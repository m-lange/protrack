import { Booking, Order, Project } from '../../core/data/model';
import { locationOf } from '../../core/data/orders';
import { HolidayId } from '../../shared/dates/holidays';
import { isoDate } from '../../shared/dates/months';

/** What one project holds on one day. Out-of-office orders count apart from work. */
export interface DayEntry {
  projectId: string;
  name: string;
  /** The project color as stored (preset or hex). */
  color: string;
  days: number;
  absent: boolean;
}

/** How a day looks (Calendar README): one of the states, in this order of precedence. */
export type DayKind = 'booked' | 'split' | 'holiday' | 'vacation' | 'weekend' | 'free';

export interface CalendarDay {
  /** ISO date. */
  date: string;
  dayOfMonth: number;
  kind: DayKind;
  /** The project colors of a booked (one) or split (two) day, as stored. */
  colors: string[];
  holiday: HolidayId | null;
  weekend: boolean;
  today: boolean;
  /** Work first, then absence; the larger share first. */
  entries: DayEntry[];
}

export interface CalendarMonth {
  /** 0–11. */
  month: number;
  /** Empty cells before the 1st, so the grid starts on Monday. */
  leading: number;
  days: CalendarDay[];
  /** Empty cells after the last day, so every month has six rows. */
  trailing: number;
  /** Work days booked in the month (not out of office). */
  booked: number;
  absent: number;
}

/** Six weeks: every month fits, and all months are equally tall. */
const CELLS = 42;

/** What every booking belongs to, by order id. */
export function orderIndex(
  projects: readonly Project[],
): Map<string, { project: Project; order: Order }> {
  const index = new Map<string, { project: Project; order: Order }>();
  for (const project of projects) {
    for (const order of project.orders) index.set(order.id, { project, order });
  }
  return index;
}

/**
 * The entries per day of a year: the bookings summed per project, work apart from absence.
 * Bookings of unknown orders are left out.
 */
export function entriesByDate(
  year: number,
  bookings: readonly Booking[],
  projects: readonly Project[],
): Map<string, DayEntry[]> {
  const orders = orderIndex(projects);
  const prefix = `${year}-`;
  const byDate = new Map<string, Map<string, DayEntry>>();
  for (const booking of bookings) {
    if (!booking.date.startsWith(prefix) || !(booking.days > 0)) continue;
    const owner = orders.get(booking.orderId);
    if (!owner) continue;
    const absent = locationOf(booking, owner.order) === 'ooo';
    let day = byDate.get(booking.date);
    if (!day) byDate.set(booking.date, (day = new Map()));
    const key = `${owner.project.id}|${absent}`;
    const entry = day.get(key);
    if (entry) entry.days += booking.days;
    else {
      day.set(key, {
        projectId: owner.project.id,
        name: owner.project.name,
        color: owner.project.color,
        days: booking.days,
        absent,
      });
    }
  }
  const result = new Map<string, DayEntry[]>();
  for (const [date, entries] of byDate) {
    result.set(
      date,
      [...entries.values()].sort(
        (a, b) =>
          Number(a.absent) - Number(b.absent) || b.days - a.days || a.name.localeCompare(b.name),
      ),
    );
  }
  return result;
}

/**
 * The twelve months of a year as calendars. A day with work shows its projects (two at most,
 * split), even on a weekend or holiday; otherwise a holiday, then absence, then the weekend.
 */
export function buildYear(
  year: number,
  holidays: ReadonlyMap<string, HolidayId>,
  entries: ReadonlyMap<string, DayEntry[]>,
  today: Date,
): CalendarMonth[] {
  const todayIso = isoDate(today);
  return Array.from({ length: 12 }, (_, month) => {
    const length = new Date(year, month + 1, 0).getDate();
    const leading = (new Date(year, month, 1).getDay() + 6) % 7;
    let booked = 0;
    let absent = 0;
    const days = Array.from({ length }, (_, index): CalendarDay => {
      const date = new Date(year, month, index + 1);
      const iso = isoDate(date);
      const dayEntries = entries.get(iso) ?? [];
      const work = dayEntries.filter((e) => !e.absent);
      const away = dayEntries.filter((e) => e.absent);
      for (const e of dayEntries) {
        if (e.absent) absent += e.days;
        else booked += e.days;
      }
      const weekend = date.getDay() === 0 || date.getDay() === 6;
      const holiday = holidays.get(iso) ?? null;
      const kind: DayKind =
        work.length > 1
          ? 'split'
          : work.length === 1
            ? 'booked'
            : holiday
              ? 'holiday'
              : away.length
                ? 'vacation'
                : weekend
                  ? 'weekend'
                  : 'free';
      return {
        date: iso,
        dayOfMonth: index + 1,
        kind,
        colors: work.slice(0, 2).map((e) => e.color),
        holiday,
        weekend,
        today: iso === todayIso,
        entries: dayEntries,
      };
    });
    return { month, leading, days, trailing: CELLS - leading - length, booked, absent };
  });
}
