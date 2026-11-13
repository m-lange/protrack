import { Injectable, signal } from '@angular/core';
import { DBSchema, IDBPDatabase, openDB } from 'idb';
import { AppData, Booking, Customer, DayNote, Project, Settings, defaultSettings } from './model';
import type { StoredSnapshot } from './snapshots';

interface ProtrackDb extends DBSchema {
  customers: { key: string; value: Customer };
  /** Projects with their orders and forecast. */
  projects: { key: string; value: Project };
  bookings: { key: string; value: Booking };
  /** Notes per timesheet day, keyed by the date (`YYYY-MM-DD`). */
  dayNotes: { key: string; value: DayNote };
  /** One record under the key 'settings'. */
  settings: { key: string; value: Settings };
  /** Values that belong to this browser only and never go into the sync file. */
  device: { key: string; value: unknown };
  /** Restore points of all user data, on this device only. Never part of the sync file. */
  snapshots: { key: string; value: StoredSnapshot };
}

const DB_NAME = 'protrack';
/** The version of the stores. Databases of other versions are not upgraded. */
const DB_VERSION = 1;
const USER_STORES = ['customers', 'projects', 'bookings', 'dayNotes', 'settings'] as const;
const SETTINGS_KEY = 'settings';

/**
 * The IndexedDB of ProTrack. Every write to user data raises `revision`, which the
 * backup watches to keep the sync file up to date.
 */
@Injectable({ providedIn: 'root' })
export class Database {
  private connection?: Promise<IDBPDatabase<ProtrackDb>>;
  private readonly revisionState = signal(0);

  /** Counts the writes to user data since the app started. */
  readonly revision = this.revisionState.asReadonly();

  async loadAll(): Promise<AppData> {
    const db = await this.open();
    const [customers, projects, bookings, dayNotes, settings] = await Promise.all([
      db.getAll('customers'),
      db.getAll('projects'),
      db.getAll('bookings'),
      db.getAll('dayNotes'),
      db.get('settings', SETTINGS_KEY),
    ]);
    return { customers, projects, bookings, dayNotes, settings: settings ?? defaultSettings() };
  }

  async putCustomer(customer: Customer): Promise<void> {
    await (await this.open()).put('customers', customer);
    this.changed();
  }

  /** Writes several customers in one transaction, as a reorder does. */
  async putCustomers(customers: Customer[]): Promise<void> {
    const tx = (await this.open()).transaction('customers', 'readwrite');
    await Promise.all([...customers.map((customer) => tx.store.put(customer)), tx.done]);
    this.changed();
  }

  async deleteCustomer(id: string): Promise<void> {
    await (await this.open()).delete('customers', id);
    this.changed();
  }

  async putProject(project: Project): Promise<void> {
    await (await this.open()).put('projects', project);
    this.changed();
  }

  /** Writes several projects in one transaction, as a reorder does. */
  async putProjects(projects: Project[]): Promise<void> {
    const tx = (await this.open()).transaction('projects', 'readwrite');
    await Promise.all([...projects.map((project) => tx.store.put(project)), tx.done]);
    this.changed();
  }

  async deleteProject(id: string): Promise<void> {
    await (await this.open()).delete('projects', id);
    this.changed();
  }

  /** Writes and deletes bookings in one transaction, as a day's entry does. */
  async saveBookings(put: Booking[], remove: string[]): Promise<void> {
    const tx = (await this.open()).transaction('bookings', 'readwrite');
    await Promise.all([
      ...put.map((booking) => tx.store.put(booking)),
      ...remove.map((id) => tx.store.delete(id)),
      tx.done,
    ]);
    this.changed();
  }

  async putDayNote(note: DayNote): Promise<void> {
    await (await this.open()).put('dayNotes', note);
    this.changed();
  }

  async deleteDayNote(date: string): Promise<void> {
    await (await this.open()).delete('dayNotes', date);
    this.changed();
  }

  async putSettings(settings: Settings): Promise<void> {
    await (await this.open()).put('settings', settings, SETTINGS_KEY);
    this.changed();
  }

  /** Replaces all user data in one transaction. Device values stay. */
  async replaceAll(data: AppData): Promise<void> {
    const db = await this.open();
    const tx = db.transaction(USER_STORES, 'readwrite');
    const customers = tx.objectStore('customers');
    const projects = tx.objectStore('projects');
    const bookings = tx.objectStore('bookings');
    const dayNotes = tx.objectStore('dayNotes');
    const settings = tx.objectStore('settings');
    await Promise.all(USER_STORES.map((store) => tx.objectStore(store).clear()));
    await Promise.all([
      ...data.customers.map((customer) => customers.put(customer)),
      ...data.projects.map((project) => projects.put(project)),
      ...data.bookings.map((booking) => bookings.put(booking)),
      ...data.dayNotes.map((note) => dayNotes.put(note)),
      settings.put(data.settings, SETTINGS_KEY),
    ]);
    await tx.done;
    this.changed();
  }

  /** Deletes everything, user data, device values and restore points. */
  async clearAll(): Promise<void> {
    const db = await this.open();
    const stores = [...USER_STORES, 'device', 'snapshots'] as const;
    const tx = db.transaction(stores, 'readwrite');
    await Promise.all([...stores.map((store) => tx.objectStore(store).clear()), tx.done]);
    this.changed();
  }

  async getDevice<T>(key: string): Promise<T | undefined> {
    return (await (await this.open()).get('device', key)) as T | undefined;
  }

  async setDevice(key: string, value: unknown): Promise<void> {
    await (await this.open()).put('device', value, key);
  }

  async deleteDevice(key: string): Promise<void> {
    await (await this.open()).delete('device', key);
  }

  /** All restore points, oldest first. */
  async getSnapshots(): Promise<StoredSnapshot[]> {
    const snapshots = await (await this.open()).getAll('snapshots');
    return snapshots.sort((a, b) => a.takenAt.localeCompare(b.takenAt));
  }

  async getSnapshot(id: string): Promise<StoredSnapshot | undefined> {
    return (await this.open()).get('snapshots', id);
  }

  /** Adds a restore point and deletes others in one transaction. Not a change of user data. */
  async saveSnapshot(snapshot: StoredSnapshot, remove: string[]): Promise<void> {
    const tx = (await this.open()).transaction('snapshots', 'readwrite');
    await Promise.all([
      tx.store.put(snapshot),
      ...remove.map((id) => tx.store.delete(id)),
      tx.done,
    ]);
  }

  private open(): Promise<IDBPDatabase<ProtrackDb>> {
    this.connection ??= openDB<ProtrackDb>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        db.createObjectStore('customers', { keyPath: 'id' });
        db.createObjectStore('projects', { keyPath: 'id' });
        db.createObjectStore('bookings', { keyPath: 'id' });
        db.createObjectStore('dayNotes', { keyPath: 'date' });
        db.createObjectStore('settings');
        db.createObjectStore('device');
        db.createObjectStore('snapshots', { keyPath: 'id' });
      },
    });
    return this.connection;
  }

  private changed(): void {
    this.revisionState.update((revision) => revision + 1);
  }
}
