import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { CustomerStore } from '../../../core/data/customer-store';
import { customer, provideFakeDatabase } from '../../../testing/fake-database';
import { CustomersPage } from './customers-page';

describe('CustomersPage', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomersPage],
      providers: [provideRouter([]), provideFakeDatabase()],
    }).compileComponents();
  });

  it('lists the customers with an edit link each and a way to add one', async () => {
    TestBed.inject(CustomerStore).set([customer('Silberbach Bank', 's')]);
    const fixture = TestBed.createComponent(CustomersPage);
    await fixture.whenStable();
    const element = fixture.nativeElement as HTMLElement;
    expect(
      element.querySelector('a[aria-label="Edit Silberbach Bank"]')?.getAttribute('href'),
    ).toBe('/customers/s');
    expect(element.querySelector('a.name')?.getAttribute('href')).toBe('/customers/s');
    expect(element.querySelector('.pt-add-row')?.getAttribute('href')).toBe('/customers/new');
    expect(
      element.querySelector('.pt-page-head__actions a.pt-btn--primary')?.getAttribute('href'),
    ).toBe('/customers/new');
  });
});
