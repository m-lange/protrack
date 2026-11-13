import { Component, computed, inject } from '@angular/core';
import { BookingStore } from '../../core/data/booking-store';
import { ProjectStore } from '../../core/data/project-store';
import { SettingsStore } from '../../core/data/settings-store';
import { SelectedYear } from '../../core/selected-year';
import { TODAY } from '../../core/today';
import { STRINGS } from '../../i18n/strings';
import { holidaysOfYear } from '../../shared/dates/holidays';
import { MonthCalendar } from './month-calendar/month-calendar';
import { buildYear, entriesByDate } from './year-calendar';

/**
 * My year: the year picked in the top bar as twelve month calendars with weekends, public
 * holidays, out-of-office days and the projects booked on each day.
 */
@Component({
  selector: 'app-year',
  imports: [MonthCalendar],
  templateUrl: './year.html',
  styleUrl: './year.css',
})
export class Year {
  protected readonly t = inject(STRINGS);
  protected readonly year = inject(SelectedYear).year;
  private readonly today = inject(TODAY);
  private readonly bookings = inject(BookingStore).bookings;
  private readonly projects = inject(ProjectStore).projects;
  private readonly settings = inject(SettingsStore).settings;

  protected readonly months = computed(() =>
    buildYear(
      this.year(),
      holidaysOfYear(this.year(), this.settings().region),
      entriesByDate(this.year(), this.bookings(), this.projects()),
      this.today,
    ),
  );
}
