import { order, project } from '../../testing/fake-database';
import { holidaysOfYear } from '../../shared/dates/holidays';
import { buildYear, entriesByDate } from './year-calendar';

describe('year calendar', () => {
  const projects = [
    project('risk', 's', [order('mapping', '2026-01-01', '2026-12-31')], { color: 'indigo' }),
    project('warehouse', 's', [order('wh', '2026-01-01', '2026-12-31')], { color: 'orange' }),
    project('vacation', 's', [order('away', '2026-01-01', '2026-12-31', { location: 'ooo' })]),
  ];
  const holidays = holidaysOfYear(2026, 'HB');
  const today = new Date(2026, 10, 6);

  function year(bookings: { orderId: string; date: string; days: number }[]) {
    const withIds = bookings.map((b, i) => ({ id: `b${i}`, ...b }));
    return buildYear(2026, holidays, entriesByDate(2026, withIds, projects), today);
  }

  const day = (months: ReturnType<typeof year>, iso: string) =>
    months[Number(iso.slice(5, 7)) - 1].days[Number(iso.slice(8)) - 1];

  it('lays every month out in six Monday-first weeks', () => {
    const months = year([]);
    expect(months).toHaveLength(12);
    // May 1, 2026 is a Friday: four blank cells before it.
    expect(months[4].leading).toBe(4);
    for (const m of months) expect(m.leading + m.days.length + m.trailing).toBe(42);
  });

  it('marks weekends, named holidays, free days and today', () => {
    const months = year([]);
    expect(day(months, '2026-05-02').kind).toBe('weekend');
    expect(day(months, '2026-05-01')).toMatchObject({ kind: 'holiday', holiday: 'labourDay' });
    expect(day(months, '2026-10-31').holiday).toBe('reformation'); // Bremen
    expect(day(months, '2026-05-08').kind).toBe('free');
    expect(day(months, '2026-11-06').today).toBe(true);
  });

  it('colors booked days by project, splits shared days and hatches absence', () => {
    const months = year([
      { orderId: 'mapping', date: '2026-11-02', days: 1 },
      { orderId: 'mapping', date: '2026-11-03', days: 0.25 },
      { orderId: 'wh', date: '2026-11-03', days: 0.75 },
      { orderId: 'away', date: '2026-08-03', days: 1 },
      { orderId: 'away', date: '2026-11-04', days: 0.5 },
      { orderId: 'mapping', date: '2026-11-04', days: 0.5 },
      { orderId: 'mapping', date: '2025-11-04', days: 1 },
    ]);
    expect(day(months, '2026-11-02')).toMatchObject({ kind: 'booked', colors: ['indigo'] });
    // The larger share comes first.
    expect(day(months, '2026-11-03')).toMatchObject({
      kind: 'split',
      colors: ['orange', 'indigo'],
    });
    expect(day(months, '2026-08-03').kind).toBe('vacation');
    // Work wins over absence; the absence stays among the entries.
    expect(day(months, '2026-11-04').kind).toBe('booked');
    expect(day(months, '2026-11-04').entries.map((e) => e.name)).toEqual(['risk', 'vacation']);
    // Work and absence are summed apart; other years are left out.
    expect(months[10]).toMatchObject({ booked: 2.5, absent: 0.5 });
    expect(months[7]).toMatchObject({ booked: 0, absent: 1 });
  });
});
