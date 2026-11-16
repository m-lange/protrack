import { Component, inject, input, output } from '@angular/core';
import { STRINGS } from '../../i18n/strings';
import { Icon } from '../icon/icon';

/** The design system's YearSwitcher: a stepper around the year and a "This year" link. */
@Component({
  selector: 'app-year-switcher',
  imports: [Icon],
  templateUrl: './year-switcher.html',
  styleUrl: './year-switcher.css',
})
export class YearSwitcher {
  protected readonly t = inject(STRINGS);

  readonly year = input.required<number>();
  readonly currentYear = input.required<number>();
  /** Whether there is a year to step to; the arrow is disabled when not. */
  readonly hasPrevious = input(true);
  readonly hasNext = input(true);

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly thisYear = output<void>();
}
