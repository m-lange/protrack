import { monthOf } from '../../shared/dates/months';
import { Booking, Location, MonthKey, Order } from './model';

/**
 * The timeline of orders in one place. Orders of open-booking projects have none: they take
 * bookings and plans on any day, and they have no budget.
 */

/** A date range of ISO dates, both days included. */
export interface Timeline {
  start: string;
  end: string;
}

/** The order's timeline, or null for an order without one. */
export function timelineOf(order: Order): Timeline | null {
  return order.start !== null && order.end !== null ? { start: order.start, end: order.end } : null;
}

/** Whether an order takes days on a date (ISO): inside its timeline, or any day without one. */
export function runsOn(order: Order, date: string): boolean {
  const timeline = timelineOf(order);
  return !timeline || (timeline.start <= date && date <= timeline.end);
}

/** Whether an order runs at least one day from `first` to `last` (ISO dates). */
export function runsBetween(order: Order, first: string, last: string): boolean {
  const timeline = timelineOf(order);
  return !timeline || (timeline.start <= last && timeline.end >= first);
}

/** Whether an order runs at least one day of a month (`YYYY-MM`). */
export function runsIn(order: Order, month: MonthKey): boolean {
  const timeline = timelineOf(order);
  return !timeline || (monthOf(timeline.start) <= month && month <= monthOf(timeline.end));
}

/** Sorts orders by start date, then by name; orders without a timeline by name. */
export function compareOrders(a: Order, b: Order): number {
  return (a.start ?? '').localeCompare(b.start ?? '') || a.name.localeCompare(b.name);
}

/** Where a booked day was worked: the booking's own location, else its order's. */
export function locationOf(
  booking: Pick<Booking, 'location'>,
  order: Pick<Order, 'location'>,
): Location {
  return booking.location ?? order.location;
}
