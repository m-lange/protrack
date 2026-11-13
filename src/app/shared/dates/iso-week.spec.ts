import { firstWeekOfMonth, isoWeek, mondayOfIsoWeek, weekOf } from './iso-week';

const day = (date: Date) => date.toDateString();

describe('weeks', () => {
  it('numbers weeks by ISO 8601', () => {
    expect(isoWeek(new Date(2026, 10, 6))).toBe(45);
    expect(isoWeek(new Date(2027, 0, 1))).toBe(53);
  });

  it('puts a week into the month of its Thursday', () => {
    // Oct 26 – Nov 1, 2026: Thursday Oct 29.
    expect(weekOf(new Date(2026, 10, 1))).toEqual({
      year: 2026,
      month: 10,
      week: 44,
      monday: new Date(2026, 9, 26),
    });
    // Dec 28, 2026 – Jan 3, 2027 is week 53 of 2026.
    expect(weekOf(new Date(2027, 0, 2))).toMatchObject({ year: 2026, month: 12, week: 53 });
  });

  it('finds the Monday of an ISO week, and no week 53 where there is none', () => {
    expect(day(mondayOfIsoWeek(2026, 45)!)).toBe(day(new Date(2026, 10, 2)));
    expect(day(mondayOfIsoWeek(2026, 1)!)).toBe(day(new Date(2025, 11, 29)));
    expect(mondayOfIsoWeek(2027, 53)).toBeUndefined();
    expect(mondayOfIsoWeek(2026, 0)).toBeUndefined();
  });

  it('finds the first week of a month', () => {
    expect(firstWeekOfMonth(2026, 11)).toMatchObject({ month: 11, week: 45 });
    expect(firstWeekOfMonth(2026, 10)).toMatchObject({ month: 10, week: 40 });
  });
});
