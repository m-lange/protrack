import { chargeabilityByMonth } from '../../../core/chargeability';
import { OrderBookings } from '../../../core/data/booking-store';
import { Booking, MonthKey, Project, Settings, WorkLocation } from '../../../core/data/model';
import { daysOff } from '../../../shared/dates/holidays';
import { monthKey, monthOf } from '../../../shared/dates/months';
import { locationShares, shareOf } from '../location-chart/location-shares';

/** A month on the time axis of the trend charts. */
export interface TrendMonth {
  key: MonthKey;
  year: number;
  /** 0–11. */
  month: number;
}

/** Shares (0–1) per month, null where a month has nothing to share. */
export type TrendValues = (number | null)[];

export interface Trends {
  months: TrendMonth[];
  /** Chargeable ÷ available days per month; days without a booking count as non-chargeable. */
  chargeability: TrendValues;
  /** Each work location's share of the month's work days; null in a month without work days. */
  locations: Record<WorkLocation, TrendValues>;
}

/**
 * The history behind Home's trend charts (user, 2026-11-11): every month from the first one with
 * a booking to the last finished month, over all years; the current month isn't over yet and
 * stays out (in November 2026 they end with October). Only bookings count, never plans. Null
 * without bookings before the current month.
 */
export function trends(
  projects: readonly Project[],
  bookings: readonly Booking[],
  bookingsOf: (orderId: string) => OrderBookings,
  settings: Pick<Settings, 'region' | 'yearEndDaysOff'>,
  today: Date,
): Trends | null {
  const known = new Set(projects.flatMap((p) => p.orders.map((o) => o.id)));
  let first = '';
  for (const booking of bookings) {
    if (known.has(booking.orderId) && (!first || booking.date < first)) first = booking.date;
  }
  // chargeabilityByMonth plans from the current month on; every month before counts bookings.
  const planFrom = monthOf(today);
  /** The last month shown: the one before the current month. */
  const last = monthOf(new Date(today.getFullYear(), today.getMonth() - 1, 1));
  if (!first || monthOf(first) > last) return null;
  const firstMonth = monthOf(first);

  const result: Trends = {
    months: [],
    chargeability: [],
    locations: { onsite: [], reply: [], home: [] },
  };
  for (let year = Number(firstMonth.slice(0, 4)); year <= Number(last.slice(0, 4)); year++) {
    const charge = chargeabilityByMonth(
      year,
      projects,
      bookingsOf,
      daysOff(year, settings.region, settings.yearEndDaysOff),
      planFrom,
    );
    const shares = locationShares(year, projects, bookings);
    for (let month = 0; month < 12; month++) {
      const key = monthKey(year, month);
      if (key < firstMonth || key > last) continue;
      const m = charge.months[month];
      result.months.push({ key, year, month });
      result.chargeability.push(m.available > 0 ? m.chargeable / m.available : null);
      const days = shares.months[month];
      for (const id of ['onsite', 'reply', 'home'] as const) {
        result.locations[id].push(days.work > 0 ? shareOf(days, id) : null);
      }
    }
  }
  return result;
}
