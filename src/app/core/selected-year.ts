import { Injectable, computed, inject, signal } from '@angular/core';
import { TODAY } from './today';

/** The year the app shows: set by the year switcher in the top bar, read by the side nav. */
@Injectable({ providedIn: 'root' })
export class SelectedYear {
  readonly currentYear = inject(TODAY).getFullYear();

  private readonly selected = signal(this.currentYear);
  readonly year = this.selected.asReadonly();
  readonly isCurrent = computed(() => this.selected() === this.currentYear);

  previous(): void {
    this.selected.update((year) => year - 1);
  }

  next(): void {
    this.selected.update((year) => year + 1);
  }

  /** Shows a year, e.g. when the timesheet steps across the turn of the year. */
  set(year: number): void {
    this.selected.set(year);
  }

  reset(): void {
    this.selected.set(this.currentYear);
  }
}
