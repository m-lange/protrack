import { Injectable, inject, signal } from '@angular/core';
import { BookingStore } from './booking-store';
import { CustomerStore } from './customer-store';
import { DayNoteStore } from './day-note-store';
import { Database } from './database';
import { AppData, emptyData } from './model';
import { ProjectStore } from './project-store';
import { SettingsStore } from './settings-store';
import { normalizeData } from './sync-file';

/** Loads, replaces and resets all user data across the stores. */
@Injectable({ providedIn: 'root' })
export class AppDataService {
  private readonly db = inject(Database);
  private readonly customers = inject(CustomerStore);
  private readonly projects = inject(ProjectStore);
  private readonly bookings = inject(BookingStore);
  private readonly dayNotes = inject(DayNoteStore);
  private readonly settings = inject(SettingsStore);
  private readonly loadFailedState = signal(false);

  /**
   * Whether the data could not be loaded at app start. The app then shows none of it, and the
   * shell says so, so an empty app isn't taken for lost data.
   */
  readonly loadFailed = this.loadFailedState.asReadonly();

  /**
   * Loads all data from IndexedDB into the stores. Runs once at app start. The data goes
   * through the same repair as a sync file.
   */
  async load(): Promise<void> {
    try {
      const raw = (await this.db.loadAll()) as unknown as Record<string, unknown>;
      this.apply(normalizeData(raw));
    } catch (error) {
      this.loadFailedState.set(true);
      throw error;
    }
  }

  /** The data as it is now, for the sync file. */
  snapshot(): AppData {
    return {
      customers: this.customers.customers(),
      projects: this.projects.projects(),
      bookings: this.bookings.bookings(),
      dayNotes: this.dayNotes.notes(),
      settings: this.settings.settings(),
    };
  }

  /** Replaces all data, as an import does. */
  async replaceAll(data: AppData): Promise<void> {
    await this.db.replaceAll(data);
    this.apply(data);
  }

  /** Deletes everything in IndexedDB, including the link to the backup file. */
  async reset(): Promise<void> {
    await this.db.clearAll();
    this.apply(emptyData());
  }

  private apply(data: AppData): void {
    this.customers.set(data.customers);
    this.projects.set(data.projects);
    this.bookings.set(data.bookings);
    this.dayNotes.set(data.dayNotes);
    this.settings.set(data.settings);
  }
}
