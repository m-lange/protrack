import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { SelectedYear } from '../../core/selected-year';
import { TODAY } from '../../core/today';
import { SideNav } from './side-nav';

describe('SideNav', () => {
  beforeEach(async () => {
    localStorage.removeItem('protrack.sidebarCollapsed');
    await TestBed.configureTestingModule({
      imports: [SideNav],
      providers: [provideRouter([]), { provide: TODAY, useValue: new Date(2026, 10, 6) }],
    }).compileComponents();
  });

  async function render() {
    const fixture = TestBed.createComponent(SideNav);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement };
  }

  it('lists all twelve months and marks the current and future ones', async () => {
    const { element } = await render();
    const months = element.querySelectorAll('.pt-nav__month');
    expect(months.length).toBe(12);
    expect(element.querySelector('.pt-nav__month--now')?.textContent?.trim()).toBe('November');
    expect(element.querySelectorAll('.pt-nav__month--future').length).toBe(1);
    expect(months[10].getAttribute('href')).toBe('/timesheet/2026/11');
  });

  it('follows the year picked in the top bar', async () => {
    const { fixture, element } = await render();
    TestBed.inject(SelectedYear).set(2027);
    await fixture.whenStable();
    expect(element.querySelectorAll('.pt-nav__month')[0].getAttribute('href')).toBe(
      '/timesheet/2027/1',
    );
    expect(element.querySelector('.pt-nav__month--now')).toBeNull();
    expect(element.querySelectorAll('.pt-nav__month--future').length).toBe(12);
  });

  it('collapses to its icons and remembers it', async () => {
    const { fixture, element } = await render();
    const toggle = element.querySelector<HTMLButtonElement>('button.toggle')!;
    expect(toggle.getAttribute('aria-label')).toBe('Collapse navigation');

    toggle.click();
    await fixture.whenStable();
    expect(fixture.nativeElement.classList).toContain('collapsed');
    expect(element.querySelectorAll('.pt-nav__month').length).toBe(0);
    expect(element.querySelector('a.pt-nav__item')?.getAttribute('title')).toBe('Home');
    expect(toggle.getAttribute('aria-label')).toBe('Expand navigation');
    expect(localStorage.getItem('protrack.sidebarCollapsed')).toBe('true');

    toggle.click();
    await fixture.whenStable();
    expect(element.querySelectorAll('.pt-nav__month').length).toBe(12);
    expect(localStorage.getItem('protrack.sidebarCollapsed')).toBe('false');
  });
});
