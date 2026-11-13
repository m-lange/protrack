import { order, project } from '../testing/fake-database';
import { publicHolidays } from '../shared/dates/holidays';
import { OrderBookings } from './data/booking-store';
import { chargeabilityByMonth, sumChargeability, targetStatus } from './chargeability';

describe('targetStatus', () => {
  it('is met at the target, near up to 10 points below, below further down', () => {
    expect(targetStatus(0.8, 80)).toBe('met');
    expect(targetStatus(0.795, 80)).toBe('met'); // shown as 80%
    expect(targetStatus(0.79, 80)).toBe('near');
    expect(targetStatus(0.7, 80)).toBe('near');
    expect(targetStatus(0.69, 80)).toBe('below');
  });
});

describe('chargeabilityByMonth', () => {
  const projects = [
    project('client', 'c', [
      order('work', '2026-10-01', '2026-12-31', { forecast: { '2026-11': 8, '2026-12': 4 } }),
    ]),
    project('leave', 'c', [
      order('away', '2026-01-01', '2026-12-31', { location: 'ooo', forecast: { '2026-12': 2 } }),
    ]),
  ];
  const booked: Record<string, [string, number][]> = {
    work: [
      ['2026-10', 11],
      ['2026-11', 3],
    ],
    away: [['2026-10', 1]],
  };
  const bookingsOf = (id: string): OrderBookings => {
    const byMonth = new Map(booked[id] ?? []);
    return { total: [...byMonth.values()].reduce((a, b) => a + b, 0), byMonth };
  };

  it('uses bookings before the current month and the forecast from it on', () => {
    const charge = chargeabilityByMonth(
      2026,
      projects,
      bookingsOf,
      publicHolidays(2026, null),
      '2026-11',
    );
    const [oct, nov, dec] = charge.months.slice(9);
    // October: 22 working days less 1 out of office.
    expect(oct).toMatchObject({ forecast: false, chargeable: 11, available: 21, share: 11 / 21 });
    // November counts its 8 planned days, not the 3 booked so far.
    expect(nov).toMatchObject({ forecast: true, chargeable: 8, available: 21, share: 8 / 21 });
    // December: 22 working days (Christmas on Friday) less 2 planned out of office.
    expect(dec).toMatchObject({ forecast: true, chargeable: 4, available: 20 });
    expect(charge.months[0].share).toBeNull();
    // The year: 254 working days less 3 out of office.
    expect(charge.share).toBe(23 / 251);
  });

  it('leaves neutral days out and counts non-chargeable days against it', () => {
    // October 2026 has 22 working days. 11 chargeable, 5 non-chargeable, 6 neutral.
    const mixed = [
      project('client', 'c', [order('work', '2026-10-01', '2026-10-31')]),
      project('internal', 'c', [order('admin', '2026-10-01', '2026-10-31')], {
        billing: 'nonChargeable',
      }),
      project('training', 'c', [order('learn', '2026-10-01', '2026-10-31')], {
        billing: 'neutral',
      }),
    ];
    const days: Record<string, number> = { work: 11, admin: 5, learn: 6 };
    const charge = chargeabilityByMonth(
      2026,
      mixed,
      (id) => ({ total: days[id], byMonth: new Map([['2026-10', days[id]]]) }),
      publicHolidays(2026, null),
      '2026-11',
    );
    // 22 working days less 6 neutral: 16 available, of which 11 chargeable.
    expect(charge.months[9]).toMatchObject({ chargeable: 11, available: 16, share: 11 / 16 });
  });

  it('is 100 % when every available day is booked chargeable, whatever is neutral', () => {
    const mixed = [
      project('client', 'c', [order('work', '2026-10-01', '2026-10-31')]),
      project('training', 'c', [order('learn', '2026-10-01', '2026-10-31')], {
        billing: 'neutral',
      }),
    ];
    const days: Record<string, number> = { work: 16, learn: 6 };
    const charge = chargeabilityByMonth(
      2026,
      mixed,
      (id) => ({ total: days[id], byMonth: new Map([['2026-10', days[id]]]) }),
      publicHolidays(2026, null),
      '2026-11',
    );
    expect(charge.months[9].share).toBe(1);
  });

  it('counts booked days out of office where a booking has that location of its own', () => {
    const charge = chargeabilityByMonth(
      2026,
      projects,
      (id) => ({
        ...bookingsOf(id),
        ownLocation: new Map(id === 'work' ? [['2026-10', { away: 1, work: 0 }]] : []),
      }),
      publicHolidays(2026, null),
      '2026-11',
    );
    // October: of the 11 days on the client, 1 was out of office; with leave, 2 days away.
    expect(charge.months[9]).toMatchObject({ chargeable: 10, available: 20, days: 12 });
  });
});

describe('sumChargeability', () => {
  it('sums the days and takes the share over the sums', () => {
    const month = (days: number, chargeable: number, available: number) => ({
      days,
      workingDays: 20,
      chargeable,
      available,
      share: null,
    });
    expect(sumChargeability([month(10, 8, 20), month(5, 4, 18)])).toEqual({
      days: 15,
      workingDays: 40,
      chargeable: 12,
      available: 38,
      share: 12 / 38,
    });
    expect(sumChargeability([month(0, 0, 20)]).share).toBeNull();
  });
});
