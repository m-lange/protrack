import { TestBed } from '@angular/core/testing';
import { FakeDatabase, order, project, provideFakeDatabase } from '../../testing/fake-database';
import { BookingStore } from './booking-store';
import { ProjectStore } from './project-store';

describe('ProjectStore', () => {
  let store: ProjectStore;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideFakeDatabase()] });
    store = TestBed.inject(ProjectStore);
    store.set([
      project('p', 'c', [
        order('o', '2026-09-01', '2026-12-31', { forecast: { '2026-11': 8, '2026-12': 6 } }),
      ]),
    ]);
  });

  it('keeps the forecast of the months still in an order timeline', async () => {
    await store.update('p', {
      customerId: 'c',
      name: 'p',
      color: 'pink',
      status: 'active',
      billing: 'neutral',
      booking: 'po',
      orders: [
        {
          id: 'o',
          name: 'o',
          start: '2026-09-01',
          end: '2026-11-30',
          budget: 10,
          location: 'home',
        },
        {
          id: '',
          name: 'New',
          start: '2027-01-01',
          end: '2027-03-31',
          budget: 5,
          location: 'reply',
        },
      ],
      location: 'onsite',
    });
    const saved = TestBed.inject(FakeDatabase).projects.get('p');
    expect(saved?.orders[0].forecast).toEqual({ '2026-11': 8 });
    expect(saved?.orders[1].id).not.toBe('');
    expect(saved?.billing).toBe('neutral');
  });

  it('plans only inside the timeline; 0 or null removes the plan', async () => {
    await store.setForecast('p', 'o', '2027-01', 3);
    await store.setForecast('p', 'o', '2026-12', null);
    await store.setForecast('p', 'o', '2026-10', 2.5);
    expect(store.get('p')?.orders[0].forecast).toEqual({ '2026-10': 2.5, '2026-11': 8 });
  });

  /** A draft of project p switched to open booking at `location`, with its order o in the form. */
  const openDraft = (location: 'home' | 'reply') => ({
    customerId: 'c',
    name: 'Internal',
    color: 'pink',
    status: 'active' as const,
    billing: 'nonChargeable' as const,
    booking: 'open' as const,
    orders: [
      {
        id: 'o',
        name: 'o',
        start: '2026-09-01',
        end: '2026-09-30',
        budget: 10,
        location: 'home' as const,
      },
    ],
    location,
  });

  it('saves an open-booking project with one order at its default location, keeping the forecast', async () => {
    await store.update('p', openDraft('reply'));
    const saved = store.get('p')!;
    expect(saved.booking).toBe('open');
    expect(saved.orders).toHaveLength(1);
    expect(saved.orders[0]).toMatchObject({
      id: 'o',
      name: 'Internal',
      start: null,
      end: null,
      budget: null,
      location: 'reply',
    });
    // November and December lie outside the dates typed, but open booking has no timeline.
    expect(saved.orders[0].forecast).toEqual({ '2026-11': 8, '2026-12': 6 });
    await store.setForecast('p', 'o', '2027-05', 2);
    expect(store.get('p')!.orders[0].forecast['2027-05']).toBe(2);
  });

  it('merges the orders of a project switched to open booking, with their bookings', async () => {
    store.set([
      project('p', 'c', [
        order('o', '2026-09-01', '2026-12-31', { location: 'home', forecast: { '2026-11': 2 } }),
        order('x', '2026-10-01', '2026-12-31', { location: 'onsite', forecast: { '2026-11': 3 } }),
      ]),
    ]);
    const bookings = TestBed.inject(BookingStore);
    bookings.set([
      { id: 'b1', orderId: 'o', date: '2026-10-05', days: 0.5 },
      { id: 'b2', orderId: 'x', date: '2026-10-05', days: 0.25 },
      { id: 'b3', orderId: 'x', date: '2026-10-06', days: 1 },
    ]);
    const draft = openDraft('home');
    await store.update('p', {
      ...draft,
      orders: [...draft.orders, { ...draft.orders[0], id: 'x' }],
    });
    const saved = store.get('p')!;
    expect(saved.orders.map((o) => o.id)).toEqual(['o']);
    expect(saved.orders[0].forecast).toEqual({ '2026-11': 5 });
    // The two bookings of Oct 5 add up; Oct 6 keeps x's on-site as its own location.
    expect(bookings.bookings()).toEqual([
      { id: 'b1', orderId: 'o', date: '2026-10-05', days: 0.75 },
      { id: 'b3', orderId: 'o', date: '2026-10-06', days: 1, location: 'onsite' },
    ]);
    expect(TestBed.inject(FakeDatabase).bookings.has('b2')).toBe(false);
  });
});
