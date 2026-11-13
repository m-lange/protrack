import { Component, computed, inject, input } from '@angular/core';
import { LOCATIONS } from '../../../core/categories';
import { Location } from '../../../core/data/model';
import { STRINGS } from '../../../i18n/strings';
import { formatDays } from '../../../shared/pipes/days';
import { LocationDays, LocationShares } from '../location-chart/location-shares';

/** The locations bottom-up and in the legend: on-site, Reply, home office, out of office. */
const CHART_ORDER: readonly Location[] = ['onsite', 'reply', 'home', 'ooo'];
/** The highest bar's height; the rest of the 200px plot keeps room for its label. */
const MAX_BAR_PX = 176;

interface Segment {
  location: Location;
  color: string;
  /** Height in percent of the bar. */
  share: number;
}

interface Bar {
  label: string;
  /** All days of the month, "22", or "" for none. */
  value: string;
  /** The bar's height in px, against the month with the most days. */
  height: number;
  segments: Segment[];
  title: string;
}

/**
 * The booked days per location and month, out of office included (user, 2026-11-11): stacked
 * bars in days, not scaled to 100 %, without targets and without a year bar. It has the grid of
 * the other Home charts (../chart-grid.css) with the year's column and the label column left
 * empty, so its months stand right below theirs.
 */
@Component({
  selector: 'app-location-days-chart',
  templateUrl: './location-days-chart.html',
  styleUrls: ['../chart-grid.css', './location-days-chart.css'],
})
export class LocationDaysChart {
  protected readonly t = inject(STRINGS);
  readonly year = input.required<number>();
  readonly data = input.required<LocationShares>();

  /** The locations with their colors, in the chart's order. */
  private readonly locations = CHART_ORDER.map((id) => ({
    id,
    color: LOCATIONS.find((l) => l.id === id)!.color,
  }));

  protected readonly legend = this.locations.map((l) => ({
    name: this.t.locations[l.id],
    color: l.color,
  }));

  protected readonly bars = computed<Bar[]>(() => {
    const year = this.year();
    const months = this.data().months;
    const most = Math.max(0, ...months.map((m) => m.total));
    return months.map((days, i) =>
      this.bar(this.t.monthsShort[i], `${this.t.monthsShort[i]} ${year}`, days, most),
    );
  });

  private bar(label: string, name: string, days: LocationDays, most: number): Bar {
    const segments = this.locations
      .map((l) => ({
        location: l.id,
        color: l.color,
        share: days.total > 0 ? (days.days[l.id] / days.total) * 100 : 0,
      }))
      .filter((s) => s.share > 0);
    const chart = this.t.home.daysChart;
    const title = segments.length
      ? chart.bar(
          name,
          segments.map((s) =>
            chart.part(
              this.t.locations[s.location],
              this.t.common.days(formatDays(days.days[s.location])),
            ),
          ),
          this.t.common.days(formatDays(days.total)),
        )
      : chart.nothing(name);
    return {
      label,
      value: days.total > 0 ? formatDays(days.total, 1) : '',
      height: most > 0 ? (days.total / most) * MAX_BAR_PX : 0,
      segments,
      title,
    };
  }
}
