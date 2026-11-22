import { Component, computed, inject, input } from '@angular/core';
import { BILLING, category } from '../../../core/categories';
import { Chargeability, YearChargeability } from '../../../core/chargeability';
import { STRINGS } from '../../../i18n/strings';
import { formatDays } from '../../../shared/pipes/days';

/** The plot of the TargetBarChart: 1.4px per percent, so 100% is 140px of the 220px plot. */
const PX_PER_PERCENT = 1.4;
/** Bars stop here, so the label of a bar far over 100% still fits above it. */
const MAX_BAR_PX = 200;

interface Bar {
  /** The axis label: "Jan", or the year. */
  label: string;
  /** The whole year: its axis label is bold. */
  year: boolean;
  /** "73 %", or "" for a bar without days. */
  value: string;
  over: boolean;
  forecast: boolean;
  height: number;
  title: string;
}

/**
 * The design system's TargetBarChart for chargeability per month and for the year: booked
 * months in the chargeable color, forecast months lighter, the target as a dashed line labeled
 * beside the plot. It has the grid of the location chart below it, twelve months and the year
 * with a label column at the right, so the months of both charts line up (user, 2026-11-11).
 */
@Component({
  selector: 'app-chargeability-chart',
  templateUrl: './chargeability-chart.html',
  styleUrls: ['../chart-grid.css', './chargeability-chart.css'],
  host: { '[style.--bar-color]': 'color' },
})
export class ChargeabilityChart {
  protected readonly t = inject(STRINGS);
  readonly year = input.required<number>();
  readonly data = input.required<YearChargeability>();
  /** The chargeability target in percent. */
  readonly target = input.required<number>();

  protected readonly color = category(BILLING, 'chargeable').color;
  protected readonly guideAt = 100 * PX_PER_PERCENT;
  protected readonly targetAt = computed(() => this.target() * PX_PER_PERCENT);
  protected readonly targetPercent = computed(() => this.t.home.percent(this.target()));

  protected readonly bars = computed<Bar[]>(() => {
    const year = this.year();
    const data = this.data();
    const months = data.months.map((m, i) =>
      this.bar(this.t.monthsShort[i], `${this.t.monthsShort[i]} ${year}`, m, m.forecast, false),
    );
    // The year rests on planned days as soon as one month does, so it is lighter then.
    const planned = data.months.some((m) => m.forecast);
    return [...months, this.bar(String(year), String(year), data, planned, true)];
  });

  private bar(
    label: string,
    name: string,
    figures: Chargeability,
    forecast: boolean,
    year: boolean,
  ): Bar {
    if (figures.share === null) {
      return {
        label,
        year,
        value: '',
        over: false,
        forecast,
        height: 0,
        title: this.t.home.chargeChart.noDays(name),
      };
    }
    const percent = Math.round(figures.share * 100);
    const value = this.t.home.percent(percent);
    const title = this.t.home.chargeChart.bar(
      name,
      value,
      formatDays(figures.chargeable),
      formatDays(figures.available),
    );
    return {
      label,
      year,
      value,
      over: percent > 100,
      forecast,
      height: Math.min(MAX_BAR_PX, percent * PX_PER_PERCENT),
      title: forecast ? this.t.home.chargeChart.barForecast(title) : title,
    };
  }
}
