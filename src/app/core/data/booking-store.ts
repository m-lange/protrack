import { Injectable, computed, inject, signal } from '@angular/core';
import { monthOf } from '../../shared/dates/months';
import { Database } from './database';
import { Booking, Location, MonthKey, Order } from './model';

/** The days booked on one order: in total and per month. */
export interface OrderBookings {
  total: number;
  byMonth: Map<MonthKey, number>;
  /**
   * Of those, the days per month booked with a location of their own (not the order's), split
   * into out of office and work. Absent months (or an absent map) have none.
   */
  ownLocation?: Map<MonthKey, { away: number; work: number }>;
}

const NONE: OrderBookings = { total: 0, byMonth: new Map(), ownLocation: new Map() };

/** The days of an order booked out of office in a month, with the bookings' own locations. */
export function awayInMonth(order: Order, booked: OrderBookings, month: MonthKey): number {
  const own = booked.ownLocation?.get(month) ?? { away: 0, work: 0 };
  return order.location === 'ooo' ? (booked.byMonth.get(month) ?? 0) - own.work : own.away;
}

/** The booked days from My timesheet, held in memory and written through to IndexedDB. */
@Injectable({ providedIn: 'root' })
export class BookingStore {
  private readonly db = inject(Database);
  private readonly state = signal<Booking[]>([]);

  readonly bookings = this.state.asReadonly();

  /** The bookings summed per order and month. */
  private readonly byOrder = computed(() => {
    const result = new Map<string, OrderBookings>();
    for (const booking of this.state()) {
      let entry = result.get(booking.orderId);
      if (!entry) {
        result.set(
          booking.orderId,
          (entry = { total: 0, byMonth: new Map(), ownLocation: new Map() }),
        );
      }
      const month = monthOf(booking.date);
      entry.total += booking.days;
      entry.byMonth.set(month, (entry.byMonth.get(month) ?? 0) + booking.days);
      if (booking.location) {
        const own = entry.ownLocation!.get(month) ?? { away: 0, work: 0 };
        own[booking.location === 'ooo' ? 'away' : 'work'] += booking.days;
        entry.ownLocation!.set(month, own);
      }
    }
    return result;
  });

  /** The days booked per order and date, keyed `orderId|date`. */
  private readonly byOrderDay = computed(() => {
    const result = new Map<string, number>();
    for (const b of this.state()) {
      const key = dayKey(b.orderId, b.date);
      result.set(key, (result.get(key) ?? 0) + b.days);
    }
    return result;
  });

  /** The days booked per date over all orders. */
  private readonly byDate = computed(() => {
    const result = new Map<string, number>();
    for (const b of this.state()) result.set(b.date, (result.get(b.date) ?? 0) + b.days);
    return result;
  });

  /** Sets the bookings after a load or import, without writing them. */
  set(bookings: Booking[]): void {
    this.state.set(bookings);
  }

  /** The days booked on an order. Reading it tracks all bookings. */
  of(orderId: string): OrderBookings {
    return this.byOrder().get(orderId) ?? NONE;
  }

  /** The days booked on an order on one date (ISO), 0 for none. */
  onDay(orderId: string, date: string): number {
    return this.byOrderDay().get(dayKey(orderId, date)) ?? 0;
  }

  /** The days booked on one date (ISO) over all orders. */
  onDate(date: string): number {
    return this.byDate().get(date) ?? 0;
  }

  /** The booking of an order on one date (ISO), if any. */
  find(orderId: string, date: string): Booking | undefined {
    return this.state().find((b) => b.orderId === orderId && b.date === date);
  }

  /**
   * Books `days` on an order on one date (ISO); 0 or null removes the booking. `location` is
   * the day's own location, null for the order's; left out, the booking keeps the one it has.
   * Pass null where it is the order's location.
   */
  async book(
    orderId: string,
    date: string,
    days: number | null,
    location?: Location | null,
  ): Promise<void> {
    const existing = this.state().filter((b) => b.orderId === orderId && b.date === date);
    const own = location === undefined ? existing[0]?.location : (location ?? undefined);
    const keep: Booking | undefined =
      days && days > 0
        ? {
            id: existing[0]?.id ?? crypto.randomUUID(),
            orderId,
            date,
            days,
            ...(own ? { location: own } : {}),
          }
        : undefined;
    if (keep && existing.length === 1 && sameBooking(existing[0], keep)) return;
    const remove = existing.map((b) => b.id).filter((id) => id !== keep?.id);
    if (!keep && remove.length === 0) return;
    await this.db.saveBookings(keep ? [keep] : [], remove);
    // A changed booking keeps its place, a new one goes last: the timesheet shows a day's
    // bookings in the order they were made.
    this.state.update((bookings) => {
      const next = bookings.flatMap((b) =>
        b.orderId === orderId && b.date === date ? (keep && b.id === keep.id ? [keep] : []) : [b],
      );
      return keep && !next.includes(keep) ? [...next, keep] : next;
    });
  }

  /**
   * Writes and deletes bookings in one go, as when the orders of an open-booking project merge
   * into one. Written bookings keep their place.
   */
  async apply(put: Booking[], remove: string[]): Promise<void> {
    if (put.length === 0 && remove.length === 0) return;
    await this.db.saveBookings(put, remove);
    const byId = new Map(put.map((b) => [b.id, b]));
    const removed = new Set(remove);
    this.state.update((bookings) => {
      const next = bookings.filter((b) => !removed.has(b.id)).map((b) => byId.get(b.id) ?? b);
      const known = new Set(next.map((b) => b.id));
      return [...next, ...put.filter((b) => !known.has(b.id))];
    });
  }

  /**
   * Moves the days booked on one order on a date to another order, in one write, with the
   * day's own location (null for the new order's). Nothing happens when the other order has
   * days on that date already.
   */
  async move(fromOrderId: string, toOrderId: string, date: string, location: Location | null) {
    const from = this.find(fromOrderId, date);
    if (!from || fromOrderId === toOrderId || this.find(toOrderId, date)) return;
    const moved: Booking = {
      id: from.id,
      orderId: toOrderId,
      date,
      days: from.days,
      ...(location ? { location } : {}),
    };
    await this.db.saveBookings([moved], []);
    this.state.update((bookings) => bookings.map((b) => (b.id === from.id ? moved : b)));
  }
}

function sameBooking(a: Booking, b: Booking): boolean {
  return a.id === b.id && a.days === b.days && a.location === b.location;
}

function dayKey(orderId: string, date: string): string {
  return `${orderId}|${date}`;
}
