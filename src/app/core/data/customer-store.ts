import { Injectable, computed, inject, signal } from '@angular/core';
import { Database } from './database';
import { Snapshots } from './snapshots';
import { Customer } from './model';

/** What the user edits on a customer. */
export interface CustomerDraft {
  name: string;
  logo: string | null;
}

/** The customers, held in memory and written through to IndexedDB. */
@Injectable({ providedIn: 'root' })
export class CustomerStore {
  private readonly db = inject(Database);
  private readonly snapshots = inject(Snapshots);
  private readonly state = signal<Customer[]>([]);

  /** All customers in the user's order. */
  readonly customers = computed(() => [...this.state()].sort((a, b) => a.order - b.order));

  /** Sets the customers after a load or import, without writing them. */
  set(customers: Customer[]): void {
    this.state.set(customers);
  }

  get(id: string): Customer | undefined {
    return this.state().find((customer) => customer.id === id);
  }

  /** Adds a customer at the end of the list. */
  async create(draft: CustomerDraft): Promise<Customer> {
    const now = new Date().toISOString();
    const last = this.customers().at(-1);
    const customer: Customer = {
      id: crypto.randomUUID(),
      name: draft.name.trim(),
      order: last ? last.order + 1 : 0,
      logo: draft.logo,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.putCustomer(customer);
    this.state.update((customers) => [...customers, customer]);
    return customer;
  }

  async update(id: string, draft: CustomerDraft): Promise<void> {
    const current = this.get(id);
    if (!current) throw new Error(`Unknown customer ${id}`);
    const customer: Customer = {
      ...current,
      name: draft.name.trim(),
      logo: draft.logo,
      updatedAt: new Date().toISOString(),
    };
    await this.db.putCustomer(customer);
    this.state.update((customers) => customers.map((c) => (c.id === id ? customer : c)));
  }

  /** Deletes a customer; a restore point is taken first. */
  async remove(id: string): Promise<void> {
    const name = this.customers().find((c) => c.id === id)?.name ?? null;
    await this.snapshots
      .take('deleteCustomer', name)
      .catch((error) => console.error('ProTrack could not take a restore point.', error));
    await this.db.deleteCustomer(id);
    this.state.update((customers) => customers.filter((c) => c.id !== id));
  }

  /** Moves a customer one place up (−1) or down (+1). */
  async move(id: string, step: -1 | 1): Promise<void> {
    const ids = this.customers().map((c) => c.id);
    const from = ids.indexOf(id);
    const to = from + step;
    if (from < 0 || to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    await this.reorder(ids);
  }

  /** Moves a customer to the place of another one, as a drop in a drag and drop does. */
  async moveTo(id: string, targetId: string): Promise<void> {
    const ids = this.customers().map((c) => c.id);
    const from = ids.indexOf(id);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0 || from === to) return;
    ids.splice(from, 1);
    ids.splice(to, 0, id);
    await this.reorder(ids);
  }

  /** Numbers the customers 0, 1, 2… in the given order and saves the ones that moved. */
  private async reorder(ids: string[]): Promise<void> {
    const byId = new Map(this.state().map((c) => [c.id, c]));
    const moved: Customer[] = [];
    ids.forEach((id, order) => {
      const customer = byId.get(id);
      if (customer && customer.order !== order) moved.push({ ...customer, order });
    });
    if (moved.length === 0) return;
    await this.db.putCustomers(moved);
    const changed = new Map(moved.map((c) => [c.id, c]));
    this.state.update((customers) => customers.map((c) => changed.get(c.id) ?? c));
  }
}
