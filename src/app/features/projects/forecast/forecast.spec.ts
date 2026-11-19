import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingStore } from '../../../core/data/booking-store';
import { CustomerStore } from '../../../core/data/customer-store';
import { ProjectStore } from '../../../core/data/project-store';
import { TODAY } from '../../../core/today';
import {
  FakeDatabase,
  customer,
  order,
  project,
  provideFakeDatabase,
} from '../../../testing/fake-database';
import { Forecast } from './forecast';

describe('Forecast', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Forecast],
      providers: [
        provideRouter([]),
        provideFakeDatabase(),
        { provide: TODAY, useValue: new Date(2026, 10, 7) },
      ],
    }).compileComponents();
    TestBed.inject(CustomerStore).set([customer('Silberbach Bank', 's', 0)]);
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [
        order('mapping', '2026-09-14', '2026-11-30', { forecast: { '2026-11': 8 } }),
      ]),
      project('audit', 's', [order('old', '2025-01-01', '2025-03-31')]),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'mapping', date: '2026-10-05', days: 1 },
      { id: 'b2', orderId: 'mapping', date: '2026-10-06', days: 0.5 },
    ]);
  });

  async function render() {
    const fixture = TestBed.createComponent(Forecast);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const input = (month: string) =>
      element.querySelector<HTMLInputElement>(`input[aria-label="mapping, ${month} 2026"]`);
    return { fixture, element, input };
  }

  it('shows bookings before the current month and inputs from it on', async () => {
    const { element, input } = await render();
    const row = element.querySelector('.pt-row--order')!;
    const actual = [...row.querySelectorAll('.pt-time-cell--actual')].map((c) => c.textContent);
    expect(actual).toEqual(['–', '–', '–', '–', '–', '–', '–', '–', '–', '1.5']);
    expect(row.querySelectorAll('.pt-time-cell--forecast input').length).toBe(2);
    expect(input('October')).toBeNull();
    expect(input('November')!.value).toBe('8');
    expect(input('November')!.disabled).toBe(false);
  });

  it('keeps inputs outside the order timeline visible but disabled', async () => {
    const { input } = await render();
    expect(input('December')!.disabled).toBe(true);
  });

  it('leaves out projects without orders in the year', async () => {
    const { element } = await render();
    const names = [...element.querySelectorAll('.pt-row--project .pt-cell__text')].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(['risk']);
  });

  it('leaves out completed projects, even with orders in the year', async () => {
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [order('mapping', '2026-09-14', '2026-11-30')]),
      project('audit', 's', [order('review', '2026-02-02', '2026-04-30')], {
        status: 'completed',
      }),
      project('legacy', 's', [order('old', '2025-01-01', '2025-03-31')], { status: 'completed' }),
    ]);
    const { element } = await render();
    expect(element.querySelectorAll('.pt-table').length).toBe(1);
    expect(element.querySelector('.pt-group-head')).toBeNull();
    const names = [...element.querySelectorAll('.pt-row--project .pt-cell__text')].map(
      (n) => n.textContent,
    );
    expect(names).toEqual(['risk']);
  });

  it('saves a plan in steps of 0.25 and undoes what is not a number', async () => {
    const { fixture, input } = await render();
    const november = input('November')!;
    const saved = () => TestBed.inject(FakeDatabase).projects.get('risk')?.orders[0].forecast;

    november.value = '6,3';
    november.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(saved()).toEqual({ '2026-11': 6.25 });
    expect(november.value).toBe('6.25');

    november.value = 'lots';
    november.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(november.value).toBe('6.25');

    november.value = '';
    november.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(saved()).toEqual({});
  });

  it('collapses projects and customers', async () => {
    const { fixture, element } = await render();
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    button('Collapse risk').click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.pt-row--order').length).toBe(0);
    button('Collapse Silberbach Bank').click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.pt-row--project').length).toBe(0);
  });

  it('shows chargeability per month and for the year as badges against the target', async () => {
    const { element } = await render();
    const [daysRow, workingRow, row] = [...element.querySelectorAll('.pt-row--total')];
    // Above them, the days of all projects: booked in October, planned from November on.
    const days = [...daysRow.querySelectorAll('.pt-time-cell')].map((c) => c.textContent);
    expect(days.slice(9, 11)).toEqual(['1.5', '8']);
    expect(daysRow.querySelector('.pt-cell--center')?.textContent?.trim()).toBe('9.5');
    const working = [...workingRow.querySelectorAll('.pt-time-cell')].map((c) => c.textContent);
    // Nationwide holidays only (no federal state set): October 22, November 21 working days.
    expect(working.slice(9, 11)).toEqual(['22', '21']);
    const cells = [...row.querySelectorAll('.pt-time-cell')];
    // October: 1.5 booked of 22 working days. November: 8 planned of 21 working days.
    const october = cells[9].querySelector('.pt-chip')!;
    expect(october.textContent?.trim()).toBe('7%');
    expect(october.classList).toContain('pt-chip--minus-strong');
    expect(october.classList).not.toContain('planned');
    const november = cells[10].querySelector('.pt-chip')!;
    expect(november.textContent?.trim()).toBe('38%');
    expect(november.classList).toContain('planned');
    expect(cells[0].textContent?.trim()).toBe('–');
    expect(row.querySelectorAll('.pt-cell--center .pt-chip').length).toBe(1);
  });

  it('tints a month of all projects with more days than working days', async () => {
    const { fixture, element, input } = await render();
    const daysCells = () => [
      ...element.querySelectorAll('.pt-row--total')[0].querySelectorAll('.pt-time-cell'),
    ];
    expect(element.querySelectorAll('.over').length).toBe(0);
    // November has 21 working days.
    const november = input('November')!;
    november.value = '21.5';
    november.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    const [october, nov] = daysCells().slice(9, 11);
    expect(nov.classList).toContain('over');
    expect(nov.getAttribute('title')).toBe('More days than working days');
    expect(october.classList).not.toContain('over');
    expect(october.getAttribute('title')).toBeNull();
    // The month's inputs are tinted too; December's stay as they are.
    expect(november.classList).toContain('over');
    expect(input('December')!.classList).not.toContain('over');
  });

  it('folds January through a month into one column and back, and keeps the fold', async () => {
    const { fixture, element, input } = await render();
    const heads = () => [...element.querySelectorAll('.pt-row--head .pt-time-head')];
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    // January has nothing to fold, December would repeat the Total: no button on either.
    expect(heads()[0].querySelector('button')).toBeNull();
    expect(heads()[11].querySelector('button')).toBeNull();

    button('Collapse January to October 2026')!.click();
    await fixture.whenStable();
    expect(heads().length).toBe(3);
    expect(heads()[0].textContent?.trim()).toBe('');
    expect(localStorage.getItem('protrack.forecastFoldedThrough')).toBe('9');
    // The folded column sums its months; November and December keep their inputs.
    const row = element.querySelector('.pt-row--order')!;
    expect(row.querySelector('.pt-time-cell')?.textContent).toBe('1.5');
    expect(input('November')!.value).toBe('8');
    const [daysRow] = [...element.querySelectorAll('.pt-row--total')];
    const days = [...daysRow.querySelectorAll('.pt-time-cell')].map((c) => c.textContent);
    expect(days).toEqual(['1.5', '8', '–']);

    button('Expand January to October 2026')!.click();
    await fixture.whenStable();
    expect(heads().length).toBe(12);
    expect(localStorage.getItem('protrack.forecastFoldedThrough')).toBeNull();
  });

  it('starts with the fold kept in the browser', async () => {
    localStorage.setItem('protrack.forecastFoldedThrough', '2');
    const { element } = await render();
    expect(element.querySelectorAll('.pt-row--head .pt-time-head').length).toBe(10);
  });
});
