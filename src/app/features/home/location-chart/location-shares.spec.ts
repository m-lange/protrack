import { order, project } from '../../../testing/fake-database';
import { locationShares, shareOf } from './location-shares';

describe('locationShares', () => {
  const projects = [
    project('p', 'c', [
      order('on', '2026-01-01', '2026-12-31', { location: 'onsite' }),
      order('ho', '2026-01-01', '2026-12-31', { location: 'home' }),
      order('away', '2026-01-01', '2026-12-31', { location: 'ooo' }),
    ]),
  ];

  it('sums booked days per location per month and year, work apart from out of office', () => {
    const shares = locationShares(2026, projects, [
      { id: '1', orderId: 'on', date: '2026-03-02', days: 1 },
      { id: '2', orderId: 'ho', date: '2026-03-03', days: 3 },
      { id: '3', orderId: 'ho', date: '2026-04-01', days: 1 },
      { id: '4', orderId: 'away', date: '2026-04-02', days: 2 },
      { id: '5', orderId: 'on', date: '2025-12-31', days: 1 }, // last year
    ]);
    expect(shares.months[2]).toEqual({
      days: { onsite: 1, reply: 0, home: 3, ooo: 0 },
      work: 4,
      total: 4,
    });
    expect(shares.months[3]).toEqual({
      days: { onsite: 0, reply: 0, home: 1, ooo: 2 },
      work: 1,
      total: 3,
    });
    expect(shares.months[0].total).toBe(0);
    expect(shares.year).toEqual({
      days: { onsite: 1, reply: 0, home: 4, ooo: 2 },
      work: 5,
      total: 7,
    });
  });

  it('takes the shares of the work days only', () => {
    const shares = locationShares(2026, projects, [
      { id: '1', orderId: 'on', date: '2026-04-01', days: 1 },
      { id: '2', orderId: 'ho', date: '2026-04-02', days: 3 },
      { id: '3', orderId: 'away', date: '2026-04-03', days: 4 },
    ]);
    expect(shareOf(shares.months[3], 'onsite')).toBe(0.25);
    expect(shareOf(shares.months[3], 'home')).toBe(0.75);
    expect(shareOf(shares.months[0], 'reply')).toBe(0);
  });

  it('counts a booked day where it was worked when it has a location of its own', () => {
    const shares = locationShares(2026, projects, [
      { id: '1', orderId: 'on', date: '2026-03-02', days: 1, location: 'home' },
      { id: '2', orderId: 'on', date: '2026-03-03', days: 1, location: 'ooo' },
      { id: '3', orderId: 'on', date: '2026-03-04', days: 1 },
    ]);
    expect(shares.months[2]).toEqual({
      days: { onsite: 1, reply: 0, home: 1, ooo: 1 },
      work: 2,
      total: 3,
    });
  });
});
