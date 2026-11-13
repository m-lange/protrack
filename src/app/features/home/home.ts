import { Component, computed, inject } from '@angular/core';
import { TargetStatus, chargeabilityByMonth, targetStatus } from '../../core/chargeability';
import { BookingStore } from '../../core/data/booking-store';
import { CustomerStore } from '../../core/data/customer-store';
import { ProjectStore } from '../../core/data/project-store';
import { SettingsStore } from '../../core/data/settings-store';
import { SelectedYear } from '../../core/selected-year';
import { TODAY } from '../../core/today';
import { STRINGS } from '../../i18n/strings';
import { daysOff } from '../../shared/dates/holidays';
import { monthOf } from '../../shared/dates/months';
import { formatDays } from '../../shared/pipes/days';
import { BudgetOverview } from './budget-overview/budget-overview';
import { budgetRows } from './budget-overview/budgets';
import { ChargeabilityChart } from './chargeability-chart/chargeability-chart';
import { LocationChart } from './location-chart/location-chart';
import { LocationDaysChart } from './location-days-chart/location-days-chart';
import { TrendChart, TrendSeries } from './trend-chart/trend-chart';
import { BILLING, LOCATIONS, category } from '../../core/categories';
import { trends } from './trends/trends';
import { locationShares } from './location-chart/location-shares';
import { yearKpis } from './year-kpis';

/**
 * The start page: the year picked in the top bar at a glance. Four KPI tiles, chargeability by
 * month, the booked days by location and month (shares, then days with out of office), the
 * remaining budget by project, and at the bottom chargeability and the location shares over all
 * years.
 */
@Component({
  selector: 'app-home',
  imports: [BudgetOverview, ChargeabilityChart, LocationChart, LocationDaysChart, TrendChart],
  templateUrl: './home.html',
  styleUrl: './home.css',
})
export class Home {
  protected readonly t = inject(STRINGS);
  private readonly today = inject(TODAY);
  protected readonly year = inject(SelectedYear).year;
  protected readonly settings = inject(SettingsStore).settings;
  private readonly customers = inject(CustomerStore).customers;
  private readonly projects = inject(ProjectStore).projects;
  private readonly bookingStore = inject(BookingStore);
  private readonly bookings = this.bookingStore.bookings;

  /** Public holidays, and December 24 and 31 as far as the company gives them off. */
  private readonly holidays = computed(() =>
    daysOff(this.year(), this.settings().region, this.settings().yearEndDaysOff),
  );

  protected readonly hasProjects = computed(() => this.projects().length > 0);

  protected readonly kpis = computed(() =>
    yearKpis(this.year(), this.projects(), this.bookings(), this.holidays(), this.today),
  );

  protected readonly chargeabilityByMonth = computed(() =>
    chargeabilityByMonth(
      this.year(),
      this.projects(),
      (orderId) => this.bookingStore.of(orderId),
      this.holidays(),
      monthOf(this.today),
    ),
  );

  protected readonly budgets = computed(() =>
    budgetRows(this.customers(), this.projects(), (orderId) => this.bookingStore.of(orderId)),
  );

  protected readonly locations = computed(() =>
    locationShares(this.year(), this.projects(), this.bookings()),
  );

  /** Every month from the first booking to last month, over all years; not the picked year. */
  protected readonly trends = computed(() =>
    trends(
      this.projects(),
      this.bookings(),
      (orderId) => this.bookingStore.of(orderId),
      this.settings(),
      this.today,
    ),
  );

  protected readonly chargeTrend = computed<TrendSeries[]>(() => [
    {
      id: 'chargeability',
      name: this.t.home.chargeability,
      color: category(BILLING, 'chargeable').color,
      values: this.trends()?.chargeability ?? [],
    },
  ]);

  /** The work locations in the order of the location charts: on-site, Reply, home office. */
  protected readonly locationTrend = computed<TrendSeries[]>(() =>
    (['onsite', 'reply', 'home'] as const).map((id) => ({
      id,
      name: this.t.locations[id],
      color: category(LOCATIONS, id).color,
      values: this.trends()?.locations[id] ?? [],
    })),
  );

  /** The year-end forecast's tooltip, with the booked and planned days once there are any. */
  protected readonly forecastTooltip = computed(() => {
    const forecast = this.kpis().forecast;
    const title = this.t.home.forecastTitle;
    if (!forecast) return title;
    const detail = this.t.home.forecastDetail(
      formatDays(forecast.booked),
      formatDays(forecast.planned),
    );
    return this.t.home.tooltip(title, detail);
  });

  /** The chargeability's tooltip, with its days and the target once there are any. */
  protected readonly chargeabilityTooltip = computed(() => {
    const charge = this.kpis().chargeability;
    const title = this.t.home.chargeabilityTitle;
    if (!charge) return title;
    const detail = this.t.home.chargeabilityDetail(
      formatDays(charge.chargeable),
      formatDays(charge.available),
      this.settings().chargeabilityTarget,
    );
    return this.t.home.tooltip(title, detail);
  });

  /** Person-days written out ("143 days"); "–" when there are none. */
  protected days(value: number | undefined): string {
    return value === undefined ? this.t.common.empty : this.t.home.days(formatDays(value));
  }

  /** A projection in whole days: it is an estimate. */
  protected roundDays(value: number | undefined): number | undefined {
    return value === undefined ? undefined : Math.round(value);
  }

  /** A share in whole percent with a space before the sign ("73 %"); "–" when there is none. */
  protected percent(share: number | undefined): string {
    return share === undefined ? this.t.common.empty : this.t.home.percent(Math.round(share * 100));
  }

  /** How a tile's share compares to the chargeability target; null leaves the tile neutral. */
  protected status(share: number | null | undefined): TargetStatus | null {
    return share === null || share === undefined
      ? null
      : targetStatus(share, this.settings().chargeabilityTarget);
  }
}
