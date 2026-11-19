import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingStore } from '../../core/data/booking-store';
import { defaultSettings } from '../../core/data/model';
import { ProjectStore } from '../../core/data/project-store';
import { SettingsStore } from '../../core/data/settings-store';
import { SelectedYear } from '../../core/selected-year';
import { TODAY } from '../../core/today';
import { order, project, provideFakeDatabase } from '../../testing/fake-database';
import { Home } from './home';

describe('Home', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Home],
      providers: [
        provideRouter([]),
        provideFakeDatabase(),
        { provide: TODAY, useValue: new Date(2026, 10, 6) },
      ],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(Home);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const tiles = () => [...element.querySelectorAll('.pt-kpi')];
    const values = () => tiles().map((e) => e.querySelector('.pt-kpi__value')?.textContent?.trim());
    const targets = () => tiles().map((e) => e.getAttribute('data-target'));
    const titles = () => tiles().map((e) => e.getAttribute('title'));
    return { fixture, element, values, targets, titles };
  }

  it('shows the year at a glance with empty KPIs as dashes', async () => {
    const { element, values, targets } = await render();
    expect(element.querySelector('.pt-page-sub')).toBeNull();
    expect(element.querySelector('.pt-kpi__label')?.textContent).toBe('Booked 2026');
    expect(values()).toEqual(['–', '–', '–', '–']);
    expect(targets()).toEqual([null, null, null, null]);
    expect(element.querySelector('#home-start')).not.toBeNull();
    expect(element.querySelector('app-chargeability-chart')).toBeNull();
    expect(element.querySelector('.pt-kpi__sub')).toBeNull();
  });

  it('shows booked days, the year-end forecast and chargeability', async () => {
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [
        order('mapping', '2026-10-01', '2026-12-31', {
          forecast: { '2026-11': 8, '2026-12': 4 },
        }),
      ]),
      project('leave', 's', [order('vacation', '2026-01-01', '2026-12-31', { location: 'ooo' })]),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'mapping', date: '2026-10-05', days: 1 },
      { id: 'b2', orderId: 'mapping', date: '2026-11-02', days: 1 },
      { id: 'b3', orderId: 'vacation', date: '2026-11-03', days: 1 },
    ]);
    const { values, targets, titles } = await render();
    // Chargeability, Jan 1 – Nov 30 (the end of this month): 232 working days without
    // nationwide holidays, 1 out of office; days without a booking count as non-chargeable.
    // Year-end: October 1 booked, November 8 planned over 1 booked, December 4 planned.
    // Chargeability forecast over November and December, the planned months: 12 chargeable of
    // 21 + 21 working days (Christmas on Friday, December 24 and 31 half days off).
    expect(values()).toEqual(['2 days', '1 %', '13 days', '29 %']);
    expect(targets()).toEqual(['below', 'below', 'below', 'below']);
    expect(titles()[2]).toContain('\n2 booked + 11 planned');
    expect(titles()[3]).toContain('\n12/42 d \u00b7 2 months');
    expect(titles()[1]).toContain('\n2/231 d · target 80%');
  });

  it('shows the charts and the budget overview once there are projects', async () => {
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [order('mapping', '2026-01-01', '2026-12-31', { budget: 20 })]),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'mapping', date: '2026-10-05', days: 5 },
    ]);
    const { element } = await render();
    expect(element.querySelector('#home-start')).toBeNull();
    const charge = element.querySelector('app-chargeability-chart')!;
    // Twelve months and the year, like the location chart; the year rests on planned months.
    expect(charge.querySelectorAll('.pt-bar').length).toBe(13);
    expect(charge.querySelectorAll('.pt-bar__mark--forecast').length).toBe(3);
    // The target is labeled beside the plot, not in the legend.
    expect(charge.querySelector('.chart__target')?.textContent).toContain('Target 80\u00a0%');
    expect(charge.querySelector('.pt-legend')?.textContent).not.toContain('Target');
    const budgets = element.querySelector('app-budget-overview')!;
    expect(budgets.querySelector('.pt-budget-bar')?.getAttribute('title')).toBe('risk: 5/20 d');
    const locations = element.querySelector('app-location-chart')!;
    expect(locations.querySelectorAll('.pt-bar').length).toBe(13);
    expect(locations.querySelectorAll('.pt-target-line').length).toBe(2);
    expect(locations.querySelectorAll('.pt-hatch').length).toBe(11);
  });

  it('writes out a single day', async () => {
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [order('mapping', '2026-11-01', '2026-11-30')]),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'mapping', date: '2026-11-02', days: 1 },
    ]);
    const { values } = await render();
    // Nothing planned: no chargeability forecast.
    expect(values()).toEqual(['1 day', '0 %', '1 day', '–']);
  });

  it('colors the tiles against the chargeability target', async () => {
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [order('mapping', '2026-01-01', '2026-12-31')]),
      project('internal', 's', [order('admin', '2026-01-01', '2026-12-31')], {
        billing: 'nonChargeable',
      }),
    ]);
    // Monday to Friday of this week: 4 chargeable days and 1 internal.
    TestBed.inject(BookingStore).set(
      ['02', '03', '04', '05', '06'].map((day, i) => ({
        id: day,
        orderId: i < 4 ? 'mapping' : 'admin',
        date: `2026-11-${day}`,
        days: 1,
      })),
    );
    const settings = TestBed.inject(SettingsStore);
    settings.set({ ...defaultSettings(), chargeabilityTarget: 2 });
    const { fixture, targets } = await render();
    // Booked 5 of 216 days (2%), the year-end forecast 5 of 254 (2%), chargeability 4 of 216 (2%);
    // nothing is planned, so the chargeability forecast stays neutral.
    expect(targets()).toEqual(['met', 'met', 'met', null]);
    settings.set({ ...defaultSettings(), chargeabilityTarget: 12 });
    await fixture.whenStable();
    expect(targets()).toEqual(['near', 'near', 'near', null]);
    settings.set({ ...defaultSettings(), chargeabilityTarget: 13 });
    await fixture.whenStable();
    expect(targets()).toEqual(['below', 'below', 'below', null]);
  });

  it('follows the year picked in the top bar', async () => {
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [order('mapping', '2025-01-01', '2026-12-31')]),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'mapping', date: '2025-03-02', days: 3 },
      { id: 'b2', orderId: 'mapping', date: '2026-11-02', days: 1 },
    ]);
    const { fixture, element, values } = await render();
    expect(values()[0]).toBe('1 day');
    TestBed.inject(SelectedYear).previous();
    await fixture.whenStable();
    expect(element.querySelector('.pt-kpi__label')?.textContent).toBe('Booked 2025');
    // A past year ends as booked: the forecast equals the booked days.
    expect([values()[0], values()[2]]).toEqual(['3 days', '3 days']);
    const charge = element.querySelector('app-chargeability-chart')!;
    expect(charge.querySelectorAll('.pt-bar__mark--forecast').length).toBe(0);
  });
});
