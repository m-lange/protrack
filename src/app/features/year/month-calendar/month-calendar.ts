import { formatDate } from '@angular/common';
import { Component, LOCALE_ID, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { projectColor } from '../../../core/categories';
import { STRINGS } from '../../../i18n/strings';
import { parseIsoDate } from '../../../shared/dates/months';
import { formatDays } from '../../../shared/pipes/days';
import { CalendarDay, CalendarMonth } from '../year-calendar';

interface DayCell {
  day: CalendarDay;
  /** The pt-day modifiers of its state. */
  classes: string;
  /** The project colors of a booked or split day, as CSS values. */
  color: string | null;
  color2: string | null;
  /** Its date and what it holds: "Mon, Nov 2, 2026 · Risk Data Platform 0.5 d". */
  title: string;
}

/**
 * One month of My year (Calendar in the design system): day numbers from Monday to Sunday that
 * show weekends, public holidays, out-of-office days, booked projects and today. The month name
 * opens the month in My timesheet.
 */
@Component({
  selector: 'app-month-calendar',
  imports: [RouterLink],
  templateUrl: './month-calendar.html',
  styleUrl: './month-calendar.css',
  host: { class: 'pt-table' },
})
export class MonthCalendar {
  protected readonly t = inject(STRINGS);
  private readonly locale = inject(LOCALE_ID);

  readonly month = input.required<CalendarMonth>();
  readonly year = input.required<number>();

  /** "November 2026". */
  protected readonly name = computed(() => `${this.t.months[this.month().month]} ${this.year()}`);

  protected readonly leading = computed(() => Array.from({ length: this.month().leading }));
  protected readonly trailing = computed(() => Array.from({ length: this.month().trailing }));

  protected readonly cells = computed<DayCell[]>(() =>
    this.month().days.map((day) => {
      const [first, second] = day.colors.map(projectColor);
      return {
        day,
        classes: `pt-day--${day.kind}${day.today ? ' pt-day--today' : ''}`,
        color: first ?? null,
        color2: second ?? null,
        title: this.title(day),
      };
    }),
  );

  private title(day: CalendarDay): string {
    const y = this.t.year;
    const parts = [formatDate(parseIsoDate(day.date), this.t.formats.weekDayYear, this.locale)];
    if (day.holiday) parts.push(y.dayHoliday(this.t.holidays[day.holiday]));
    for (const entry of day.entries) {
      parts.push(y.dayEntry(entry.name, this.t.common.days(formatDays(entry.days))));
    }
    if (parts.length === 1) parts.push(day.weekend ? y.dayWeekend : y.dayFree);
    const text = y.day(parts);
    return day.today ? y.dayToday(text) : text;
  }
}
