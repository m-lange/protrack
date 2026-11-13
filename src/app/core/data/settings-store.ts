import { Injectable, inject, signal } from '@angular/core';
import { Database } from './database';
import { Settings, defaultSettings } from './model';

/** The user's settings, held in memory and written through to IndexedDB. */
@Injectable({ providedIn: 'root' })
export class SettingsStore {
  private readonly db = inject(Database);
  private readonly state = signal<Settings>(defaultSettings());

  readonly settings = this.state.asReadonly();

  /** Sets the settings after a load or import, without writing them. */
  set(settings: Settings): void {
    this.state.set(settings);
  }

  /** Changes the settings in memory only, for live previews such as a dragged slider. */
  preview(change: Partial<Settings>): void {
    this.state.update((settings) => ({ ...settings, ...change }));
  }

  /** Changes the settings and saves them. */
  async update(change: Partial<Settings>): Promise<void> {
    this.preview(change);
    await this.db.putSettings(this.state());
  }
}
