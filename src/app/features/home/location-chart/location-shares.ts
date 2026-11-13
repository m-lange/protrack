import { Booking, Location, Project, WorkLocation } from '../../../core/data/model';
import { monthOf, monthsOfYear } from '../../../shared/dates/months';

/** Booked days per location in one bar: a month or the whole year. */
export interface LocationDays {
  /** Per location, out of office included. */
  days: Record<Location, number>;
  /** All days at the work locations (without out of office): the whole of the shares. */
  work: number;
  /** All days, out of office included. */
  total: number;
}

export interface LocationShares {
  months: LocationDays[];
  year: LocationDays;
}

/** The days booked in a year per location, per month and for the whole year. */
export function locationShares(
  year: number,
  projects: readonly Project[],
  bookings: readonly Booking[],
): LocationShares {
  const locations = new Map(projects.flatMap((p) => p.orders.map((o) => [o.id, o.location])));
  const keys = monthsOfYear(year);
  const empty = (): LocationDays => ({
    days: { onsite: 0, reply: 0, home: 0, ooo: 0 },
    work: 0,
    total: 0,
  });
  const months = keys.map(empty);
  const total = empty();
  for (const booking of bookings) {
    const orderLocation = locations.get(booking.orderId);
    const index = keys.indexOf(monthOf(booking.date));
    if (!orderLocation || index < 0) continue;
    const location = booking.location ?? orderLocation;
    for (const bar of [months[index], total]) {
      bar.days[location] += booking.days;
      bar.total += booking.days;
      if (location !== 'ooo') bar.work += booking.days;
    }
  }
  return { months, year: total };
}

/**
 * The share of a work location in the work days of a bar, 0–1; 0 for a bar without work days.
 * Out of office is not part of the shares (Home's share chart).
 */
export function shareOf(bar: LocationDays, location: WorkLocation): number {
  return bar.work > 0 ? bar.days[location] / bar.work : 0;
}
