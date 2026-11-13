import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomerStore } from '../../core/data/customer-store';
import { customer, provideFakeDatabase } from '../../testing/fake-database';
import { Projects } from './projects';

describe('Projects', () => {
  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [Projects],
      providers: [provideRouter([]), provideFakeDatabase()],
    }).compileComponents();
  });

  it('points to My customers to add the first customer', async () => {
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.pt-hint a')?.getAttribute('href')).toBe('/customers');
    expect(element.querySelector('.pt-tabs')).toBeNull();
  });

  it('shows the Projects, Forecast and Archive tabs and "New project" once there are customers', async () => {
    TestBed.inject(CustomerStore).set([customer('Silberbach Bank', 's', 0)]);
    const fixture = TestBed.createComponent(Projects);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    const tabs = [...element.querySelectorAll('.pt-tab')].map((tab) => [
      tab.textContent?.trim(),
      tab.getAttribute('href'),
    ]);
    expect(tabs).toEqual([
      ['Projects', '/projects'],
      ['Forecast', '/projects/forecast'],
      ['Archive', '/projects/archive'],
    ]);
    expect(element.querySelector('.pt-btn--primary')?.getAttribute('href')).toBe('/projects/new');
  });
});
