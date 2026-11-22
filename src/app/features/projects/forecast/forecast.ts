import { NgTemplateOutlet, PercentPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { projectColor } from '../../../core/categories';
import {
  TargetStatus,
  chargeabilityByMonth,
  sumChargeability,
  targetStatus,
} from '../../../core/chargeability';
import { BookingStore } from '../../../core/data/booking-store';
import { CustomerStore } from '../../../core/data/customer-store';
import { MonthKey, Order, Project } from '../../../core/data/model';
import { openOrder } from '../../../core/data/open-booking';
import { runsBetween, runsIn, timelineOf } from '../../../core/data/orders';
import { ProjectStore } from '../../../core/data/project-store';
import { SettingsStore } from '../../../core/data/settings-store';
import {
  CustomerNode,
  ForecastFigures,
  buildTree,
  orderForecast,
  sumForecasts,
} from '../../../core/data/tree';
import { SelectedYear } from '../../../core/selected-year';
import { TODAY } from '../../../core/today';
import { STRINGS } from '../../../i18n/strings';
import { CustomerBadge } from '../../../shared/customer-badge/customer-badge';
import { daysOff } from '../../../shared/dates/holidays';
import { monthOf, monthsOfYear } from '../../../shared/dates/months';
import { Icon } from '../../../shared/icon/icon';
import { DateRangePipe } from '../../../shared/pipes/date-range-pipe';
import { formatDays, parseDays } from '../../../shared/pipes/days';
import { DaysPipe } from '../../../shared/pipes/days-pipe';
import { DeltaPipe, deltaChip } from '../../../shared/pipes/delta-pipe';
import { TreeState, customerKey, projectKey } from '../tree-state';

/**
 * A month column, or January through a later month folded into one column. Months before the
 * current one show bookings; from it on, the forecast.
 */
interface MonthColumn {
  /** The month, or the first month of a folded column. */
  key: MonthKey;
  /** The indexes of the first and last month (0–11) the column covers. */
  from: number;
  to: number;
  short: string;
  name: string;
  /** Whether every month of the column is booked rather than planned. */
  actual: boolean;
  /** Whether the column covers the current month. */
  current: boolean;
  folded: boolean;
  /**
   * The label of the head's button: unfold a folded column, or fold January through this month
   * (not January itself, nor December, which the Total shows); null for no button.
   */
  toggleLabel: string | null;
}

interface OrderRow {
  order: Order;
  figures: ForecastFigures;
}

interface ProjectRow {
  project: Project;
  color: string;
  figures: ForecastFigures;
  orders: OrderRow[];
}

interface CustomerRow {
  node: CustomerNode;
  figures: ForecastFigures;
  projects: ProjectRow[];
}

/** The badge of a chargeability by how it compares to the target. */
const CHARGE_CHIPS: Record<TargetStatus, string> = {
  met: 'pt-chip--plus',
  near: 'pt-chip--minus',
  below: 'pt-chip--minus-strong',
};

/** Plans above this many days in one month are taken for typos. */
const MAX_DAYS_PER_MONTH = 31;

/**
 * The Forecast tab of My projects: the year picked in the top bar in months. Months before the
 * current one show the booked days; from the current month on, every order row has an input,
 * which takes days only in the months of the order's timeline.
 */
@Component({
  selector: 'app-forecast',
  imports: [NgTemplateOutlet, PercentPipe, CustomerBadge, DateRangePipe, DaysPipe, DeltaPipe, Icon],
  templateUrl: './forecast.html',
  styleUrl: './forecast.css',
})
export class Forecast {
  protected readonly t = inject(STRINGS);
  protected readonly tree = inject(TreeState);
  protected readonly year = inject(SelectedYear).year;
  private readonly customers = inject(CustomerStore).customers;
  private readonly store = inject(ProjectStore);
  private readonly bookings = inject(BookingStore);
  protected readonly settings = inject(SettingsStore).settings;
  /** What the working days row counts, with the federal state and the year-end days from Settings. */
  protected readonly workingDaysHint = computed(() => {
    const { region, yearEndDaysOff } = this.settings();
    const holidays = region
      ? this.t.forecast.workingDaysHint(this.t.regions[region])
      : this.t.forecast.workingDaysHintNoRegion;
    return yearEndDaysOff > 0 ? this.t.forecast.yearEndHint(holidays, yearEndDaysOff) : holidays;
  });
  private readonly currentMonth = monthOf(inject(TODAY));

  protected readonly customerKey = customerKey;
  protected readonly projectKey = projectKey;

  /** The twelve months of the year. */
  protected readonly months = computed<MonthColumn[]>(() =>
    monthsOfYear(this.year()).map((key, index) => ({
      key,
      from: index,
      to: index,
      short: this.t.monthsShort[index],
      name: `${this.t.months[index]} ${this.year()}`,
      actual: key < this.currentMonth,
      current: key === this.currentMonth,
      folded: false,
      toggleLabel: index > 0 && index < 11 ? this.t.forecast.fold(this.foldedName(index)) : null,
    })),
  );

  /** The month columns as shown: January through the folded month in one, then single months. */
  protected readonly columns = computed<MonthColumn[]>(() => {
    const months = this.months();
    const through = this.tree.foldedThrough();
    if (through === null) return months;
    const last = months[through];
    const folded: MonthColumn = {
      key: months[0].key,
      from: 0,
      to: through,
      // The folded column shows only its expand chevron, no month name.
      short: '',
      name: this.foldedName(through),
      actual: last.actual,
      current: months.slice(0, through + 1).some((m) => m.current),
      folded: true,
      toggleLabel: this.t.forecast.unfold(this.foldedName(through)),
    };
    return [folded, ...months.slice(through + 1)];
  });

  /** "January to March 2026": January through a month of the year. */
  private foldedName(through: number): string {
    return this.t.forecast.foldedName(this.t.months[0], this.t.months[through], this.year());
  }

  /** The sum of a column's months in a list of twelve monthly figures. */
  protected sum(values: readonly number[], column: MonthColumn): number {
    let total = 0;
    for (let i = column.from; i <= column.to; i++) total += values[i];
    return total;
  }

  /**
   * The active projects with the orders that run in the year or have bookings in it; completed
   * projects stay out (user, 2026-11-19). Orders without a timeline (open booking) run in
   * every year.
   */
  protected readonly rows = computed<CustomerRow[]>(() => {
    const months = this.months().map((m) => m.key);
    const year = this.year();
    const inYear = (order: Order) =>
      !timelineOf(order) ||
      runsBetween(order, `${year}-01-01`, `${year}-12-31`) ||
      months.some((month) => this.bookings.of(order.id).byMonth.has(month));
    const nodes = buildTree(this.customers(), this.store.projects(), 'active', { orders: inYear });
    return nodes.map((node) => this.customerRow(node, months));
  });

  /**
   * Chargeability per month and for the year: chargeable days divided by the working days
   * (Monday to Friday without public holidays) less the out-of-office days. Like the rows, it
   * uses booked days before the current month and planned days from it on, over all projects.
   */
  protected readonly chargeability = computed(() => {
    const year = this.year();
    const charge = chargeabilityByMonth(
      year,
      this.store.projects(),
      (orderId) => this.bookings.of(orderId),
      daysOff(year, this.settings().region, this.settings().yearEndDaysOff),
      this.currentMonth,
    );
    return {
      /**
       * Per column: all days over all projects (booked before the current month, then planned),
       * the working days (Monday to Friday without public holidays) and the chargeability.
       */
      columns: this.columns().map((c) => sumChargeability(charge.months.slice(c.from, c.to + 1))),
      year: charge,
      /** Whether the year's figure rests on planned days, at least in part. */
      planned: this.months().some((m) => !m.actual),
    };
  });

  /**
   * The months in which all projects together have more days than working days: their inputs
   * are tinted like the All projects cell (user, 2026-11-19).
   */
  protected readonly overMonths = computed(
    () =>
      new Set(
        this.chargeability()
          .year.months.filter((m) => m.days > m.workingDays)
          .map((m) => m.month),
      ),
  );

  /**
   * The badge color of a chargeability, against the target (like the Remaining badges): at or
   * above the target green, up to 10 points below yellow, further below red.
   */
  protected chargeChip(share: number): string {
    return CHARGE_CHIPS[targetStatus(share, this.settings().chargeabilityTarget)];
  }

  protected readonly timelineOf = timelineOf;
  protected readonly openOrder = openOrder;

  /**
   * Whether an order can be planned in a month: a forecast month of its timeline, or any
   * forecast month for an order without one (open booking).
   */
  protected canPlan(order: Order, month: MonthColumn): boolean {
    return !month.actual && runsIn(order, month.key);
  }

  /** The planned days as the input shows them, or '' for none. */
  protected planned(order: Order, month: MonthKey): string {
    const days = order.forecast[month];
    return days ? formatDays(days) : '';
  }

  /** The delta chip's variant for Budget − forecast (Chip README). */
  protected readonly deltaChip = deltaChip;

  /** Saves what was typed into a forecast input; anything that is not a number of days is undone. */
  protected async plan(
    input: HTMLInputElement,
    project: Project,
    order: Order,
    month: MonthKey,
  ): Promise<void> {
    const days = parseDays(input.value);
    if (days === undefined || (days !== null && days > MAX_DAYS_PER_MONTH)) {
      input.value = this.planned(order, month);
      return;
    }
    await this.store.setForecast(project.id, order.id, month, days);
    input.value = days ? formatDays(days) : '';
  }

  private customerRow(node: CustomerNode, months: MonthKey[]): CustomerRow {
    const projects = node.projects.map(({ project, orders }): ProjectRow => {
      const orderRows = orders.map((order) => ({
        order,
        figures: orderForecast(order, this.bookings.of(order.id), months, this.currentMonth),
      }));
      return {
        project,
        color: projectColor(project.color),
        figures: sumForecasts(orderRows.map((o) => o.figures)),
        orders: orderRows,
      };
    });
    return { node, projects, figures: sumForecasts(projects.map((p) => p.figures)) };
  }
}
