import { Booking, Project } from '../../core/data/model';
import { locationOf } from '../../core/data/orders';
import { DaysOff, workingDaysBetween } from '../../shared/dates/holidays';
import { isoDate, monthOf, monthsOfYear } from '../../shared/dates/months';

/**
 * The headline figures of Home for one year, seen from today. Days are person-days.
 *
 * Booked and forecast count only chargeable days: how many chargeable days are
 * booked so far and how many there will likely be at the end of the year (user, 2026-11-11).
 * Non-chargeable and neutral projects and out-of-office days don't count in them.
 *
 * "So far" is January 1 to today, or the whole year once it is over. Available days are working
 * days (Monday to Friday without public holidays) less the out-of-office days and the days on
 * neutral projects: neutral days don't change chargeability, non-chargeable days lower it (user,
 * 2026-11-11). Each figure has a share of available days, which Home compares with the
 * chargeability target.
 *
 * Chargeability runs from January 1 to the end of the current month, days booked later in the
 * month included; a past year counts whole, a future year has none. Available days without a
 * booking count as non-chargeable (user, 2026-11-11).
 */
export interface YearKpis {
  /**
   * Chargeable days booked so far; the share is the chargeability's, so the tile shows the same
   * color. Null when nothing is booked.
   */
  booked: { days: number; share: number | null } | null;
  /**
   * Chargeable days at the end of the year: those booked before the current month, then per
   * order and month the planned days, or the booked days where they are more. `booked` is the
   * chargeable days booked so far, `planned` the rest. The share is of the year's available
   * days, with the out-of-office and neutral days counted the same way. Null when nothing is
   * booked or planned.
   */
  forecast: { total: number; booked: number; planned: number; share: number | null } | null;
  /**
   * Chargeable days booked from January 1 to the end of the current month (a past year: the
   * whole year), divided by the available days in that time. Days without a booking count as
   * non-chargeable. Null for a future year, or when nothing is booked in that time.
   */
  chargeability: { share: number; chargeable: number; available: number } | null;
}

/** Days of work and out of office, and of the work the chargeable and the neutral part. */
interface Split {
  work: number;
  away: number;
  chargeable: number;
  neutral: number;
}

const none = (): Split => ({ work: 0, away: 0, chargeable: 0, neutral: 0 });

/** The days that aren't available for chargeable work: out of office and neutral. */
const off = (split: Split) => split.away + split.neutral;

/** Works out the Home KPIs of `year` from the projects and bookings, as of `today`. */
export function yearKpis(
  year: number,
  projects: readonly Project[],
  bookings: readonly Booking[],
  holidays: DaysOff,
  today: Date,
): YearKpis {
  const start = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;
  const todayIso = isoDate(today);
  const end = todayIso < yearEnd ? todayIso : yearEnd;
  const currentMonth = monthOf(today);
  /** The last day of chargeability: the end of the current month, of a past year its end. */
  const monthEnd = isoDate(new Date(today.getFullYear(), today.getMonth() + 1, 0));
  const chargeEnd = monthEnd < yearEnd ? monthEnd : yearEnd;

  const orders = new Map(
    projects.flatMap((project) => project.orders.map((order) => [order.id, { project, order }])),
  );

  /** Days booked so far (up to `end`). */
  const soFar = none();
  /** Days booked in the time of chargeability (up to `chargeEnd`). */
  const period = none();
  /** Days booked before the current month. */
  const before = none();
  /** Days booked per order and month (`orderId|YYYY-MM`) from the current month on. */
  const bookedLater = new Map<string, Split>();
  for (const booking of bookings) {
    const entry = orders.get(booking.orderId);
    if (!entry || booking.date < start || booking.date > yearEnd) continue;
    const away = locationOf(booking, entry.order) === 'ooo';
    // Out of office never counts as chargeable, whatever the project's billing.
    const chargeable = !away && entry.project.billing === 'chargeable';
    const neutral = !away && entry.project.billing === 'neutral';
    const add = (split: Split) => {
      split[away ? 'away' : 'work'] += booking.days;
      if (chargeable) split.chargeable += booking.days;
      if (neutral) split.neutral += booking.days;
    };
    const month = monthOf(booking.date);
    if (month < currentMonth) add(before);
    else {
      const key = `${booking.orderId}|${month}`;
      const later = bookedLater.get(key) ?? none();
      add(later);
      bookedLater.set(key, later);
    }
    if (booking.date <= chargeEnd) add(period);
    if (booking.date <= end) add(soFar);
  }

  // From the current month on, each order counts its plan, or its bookings where they are more.
  const later = none();
  const laterMonths = monthsOfYear(year).filter((month) => month >= currentMonth);
  for (const { project, order } of orders.values()) {
    for (const month of laterMonths) {
      const planned = order.forecast[month] ?? 0;
      const booked = bookedLater.get(`${order.id}|${month}`) ?? none();
      if (booked.work + booked.away > planned) {
        // The bookings count, where they were worked.
        later.work += booked.work;
        later.away += booked.away;
        later.chargeable += booked.chargeable;
        later.neutral += booked.neutral;
      } else if (order.location === 'ooo') later.away += planned;
      else {
        later.work += planned;
        if (project.billing === 'chargeable') later.chargeable += planned;
        if (project.billing === 'neutral') later.neutral += planned;
      }
    }
  }
  const total = before.chargeable + later.chargeable;

  // Chargeability: every available day up to the end of the current month counts, booked or not.
  const chargeAvailable =
    chargeEnd >= start
      ? Math.max(0, workingDaysBetween(start, chargeEnd, holidays) - off(period))
      : 0;
  const chargeability =
    chargeAvailable > 0 && period.work + period.away > 0
      ? {
          share: period.chargeable / chargeAvailable,
          chargeable: period.chargeable,
          available: chargeAvailable,
        }
      : null;

  const yearAvailable = Math.max(
    0,
    workingDaysBetween(start, yearEnd, holidays) - off(before) - off(later),
  );
  const share = (days: number, of: number) => (of > 0 ? days / of : null);

  return {
    booked:
      soFar.work > 0 ? { days: soFar.chargeable, share: chargeability?.share ?? null } : null,
    forecast:
      before.work + later.work > 0
        ? {
            total,
            booked: soFar.chargeable,
            planned: Math.max(0, total - soFar.chargeable),
            share: share(total, yearAvailable),
          }
        : null,
    chargeability,
  };
}
