import { TestBed } from '@angular/core/testing';
import { LocationSelect } from './location-select';

describe('LocationSelect', () => {
  async function render() {
    await TestBed.configureTestingModule({ imports: [LocationSelect] }).compileComponents();
    const fixture = TestBed.createComponent(LocationSelect);
    fixture.componentRef.setInput('value', 'home');
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const trigger = element.querySelector<HTMLElement>('[ngCombobox]')!;
    return { fixture, element, trigger };
  }

  it('shows the location as its chip with its icon', async () => {
    const { trigger } = await render();
    expect(trigger.classList).toContain('pt-chip--home');
    expect(trigger.textContent).toContain('Home office');
    expect(trigger.querySelectorAll('app-icon').length).toBe(2);
  });

  it('lists every location with its icon and takes a pick', async () => {
    const { fixture, element, trigger } = await render();
    trigger.click();
    await fixture.whenStable();
    const options = [...element.querySelectorAll<HTMLElement>('[role="option"]')];
    expect(options.map((o) => o.textContent?.trim())).toEqual([
      'On-site',
      'Reply',
      'Home office',
      'Out of office',
    ]);
    expect(options.every((o) => o.querySelector('app-icon'))).toBe(true);
    options[1].click();
    await fixture.whenStable();
    expect(fixture.componentInstance.value()).toBe('reply');
    expect(trigger.classList).toContain('pt-chip--reply');
    expect(trigger.classList).not.toContain('pt-chip--home');
  });
});
