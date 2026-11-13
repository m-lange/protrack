import { TestBed } from '@angular/core/testing';
import { CustomerStore } from '../../core/data/customer-store';
import { customer, provideFakeDatabase } from '../../testing/fake-database';
import { CustomerSelect } from './customer-select';

describe('CustomerSelect', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerSelect],
      providers: [provideFakeDatabase()],
    }).compileComponents();
    TestBed.inject(CustomerStore).set([
      customer('Silberbach Bank', 's', 0),
      customer('Kranich Logistik', 'k', 1),
    ]);
  });

  async function render(value = '') {
    const fixture = TestBed.createComponent(CustomerSelect);
    fixture.componentRef.setInput('value', value);
    fixture.componentRef.setInput('placeholder', 'Choose a customer');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLElement>('[ngCombobox]')!;
    const options = () => [...element.querySelectorAll<HTMLElement>('[role="option"]')];
    const key = async (key: string) => {
      trigger.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
      await fixture.whenStable();
    };
    return { fixture, element, trigger, options, key };
  }

  it('shows the chosen customer with its badge, or the placeholder', async () => {
    const { trigger } = await render('k');
    expect(trigger.querySelector('app-customer-badge')).not.toBeNull();
    expect(trigger.textContent).toContain('Kranich Logistik');
    const empty = await render();
    expect(empty.trigger.textContent).toContain('Choose a customer');
  });

  it('opens a list of customers with badges and takes a click', async () => {
    const { fixture, trigger, options } = await render();
    trigger.click();
    await fixture.whenStable();
    expect(options().map((o) => o.textContent?.trim())).toEqual([
      'SBSilberbach Bank',
      'KLKranich Logistik',
    ]);
    expect(options()[0].querySelector('app-customer-badge')).not.toBeNull();
    options()[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('k');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });

  it('works with the keyboard', async () => {
    const { fixture, trigger, key } = await render('s');
    await key('ArrowDown');
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    await key('ArrowDown');
    await key('Enter');
    expect(fixture.componentInstance.value()).toBe('k');
  });
});
