import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { CustomerStore } from '../../../core/data/customer-store';
import { FakeDatabase, customer, provideFakeDatabase } from '../../../testing/fake-database';
import { CustomerEdit } from './customer-edit';

describe('CustomerEdit', () => {
  let store: CustomerStore;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerEdit],
      providers: [provideRouter([]), provideFakeDatabase()],
    }).compileComponents();
    store = TestBed.inject(CustomerStore);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  async function render(id?: string) {
    const fixture = TestBed.createComponent(CustomerEdit);
    if (id) fixture.componentRef.setInput('id', id);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const name = element.querySelector<HTMLInputElement>('input[type="text"]')!;
    const submit = () => element.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    return { fixture, element, name, submit };
  }

  it('adds a customer', async () => {
    const { fixture, element, name, submit } = await render();
    expect(element.querySelector('h1')?.textContent).toBe('New account');
    name.value = 'Silberbach Bank';
    name.dispatchEvent(new Event('input'));
    submit();
    await fixture.whenStable();
    expect(store.customers().map((c) => c.name)).toEqual(['Silberbach Bank']);
    expect(TestBed.inject(FakeDatabase).customers.size).toBe(1);
  });

  it('updates the title and badge live as the name is typed', async () => {
    store.set([customer('Kranich Logistik', 'k')]);
    const { fixture, element, name } = await render('k');
    name.value = 'Brennwald Retail';
    name.dispatchEvent(new Event('input'));
    await fixture.whenStable();
    expect(element.querySelector('h1')?.textContent).toBe('Brennwald Retail');
    expect(element.querySelector('.head app-customer-badge')?.textContent?.trim()).toBe('BR');
    expect(element.querySelector('.pt-breadcrumb [aria-current="page"]')?.textContent).toBe(
      'Brennwald Retail',
    );
  });

  it('needs a name that is not taken', async () => {
    store.set([customer('Silberbach Bank')]);
    const { fixture, element, name, submit } = await render();
    submit();
    await fixture.whenStable();
    expect(element.querySelector('.pt-hint--error')?.textContent).toContain('Enter the name');

    name.value = 'silberbach bank';
    name.dispatchEvent(new Event('input'));
    submit();
    await fixture.whenStable();
    expect(element.querySelector('.pt-hint--error')?.textContent).toContain(
      'You already have an account named silberbach bank.',
    );
    expect(store.customers().length).toBe(1);
  });

  it('edits and deletes a customer', async () => {
    store.set([customer('Kranich Logistik', 'k')]);
    const { fixture, element, name, submit } = await render('k');
    expect(name.value).toBe('Kranich Logistik');
    expect(element.querySelector('app-customer-badge')?.textContent?.trim()).toBe('KL');

    name.value = 'Kranich Logistik AG';
    name.dispatchEvent(new Event('input'));
    submit();
    await fixture.whenStable();
    expect(store.get('k')?.name).toBe('Kranich Logistik AG');

    element.querySelector<HTMLButtonElement>('.pt-btn--danger')!.click();
    await fixture.whenStable();
    // The confirmation: Keep first, in Delete's place, then the filled Delete.
    const confirm = [
      ...element.querySelectorAll<HTMLButtonElement>('.state:not(.inactive) .pt-btn'),
    ];
    expect(confirm.map((b) => b.textContent?.trim())).toEqual(['Keep account', 'Delete account']);
    confirm[1].click();
    await fixture.whenStable();
    expect(store.customers()).toEqual([]);
  });

  it('says so when the customer does not exist', async () => {
    const { element } = await render('gone');
    expect(element.querySelector('h1')?.textContent).toBe('Account not found');
  });
});
