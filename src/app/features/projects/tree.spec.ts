import { order } from '../../testing/fake-database';
import { orderForecast, spanOf, sumForecasts } from './tree';

describe('orderForecast', () => {
  const months = ['2026-09', '2026-10', '2026-11', '2026-12'];
  const booked = {
    total: 14,
    byMonth: new Map([
      ['2026-09', 6],
      ['2026-10', 5],
      ['2026-11', 3],
    ]),
  };

  it('shows bookings before the current month and the plan from it on', () => {
    const o = order('o', '2026-09-14', '2026-12-18', {
      budget: 30,
      forecast: { '2026-10': 99, '2026-11': 8, '2026-12': 6 },
    });
    const figures = orderForecast(o, booked, months, '2026-11');
    expect(figures.months).toEqual([6, 5, 8, 6]);
    expect(figures.total).toBe(25);
    // Booked before November (11) plus planned from November on (14).
    expect(figures.outlook).toBe(25);
    expect(figures.budget).toBe(30);
  });

  it('ignores plans outside the order timeline', () => {
    const o = order('o', '2026-09-01', '2026-11-30', { forecast: { '2026-12': 4 } });
    const figures = orderForecast(o, { total: 0, byMonth: new Map() }, months, '2026-11');
    expect(figures.months).toEqual([0, 0, 0, 0]);
    expect(figures.outlook).toBe(0);
  });

  it('adds rows up', () => {
    const a = { months: [1, 2], total: 3, budget: 10, outlook: 3 };
    const b = { months: [0.5, 0], total: 0.5, budget: 5, outlook: 1 };
    expect(sumForecasts([a, b], 2)).toEqual({
      months: [1.5, 2],
      total: 3.5,
      budget: 15,
      outlook: 4,
    });
  });
});

describe('spanOf', () => {
  it('spans from the earliest start to the latest end', () => {
    expect(
      spanOf([
        { start: '2026-10-19', end: '2026-12-18' },
        { start: '2026-09-14', end: '2026-12-04' },
      ]),
    ).toEqual({ start: '2026-09-14', end: '2026-12-18' });
    expect(spanOf([])).toBeNull();
  });
});
