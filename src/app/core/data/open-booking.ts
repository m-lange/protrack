import { Booking, Location, Order, Project } from './model';
import { compareOrders } from './orders';

/**
 * Open-booking projects have no orders the user sees (user, 2026-11-10). Inside, each one has
 * exactly one order: it takes the project's bookings and forecast, carries the project's name
 * and its default work location, and has no timeline or budget. The UI shows the project in its
 * place.
 */

/** The id of the one order of an open-booking project that had none: stable across loads. */
function openOrderId(projectId: string): string {
  return `${projectId}-booking`;
}

/** The one order of an open-booking project; undefined for a PO-restricted one. */
export function openOrder(project: Project): Order | undefined {
  return project.booking === 'open' ? project.orders[0] : undefined;
}

/** A project with its one order, and the orders merged into it with their locations. */
export interface SingleOrder {
  project: Project;
  /** The ids of the orders that were merged into the one, with the location each had. */
  merged: Map<string, Location>;
}

/**
 * Gives an open-booking project exactly one order: the first of its orders (by name), or a new
 * one at `location` when it has none. The others are merged into it: their forecasts add up,
 * their bookings move with `moveBookings`. The order takes the project's name. PO-restricted
 * projects come back as they are.
 */
export function singleOrder(project: Project, location: Location = 'onsite'): SingleOrder {
  const merged = new Map<string, Location>();
  if (project.booking !== 'open') return { project, merged };
  const [first, ...rest] = [...project.orders].sort(compareOrders);
  const forecast: Record<string, number> = {};
  for (const order of project.orders) {
    for (const [month, days] of Object.entries(order.forecast)) {
      forecast[month] = (forecast[month] ?? 0) + days;
    }
  }
  for (const order of rest) merged.set(order.id, order.location);
  const order: Order = {
    id: first?.id ?? openOrderId(project.id),
    name: project.name,
    start: null,
    end: null,
    budget: null,
    location: first?.location ?? location,
    forecast,
  };
  return { project: { ...project, orders: [order] }, merged };
}

/** What `moveBookings` changes: all bookings afterwards, and what to write and delete. */
export interface MovedBookings {
  bookings: Booking[];
  put: Booking[];
  remove: string[];
}

/**
 * Moves the bookings of merged orders onto `target`. Every day keeps where it was worked: its
 * own location, else its old order's, kept as the day's own where it differs from the target's.
 * Where the target has days on the same date already, the days add up into one booking, at the
 * location of the larger part.
 */
export function moveBookings(
  bookings: readonly Booking[],
  merged: ReadonlyMap<string, Location>,
  target: Pick<Order, 'id' | 'location'>,
): MovedBookings {
  const put = new Map<string, Booking>();
  const remove: string[] = [];
  if (merged.size === 0) return { bookings: [...bookings], put: [], remove };
  // The target's booking per date, as it will be.
  const onDate = new Map<string, Booking>();
  for (const b of bookings) {
    if (b.orderId === target.id && !onDate.has(b.date)) onDate.set(b.date, b);
  }
  for (const b of bookings) {
    const from = merged.get(b.orderId);
    if (from === undefined) continue;
    const here = b.location ?? from;
    const existing = onDate.get(b.date);
    let next: Booking;
    if (existing) {
      const there = existing.location ?? target.location;
      next = at(
        { ...existing, days: existing.days + b.days },
        b.days > existing.days ? here : there,
      );
      remove.push(b.id);
    } else {
      next = at({ ...b, orderId: target.id }, here);
    }
    onDate.set(b.date, next);
    put.set(next.id, next);
  }
  const removed = new Set(remove);
  return {
    bookings: bookings.filter((b) => !removed.has(b.id)).map((b) => put.get(b.id) ?? b),
    put: [...put.values()],
    remove,
  };

  /** The booking with `location` as its own, or none where that is the target's. */
  function at(booking: Booking, location: Location): Booking {
    const { location: _own, ...rest } = booking;
    return location === target.location ? rest : { ...rest, location };
  }
}
