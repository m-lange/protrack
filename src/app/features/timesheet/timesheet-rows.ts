import { Booking, Location, MonthKey, Order, Project } from '../../core/data/model';
import { locationOf, runsIn, runsOn } from '../../core/data/orders';
import { sum } from '../../core/data/tree';
import { HolidayId } from '../../shared/dates/holidays';
import { OrderOption } from './order-select/order-select';

/** A day of the shown month. */
export interface Day {
  /** ISO date. */
  date: string;
  /** "Mon". */
  weekday: string;
  /** "3". */
  dayOfMonth: string;
  /** "Tue, Nov 3", for labels. */
  label: string;
  /** Weekends, public holidays and December 24 and 31 when they are off in full: greyed out. */
  off: boolean;
  /** A public holiday on the day; its name shows in the day cell. */
  holiday: HolidayId | null;
  today: boolean;
  /** After today: its project color is lighter, like an order's in My projects. */
  future: boolean;
  /**
   * The days a row books when an order is picked before any hours are typed: a full day, on
   * December 24 and 31 only the part that is work (4 h for half days off, user 2026-11-10).
   */
  defaultDays: number;
  /** A Monday after the 1st: a line above it sets the weeks apart. */
  weekStart: boolean;
  /** Days booked on the date over all orders. */
  booked: number;
}

/** An order with what the timesheet shows of it. */
export interface OrderEntry {
  order: Order;
  project: Project;
  option: OrderOption;
}

/** A row not booked yet: what has been picked or typed so far. */
export interface Draft {
  /** Tells the rows being made on one day apart; NEW_DRAFT for the row of an empty day. */
  id: number;
  orderId: string | null;
  /** Typed hours, in days. */
  days: number | null;
  /** A location of its own, null for the order's. */
  location: Location | null;
}

/** The id of the empty row a day without bookings shows before anything is typed into it. */
export const NEW_DRAFT = -1;
export const EMPTY_DRAFT: Draft = { id: NEW_DRAFT, orderId: null, days: null, location: null };

/** A row of the table: a booking, or an entry still being made. */
export interface Row {
  /** The date and the row's place in its day, so a row keeps its fields once it is booked. */
  key: string;
  day: Day;
  /** The first row of its day carries the day and its note. */
  first: boolean;
  booking: Booking | null;
  /** The row being made, for a row without booking. */
  draft: Draft | null;
  /** A booking or a row with something in it: it can be deleted. */
  canDelete: boolean;
  entry: OrderEntry | null;
  /** Booked or typed days. */
  days: number;
  /** Where the day is worked; null until an order is picked. */
  location: Location | null;
  /**
   * The orders the row can take, project by project, the project booked last before the row's
   * day first.
   */
  options: OrderOption[];
  /** Days booked on the order in the month up to this row. */
  total: number;
  /** Days planned for the order in the month; null for none. */
  forecast: number | null;
  /**
   * The order's budget less all days booked on it up to and including the row's day, over its
   * whole timeline (user, 2026-11-10); null without an order or without a budget (open booking).
   */
  remaining: number | null;
  /** Every row of the day has an order: + adds another row. */
  canAdd: boolean;
}

/** What the rows of a month are built from. */
export interface RowSource {
  /** The month shown. */
  month: MonthKey;
  days: readonly Day[];
  /** Every order by its id, in the order of My projects. */
  orders: ReadonlyMap<string, OrderEntry>;
  /** The bookings of all months: Remaining counts an order's whole timeline. */
  bookings: readonly Booking[];
  /** The days each project was booked on, by project id, the earliest first. */
  bookedDays: ReadonlyMap<string, readonly string[]>;
  /** Rows being made, by date, in their order. */
  drafts: ReadonlyMap<string, readonly Draft[]>;
}

/** The numbers a row shows of its order; `days` are the days the row itself books. */
type Figures = (
  order: Order,
  date: string,
  days?: number,
) => Pick<Row, 'total' | 'forecast' | 'remaining'>;

/** The rows of a month: for each day its bookings, then the rows being made on it. */
export function buildRows(source: RowSource): Row[] {
  const { month, orders } = source;
  const booked = groupBy(
    source.bookings.filter((b) => b.date.startsWith(month) && orders.has(b.orderId)),
    (b) => b.date,
  );
  const figures = orderFigures(source);
  return source.days.flatMap((day) => rowsOfDay(day, booked.get(day.date) ?? [], source, figures));
}

/**
 * The rows of one day: its bookings in the order they were made, so a row stays in place once
 * it is booked, then the rows being made. A day without either shows one empty row.
 */
function rowsOfDay(
  day: Day,
  booked: readonly Booking[],
  source: RowSource,
  figures: Figures,
): Row[] {
  let drafts = source.drafts.get(day.date) ?? [];
  if (!booked.length && !drafts.length) drafts = [EMPTY_DRAFT];
  const taken = new Set([
    ...booked.map((b) => b.orderId),
    ...drafts.flatMap((d) => (d.orderId ? [d.orderId] : [])),
  ]);
  // The orders a row can take: those of active projects running on the day, not on another
  // row of the day, and the row's own; project by project, the project booked last before
  // the day first.
  const listed = listedOrders(source, day.date);
  const optionsFor = (own: string | null) =>
    listed
      .filter(
        ({ order, project }) =>
          order.id === own ||
          (project.status === 'active' && runsOn(order, day.date) && !taken.has(order.id)),
      )
      .map((e) => e.option);
  const rows: Omit<Row, 'key' | 'first' | 'canAdd'>[] = [
    ...booked.map((booking) => {
      const entry = source.orders.get(booking.orderId)!;
      return {
        day,
        booking,
        draft: null,
        canDelete: true,
        entry,
        days: booking.days,
        location: locationOf(booking, entry.order),
        options: optionsFor(booking.orderId),
        ...figures(entry.order, day.date, booking.days),
      };
    }),
    ...drafts.map((draft) => {
      const entry = draft.orderId ? (source.orders.get(draft.orderId) ?? null) : null;
      return {
        day,
        booking: null,
        draft,
        canDelete: draft.id !== NEW_DRAFT,
        entry,
        days: draft.days ?? 0,
        location: entry ? (draft.location ?? entry.order.location) : null,
        options: optionsFor(entry?.order.id ?? null),
        ...(entry ? figures(entry.order, day.date) : { total: 0, forecast: null, remaining: null }),
      };
    }),
  ];
  const canAdd = rows.every((row) => row.entry !== null);
  return rows.map((row, index) => ({
    ...row,
    key: `${day.date}|${index}`,
    first: index === 0,
    canAdd,
  }));
}

/**
 * The numbers of an order as of a row: the days booked on it in the month up to the row, which
 * add up row by row in the order the rows are built, its forecast for the month and its
 * remaining budget on the row's day.
 */
function orderFigures({ month, bookings }: RowSource): Figures {
  const byOrder = groupBy(bookings, (b) => b.orderId);
  const running = new Map<string, number>();
  return (order, date, days = 0) => {
    const total = (running.get(order.id) ?? 0) + days;
    running.set(order.id, total);
    const spent = (byOrder.get(order.id) ?? []).filter((b) => b.date <= date).map((b) => b.days);
    return {
      total,
      forecast: runsIn(order, month) && order.forecast[month] ? order.forecast[month] : null,
      remaining: order.budget === null ? null : order.budget - sum(spent),
    };
  };
}

/**
 * Every order as the order pickers of a day list them (user, 2026-11-12): project by project,
 * first the project booked on the nearest day before, then the one booked before that, and
 * so on. Days without bookings don't count, nor do the day itself and the days after it. The
 * orders of a project stay as in My projects; so do projects last booked on the same day and,
 * at the end, those not booked before the day.
 */
function listedOrders({ orders, bookedDays }: RowSource, date: string): OrderEntry[] {
  const entries = [...orders.values()];
  const lastBefore = new Map<string, string>();
  for (const { project } of entries) {
    if (lastBefore.has(project.id)) continue;
    const days = bookedDays.get(project.id) ?? [];
    let at = days.length - 1;
    while (at >= 0 && days[at] >= date) at--;
    lastBefore.set(project.id, at >= 0 ? days[at] : '');
  }
  // The sort is stable: projects that tie, and the orders of a project, stay as they were.
  return entries.sort((a, b) =>
    lastBefore.get(b.project.id)!.localeCompare(lastBefore.get(a.project.id)!),
  );
}

/** Groups items by a key, each group in the order of the items. */
function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const group = groups.get(key(item));
    if (group) group.push(item);
    else groups.set(key(item), [item]);
  }
  return groups;
}
