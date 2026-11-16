import { formatDate } from '@angular/common';
import {
  Component,
  ElementRef,
  Injector,
  LOCALE_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { projectColor } from '../../core/categories';
import { BookingStore } from '../../core/data/booking-store';
import { CustomerStore } from '../../core/data/customer-store';
import { DayNoteStore } from '../../core/data/day-note-store';
import { Booking, Location, Order, Project } from '../../core/data/model';
import { locationOf, runsIn, runsOn } from '../../core/data/orders';
import { ProjectStore } from '../../core/data/project-store';
import { SettingsStore } from '../../core/data/settings-store';
import { SelectedYear } from '../../core/selected-year';
import { Shortcuts } from '../../core/shortcuts';
import { TODAY } from '../../core/today';
import { STRINGS } from '../../i18n/strings';
import { HolidayId, holidaysOfYear, yearEndDays } from '../../shared/dates/holidays';
import { isoDate, monthKey, parseIsoDate } from '../../shared/dates/months';
import { Icon } from '../../shared/icon/icon';
import { renderMarkdown } from '../../shared/markdown';
import { LocationSelect } from '../../shared/location-select/location-select';
import { formatHours, parseHours } from '../../shared/pipes/days';
import { DaysPipe } from '../../shared/pipes/days-pipe';
import { DeltaPipe, deltaChip } from '../../shared/pipes/delta-pipe';
import { HoursPipe } from '../../shared/pipes/hours-pipe';
import { buildTree, sum } from '../projects/tree';
import { NoteChange, NoteDialog } from './note-dialog/note-dialog';
import { OrderOption, OrderSelect } from './order-select/order-select';

/** A day of the shown month. */
interface Day {
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
interface OrderEntry {
  order: Order;
  project: Project;
  option: OrderOption;
}

/** A row not booked yet: what has been picked or typed so far. */
interface Draft {
  /** Tells the rows being made on one day apart; NEW_DRAFT for the row of an empty day. */
  id: number;
  orderId: string | null;
  /** Typed hours, in days. */
  days: number | null;
  /** A location of its own, null for the order's. */
  location: Location | null;
}

/** The id of the empty row a day without bookings shows before anything is typed into it. */
const NEW_DRAFT = -1;
const EMPTY_DRAFT: Draft = { id: NEW_DRAFT, orderId: null, days: null, location: null };

/** A row of the table: a booking, or an entry still being made. */
interface Row {
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

/** Single entries above this many days (16 h) are taken for typos. */
const MAX_DAYS_PER_ENTRY = 2;
/** A day with more booked than this (8 h) gets a warning (overtime is allowed). */
const FULL_DAY = 1;

/**
 * My timesheet: one month, a row per day (and per further order booked on a day) with its
 * hours, project and order, location, and per row the order's Total, Forecast and Remaining in
 * the month up to that day, and the day's note (an icon that opens it in a dialog). The URL names the month: /timesheet/2026/11.
 */
@Component({
  selector: 'app-timesheet',
  imports: [
    RouterLink,
    DaysPipe,
    DeltaPipe,
    HoursPipe,
    Icon,
    LocationSelect,
    NoteDialog,
    OrderSelect,
  ],
  templateUrl: './timesheet.html',
  styleUrl: './timesheet.css',
})
export class Timesheet {
  protected readonly t = inject(STRINGS);
  private readonly locale = inject(LOCALE_ID);
  private readonly today = inject(TODAY);
  private readonly bookings = inject(BookingStore);
  private readonly customers = inject(CustomerStore).customers;
  private readonly projects = inject(ProjectStore).projects;
  private readonly dayNotes = inject(DayNoteStore);
  private readonly noteDialog = viewChild.required(NoteDialog);
  private readonly settingsStore = inject(SettingsStore);
  private readonly settings = this.settingsStore.settings;
  private readonly selectedYear = inject(SelectedYear);
  private readonly router = inject(Router);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly injector = inject(Injector);

  /** From the route: the year and month (1–12). */
  readonly year = input<string>();
  readonly month = input<string>();

  protected readonly deltaChip = deltaChip;
  protected readonly fullDay = FULL_DAY;

  /** The month shown; today's month when the route names none. */
  protected readonly ref = computed(() => {
    const year = Number(this.year());
    const month = Number(this.month());
    const valid = Number.isInteger(year) && year > 0 && Number.isInteger(month);
    const first =
      valid && month >= 1 && month <= 12
        ? new Date(year, month - 1, 1)
        : new Date(this.today.getFullYear(), this.today.getMonth(), 1);
    return {
      year: first.getFullYear(),
      /** 1–12. */
      month: first.getMonth() + 1,
      key: monthKey(first.getFullYear(), first.getMonth()),
      name: `${this.t.months[first.getMonth()]} ${first.getFullYear()}`,
    };
  });

  /**
   * The year picked in the top bar and the shown month go together: the month sets the year,
   * and picking another year in the top bar shows the same month in it.
   */
  constructor() {
    // Page up / Page down step the month, also from the hours; "." goes to today.
    const shortcuts = inject(Shortcuts);
    if (shortcuts.takeToday())
      afterNextRender(() => this.focusToday(), { injector: this.injector });
    shortcuts.use({
      previous: () => void this.router.navigate(this.adjacentMonths().previous.link),
      next: () => void this.router.navigate(this.adjacentMonths().next.link),
      today: () => void this.goToToday(),
      copy: () => void this.copyLastDay(),
      stepFromFields: true,
    });
    effect(() => {
      const year = this.ref().year;
      untracked(() => this.selectedYear.set(year));
    });
    // Rows being made belong to their month.
    effect(() => {
      this.ref();
      untracked(() => this.drafts.set(new Map()));
    });
    let seen = this.selectedYear.year();
    effect(() => {
      const year = this.selectedYear.year();
      if (year === seen) return;
      seen = year;
      const shown = untracked(this.ref);
      if (year !== shown.year) void this.router.navigate(['/timesheet', year, shown.month]);
    });
  }

  /** The months before and after, for the stepper. */
  protected readonly adjacentMonths = computed(() => {
    const { year, month } = this.ref();
    const at = (offset: number) => {
      const first = new Date(year, month - 1 + offset, 1);
      return {
        link: ['/timesheet', first.getFullYear(), first.getMonth() + 1],
        name: `${this.t.months[first.getMonth()]} ${first.getFullYear()}`,
      };
    };
    return { previous: at(-1), next: at(1) };
  });

  /** Whether the shown month is today's. */
  protected readonly isCurrentMonth = computed(
    () => this.ref().key === monthKey(this.today.getFullYear(), this.today.getMonth()),
  );

  /** Shows today's month. */
  protected showThisMonth(): Promise<boolean> {
    return this.router.navigate([
      '/timesheet',
      this.today.getFullYear(),
      this.today.getMonth() + 1,
    ]);
  }

  /** Shows today's month and puts the cursor into today's hours (the "." key). */
  private async goToToday(): Promise<void> {
    if (this.isCurrentMonth()) {
      this.focusToday();
      return;
    }
    await this.showThisMonth();
    afterNextRender(() => this.focusToday(), { injector: this.injector });
  }

  /**
   * The "+" key (user, 2026-11-13): copies the bookings of the shown month's last booked day
   * (order, hours, location) to its first working day without bookings. The cursor stays out of
   * the fields, so + can be pressed again and again (user, 2026-11-15). Orders that don't run on
   * that day are left out; with nothing to copy, nothing happens, without a message.
   */
  private async copyLastDay(): Promise<void> {
    if (this.locked()) return;
    const month = this.ref().key;
    const orders = this.orders();
    const booked = this.bookings
      .bookings()
      .filter((b) => b.date.startsWith(month) && orders.has(b.orderId));
    const last = booked.reduce((latest, b) => (b.date > latest ? b.date : latest), '');
    const target = this.days().find((day) => !day.off && day.booked === 0)?.date;
    if (!last || !target) return;
    const copies: Booking[] = booked
      .filter((b) => b.date === last)
      .filter((b) => {
        const { order, project } = orders.get(b.orderId)!;
        return project.status === 'active' && runsOn(order, target);
      })
      .map((b) => ({ ...b, id: crypto.randomUUID(), date: target }));
    if (!copies.length) return;
    await this.bookings.apply(copies, []);
    this.drafts.update((drafts) => {
      const next = new Map(drafts);
      next.delete(target);
      return next;
    });
  }

  private focusToday(): void {
    this.host.nativeElement.querySelector<HTMLInputElement>('.entry.today .hours-input')?.focus();
  }

  /** Whether the shown month is locked: its entries show but can't be changed. */
  protected readonly locked = computed(() => this.settings().lockedMonths.includes(this.ref().key));

  /** Locks the shown month, or unlocks it again. */
  protected async toggleLock(): Promise<void> {
    const key = this.ref().key;
    const months = this.settings().lockedMonths;
    await this.settingsStore.update({
      lockedMonths: months.includes(key)
        ? months.filter((m) => m !== key)
        : [...months, key].sort(),
    });
  }

  protected readonly days = computed<Day[]>(() => {
    const { year, month } = this.ref();
    const { region, yearEndDaysOff } = this.settings();
    const holidays = holidaysOfYear(year, region);
    // December 24 and 31: as much of them is work as Settings leave. They grey out only when
    // they are off in full; their name never shows, only public holidays do (user, 2026-11-10).
    const yearEnd = yearEndDays(year);
    const yearEndWork = 1 - yearEndDaysOff / 100;
    const today = isoDate(this.today);
    const count = new Date(year, month, 0).getDate();
    return Array.from({ length: count }, (_, index) => {
      const day = new Date(year, month - 1, index + 1);
      const date = isoDate(day);
      const weekday = (day.getDay() + 6) % 7;
      const holiday = holidays.get(date) ?? null;
      const work = holiday === null && yearEnd.includes(date) ? yearEndWork : 1;
      return {
        date,
        weekday: this.t.weekdaysShort[weekday],
        dayOfMonth: String(index + 1),
        label: formatDate(day, this.t.formats.weekDay, this.locale),
        off: weekday >= 5 || holiday !== null || work === 0,
        holiday,
        // A day off in full still books a full day by default, like a public holiday.
        defaultDays: work > 0 ? work * FULL_DAY : FULL_DAY,
        today: date === today,
        future: date > today,
        weekStart: weekday === 0 && index > 0,
        booked: this.bookings.onDate(date),
      };
    });
  });

  /** Every order, in the order of My projects (customer, project, order), with its option. */
  private readonly orders = computed(() => {
    const entries = new Map<string, OrderEntry>();
    for (const node of buildTree(this.customers(), this.projects(), 'all')) {
      for (const { project, orders } of node.projects) {
        for (const order of orders) {
          entries.set(order.id, {
            order,
            project,
            option: {
              id: order.id,
              projectId: project.id,
              project: project.name,
              // An open-booking project shows as itself: its one order has no name of its own.
              order: project.booking === 'open' ? '' : order.name,
              customer: node.customer.name,
              color: projectColor(project.color),
            },
          });
        }
      }
    }
    return entries;
  });

  /** Whether there is any order to book on. */
  protected readonly hasOrders = computed(() => this.orders().size > 0);

  /** The days each project was booked on, by project id, the earliest first. */
  private readonly bookedDays = computed(() => {
    const orders = this.orders();
    const days = new Map<string, string[]>();
    for (const { orderId, date } of this.bookings.bookings()) {
      const projectId = orders.get(orderId)?.project.id;
      if (!projectId) continue;
      const list = days.get(projectId);
      if (list) list.push(date);
      else days.set(projectId, [date]);
    }
    for (const list of days.values()) list.sort();
    return days;
  });

  /**
   * Every order as the order pickers of a day list them (user, 2026-11-12): project by project,
   * first the project booked on the nearest day before, then the one booked before that, and
   * so on. Days without bookings don't count, nor do the day itself and the days after it. The
   * orders of a project stay as in My projects; so do projects last booked on the same day and,
   * at the end, those not booked before the day.
   */
  private listedOrders(date: string): OrderEntry[] {
    const booked = this.bookedDays();
    const entries = [...this.orders().values()];
    const lastBefore = new Map<string, string>();
    for (const { project } of entries) {
      if (lastBefore.has(project.id)) continue;
      const days = booked.get(project.id) ?? [];
      let at = days.length - 1;
      while (at >= 0 && days[at] >= date) at--;
      lastBefore.set(project.id, at >= 0 ? days[at] : '');
    }
    // The sort is stable: projects that tie, and the orders of a project, stay as they were.
    return entries.sort((a, b) =>
      lastBefore.get(b.project.id)!.localeCompare(lastBefore.get(a.project.id)!),
    );
  }

  /** Rows being made, by date, in their order. A day without bookings always shows one. */
  private readonly drafts = signal<ReadonlyMap<string, readonly Draft[]>>(new Map());
  private nextDraftId = 0;

  protected readonly rows = computed<Row[]>(() => {
    const month = this.ref().key;
    const orders = this.orders();
    const drafts = this.drafts();
    const byDate = new Map<string, Booking[]>();
    for (const booking of this.bookings.bookings()) {
      if (!booking.date.startsWith(month) || !orders.has(booking.orderId)) continue;
      byDate.set(booking.date, [...(byDate.get(booking.date) ?? []), booking]);
    }
    const running = new Map<string, number>();
    const forecastOf = (order: Order) =>
      runsIn(order, month) && order.forecast[month] ? order.forecast[month] : null;
    // All bookings of each order, to sum them up to a day.
    const bookedOn = new Map<string, Booking[]>();
    for (const booking of this.bookings.bookings()) {
      bookedOn.set(booking.orderId, [...(bookedOn.get(booking.orderId) ?? []), booking]);
    }
    const remainingOf = (order: Order, date: string) =>
      order.budget === null
        ? null
        : order.budget -
          sum((bookedOn.get(order.id) ?? []).filter((b) => b.date <= date).map((b) => b.days));
    const rows: Row[] = [];
    for (const day of this.days()) {
      // In the order they were made, so a row stays in place once it is booked.
      const booked = byDate.get(day.date) ?? [];
      let dayDrafts = drafts.get(day.date) ?? [];
      if (!booked.length && !dayDrafts.length) dayDrafts = [EMPTY_DRAFT];
      const taken = new Set([
        ...booked.map((b) => b.orderId),
        ...dayDrafts.flatMap((d) => (d.orderId ? [d.orderId] : [])),
      ]);
      // The orders a row can take: those of active projects running on the day, not on another
      // row of the day, and the row's own; project by project, the project booked last before
      // the day first.
      const listed = this.listedOrders(day.date);
      const optionsFor = (own: string | null) =>
        listed
          .filter(
            ({ order, project }) =>
              order.id === own ||
              (project.status === 'active' && runsOn(order, day.date) && !taken.has(order.id)),
          )
          .map((e) => e.option);
      const dayRows: Row[] = booked.map((booking) => {
        const entry = orders.get(booking.orderId)!;
        const total = (running.get(booking.orderId) ?? 0) + booking.days;
        running.set(booking.orderId, total);
        return {
          key: '',
          day,
          first: false,
          booking,
          draft: null,
          canDelete: true,
          entry,
          days: booking.days,
          location: locationOf(booking, entry.order),
          options: optionsFor(booking.orderId),
          total,
          forecast: forecastOf(entry.order),
          remaining: remainingOf(entry.order, day.date),
          canAdd: false,
        };
      });
      for (const draft of dayDrafts) {
        const entry = draft.orderId ? (orders.get(draft.orderId) ?? null) : null;
        dayRows.push({
          key: '',
          day,
          first: false,
          booking: null,
          draft,
          canDelete: draft.id !== NEW_DRAFT,
          entry,
          days: draft.days ?? 0,
          location: entry ? (draft.location ?? entry.order.location) : null,
          options: optionsFor(entry?.order.id ?? null),
          total: entry ? (running.get(entry.order.id) ?? 0) : 0,
          forecast: entry ? forecastOf(entry.order) : null,
          remaining: entry ? remainingOf(entry.order, day.date) : null,
          canAdd: false,
        });
      }
      dayRows.forEach((row, index) => (row.key = `${day.date}|${index}`));
      dayRows[0].first = true;
      const canAdd = dayRows.every((row) => row.entry !== null);
      for (const row of dayRows) row.canAdd = canAdd;
      rows.push(...dayRows);
    }
    return rows;
  });

  /**
   * The month in all: hours booked, the forecast of all orders, and the remaining budget of the
   * orders on the month's rows, each as of its last row in the month.
   */
  protected readonly monthTotals = computed(() => {
    const month = this.ref().key;
    const booked = sum(this.days().map((d) => d.booked));
    const planned = sum(
      [...this.orders().values()].map(({ order }) =>
        runsIn(order, month) ? (order.forecast[month] ?? 0) : 0,
      ),
    );
    const remainingByOrder = new Map<string, number>();
    for (const row of this.rows()) {
      if (row.entry && row.remaining !== null) {
        remainingByOrder.set(row.entry.order.id, row.remaining);
      }
    }
    const remaining = remainingByOrder.size ? sum([...remainingByOrder.values()]) : null;
    return { booked, planned, remaining };
  });

  /** The booked days as the input shows them, in hours, or '' for none. */
  protected value(days: number): string {
    return days ? formatHours(days) : '';
  }

  // Changes ------------------------------------------------------------------------------------

  /**
   * Saves the hours typed into a row, rounded up to a half hour, as days. A row without an
   * order keeps them until one is picked. Anything that is not a number of hours is undone, and
   * so is anything typed into a locked month. Clearing a booking's hours removes it.
   */
  protected async setHours(input: HTMLInputElement, row: Row): Promise<void> {
    const days = parseHours(input.value);
    if (this.locked() || days === undefined || (days !== null && days > MAX_DAYS_PER_ENTRY)) {
      input.value = this.value(row.days);
      return;
    }
    input.value = this.value(days ?? 0);
    const date = row.day.date;
    if (row.booking) {
      await this.bookings.book(row.booking.orderId, date, days);
      return;
    }
    const draft = { ...row.draft!, days };
    if (draft.orderId && days) await this.commit(date, draft);
    else this.setDraft(date, draft);
  }

  /**
   * Puts a row on an order. A booking moves with its days; a row being made is booked at once,
   * with the hours typed into it or a full day (user, 2026-11-10). A second order on a day whose
   * one booking is a full day splits the day: both get half (user, 2026-11-15).
   */
  protected async pickOrder(row: Row, orderId: string | null): Promise<void> {
    const entry = orderId ? this.orders().get(orderId) : undefined;
    if (this.locked() || !entry) return;
    const date = row.day.date;
    if (row.booking) {
      if (row.booking.orderId === orderId) return;
      // A location of the day's own stays, unless it is the new order's anyway.
      const own = row.booking.location ?? null;
      await this.bookings.move(
        row.booking.orderId,
        entry.order.id,
        date,
        own === entry.order.location ? null : own,
      );
      return;
    }
    const current = row.draft!;
    const location = current.location === entry.order.location ? null : current.location;
    const booked = this.bookings
      .bookings()
      .filter((b) => b.date === date && this.orders().has(b.orderId));
    if (current.days === null && booked.length === 1 && booked[0].days === row.day.defaultDays) {
      const half = row.day.defaultDays / 2;
      await this.bookings.apply(
        [
          { ...booked[0], days: half },
          {
            id: crypto.randomUUID(),
            orderId: entry.order.id,
            date,
            days: half,
            ...(location ? { location } : {}),
          },
        ],
        [],
      );
      this.removeRow(date, current);
      return;
    }
    await this.commit(date, {
      ...current,
      orderId: entry.order.id,
      days: current.days ?? row.day.defaultDays,
      location,
    });
  }

  /** Sets where a row's day is worked; the order's location means none of its own. */
  protected async setLocation(row: Row, location: Location): Promise<void> {
    if (this.locked() || !row.entry) return;
    const own = location === row.entry.order.location ? null : location;
    if (row.booking) {
      await this.bookings.book(row.booking.orderId, row.day.date, row.booking.days, own);
    } else {
      this.setDraft(row.day.date, { ...row.draft!, location: own });
    }
  }

  /**
   * Deletes a row: its booking, or what was picked or typed into it. A day's only row starts
   * over empty.
   */
  protected async deleteRow(row: Row): Promise<void> {
    if (this.locked()) return;
    if (row.booking) await this.bookings.book(row.booking.orderId, row.day.date, null);
    else if (row.draft) this.removeRow(row.day.date, row.draft);
  }

  /** Adds a row at the end of a day for another order. */
  protected addRow(date: string): void {
    if (this.locked()) return;
    this.setDraft(date, { ...EMPTY_DRAFT, id: this.nextDraftId++ });
  }

  /** Takes away a row being made. */
  private removeRow(date: string, draft: Draft): void {
    this.drafts.update((drafts) => {
      const next = new Map(drafts);
      const rest = (next.get(date) ?? []).filter((d) => d.id !== draft.id);
      if (rest.length) next.set(date, rest);
      else next.delete(date);
      return next;
    });
  }

  /** Keeps what was picked or typed into a row being made, in its place. */
  private setDraft(date: string, draft: Draft): void {
    this.drafts.update((drafts) => {
      const list = drafts.get(date) ?? [];
      const saved = draft.id === NEW_DRAFT ? { ...draft, id: this.nextDraftId++ } : draft;
      const at = list.findIndex((d) => d.id === draft.id);
      const next = at < 0 ? [...list, saved] : list.map((d, i) => (i === at ? saved : d));
      return new Map(drafts).set(date, next);
    });
  }

  /** Books a row that has an order and hours; it is a booking row from then on. */
  private async commit(date: string, draft: Draft): Promise<void> {
    await this.bookings.book(draft.orderId!, date, draft.days, draft.location);
    this.removeRow(date, draft);
  }

  // Notes --------------------------------------------------------------------------------------

  protected note(date: string): string {
    return this.dayNotes.of(date);
  }

  /** The note shown as a tooltip beside its icon, rendered from Markdown; null for none. */
  protected readonly tip = signal<{ date: string; html: string } | null>(null);

  /** Shows a day's note beside its icon (user, 2026-11-10: rendered, not as plain text). */
  protected showTip(date: string, text: string): void {
    this.tip.set(text ? { date, html: renderMarkdown(text) } : null);
  }

  /** Opens a day's note in the dialog; in a locked month only to read it. */
  protected openNote(day: Day): void {
    // The title writes the month out (user, 2026-11-10): "Note · Mon, November 2".
    const label = formatDate(parseIsoDate(day.date), this.t.formats.weekDayLong, this.locale);
    this.noteDialog().open(day.date, label, this.note(day.date), this.locked());
  }

  /** Saves a note from the dialog; blank text deletes it. A locked month keeps its notes. */
  protected async saveNote({ date, text }: NoteChange): Promise<void> {
    if (this.locked()) return;
    await this.dayNotes.save(date, text);
  }

  // Keyboard -----------------------------------------------------------------------------------

  /**
   * Moves between the hour fields like in a spreadsheet: up and down, Enter and Shift+Enter to
   * the row below and above.
   */
  protected navigate(event: KeyboardEvent): void {
    const field = event.target;
    if (!(field instanceof HTMLInputElement) || !field.classList.contains('hours-input')) return;
    let step: number;
    switch (event.key) {
      case 'ArrowUp':
        step = -1;
        break;
      case 'ArrowDown':
        step = 1;
        break;
      case 'Enter':
        step = event.shiftKey ? -1 : 1;
        break;
      default:
        return;
    }
    const fields = [
      ...(event.currentTarget as HTMLElement).querySelectorAll<HTMLInputElement>(
        'input.hours-input',
      ),
    ];
    const next = fields[fields.indexOf(field) + step];
    event.preventDefault();
    if (next) {
      next.focus();
      next.select();
    } else {
      // In the last row, Enter still saves what was typed.
      field.blur();
    }
  }
}
