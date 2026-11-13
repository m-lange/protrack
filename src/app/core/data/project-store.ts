import { Injectable, computed, inject, signal } from '@angular/core';
import { BookingStore } from './booking-store';
import { Database } from './database';
import { Snapshots } from './snapshots';
import { Billing, BookingMode, Location, MonthKey, Order, Project, ProjectStatus } from './model';
import { SingleOrder, moveBookings, singleOrder } from './open-booking';
import { compareOrders, runsIn } from './orders';

/**
 * What the user edits on an order of a PO-restricted project. A new order has the id '' until
 * it is saved.
 */
export interface OrderDraft {
  id: string;
  name: string;
  start: string;
  end: string;
  budget: number;
  location: Location;
}

/** What the user edits on a project. */
export interface ProjectDraft {
  customerId: string;
  name: string;
  color: string;
  status: ProjectStatus;
  billing: Billing;
  booking: BookingMode;
  /** The orders of a PO-restricted project; an open-booking project ignores them. */
  orders: OrderDraft[];
  /** The default work location of an open-booking project; a PO-restricted one ignores it. */
  location: Location;
}

/** The projects with their orders and forecast, held in memory and written through to IndexedDB. */
@Injectable({ providedIn: 'root' })
export class ProjectStore {
  private readonly db = inject(Database);
  private readonly snapshots = inject(Snapshots);
  private readonly bookings = inject(BookingStore);
  private readonly state = signal<Project[]>([]);

  /**
   * All projects in their order: by position within their customer (user, 2026-11-10: they can
   * be moved like customers), then by name.
   */
  readonly projects = computed(() =>
    [...this.state()].sort(
      (a, b) =>
        a.order - b.order || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    ),
  );

  /** How many projects each customer has, by customer id. */
  readonly countByCustomer = computed(() => {
    const counts = new Map<string, number>();
    for (const p of this.state()) counts.set(p.customerId, (counts.get(p.customerId) ?? 0) + 1);
    return counts;
  });

  /** Sets the projects after a load or import, without writing them. */
  set(projects: Project[]): void {
    this.state.set(projects);
  }

  get(id: string): Project | undefined {
    return this.state().find((project) => project.id === id);
  }

  async create(draft: ProjectDraft): Promise<Project> {
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const order = this.nextOrder(draft.customerId);
    const project = withOneOrder(
      { id, ...fromDraft(draft, []), order, createdAt: now, updatedAt: now },
      [],
      draft,
    );
    await this.save(project.project);
    return project.project;
  }

  /**
   * Saves the project's details and orders. Orders keep their forecast for the months still in
   * their timeline; orders left out of the draft are deleted. An open-booking project keeps one
   * order: the orders it had (or the PO-restricted ones it switches from) merge into it, with
   * their bookings and forecast.
   */
  async update(id: string, draft: ProjectDraft): Promise<void> {
    const current = this.require(id);
    const kept = current.orders.filter((order) => draft.orders.some((d) => d.id === order.id));
    // A project that moves to another customer goes last there.
    const order =
      draft.customerId === current.customerId ? current.order : this.nextOrder(draft.customerId);
    const { project, merged } = withOneOrder(
      {
        ...current,
        ...fromDraft(draft, current.orders),
        order,
        updatedAt: new Date().toISOString(),
      },
      kept,
      draft,
    );
    if (merged.size > 0) {
      const moved = moveBookings(this.bookings.bookings(), merged, project.orders[0]);
      await this.bookings.apply(moved.put, moved.remove);
    }
    await this.save(project);
  }

  /** Deletes a project; a restore point is taken first. */
  async remove(id: string): Promise<void> {
    await this.snapshots
      .take('deleteProject', this.projects().find((p) => p.id === id)?.name ?? null)
      .catch((error) => console.error('ProTrack could not take a restore point.', error));
    await this.db.deleteProject(id);
    this.state.update((projects) => projects.filter((p) => p.id !== id));
  }

  /** Plans `days` for an order in a month of its timeline; 0 or null removes the plan. */
  async setForecast(
    projectId: string,
    orderId: string,
    month: MonthKey,
    days: number | null,
  ): Promise<void> {
    const project = this.require(projectId);
    const orders = project.orders.map((order) => {
      if (order.id !== orderId || !runsIn(order, month)) return order;
      const forecast = { ...order.forecast };
      if (days && days > 0) forecast[month] = days;
      else delete forecast[month];
      return { ...order, forecast };
    });
    await this.save({ ...project, orders, updatedAt: new Date().toISOString() });
  }

  /**
   * Moves a project one place up (−1) or down (+1) among `siblings`: the ids of its customer's
   * projects as a table shows them, in order. Projects the table doesn't show keep their places.
   */
  async move(id: string, step: -1 | 1, siblings: readonly string[]): Promise<void> {
    const ids = [...siblings];
    const from = ids.indexOf(id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await this.reorder(ids);
  }

  /** Moves a project to the place of another one among `siblings`, as a drop does. */
  async moveTo(id: string, targetId: string, siblings: readonly string[]): Promise<void> {
    const ids = [...siblings];
    const from = ids.indexOf(id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    await this.reorder(ids);
  }

  /**
   * Puts the projects of one customer that a table shows (`shown`, in their new order) into the
   * places they take among all of its projects, numbers them 0, 1, 2… and saves those that moved.
   */
  private async reorder(shown: readonly string[]): Promise<void> {
    const first = this.get(shown[0]);
    if (!first) return;
    const all = this.projects().filter((p) => p.customerId === first.customerId);
    const shownSet = new Set(shown);
    let next = 0;
    const ids = all.map((p) => (shownSet.has(p.id) ? shown[next++] : p.id));
    const byId = new Map(all.map((p) => [p.id, p]));
    const moved: Project[] = [];
    ids.forEach((id, order) => {
      const project = byId.get(id);
      if (project && project.order !== order) moved.push({ ...project, order });
    });
    if (moved.length === 0) return;
    await this.db.putProjects(moved);
    const changed = new Map(moved.map((p) => [p.id, p]));
    this.state.update((projects) => projects.map((p) => changed.get(p.id) ?? p));
  }

  /** The position after the last project of a customer. */
  private nextOrder(customerId: string): number {
    const orders = this.state()
      .filter((p) => p.customerId === customerId)
      .map((p) => p.order);
    return orders.length ? Math.max(...orders) + 1 : 0;
  }

  private require(id: string): Project {
    const project = this.get(id);
    if (!project) throw new Error(`Unknown project ${id}`);
    return project;
  }

  private async save(project: Project): Promise<void> {
    await this.db.putProject(project);
    this.state.update((projects) =>
      projects.some((p) => p.id === project.id)
        ? projects.map((p) => (p.id === project.id ? project : p))
        : [...projects, project],
    );
  }
}

function fromDraft(
  draft: ProjectDraft,
  current: Order[],
): Omit<Project, 'id' | 'order' | 'createdAt' | 'updatedAt'> {
  const previous = new Map(current.map((order) => [order.id, order]));
  // An open-booking project gets its one order from withOneOrder.
  const drafts = draft.booking === 'open' ? [] : draft.orders;
  const orders = drafts.map((d): Order => {
    const order: Order = {
      id: d.id || crypto.randomUUID(),
      name: d.name.trim(),
      start: d.start,
      end: d.end,
      budget: d.budget,
      location: d.location,
      forecast: {},
    };
    for (const [month, days] of Object.entries(previous.get(d.id)?.forecast ?? {})) {
      if (runsIn(order, month)) order.forecast[month] = days;
    }
    return order;
  });
  orders.sort(compareOrders);
  return {
    customerId: draft.customerId,
    name: draft.name.trim(),
    color: draft.color.toLowerCase(),
    status: draft.status,
    billing: draft.billing,
    booking: draft.booking,
    orders,
  };
}

/**
 * An open-booking project with its one order: the `kept` orders merge into the first of them
 * (or a new one), named like the project, at the draft's default work location. PO-restricted
 * projects come back as they are.
 */
function withOneOrder(project: Project, kept: Order[], draft: ProjectDraft): SingleOrder {
  if (project.booking !== 'open') return { project, merged: new Map() };
  const single = singleOrder({ ...project, orders: kept }, draft.location);
  const order = { ...single.project.orders[0], location: draft.location };
  return { project: { ...single.project, orders: [order] }, merged: single.merged };
}
