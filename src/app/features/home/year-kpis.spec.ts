import { Booking } from '../../core/data/model';
import { publicHolidays } from '../../shared/dates/holidays';
import { order, project } from '../../testing/fake-database';
import { yearKpis } from './year-kpis';

describe('yearKpis', () => {
  const projects = [
    project('client', 'c', [
      order('c', '2026-01-01', '2026-06-30', { forecast: { '2026-01': 3, '2026-02': 10 } }),
    ]),
    project('internal', 'c', [order('n', '2026-01-01', '2026-12-31', { location: 'home' })], {
      billing: 'nonChargeable',
    }),
    project('absence', 'c', [
      order('v', '2026-01-01', '2026-12-31', {
        location: 'ooo',
        forecast: { '2026-01': 5 },
      }),
    ]), // billing chargeable on purpose: out of office never counts as chargeable
  ];
  let id = 0;
  const book = (orderId: string, date: string, days: number): Booking => ({
    id: String(id++),
    orderId,
    date,
    days,
  });
  const bookings = [
    book('c', '2025-12-30', 1), // last year
    book('c', '2026-01-02', 1),
    book('c', '2026-01-05', 1),
    book('c', '2026-01-06', 0.5),
    book('n', '2026-01-06', 0.5),
    book('v', '2026-01-07', 1),
    book('v', '2026-01-08', 1),
    book('c', '2026-01-20', 1), // after today
    book('gone', '2026-01-05', 1), // order deleted
  ];
  const holidays = publicHolidays(2026, null);

  // 2026 has 254 working days without the nationwide holidays.
  const yearWorkingDays = 254;

  // January 2026 has 21 working days without the nationwide holidays (Jan 1 is one).
  const januaryWorkingDays = 21;

  it('works out chargeable days booked, the year-end forecast and chargeability', () => {
    // Friday, January 9; the last booked day is Thursday, January 8. Jan 1 is a holiday, so
    // Jan 2 and Jan 5–8 are 5 working days.
    const kpis = yearKpis(2026, projects, bookings, holidays, new Date(2026, 0, 9));
    // Chargeability runs to January 31: 3.5 chargeable days on c (the one on Jan 20 too; n is
    // non-chargeable) of 21 working days less 2 out of office.
    const charge = { share: 3.5 / 19, chargeable: 3.5, available: januaryWorkingDays - 2 };
    expect(kpis.chargeability).toEqual(charge);
    // Booked counts up to today: 2.5 chargeable days; its tile shares chargeability's color.
    expect(kpis.booked).toEqual({ days: 2.5, share: charge.share });
    // January: c has 3.5 booked over 3 planned (n's 0.5 isn't chargeable); February: c 10
    // planned. Out of office in January: 5 planned over 2 booked.
    expect(kpis.forecast).toEqual({
      total: 13.5,
      booked: 2.5,
      planned: 11,
      share: 13.5 / (yearWorkingDays - 5),
    });
  });

  it('takes a past year as booked, without plans', () => {
    const kpis = yearKpis(2026, projects, bookings, holidays, new Date(2027, 2, 1));
    // Chargeability takes the whole past year: 254 working days less 2 out of office.
    const yearAvailable = yearWorkingDays - 2;
    // 3.5 chargeable days on c; n's 0.5 days are non-chargeable.
    expect(kpis.booked).toEqual({ days: 3.5, share: 3.5 / yearAvailable });
    expect(kpis.forecast).toEqual({
      total: 3.5,
      booked: 3.5,
      planned: 0,
      share: 3.5 / yearAvailable,
    });
    expect(kpis.chargeability).toEqual({
      share: 3.5 / yearAvailable,
      chargeable: 3.5,
      available: yearAvailable,
    });
  });

  it('leaves days on neutral projects out of the available days', () => {
    const withNeutral = [
      ...projects,
      project('training', 'c', [order('t', '2026-01-01', '2026-12-31')], { billing: 'neutral' }),
    ];
    // January's 21 working days less 2 out of office and 1 neutral leave 18 available.
    const kpis = yearKpis(
      2026,
      withNeutral,
      [...bookings, book('t', '2026-01-08', 1)],
      holidays,
      new Date(2026, 0, 9),
    );
    expect(kpis.chargeability).toEqual({ share: 3.5 / 18, chargeable: 3.5, available: 18 });
    // The neutral day is no chargeable day either.
    expect(kpis.booked?.days).toBe(2.5);
  });

  it('runs chargeability to the end of the current month, days without bookings included', () => {
    // Tuesday, February 10: January's 21 and February's 20 working days, less 2 out of office.
    // Nothing is booked in February; its days count as non-chargeable.
    const kpis = yearKpis(2026, projects, bookings, holidays, new Date(2026, 1, 10));
    expect(kpis.chargeability).toEqual({ share: 3.5 / 39, chargeable: 3.5, available: 39 });
  });

  it('has no chargeability for a year still to come', () => {
    const kpis = yearKpis(2027, projects, bookings, holidays, new Date(2026, 10, 11));
    expect(kpis.chargeability).toBeNull();
  });

  it('has no figures without bookings and plans', () => {
    const kpis = yearKpis(2026, [], [], holidays, new Date(2026, 0, 9));
    expect(kpis.booked).toBeNull();
    expect(kpis.forecast).toBeNull();
    expect(kpis.chargeability).toBeNull();
  });

  it('has a forecast from plans alone', () => {
    const kpis = yearKpis(2026, projects, [], holidays, new Date(2026, 0, 9));
    expect(kpis.booked).toBeNull();
    expect(kpis.forecast).toEqual({
      total: 13,
      booked: 0,
      planned: 13,
      share: 13 / (yearWorkingDays - 5),
    });
    expect(kpis.chargeability).toBeNull();
  });
});
