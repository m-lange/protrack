import { DOCUMENT } from '@angular/common';
import {
  Component,
  ElementRef,
  computed,
  inject,
  input,
  linkedSignal,
  signal,
} from '@angular/core';
import {
  FormField,
  FormRoot,
  applyEach,
  applyWhen,
  form,
  required,
  validate,
} from '@angular/forms/signals';
import { Router, RouterLink } from '@angular/router';
import { BILLING, LOCATIONS, STATUSES, category, projectColor } from '../../../core/categories';
import { BookingStore } from '../../../core/data/booking-store';
import { CustomerStore } from '../../../core/data/customer-store';
import {
  BOOKING_MODE_IDS,
  Billing,
  BookingMode,
  HEX_COLOR,
  Location,
  PROJECT_COLOR_PRESETS,
  Project,
  ProjectStatus,
} from '../../../core/data/model';
import { OrderDraft, ProjectStore } from '../../../core/data/project-store';
import { SettingsStore } from '../../../core/data/settings-store';
import { Shortcuts } from '../../../core/shortcuts';
import { TODAY } from '../../../core/today';
import { STRINGS } from '../../../i18n/strings';
import { isIsoDay, isoDate, parseIsoDate } from '../../../shared/dates/months';
import { CustomerSelect } from '../../../shared/customer-select/customer-select';
import { Icon } from '../../../shared/icon/icon';
import { LocationSelect } from '../../../shared/location-select/location-select';
import { DateRangePipe } from '../../../shared/pipes/date-range-pipe';
import { formatDays, parseDays } from '../../../shared/pipes/days';
import { DaysPipe } from '../../../shared/pipes/days-pipe';
import { spanOf } from '../tree';

/**
 * An order of a PO-restricted project as the form edits it: the budget is the text typed. The
 * orders stay in the model while the form switches to open booking, so switching back doesn't
 * lose them; an open-booking project saves none of them but its default work location.
 */
interface OrderModel {
  id: string;
  name: string;
  start: string;
  end: string;
  budget: string;
  location: Location;
}

interface ProjectModel {
  customerId: string;
  name: string;
  color: string;
  status: ProjectStatus;
  billing: Billing;
  booking: BookingMode;
  orders: OrderModel[];
  /** The default work location of an open-booking project. */
  location: Location;
}

/** The hex code shown when a preset color's hex can't be read from the styles. */
const FIRST_CUSTOM_COLOR = '#2f9e8f';

/** Budgets are kept to two decimals. */
const BUDGET_STEP = 0.01;

/**
 * Adds a project (no id; `customer` from the query preselects its customer) or edits one: its
 * details, color and orders. The forecast of the orders is planned on the Forecast tab.
 */
@Component({
  selector: 'app-project-edit',
  imports: [
    FormField,
    FormRoot,
    RouterLink,
    CustomerSelect,
    DateRangePipe,
    DaysPipe,
    Icon,
    LocationSelect,
  ],
  templateUrl: './project-edit.html',
  styleUrl: './project-edit.css',
})
export class ProjectEdit {
  private readonly store = inject(ProjectStore);
  private readonly bookings = inject(BookingStore);
  private readonly router = inject(Router);
  private readonly today = inject(TODAY);
  private readonly settings = inject(SettingsStore);
  private readonly document = inject(DOCUMENT);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  protected readonly t = inject(STRINGS);
  protected readonly customers = inject(CustomerStore).customers;

  constructor() {
    // Ctrl+S saves like the Save button; Escape leaves like Cancel.
    inject(Shortcuts).use({
      save: () =>
        this.host.nativeElement.querySelector<HTMLFormElement>('#project-form')?.requestSubmit(),
      cancel: () => void this.router.navigate(['/projects']),
    });
  }

  /** The project's id from the route; absent for a new project. */
  readonly id = input<string>();
  /** The customer to preselect for a new project, from the query. */
  readonly customer = input<string>();

  protected readonly presets = PROJECT_COLOR_PRESETS;
  protected readonly statuses = STATUSES;
  protected readonly billings = BILLING;
  protected readonly bookingModes = BOOKING_MODE_IDS;
  protected readonly locations = LOCATIONS;
  protected readonly projectColor = projectColor;

  protected readonly isNew = computed(() => !this.id());
  protected readonly project = computed(() => {
    const id = this.id();
    return id ? this.store.get(id) : undefined;
  });
  protected readonly missing = computed(() => !this.isNew() && !this.project());

  protected readonly model = linkedSignal<ProjectModel>(() => {
    const project = this.project();
    return project ? toModel(project) : this.newModel();
  });
  protected readonly confirmingDelete = signal(false);

  protected readonly projectForm = form(
    this.model,
    (path) => {
      required(path.name, { message: this.t.projectEdit.nameRequired });
      required(path.customerId, { message: this.t.projectEdit.customerRequired });
      validate(path.name, ({ value, valueOf }) => {
        const name = value().trim().toLocaleLowerCase();
        const customerId = valueOf(path.customerId);
        const taken = this.store
          .projects()
          .some(
            (p) =>
              p.id !== this.id() &&
              p.customerId === customerId &&
              p.name.toLocaleLowerCase() === name,
          );
        const customer = this.customers().find((c) => c.id === customerId);
        return taken && customer
          ? {
              kind: 'duplicate',
              message: this.t.projectEdit.nameTaken(value().trim(), customer.name),
            }
          : undefined;
      });
      // Only PO-restricted projects have orders, each with a name, a timeline and a budget.
      // An open-booking project keeps them in the form only, unchecked and unsaved.
      applyWhen(
        path,
        ({ valueOf }) => valueOf(path.booking) === 'po',
        (po) =>
          applyEach(po.orders, (order) => {
            required(order.name);
            required(order.start);
            required(order.end);
            validate(order.start, ({ value }) =>
              isIsoDay(value()) ? undefined : { kind: 'dates' },
            );
            validate(order.end, ({ value }) => (isIsoDay(value()) ? undefined : { kind: 'dates' }));
            validate(order.end, ({ value, valueOf }) =>
              isIsoDay(value()) && isIsoDay(valueOf(order.start)) && value() < valueOf(order.start)
                ? { kind: 'endBeforeStart' }
                : undefined,
            );
            validate(order.budget, ({ value }) =>
              typeof parseDays(value(), BUDGET_STEP) === 'number' ? undefined : { kind: 'budget' },
            );
          }),
      );
    },
    {
      submission: {
        action: async () => {
          const model = this.model();
          const draft = {
            customerId: model.customerId,
            name: model.name,
            color: model.color,
            status: model.status,
            billing: model.billing,
            booking: model.booking,
            orders: model.orders.map((o): OrderDraft => ({
              id: o.id,
              name: o.name,
              start: o.start,
              end: o.end,
              budget: parseDays(o.budget, BUDGET_STEP) ?? 0,
              location: o.location,
            })),
            location: model.location,
          };
          const id = this.id();
          if (id) {
            await this.store.update(id, draft);
          } else {
            await this.store.create(draft);
          }
          await this.router.navigate(['/projects']);
          return undefined;
        },
      },
    },
  );

  /** The name in the header, live as it is typed; else the saved name or "New project". */
  protected readonly title = computed(
    () => this.model().name.trim() || this.project()?.name || this.t.projectEdit.newTitle,
  );
  protected readonly customerName = computed(
    () => this.customers().find((c) => c.id === this.model().customerId)?.name,
  );
  protected readonly color = computed(() => projectColor(this.model().color));
  protected readonly statusChip = computed(() => category(STATUSES, this.model().status).chip);
  protected readonly billingChip = computed(() => category(BILLING, this.model().billing).chip);

  /**
   * The custom colors to choose from: the user's own (removable), then the project's color when
   * it is custom but no longer among them.
   */
  protected readonly customColors = computed(() => {
    const own = this.settings.settings().customColors;
    const current = this.model().color;
    const colors = own.map((color) => ({ color, removable: true }));
    if (HEX_COLOR.test(current) && !own.includes(current)) {
      colors.push({ color: current, removable: false });
    }
    return colors;
  });

  /** The chosen color as `#rrggbb`, where the color picker starts. */
  protected readonly hex = computed(() => {
    const color = this.model().color;
    if (HEX_COLOR.test(color)) return color;
    const value = this.document.defaultView
      ?.getComputedStyle(this.document.documentElement)
      .getPropertyValue(`--project-${color}`)
      .trim()
      .toLowerCase();
    return value && HEX_COLOR.test(value) ? value : FIRST_CUSTOM_COLOR;
  });

  /** A project with booked days keeps its history: it can be completed, not deleted. */
  protected readonly hasBookings = computed(
    () => this.project()?.orders.some((o) => this.booked(o.id)) ?? false,
  );

  protected readonly nameError = computed(() => this.firstError(this.projectForm.name()));
  protected readonly customerError = computed(() => this.firstError(this.projectForm.customerId()));

  /** One message per order with a problem, once its fields were touched. */
  protected readonly orderErrors = computed(() => {
    const messages: string[] = [];
    const e = this.t.projectEdit.orderErrors;
    this.model().orders.forEach((order, index) => {
      const field = this.projectForm.orders[index];
      if (!field) return;
      const label = order.name.trim() || this.t.projectEdit.newOrder(index + 1);
      const kinds = (f: typeof field.name) =>
        f().touched()
          ? f()
              .errors()
              .map((error) => error.kind)
          : [];
      const end = kinds(field.end);
      if (kinds(field.name).length) messages.push(e.name(index + 1));
      if (kinds(field.start).length || end.some((kind) => kind !== 'endBeforeStart')) {
        messages.push(e.dates(label));
      } else if (end.length) {
        messages.push(e.endBeforeStart(label));
      }
      if (kinds(field.budget).length) messages.push(e.budget(label));
    });
    return messages;
  });

  /** "2 orders · 32 d budget · Sep 1, 2026 – Dec 18, 2026", over the orders with valid dates. */
  protected readonly summary = computed(() => {
    const orders = this.model().orders.filter(
      (o) => isIsoDay(o.start) && isIsoDay(o.end) && o.start <= o.end,
    );
    const budget = this.model().orders.reduce(
      (total, o) => total + (parseDays(o.budget, BUDGET_STEP) ?? 0),
      0,
    );
    return {
      count: this.model().orders.length,
      budget,
      span: spanOf(orders),
    };
  });

  protected invalid(field: { (): { touched(): boolean; errors(): readonly unknown[] } }): boolean {
    return field().touched() && field().errors().length > 0;
  }

  protected booked(orderId: string): boolean {
    return orderId !== '' && this.bookings.of(orderId).total > 0;
  }

  protected setStatus(status: ProjectStatus): void {
    this.model.update((m) => ({ ...m, status }));
  }

  protected setBilling(billing: Billing): void {
    this.model.update((m) => ({ ...m, billing }));
  }

  /**
   * Switches between PO-restricted and open booking; the orders keep what was typed. An
   * open-booking project's one order turns into a visible order at its default location.
   */
  protected setBooking(booking: BookingMode): void {
    this.model.update((m) => {
      if (booking === m.booking) return m;
      const fromOne = m.booking === 'open' && m.orders.length === 1;
      const orders = fromOne ? [{ ...m.orders[0], location: m.location }] : m.orders;
      return { ...m, booking, orders };
    });
  }

  /** The default work location of an open-booking project. */
  protected setLocation(location: Location): void {
    this.model.update((m) => ({ ...m, location }));
  }

  protected setColor(color: string): void {
    this.model.update((m) => ({ ...m, color: color.toLowerCase() }));
  }

  /** Chooses a custom color and keeps it among the user's own colors. */
  protected async addCustomColor(color: string): Promise<void> {
    const hex = color.toLowerCase();
    this.setColor(hex);
    const own = this.settings.settings().customColors;
    if (!own.includes(hex)) await this.settings.update({ customColors: [...own, hex] });
  }

  /** Removes a custom color from the user's own. Projects that use it keep it. */
  protected async removeCustomColor(color: string): Promise<void> {
    const own = this.settings.settings().customColors;
    await this.settings.update({ customColors: own.filter((c) => c !== color) });
  }

  /** Adds an order after the last one: it starts the day after and runs to the end of that quarter. */
  protected addOrder(): void {
    this.model.update((m) => {
      const last = m.orders.at(-1);
      const start =
        last && isIsoDay(last.end) ? addDays(parseIsoDate(last.end), 1) : this.todayStart();
      const quarterEnd = new Date(start.getFullYear(), Math.floor(start.getMonth() / 3) * 3 + 3, 0);
      const order: OrderModel = {
        id: '',
        name: this.t.projectEdit.newOrder(m.orders.length + 1),
        start: isoDate(start),
        end: isoDate(quarterEnd),
        budget: '',
        location: last?.location ?? 'onsite',
      };
      return { ...m, orders: [...m.orders, order] };
    });
  }

  protected removeOrder(index: number): void {
    this.model.update((m) => ({ ...m, orders: m.orders.filter((_, i) => i !== index) }));
  }

  protected async delete(): Promise<void> {
    const id = this.id();
    if (!id || this.hasBookings()) return;
    await this.store.remove(id);
    await this.router.navigate(['/projects']);
  }

  private firstError(field: {
    touched(): boolean;
    errors(): readonly { message?: string }[];
  }): string | undefined {
    return field.touched() ? field.errors()[0]?.message : undefined;
  }

  private todayStart(): Date {
    return new Date(this.today.getFullYear(), this.today.getMonth(), this.today.getDate());
  }

  /** A new project: the customer from the query (or the only one) and a color not yet in use. */
  private newModel(): ProjectModel {
    const customers = this.customers();
    const wanted = this.customer();
    const customerId = customers.some((c) => c.id === wanted)
      ? wanted!
      : customers.length === 1
        ? customers[0].id
        : '';
    const used = new Set(
      this.store
        .projects()
        .filter((p) => p.status === 'active')
        .map((p) => p.color),
    );
    return {
      customerId,
      name: '',
      color: PROJECT_COLOR_PRESETS.find((c) => !used.has(c)) ?? PROJECT_COLOR_PRESETS[0],
      status: 'active',
      billing: 'chargeable',
      booking: 'po',
      orders: [],
      location: 'onsite',
    };
  }
}

function toModel(project: Project): ProjectModel {
  return {
    customerId: project.customerId,
    name: project.name,
    color: project.color,
    status: project.status,
    billing: project.billing,
    booking: project.booking,
    orders: project.orders.map((o) => ({
      id: o.id,
      name: o.name,
      start: o.start ?? '',
      end: o.end ?? '',
      budget: o.budget === null ? '' : formatDays(o.budget),
      location: o.location,
    })),
    // Open booking: the location of its one order; PO-restricted: where a switch would start.
    location: project.orders[0]?.location ?? 'onsite',
  };
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}
