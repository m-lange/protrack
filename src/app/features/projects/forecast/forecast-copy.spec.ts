import { customer, order, project } from '../../../testing/fake-database';
import { forecastCopy } from './forecast-copy';

describe('forecastCopy', () => {
  const texts = {
    project: 'Project',
    row: (name: string, place: 'onsite' | 'remote') => `${name} › ${place}`,
    month: (month: string) => month,
  };

  it('copies the planned days of this month and the next two per project, on-site and remote', () => {
    const copy = forecastCopy(
      [customer('Silberbach Bank', 's', 0)],
      [
        project('risk', 's', [
          order('a', '2026-01-01', '2027-03-31', {
            forecast: { '2026-10': 4, '2026-11': 2.5, '2026-12': 3, '2027-01': 9 },
          }),
          order('b', '2026-01-01', '2026-11-30', {
            location: 'home',
            forecast: { '2026-10': 1, '2026-11': 1, '2026-12': 5 },
          }),
          order('c', '2026-01-01', '2027-12-31', { location: 'reply', forecast: { '2026-12': 2 } }),
          order('d', '2026-01-01', '2027-12-31', { location: 'ooo', forecast: { '2026-10': 3 } }),
        ]),
        project(
          'old',
          's',
          [order('e', '2026-01-01', '2026-12-31', { forecast: { '2026-10': 5 } })],
          {
            status: 'completed',
          },
        ),
      ],
      new Date(2026, 9, 16),
      texts,
    )!;
    const table = new DOMParser().parseFromString(copy.html, 'text/html').querySelector('table')!;
    const cells = [...table.querySelectorAll('tr')].map((tr) =>
      [...tr.children].map((cell) => cell.textContent),
    );
    // Order "b" ends in November, so its December days don't count; out of office is left out.
    expect(cells).toEqual([
      ['Project', '2026-10', '2026-11', '2026-12'],
      ['risk › onsite', '4', '2.5', '3'],
      ['risk › remote', '1', '1', '2'],
    ]);
    // The month columns are centered and share one width, enough for the longest text
    // ("2026-10", 7 characters).
    const days = [...table.querySelectorAll<HTMLElement>('th + th, td + td')];
    expect(new Set(days.map((cell) => cell.getAttribute('align')))).toEqual(new Set(['center']));
    expect(new Set(days.map((cell) => cell.style.width))).toEqual(new Set(['4.6em']));
    expect(copy.text.split('\n')[1]).toBe('risk › onsite\t4\t2.5\t3');
  });

  it('stays in the current year: in November only November and December', () => {
    const copy = forecastCopy(
      [customer('Silberbach Bank', 's', 0)],
      [
        project('risk', 's', [
          order('a', '2026-01-01', '2027-12-31', { forecast: { '2026-12': 1, '2027-01': 2 } }),
        ]),
      ],
      new Date(2026, 10, 16),
      texts,
    )!;
    expect(copy.text).toBe('Project\t2026-11\t2026-12\nrisk › onsite\t0\t1');
  });

  it('copies nothing without planned days', () => {
    expect(forecastCopy([], [], new Date(2026, 10, 16), texts)).toBeNull();
  });
});
