import { Injectable, signal } from '@angular/core';
import { Database } from '../core/data/database';
import {
  AppData,
  Booking,
  Customer,
  DayNote,
  Order,
  Project,
  Settings,
  defaultSettings,
} from '../core/data/model';
import { StoredSnapshot } from '../core/data/snapshots';

/** An in-memory stand-in for the IndexedDB `Database` in tests. */
@Injectable()
export class FakeDatabase implements Pick<Database, keyof Database> {
  customers = new Map<string, Customer>();
  projects = new Map<string, Project>();
  bookings = new Map<string, Booking>();
  dayNotes = new Map<string, DayNote>();
  snapshots = new Map<string, StoredSnapshot>();
  settings: Settings = defaultSettings();
  device = new Map<string, unknown>();
  private readonly revisionState = signal(0);
  readonly revision = this.revisionState.asReadonly();

  async loadAll(): Promise<AppData> {
    return {
      customers: [...this.customers.values()],
      projects: [...this.projects.values()],
      bookings: [...this.bookings.values()],
      dayNotes: [...this.dayNotes.values()],
      settings: this.settings,
    };
  }

  async putCustomer(customer: Customer): Promise<void> {
    this.customers.set(customer.id, customer);
    this.changed();
  }

  async putCustomers(customers: Customer[]): Promise<void> {
    for (const customer of customers) this.customers.set(customer.id, customer);
    this.changed();
  }

  async deleteCustomer(id: string): Promise<void> {
    this.customers.delete(id);
    this.changed();
  }

  async putProject(project: Project): Promise<void> {
    this.projects.set(project.id, project);
    this.changed();
  }

  async putProjects(projects: Project[]): Promise<void> {
    for (const project of projects) this.projects.set(project.id, project);
    this.changed();
  }

  async deleteProject(id: string): Promise<void> {
    this.projects.delete(id);
    this.changed();
  }

  async saveBookings(put: Booking[], remove: string[]): Promise<void> {
    for (const booking of put) this.bookings.set(booking.id, booking);
    for (const id of remove) this.bookings.delete(id);
    this.changed();
  }

  async putDayNote(note: DayNote): Promise<void> {
    this.dayNotes.set(note.date, note);
    this.changed();
  }

  async deleteDayNote(date: string): Promise<void> {
    this.dayNotes.delete(date);
    this.changed();
  }

  async putSettings(settings: Settings): Promise<void> {
    this.settings = settings;
    this.changed();
  }

  async replaceAll(data: AppData): Promise<void> {
    this.customers = new Map(data.customers.map((c) => [c.id, c]));
    this.projects = new Map(data.projects.map((p) => [p.id, p]));
    this.bookings = new Map(data.bookings.map((b) => [b.id, b]));
    this.dayNotes = new Map(data.dayNotes.map((n) => [n.date, n]));
    this.settings = data.settings;
    this.changed();
  }

  async clearAll(): Promise<void> {
    this.customers.clear();
    this.projects.clear();
    this.bookings.clear();
    this.dayNotes.clear();
    this.settings = defaultSettings();
    this.device.clear();
    this.snapshots.clear();
    this.changed();
  }

  async getDevice<T>(key: string): Promise<T | undefined> {
    return this.device.get(key) as T | undefined;
  }

  async setDevice(key: string, value: unknown): Promise<void> {
    this.device.set(key, value);
  }

  async deleteDevice(key: string): Promise<void> {
    this.device.delete(key);
  }

  async getSnapshots(): Promise<StoredSnapshot[]> {
    return [...this.snapshots.values()].sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  }

  async getSnapshot(id: string): Promise<StoredSnapshot | undefined> {
    return this.snapshots.get(id);
  }

  async saveSnapshot(snapshot: StoredSnapshot, remove: string[]): Promise<void> {
    this.snapshots.set(snapshot.id, snapshot);
    for (const id of remove) this.snapshots.delete(id);
  }

  private changed(): void {
    this.revisionState.update((r) => r + 1);
  }
}

export const provideFakeDatabase = () => [
  FakeDatabase,
  { provide: Database, useExisting: FakeDatabase },
];

export function customer(
  name: string,
  id = name.toLowerCase().replace(/\s+/g, '-'),
  order = 0,
): Customer {
  return {
    id,
    name,
    order,
    logo: null,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
  };
}

/** A test order; dates are ISO days, forecast by month `YYYY-MM`. */
export function order(
  id: string,
  start: string,
  end: string,
  changes: Partial<Omit<Order, 'id' | 'start' | 'end'>> = {},
): Order {
  return { id, name: id, start, end, budget: 10, location: 'onsite', forecast: {}, ...changes };
}

/** A test order of an open-booking project: no timeline, no budget. */
export function openOrder(
  id: string,
  changes: Partial<Pick<Order, 'name' | 'location' | 'forecast'>> = {},
): Order {
  return {
    id,
    name: id,
    start: null,
    end: null,
    budget: null,
    location: 'onsite',
    forecast: {},
    ...changes,
  };
}

/** A test project of a customer. */
export function project(
  id: string,
  customerId: string,
  orders: Order[] = [],
  changes: Partial<Omit<Project, 'id' | 'customerId' | 'orders'>> = {},
): Project {
  return {
    id,
    customerId,
    name: id,
    color: 'indigo',
    status: 'active',
    billing: 'chargeable',
    booking: 'po',
    order: 0,
    orders,
    createdAt: '2026-11-01T09:00:00.000Z',
    updatedAt: '2026-11-01T09:00:00.000Z',
    ...changes,
  };
}
