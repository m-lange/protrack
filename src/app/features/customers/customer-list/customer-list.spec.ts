import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomerStore } from '../../../core/data/customer-store';
import { FakeDatabase, customer, provideFakeDatabase } from '../../../testing/fake-database';
import { CustomerList } from './customer-list';

describe('CustomerList', () => {
  let store: CustomerStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerList],
      providers: [provideRouter([]), provideFakeDatabase()],
    }).compileComponents();
    store = TestBed.inject(CustomerStore);
    store.set([
      customer('Silberbach Bank', 's', 0),
      customer('Kranich Logistik', 'k', 1),
      customer('Brennwald Retail', 'b', 2),
    ]);
  });

  async function render() {
    const fixture = TestBed.createComponent(CustomerList);
    fixture.componentRef.setInput('editable', true);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const names = () =>
      [...element.querySelectorAll('.pt-row--customer .pt-cell__text')].map((n) => n.textContent);
    const button = (label: string) =>
      element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!;
    return { fixture, element, names, button };
  }

  it('moves a customer with the arrow buttons and saves the order', async () => {
    const { fixture, names, button } = await render();
    expect(button('Move Silberbach Bank up').disabled).toBe(true);
    expect(button('Move Brennwald Retail down').disabled).toBe(true);

    button('Move Silberbach Bank down').click();
    await fixture.whenStable();
    expect(names()).toEqual(['Kranich Logistik', 'Silberbach Bank', 'Brennwald Retail']);

    button('Move Brennwald Retail up').click();
    await fixture.whenStable();
    expect(names()).toEqual(['Kranich Logistik', 'Brennwald Retail', 'Silberbach Bank']);

    const saved = [...TestBed.inject(FakeDatabase).customers.values()]
      .sort((a, b) => a.order - b.order)
      .map((c) => c.id);
    expect(saved).toEqual(['k', 'b', 's']);
  });

  it('moves a customer by drag and drop', async () => {
    const { fixture, element, names } = await render();
    const rows = element.querySelectorAll<HTMLElement>('.pt-row--customer');
    expect(rows[0].getAttribute('draggable')).toBe('true');
    rows[2].dispatchEvent(new Event('dragstart'));
    rows[0].dispatchEvent(new Event('dragover', { cancelable: true }));
    rows[0].dispatchEvent(new Event('drop', { cancelable: true }));
    await fixture.whenStable();
    expect(names()).toEqual(['Brennwald Retail', 'Silberbach Bank', 'Kranich Logistik']);
  });

  it('adds new customers at the end', async () => {
    await store.create({ name: 'Aachen Werke', logo: null });
    expect(store.customers().map((c) => c.name)).toEqual([
      'Silberbach Bank',
      'Kranich Logistik',
      'Brennwald Retail',
      'Aachen Werke',
    ]);
  });
});
