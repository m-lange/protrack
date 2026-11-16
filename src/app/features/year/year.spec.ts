import { TestBed } from '@angular/core/testing';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from '../../app.routes';
import { BookingStore } from '../../core/data/booking-store';
import { ProjectStore } from '../../core/data/project-store';
import { SettingsStore } from '../../core/data/settings-store';
import { SelectedYear } from '../../core/selected-year';
import { TODAY } from '../../core/today';
import { order, project, provideFakeDatabase } from '../../testing/fake-database';

describe('Year', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes, withComponentInputBinding()),
        provideFakeDatabase(),
        { provide: TODAY, useValue: new Date(2026, 10, 6) },
      ],
    });
    const settings = TestBed.inject(SettingsStore);
    settings.set({ ...settings.settings(), region: 'HB' });
    TestBed.inject(ProjectStore).set([
      project('Risk Data Platform', 's', [order('mapping', '2026-01-01', '2026-12-31')]),
      project('Vacation', 's', [order('away', '2026-01-01', '2026-12-31', { location: 'ooo' })]),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'mapping', date: '2026-11-02', days: 1 },
      { id: 'b2', orderId: 'mapping', date: '2026-11-03', days: 0.5 },
      { id: 'b3', orderId: 'away', date: '2026-08-03', days: 1 },
    ]);
  });

  async function open() {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/year');
    return { harness, element: harness.routeNativeElement! };
  }

  const dayTitled = (element: HTMLElement, start: string) =>
    [...element.querySelectorAll<HTMLElement>('.pt-day[title]')].find((d) =>
      d.title.startsWith(start),
    );

  it('shows twelve months of the selected year, each linked to its timesheet', async () => {
    const { element } = await open();
    expect(element.querySelector('.pt-page-sub')).toBeNull();
    expect(element.querySelector('.pt-legend')).toBeNull();
    const months = element.querySelectorAll('app-month-calendar');
    expect(months).toHaveLength(12);
    const november = months[10];
    const link = november.querySelector('a')!;
    expect(link.textContent).toBe('November');
    expect(link.getAttribute('href')).toBe('/timesheet/2026/11');
  });

  it('titles every day with its date and what it holds', async () => {
    const { element } = await open();
    expect(dayTitled(element, 'Mon, Nov 2, 2026')?.title).toBe(
      'Mon, Nov 2, 2026 · Risk Data Platform 1 d',
    );
    expect(dayTitled(element, 'Mon, Nov 2, 2026')?.classList).toContain('pt-day--booked');
    expect(dayTitled(element, 'Fri, May 1, 2026')?.title).toBe(
      'Fri, May 1, 2026 · Labour Day (holiday)',
    );
    expect(dayTitled(element, 'Mon, Aug 3, 2026')?.classList).toContain('pt-day--vacation');
    expect(dayTitled(element, 'Fri, Nov 6, 2026')?.title).toBe(
      'Fri, Nov 6, 2026 · Nothing booked (today)',
    );
    expect(dayTitled(element, 'Sat, Nov 7, 2026')?.title).toBe('Sat, Nov 7, 2026 · Weekend');
  });

  it('follows the year switcher', async () => {
    const { harness, element } = await open();
    TestBed.inject(SelectedYear).set(2025);
    await harness.fixture.whenStable();
    expect(element.querySelector('section')?.getAttribute('aria-label')).toBe('Calendar 2025');
    expect(dayTitled(element, 'Mon, Nov 3, 2025')?.title).toBe('Mon, Nov 3, 2025 · Nothing booked');
  });
});
