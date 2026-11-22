import { OrderBookings } from '../../../core/data/booking-store';
import { Booking } from '../../../core/data/model';
import { monthOf } from '../../../shared/dates/months';
import { order, project } from '../../../testing/fake-database';
import { trends } from './trends';

describe('trends', () => {
  const projects = [
    project('client', 'c', [order('work', '2025-01-01', '2026-12-31', { location: 'onsite' })]),
    project('internal', 'c', [order('admin', '2025-01-01', '2026-12-31', { location: 'home' })], {
      billing: 'nonChargeable',
    }),
  ];
  const bookings: Booking[] = [
    { id: '1', orderId: 'work', date: '2025-11-03', days: 10 },
    { id: '2', orderId: 'admin', date: '2025-11-04', days: 10 },
    { id: '3', orderId: 'work', date: '2026-01-05', days: 5 },
    { id: '4', orderId: 'work', date: '2026-02-02', days: 1 }, // in the current month
  ];
  const bookingsOf = (orderId: string): OrderBookings => {
    const byMonth = new Map<string, number>();
    let total = 0;
    for (const b of bookings.filter((b) => b.orderId === orderId)) {
      byMonth.set(monthOf(b.date), (byMonth.get(monthOf(b.date)) ?? 0) + b.days);
      total += b.days;
    }
    return { total, byMonth };
  };
  const settings = { region: null, yearEndDaysOff: 50 };

  it('runs from the first booked month to the month before the current one, over the years', () => {
    // Today is in February 2026: the charts end with January.
    const result = trends(projects, bookings, bookingsOf, settings, new Date(2026, 1, 10))!;
    expect(result.months.map((m) => m.key)).toEqual(['2025-11', '2025-12', '2026-01']);
    // November 2025: 20 working days (no nationwide holiday), 10 chargeable.
    expect(result.chargeability[0]).toBe(10 / 20);
    // December 2025 has no booking: its available days count as non-chargeable.
    expect(result.chargeability[1]).toBe(0);
    // January 2026: 21 working days, 5 chargeable.
    expect(result.chargeability[2]).toBe(5 / 21);
  });

  it('takes each work location’s share of the work days, none in a month without work', () => {
    const result = trends(projects, bookings, bookingsOf, settings, new Date(2026, 1, 10))!;
    expect(result.locations.onsite).toEqual([0.5, null, 1]);
    expect(result.locations.home).toEqual([0.5, null, 0]);
    expect(result.locations.reply).toEqual([0, null, 0]);
  });

  it('is null without bookings before the current month', () => {
    expect(trends(projects, [], bookingsOf, settings, new Date(2026, 1, 10))).toBeNull();
    // In November 2025 the first booking is in the current month: nothing to show yet.
    expect(trends(projects, bookings, bookingsOf, settings, new Date(2025, 10, 20))).toBeNull();
  });
});
