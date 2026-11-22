import {
  elapsedPercent,
  isIsoDay,
  isMonthKey,
  isoDate,
  monthKey,
  monthOf,
  monthsOfYear,
  parseIsoDate,
} from './months';

describe('months', () => {
  it('writes and reads ISO dates in local time', () => {
    expect(isoDate(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(isoDate(parseIsoDate('2026-12-31'))).toBe('2026-12-31');
    expect(parseIsoDate('2026-03-01').getHours()).toBe(0);
  });

  it.each([
    ['2026-11-07', true],
    ['2028-02-29', true],
    ['2026-02-29', false],
    ['2026-02-30', false],
    ['2026-13-01', false],
    ['2026-00-10', false],
    ['2026-1-7', false],
    ['2026-11-07T10:00:00Z', false],
    ['', false],
    [20261107, false],
    [null, false],
  ])('takes %s for a real day: %s', (value, real) => {
    expect(isIsoDay(value)).toBe(real);
  });

  it.each([
    ['2026-01', true],
    ['2026-12', true],
    ['2026-00', false],
    ['2026-13', false],
    ['2026-1', false],
    ['2026-11-07', false],
    [202611, false],
  ])('takes %s for a month: %s', (value, real) => {
    expect(isMonthKey(value)).toBe(real);
  });

  it('names months as YYYY-MM, from a date, an ISO date or a year', () => {
    expect(monthKey(2026, 0)).toBe('2026-01');
    expect(monthOf(new Date(2026, 11, 31))).toBe('2026-12');
    expect(monthOf('2026-09-14')).toBe('2026-09');
    expect(monthsOfYear(2026)).toHaveLength(12);
    expect(monthsOfYear(2026).at(0)).toBe('2026-01');
    expect(monthsOfYear(2026).at(-1)).toBe('2026-12');
  });

  it('says how much of a date range has passed, both days included', () => {
    const elapsed = (today: Date) => elapsedPercent('2026-11-01', '2026-11-10', today);
    expect(elapsed(new Date(2026, 9, 31))).toBe(0);
    // The first day counts once it has begun: one day of ten.
    expect(elapsed(new Date(2026, 10, 1))).toBe(10);
    expect(elapsed(new Date(2026, 10, 5, 23, 59))).toBe(50);
    expect(elapsed(new Date(2026, 10, 10))).toBe(100);
    expect(elapsed(new Date(2027, 0, 1))).toBe(100);
  });
});
