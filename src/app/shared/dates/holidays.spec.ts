import {
  daysOff,
  easterSunday,
  holidaysOfYear,
  publicHolidays,
  workingDays,
  workingDaysBetween,
} from './holidays';

describe('public holidays', () => {
  it('finds Easter Sunday', () => {
    expect(easterSunday(2026).toDateString()).toBe(new Date(2026, 3, 5).toDateString());
    expect(easterSunday(2027).toDateString()).toBe(new Date(2027, 2, 28).toDateString());
  });

  it('counts nationwide holidays without a state and adds the state’s own', () => {
    const nationwide = publicHolidays(2026, null);
    expect(nationwide.size).toBe(9);
    expect(nationwide.has('2026-04-03')).toBe(true); // Good Friday
    expect(nationwide.has('2026-05-25')).toBe(true); // Whit Monday
    expect(publicHolidays(2026, 'HB').has('2026-10-31')).toBe(true);
    expect(publicHolidays(2026, 'HE').has('2026-06-04')).toBe(true); // Corpus Christi
    expect(publicHolidays(2026, 'SN').has('2026-11-18')).toBe(true); // Repentance Day
  });

  it('counts the working days of a month', () => {
    // May 2026: 21 weekdays, less Labour Day, Ascension Day and Whit Monday.
    expect(workingDays(2026, 4, publicHolidays(2026, 'HB'))).toBe(18);
  });
});

describe('holidaysOfYear', () => {
  it('names each holiday, in date order', () => {
    const holidays = holidaysOfYear(2026, 'HB');
    expect(holidays.get('2026-05-01')).toBe('labourDay');
    expect(holidays.get('2026-10-31')).toBe('reformation');
    const dates = [...holidays.keys()];
    expect(dates).toEqual([...dates].sort());
  });

  it('counts December 24 and 31 as working days in part, as Settings say', () => {
    // December 2026: 23 weekdays less Christmas (Boxing Day is a Saturday); the 24th and 31st
    // are Thursdays.
    expect(workingDays(2026, 11, daysOff(2026, null, 0))).toBe(22);
    expect(workingDays(2026, 11, daysOff(2026, null, 50))).toBe(21);
    expect(workingDays(2026, 11, daysOff(2026, null, 100))).toBe(20);
    expect(workingDaysBetween('2026-12-21', '2026-12-24', daysOff(2026, null, 50))).toBe(3.5);
    // A whole set still counts each date as a full day off.
    expect(workingDays(2026, 11, publicHolidays(2026, null))).toBe(22);
  });
});
