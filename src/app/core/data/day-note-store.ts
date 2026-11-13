import { Injectable, computed, inject, signal } from '@angular/core';
import { Database } from './database';
import { DayNote } from './model';

/** The notes of the timesheet days, held in memory and written through to IndexedDB. */
@Injectable({ providedIn: 'root' })
export class DayNoteStore {
  private readonly db = inject(Database);
  private readonly state = signal<DayNote[]>([]);

  /** By date. */
  readonly notes = this.state.asReadonly();

  private readonly byDate = computed(() => new Map(this.state().map((note) => [note.date, note])));

  /** Sets the notes after a load or import, without writing them. */
  set(notes: DayNote[]): void {
    this.state.set(notes);
  }

  /** The text of a day's note (ISO date), '' for none. */
  of(date: string): string {
    return this.byDate().get(date)?.text ?? '';
  }

  /** Saves a day's note; blank text deletes it. */
  async save(date: string, text: string): Promise<void> {
    const current = this.byDate().get(date);
    if (!text.trim()) {
      if (!current) return;
      await this.db.deleteDayNote(date);
      this.state.update((notes) => notes.filter((n) => n.date !== date));
      return;
    }
    if (current?.text === text) return;
    const note: DayNote = { date, text, updatedAt: new Date().toISOString() };
    await this.db.putDayNote(note);
    this.state.update((notes) =>
      [...notes.filter((n) => n.date !== date), note].sort((a, b) => a.date.localeCompare(b.date)),
    );
  }
}
