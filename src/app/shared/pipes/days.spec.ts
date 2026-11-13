import { formatDays, formatHours, parseDays, parseHours } from './days';

describe('days and hours', () => {
  it('shows days with up to two decimals, or fewer', () => {
    expect(formatDays(2.125)).toBe('2.13');
    expect(formatDays(2.125, 1)).toBe('2.1');
    expect(formatDays(2.96, 1)).toBe('3');
    expect(formatDays(-1.26, 1)).toBe('−1.3');
    expect(formatDays(-0.04, 1)).toBe('0');
  });

  it('reads days in steps', () => {
    expect(parseDays('6,3')).toBe(6.25);
    expect(parseDays('12.345', 0.01)).toBe(12.35);
    expect(parseDays('')).toBeNull();
    expect(parseDays('-1')).toBeUndefined();
  });

  it('reads hours, rounded up to half hours, as days', () => {
    expect(parseHours('8')).toBe(1);
    expect(parseHours('7,2')).toBe(7.5 / 8);
    expect(parseHours('7.6')).toBe(1);
    expect(parseHours('4.5')).toBe(4.5 / 8);
    expect(parseHours(' ')).toBeNull();
    expect(parseHours('lots')).toBeUndefined();
  });

  it('shows days as hours', () => {
    expect(formatHours(1.5)).toBe('12');
    expect(formatHours(0.5625)).toBe('4.5');
  });
});
