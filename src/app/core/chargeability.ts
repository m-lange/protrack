import { monthsOfYear } from '../shared/dates/months';
import { DaysOff, workingDays } from '../shared/dates/holidays';
import { OrderBookings, awayInMonth } from './data/booking-store';
import { MonthKey, Project } from './data/model';
import { runsIn } from './data/orders';

/** How a share of available days compares to the chargeability target. */
export type TargetStatus = 'met' | 'near' | 'below';

/** How many percentage points below the target a share is still near it (yellow, not red). */
export const TARGET_NEAR_POINTS = 10;

/**
 * Compares a share (0–1) with the chargeability target in percent: at or above the target it is
 * met (green), up to 10 points below near (yellow), further below below (red). The share is
 * rounded to whole percent first, as it is shown.
 */
export function targetStatus(share: number, target: number): TargetStatus {
  const percent = Math.round(share * 100);
  if (percent >= target) return 'met';
  return percent >= target - TARGET_NEAR_POINTS ? 'near' : 'below';
}

/** The chargeability of a month or of several months together. Days are person-days. */
export interface Chargeability {
  /** All days over all projects, out of office included. */
  days: number;
  /** Monday to Friday without public holidays. */
  workingDays: number;
  chargeable: number;
  /**
   * The working days less the out-of-office days and the days on neutral projects: neutral days
   * don't change chargeability (user, 2026-11-11).
   */
  available: number;
  /** Chargeable ÷ available; null when there are no days at all. */
  share: number | null;
}

/** The chargeability of one month. */
export interface MonthChargeability extends Chargeability {
  month: MonthKey;
  /** Whether the month is planned (the current month and later) rather than booked. */
  forecast: boolean;
}

export interface YearChargeability extends Chargeability {
  months: MonthChargeability[];
}

/** Chargeable ÷ available, or null for no available days. */
function shareOf(chargeable: number, available: number): number | null {
  return available > 0 ? chargeable / available : null;
}

/** Several months together, such as a year: the days summed, the share over the sums. */
export function sumChargeability(months: readonly Chargeability[]): Chargeability {
  const sum = (pick: (m: Chargeability) => number) =>
    months.reduce((total, m) => total + pick(m), 0);
  const days = sum((m) => m.days);
  const chargeable = sum((m) => m.chargeable);
  const available = sum((m) => m.available);
  return {
    days,
    workingDays: sum((m) => m.workingDays),
    chargeable,
    available,
    share: days ? shareOf(chargeable, available) : null,
  };
}

/**
 * Chargeability per month of a year: chargeable days divided by the working days (Monday to
 * Friday without public holidays) less the out-of-office days and the days on neutral projects.
 * All available days on chargeable projects make 100 %; non-chargeable days lower it, neutral
 * days don't count at all (user, 2026-11-11). Months before `currentMonth` use the booked days;
 * from it on, the planned days, whatever is booked in them already.
 */
export function chargeabilityByMonth(
  year: number,
  projects: readonly Project[],
  bookingsOf: (orderId: string) => OrderBookings,
  holidays: DaysOff,
  currentMonth: MonthKey,
): YearChargeability {
  const keys = monthsOfYear(year);
  const chargeable = keys.map(() => 0);
  const absent = keys.map(() => 0);
  const neutral = keys.map(() => 0);
  const all = keys.map(() => 0);
  for (const project of projects) {
    for (const order of project.orders) {
      const booked = bookingsOf(order.id);
      keys.forEach((month, i) => {
        const past = month < currentMonth;
        const days = past
          ? (booked.byMonth.get(month) ?? 0)
          : runsIn(order, month)
            ? (order.forecast[month] ?? 0)
            : 0;
        if (!days) return;
        // Booked days count where they were worked; planned days where the order is.
        const away = past ? awayInMonth(order, booked, month) : order.location === 'ooo' ? days : 0;
        all[i] += days;
        absent[i] += away;
        if (project.billing === 'chargeable') chargeable[i] += days - away;
        if (project.billing === 'neutral') neutral[i] += days - away;
      });
    }
  }
  const months = keys.map((month, i): MonthChargeability => {
    const working = workingDays(year, i, holidays);
    const available = Math.max(0, working - absent[i] - neutral[i]);
    return {
      month,
      forecast: month >= currentMonth,
      days: all[i],
      workingDays: working,
      chargeable: chargeable[i],
      available,
      share: all[i] ? shareOf(chargeable[i], available) : null,
    };
  });
  return { months, ...sumChargeability(months) };
}
