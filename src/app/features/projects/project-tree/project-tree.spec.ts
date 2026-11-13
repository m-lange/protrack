import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BookingStore } from '../../../core/data/booking-store';
import { CustomerStore } from '../../../core/data/customer-store';
import { ProjectStore } from '../../../core/data/project-store';
import { TODAY } from '../../../core/today';
import {
  customer,
  openOrder,
  order,
  project,
  provideFakeDatabase,
} from '../../../testing/fake-database';
import { ProjectTree } from './project-tree';

describe('ProjectTree', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [ProjectTree],
      providers: [
        provideRouter([]),
        provideFakeDatabase(),
        { provide: TODAY, useValue: new Date(2026, 10, 7) },
      ],
    }).compileComponents();
    TestBed.inject(CustomerStore).set([
      customer('Silberbach Bank', 's', 0),
      customer('Kranich Logistik', 'k', 1),
    ]);
    TestBed.inject(ProjectStore).set([
      project('risk', 's', [
        order('model', '2026-09-14', '2026-12-04', { budget: 20 }),
        order('testing', '2026-10-19', '2026-12-18', { budget: 12, location: 'reply' }),
      ]),
      project('audit', 's', [], { status: 'completed' }),
    ]);
  });

  async function render(status: 'active' | 'completed' = 'active') {
    const fixture = TestBed.createComponent(ProjectTree);
    fixture.componentRef.setInput('status', status);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
    return { fixture, element, button };
  }

  it('shows the active projects with sums, and customers without projects', async () => {
    const { element } = await render();
    expect(element.querySelector('.pt-group-head')).toBeNull();
    expect(element.textContent).not.toContain('audit');
    const customers = [...element.querySelectorAll('.pt-row--customer .pt-cell__text')].map(
      (n) => n.textContent,
    );
    expect(customers).toEqual(['Silberbach Bank', 'Kranich Logistik']);
    const budget = element.querySelector('.pt-row--project .pt-cell--num');
    expect(budget?.textContent?.trim()).toBe('32');
    expect(element.querySelectorAll('.pt-row--order').length).toBe(2);
    expect(
      element.querySelector('a[aria-label="Add project for Kranich Logistik"]'),
    ).not.toBeNull();
  });

  it('shows only the completed projects in the Archive, without adding projects', async () => {
    const { element } = await render('completed');
    const projects = [...element.querySelectorAll('.pt-row--project .name')].map(
      (n) => n.textContent,
    );
    expect(projects).toEqual(['audit']);
    const customers = [...element.querySelectorAll('.pt-row--customer .pt-cell__text')].map(
      (n) => n.textContent,
    );
    expect(customers).toEqual(['Silberbach Bank']);
    expect(element.querySelector('.pt-add-row')).toBeNull();
    expect(element.querySelector('a[aria-label^="Add project for"]')).toBeNull();
  });

  it('says so when the Archive is empty', async () => {
    TestBed.inject(ProjectStore).set([project('risk', 's', [])]);
    const { element } = await render('completed');
    expect(element.querySelector('.pt-table')).toBeNull();
    expect(element.querySelector('.pt-hint')?.textContent).toContain('No completed projects yet');
  });

  it('collapses a project and its orders', async () => {
    const { fixture, element, button } = await render();
    button('Collapse risk')!.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.pt-row--order').length).toBe(0);
    expect(button('Expand risk')?.getAttribute('aria-expanded')).toBe('false');
    expect(JSON.parse(localStorage.getItem('protrack.treeCollapsed')!)).toContain('project:risk');
  });

  it('starts with the collapsed rows kept in the browser', async () => {
    localStorage.setItem('protrack.treeCollapsed', JSON.stringify(['project:risk']));
    const { element, button } = await render();
    expect(element.querySelectorAll('.pt-row--order').length).toBe(0);
    expect(button('Expand risk')).not.toBeNull();
  });

  it('shows open-booking projects without orders, timeline, budget or remaining', async () => {
    TestBed.inject(ProjectStore).set([
      project('internal', 'k', [openOrder('office', { location: 'home' })], {
        booking: 'open',
        billing: 'nonChargeable',
      }),
    ]);
    TestBed.inject(BookingStore).set([
      { id: 'b1', orderId: 'office', date: '2026-11-02', days: 2 },
    ]);
    const { element, button } = await render();
    expect(element.querySelectorAll('.pt-row--order').length).toBe(0);
    expect(button('Collapse internal')).toBeNull();
    const row = element.querySelector('.pt-row--project')!;
    expect(row.querySelector('app-timeline-pill .pt-timeline__fill')).toBeNull();
    expect(row.textContent).toContain('Open booking');
    // The default work location sits in the project row.
    expect(row.querySelector('.pt-chip--home')?.textContent).toContain('Home office');
    // Budget and Booked; Remaining shows a dash, no chip.
    const numbers = [...row.querySelectorAll('.pt-cell--num')].map((c) => c.textContent?.trim());
    expect(numbers).toEqual(['–', '2']);
    expect(row.querySelector('.pt-chip--plus, .pt-chip--minus')).toBeNull();
  });
});
