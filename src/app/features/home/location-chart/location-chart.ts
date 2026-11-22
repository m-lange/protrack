import { Component, computed, inject, input } from '@angular/core';
import { LOCATIONS } from '../../../core/categories';
import { WorkLocation } from '../../../core/data/model';
import { STRINGS } from '../../../i18n/strings';
import { LocationDays, LocationShares, shareOf } from './location-shares';

/**
 * The order of the work locations in this chart, bottom-up and in the legend (user,
 * 2026-11-07). Out of office is not part of the shares; LocationDaysChart shows it in days.
 */
const CHART_ORDER: readonly WorkLocation[] = ['onsite', 'reply', 'home'];

interface Segment {
  location: WorkLocation;
  color: string;
  /** Height in percent of the bar. */
  share: number;
}

interface Bar {
  label: string;
  /** The whole year: its label is bold. */
  year: boolean;
  segments: Segment[];
  title: string;
}

interface TargetLabel {
  name: string;
  percent: string;
  /** Middle of the location's band, in percent from the bottom. */
  at: number;
}

/**
 * The design system's ShareChart for the booked days per work location: 100 % stacked bars per
 * month and for the year, with dashed lines at the cumulative location targets labeled beside
 * the plot. On the grid of all Home charts (../chart-grid.css).
 */
@Component({
  selector: 'app-location-chart',
  templateUrl: './location-chart.html',
  styleUrls: ['../chart-grid.css', './location-chart.css'],
})
export class LocationChart {
  protected readonly t = inject(STRINGS);
  readonly year = input.required<number>();
  readonly data = input.required<LocationShares>();
  /** Target share per work location in percent. */
  readonly targets = input.required<Record<WorkLocation, number>>();

  /** The work locations with their colors, in the chart's order. */
  private readonly locations = CHART_ORDER.map((id) => ({
    id,
    color: LOCATIONS.find((l) => l.id === id)!.color,
  }));

  /** The legend: the locations' names and colors, without shares (user, 2026-11-11). */
  protected readonly legend = this.locations.map((l) => ({
    name: this.t.locations[l.id],
    color: l.color,
  }));

  /** The dashed lines at the cumulative targets, between the bands. */
  protected readonly targetLines = computed(() => {
    const targets = this.targets();
    let sum = 0;
    return CHART_ORDER.slice(0, -1).map((id) => (sum += targets[id]));
  });

  /** The target labels beside the plot, in the middle of each work location's band. */
  protected readonly targetLabels = computed<TargetLabel[]>(() => {
    const targets = this.targets();
    let below = 0;
    return CHART_ORDER.map((id) => {
      const target = targets[id];
      const label = {
        name: this.t.locations[id],
        percent: this.t.home.percent(target),
        at: below + target / 2,
      };
      below += target;
      return label;
    });
  });

  protected readonly bars = computed<Bar[]>(() => {
    const year = this.year();
    const months = this.data().months.map((days, i) =>
      this.bar(this.t.monthsShort[i], `${this.t.monthsShort[i]} ${year}`, days, false),
    );
    return [...months, this.bar(String(year), String(year), this.data().year, true)];
  });

  private bar(label: string, name: string, days: LocationDays, year: boolean): Bar {
    const segments = this.locations
      .map((l) => ({ location: l.id, color: l.color, share: shareOf(days, l.id) * 100 }))
      .filter((s) => s.share > 0);
    const title = segments.length
      ? this.t.home.locationChart.bar(
          name,
          segments.map((s) =>
            this.t.home.locationChart.part(
              this.t.locations[s.location],
              this.percent(s.share / 100),
            ),
          ),
        )
      : this.t.home.locationChart.nothing(name);
    return { label, year, segments, title };
  }

  private percent(share: number): string {
    return this.t.home.percent(Math.round(share * 100));
  }
}
