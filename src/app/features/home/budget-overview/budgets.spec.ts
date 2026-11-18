import { OrderBookings } from '../../../core/data/booking-store';
import { customer, order, project } from '../../../testing/fake-database';
import { budgetRows } from './budgets';

describe('budgetRows', () => {
  const booked: Record<string, number> = { a1: 10, a2: 5, b1: 50, c1: 7, c2: 3 };
  const bookingsOf = (id: string): OrderBookings => ({
    total: booked[id] ?? 0,
    byMonth: new Map(),
  });

  it('sums budgets and bookings per active project, scaled to the largest', () => {
    const rows = budgetRows(
      2026,
      [customer('Zeta', 'z', 0), customer('Alpha', 'a', 1)],
      [
        project('beta', 'a', [order('b1', '2026-01-01', '2026-12-31', { budget: 40 })]),
        project('alpha', 'z', [
          order('a1', '2026-01-01', '2026-06-30', { budget: 20 }),
          order('a2', '2026-07-01', '2026-12-31', { budget: 20 }),
        ]),
        project('old', 'z', [order('o1', '2025-01-01', '2025-12-31')], { status: 'completed' }),
      ],
      bookingsOf,
    );
    // By customer order (Zeta first), completed projects left out.
    expect(rows.map((r) => [r.name, r.customer, r.budget, r.booked, r.remaining])).toEqual([
      ['alpha', 'Zeta', 40, 15, 25],
      ['beta', 'Alpha', 40, 50, -10],
    ]);
    // The largest is beta's 50 booked days.
    expect(rows[0]).toMatchObject({ budgetWidth: 80, bookedWidth: 30 });
    expect(rows[1]).toMatchObject({ budgetWidth: 80, bookedWidth: 100 });
  });

  it('counts only the orders that run in the year and leaves out projects without one', () => {
    const rows = budgetRows(
      2026,
      [customer('Alpha', 'a', 0)],
      [
        project('gamma', 'a', [
          order('c1', '2025-01-01', '2025-12-31', { budget: 30 }),
          order('c2', '2025-11-01', '2026-02-28', { budget: 10 }),
        ]),
        project('past', 'a', [order('p1', '2024-01-01', '2025-12-31', { budget: 20 })]),
      ],
      bookingsOf,
    );
    expect(rows.map((r) => [r.name, r.budget, r.booked, r.remaining])).toEqual([
      ['gamma', 10, 3, 7],
    ]);
  });
});
