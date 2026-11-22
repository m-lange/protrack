import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
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
import { ProjectEdit } from './project-edit';

describe('ProjectEdit', () => {
  let customers: CustomerStore;
  let projects: ProjectStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProjectEdit],
      providers: [
        provideRouter([]),
        provideFakeDatabase(),
        { provide: TODAY, useValue: new Date(2026, 10, 7) },
      ],
    }).compileComponents();
    customers = TestBed.inject(CustomerStore);
    projects = TestBed.inject(ProjectStore);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  async function render(inputs: { id?: string; customer?: string } = {}) {
    const fixture = TestBed.createComponent(ProjectEdit);
    if (inputs.id) fixture.componentRef.setInput('id', inputs.id);
    if (inputs.customer) fixture.componentRef.setInput('customer', inputs.customer);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const field = (label: string) =>
      element.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`)!;
    const name = () => element.querySelector<HTMLInputElement>('#project-form input[type="text"]')!;
    const type = async (input: HTMLInputElement, value: string) => {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      await fixture.whenStable();
    };
    const submit = async () => {
      element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
      await fixture.whenStable();
    };
    const errors = () =>
      [...element.querySelectorAll('.pt-hint--error')].map((hint) => hint.textContent?.trim());
    return { fixture, element, field, name, type, submit, errors };
  }

  it('shows the empty form without any account, and saves nothing without a name and account', async () => {
    const { element, submit, errors } = await render();
    expect(element.querySelector('h1')?.textContent).toBe('New project');
    expect(element.querySelector('button[type="submit"]')?.textContent?.trim()).toBe('Add project');

    await submit();
    expect(errors()).toEqual([
      'Enter the name of the project.',
      'Choose the account of this project.',
    ]);
    expect(TestBed.inject(FakeDatabase).projects.size).toBe(0);
  });

  it('adds a project to the account the page was opened for', async () => {
    customers.set([customer('Silberbach Bank', 's', 0), customer('Kranich Logistik', 'k', 1)]);
    const { name, type, submit } = await render({ customer: 'k' });
    await type(name(), ' Risk Data Platform ');
    await submit();

    const saved = [...TestBed.inject(FakeDatabase).projects.values()];
    expect(saved.map((p) => [p.customerId, p.name, p.status, p.billing, p.booking])).toEqual([
      ['k', 'Risk Data Platform', 'active', 'chargeable', 'po'],
    ]);
    expect(projects.projects()).toEqual(saved);
  });

  it('refuses a name another project of the account has', async () => {
    customers.set([customer('Silberbach Bank', 's')]);
    projects.set([project('risk', 's', [], { name: 'Risk' })]);
    const { name, type, submit, errors } = await render();
    await type(name(), 'risk');
    await submit();
    expect(errors()).toEqual(['Silberbach Bank already has a project named risk.']);
    expect(projects.projects()).toHaveLength(1);
  });

  it('shows a project with its orders and saves a changed order', async () => {
    customers.set([customer('Silberbach Bank', 's')]);
    projects.set([
      project('risk', 's', [order('o', '2026-09-14', '2026-12-18', { name: 'Mapping' })], {
        name: 'Risk',
      }),
    ]);
    const { element, field, name, type, submit } = await render({ id: 'risk' });
    expect(element.querySelector('h1')?.textContent).toBe('Risk');
    expect(name().value).toBe('Risk');
    expect(field('Order 1 name').value).toBe('Mapping');
    expect(field('Start of Mapping').value).toBe('2026-09-14');

    await type(field('End of Mapping'), '2026-12-31');
    await submit();
    expect(projects.get('risk')?.orders.map((o) => [o.name, o.start, o.end])).toEqual([
      ['Mapping', '2026-09-14', '2026-12-31'],
    ]);
  });

  it('keeps an order whose end lies before its start from being saved', async () => {
    customers.set([customer('Silberbach Bank', 's')]);
    projects.set([project('risk', 's', [order('o', '2026-09-14', '2026-12-18')])]);
    const { field, type, submit } = await render({ id: 'risk' });
    await type(field('End of o'), '2026-09-01');
    await submit();
    expect(field('End of o').getAttribute('aria-invalid')).toBe('true');
    expect(projects.get('risk')?.orders[0].end).toBe('2026-12-18');
  });

  it('deletes a project, but not one with bookings', async () => {
    customers.set([customer('Silberbach Bank', 's')]);
    projects.set([
      project('risk', 's', [order('o', '2026-09-14', '2026-12-18')]),
      project('sales', 's', [order('p', '2026-09-14', '2026-12-18')]),
    ]);
    TestBed.inject(BookingStore).set([{ id: 'b', orderId: 'o', date: '2026-11-02', days: 1 }]);
    const button = (element: HTMLElement, text: string) =>
      [...element.querySelectorAll<HTMLButtonElement>('button')].filter(
        (b) => b.textContent?.trim() === text,
      );

    const booked = await render({ id: 'risk' });
    expect(button(booked.element, 'Delete project')[0].disabled).toBe(true);

    const free = await render({ id: 'sales' });
    button(free.element, 'Delete project')[0].click();
    await free.fixture.whenStable();
    button(free.element, 'Delete project').at(-1)!.click();
    await free.fixture.whenStable();
    expect(projects.projects().map((p) => p.id)).toEqual(['risk']);
  });

  it('says so when the project is gone', async () => {
    const { element } = await render({ id: 'gone' });
    expect(element.querySelector('h1')?.textContent).toBe('Project not found');
    expect(element.querySelector('form')).toBeNull();
  });
});
