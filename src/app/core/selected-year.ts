import { Injectable, computed, inject, signal } from '@angular/core';
import { Project } from './data/model';
import { ProjectStore } from './data/project-store';
import { TODAY } from './today';

/**
 * The years the year switcher offers, ascending and without gaps: from the year the first order
 * starts to the year the last one ends, and at least the current year (user, 2026-11-16).
 * Open-booking orders have no timeline and add no year.
 */
function selectableYears(projects: readonly Project[], currentYear: number): number[] {
  let first = currentYear;
  let last = currentYear;
  for (const project of projects) {
    for (const order of project.orders) {
      if (!order.start || !order.end) continue;
      first = Math.min(first, Number(order.start.slice(0, 4)));
      last = Math.max(last, Number(order.end.slice(0, 4)));
    }
  }
  return Array.from({ length: last - first + 1 }, (_, i) => first + i);
}

/** The year the app shows: set by the year switcher in the top bar, read by the side nav. */
@Injectable({ providedIn: 'root' })
export class SelectedYear {
  readonly currentYear = inject(TODAY).getFullYear();
  private readonly projects = inject(ProjectStore).projects;

  private readonly selected = signal(this.currentYear);
  readonly year = this.selected.asReadonly();
  readonly isCurrent = computed(() => this.selected() === this.currentYear);

  /** The years the switcher steps through. */
  readonly years = computed(() => selectableYears(this.projects(), this.currentYear));
  private readonly before = computed(() =>
    this.years()
      .filter((y) => y < this.selected())
      .at(-1),
  );
  private readonly after = computed(() => this.years().find((y) => y > this.selected()));
  readonly hasPrevious = computed(() => this.before() !== undefined);
  readonly hasNext = computed(() => this.after() !== undefined);

  /** Steps a year back within the years on offer; stays when there is none. */
  previous(): void {
    const year = this.before();
    if (year !== undefined) this.selected.set(year);
  }

  /** Steps a year on within the years on offer; stays when there is none. */
  next(): void {
    const year = this.after();
    if (year !== undefined) this.selected.set(year);
  }

  /**
   * Shows a year, e.g. when the timesheet steps across the turn of the year. Any year: the
   * timesheet's month decides it.
   */
  set(year: number): void {
    this.selected.set(year);
  }

  reset(): void {
    this.selected.set(this.currentYear);
  }
}
