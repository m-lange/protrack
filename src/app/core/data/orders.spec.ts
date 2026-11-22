import { openOrder, order, project } from '../../testing/fake-database';
import {
  compareOrders,
  locationOf,
  ordersById,
  runsBetween,
  runsIn,
  runsOn,
  timelineOf,
} from './orders';

describe('orders', () => {
  const phase = order('phase', '2026-09-14', '2026-12-18');
  const open = openOrder('open');

  it('gives an order its timeline, an open-booking order none', () => {
    expect(timelineOf(phase)).toEqual({ start: '2026-09-14', end: '2026-12-18' });
    expect(timelineOf(open)).toBeNull();
  });

  it('runs on its first and last day, not the days around them', () => {
    expect(runsOn(phase, '2026-09-13')).toBe(false);
    expect(runsOn(phase, '2026-09-14')).toBe(true);
    expect(runsOn(phase, '2026-12-18')).toBe(true);
    expect(runsOn(phase, '2026-12-19')).toBe(false);
    expect(runsOn(open, '2031-01-01')).toBe(true);
  });

  it('runs between two dates when one day of the range lies in its timeline', () => {
    expect(runsBetween(phase, '2026-01-01', '2026-09-13')).toBe(false);
    expect(runsBetween(phase, '2026-01-01', '2026-09-14')).toBe(true);
    expect(runsBetween(phase, '2026-12-18', '2027-12-31')).toBe(true);
    expect(runsBetween(phase, '2026-12-19', '2027-12-31')).toBe(false);
    expect(runsBetween(open, '2031-01-01', '2031-01-01')).toBe(true);
  });

  it('runs in the months of its first and last day, and in no month around them', () => {
    expect(runsIn(phase, '2026-08')).toBe(false);
    expect(runsIn(phase, '2026-09')).toBe(true);
    expect(runsIn(phase, '2026-12')).toBe(true);
    expect(runsIn(phase, '2027-01')).toBe(false);
    expect(runsIn(open, '2031-01')).toBe(true);
  });

  it('sorts by start date, then by name; orders without a timeline by name', () => {
    const orders = [
      order('b', '2026-09-01', '2026-09-30'),
      order('c', '2026-03-01', '2026-03-31'),
      order('a', '2026-09-01', '2026-12-31'),
    ];
    expect(orders.sort(compareOrders).map((o) => o.id)).toEqual(['c', 'a', 'b']);
    expect([openOrder('y'), openOrder('x')].sort(compareOrders).map((o) => o.id)).toEqual([
      'x',
      'y',
    ]);
  });

  it('takes a booking’s own location before its order’s', () => {
    expect(locationOf({}, phase)).toBe('onsite');
    expect(locationOf({ location: 'home' }, phase)).toBe('home');
  });

  it('finds every order by its id, with its project', () => {
    const website = project('website', 'c', [phase]);
    const internal = project('internal', 'c', [open]);
    const orders = ordersById([website, internal]);
    expect([...orders.keys()]).toEqual(['phase', 'open']);
    expect(orders.get('open')).toEqual({ project: internal, order: open });
  });
});
