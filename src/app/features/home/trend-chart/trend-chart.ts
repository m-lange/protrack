import { Component, computed, inject, input, signal } from '@angular/core';
import { STRINGS } from '../../../i18n/strings';
import { TrendMonth, TrendValues } from '../trends/trends';

/** One line of a trend chart. */
export interface TrendSeries {
  id: string;
  name: string;
  /** A color token, such as `var(--location-onsite)`. */
  color: string;
  /** Shares 0–1 per month; null leaves a gap. */
  values: TrendValues;
}

interface Tick {
  label: string;
  /** Percent from the bottom of the plot. */
  at: number;
}

interface AxisLabel {
  label: string;
  /** Percent from the left of the plot. */
  at: number;
  /** A January (or the first month): the label carries the year. */
  year: boolean;
}

/**
 * A line chart of shares per month over time, for Home's trends (user, 2026-11-11): 2px lines in
 * the data colors, a recessive grid with percent ticks, an optional dashed target labeled at the
 * right, a crosshair with the month's values on hover or with the arrow keys, a legend for two or
 * more lines and a table for screen readers. The y axis starts at 0 and reaches at least 100 %.
 */
@Component({
  selector: 'app-trend-chart',
  templateUrl: './trend-chart.html',
  styleUrl: './trend-chart.css',
})
export class TrendChart {
  protected readonly t = inject(STRINGS);
  readonly chartId = input.required<string>();
  readonly title = input.required<string>();
  readonly months = input.required<TrendMonth[]>();
  readonly series = input.required<TrendSeries[]>();
  /** A target in percent, drawn as a dashed line; null for none. */
  readonly target = input<number | null>(null);

  /** The month under the pointer or picked with the arrow keys. */
  protected readonly hovered = signal<number | null>(null);

  /** The top of the y axis in percent: 100, or above the highest value in steps of 25. */
  protected readonly top = computed(() => {
    const highest = Math.max(
      0,
      ...this.series().flatMap((s) => s.values.map((v) => (v === null ? 0 : v * 100))),
    );
    return Math.max(100, Math.ceil(highest / 25) * 25);
  });

  protected readonly ticks = computed<Tick[]>(() => {
    const top = this.top();
    const step = top > 150 ? 50 : 25;
    const ticks: Tick[] = [];
    for (let value = 0; value <= top; value += step) {
      ticks.push({ label: this.t.home.percent(value), at: (value / top) * 100 });
    }
    return ticks;
  });

  /** The x of a month in percent: the middle of its column. */
  protected x(index: number): number {
    return ((index + 0.5) / this.months().length) * 100;
  }

  /** The y of a share in percent from the bottom. */
  protected y(value: number): number {
    return ((value * 100) / this.top()) * 100;
  }

  /**
   * Every month while there are a year's worth or fewer, else the Januaries; the first month and
   * each January carry the year.
   */
  protected readonly axis = computed<AxisLabel[]>(() => {
    const months = this.months();
    const every = months.length <= 12;
    return months.flatMap((m, i) => {
      const year = i === 0 || m.month === 0;
      if (!every && !year) return [];
      const name = this.t.monthsShort[m.month];
      return [{ label: year ? `${name} ${m.year}` : name, at: this.x(i), year }];
    });
  });

  /**
   * The lines as SVG polylines in a 100 × 100 box (stretched to the plot), one per run of months
   * with values; a single month between gaps shows as a dot.
   */
  protected readonly lines = computed(() =>
    this.series().map((s) => {
      const runs: { x: number; y: number }[][] = [];
      let run: { x: number; y: number }[] = [];
      s.values.forEach((value, i) => {
        if (value === null) {
          if (run.length) runs.push(run);
          run = [];
        } else run.push({ x: this.x(i), y: this.y(value) });
      });
      if (run.length) runs.push(run);
      return {
        series: s,
        paths: runs
          .filter((r) => r.length > 1)
          .map((r) => r.map((p) => `${p.x},${100 - p.y}`).join(' ')),
        dots: runs.filter((r) => r.length === 1).map((r) => r[0]),
      };
    }),
  );

  protected readonly targetAt = computed(() => {
    const target = this.target();
    return target === null ? null : (target / this.top()) * 100;
  });

  /** The month under the crosshair with each line's value. */
  protected readonly detail = computed(() => {
    const index = this.hovered();
    if (index === null) return null;
    const month = this.months()[index];
    return {
      index,
      at: this.x(index),
      name: this.monthName(month),
      values: this.series().map((s) => ({
        series: s,
        value: s.values[index],
        text: this.percent(s.values[index]),
      })),
    };
  });

  protected monthName(month: TrendMonth): string {
    return `${this.t.months[month.month]} ${month.year}`;
  }

  protected percent(value: number | null): string {
    return value === null ? this.t.common.empty : this.t.home.percent(Math.round(value * 100));
  }

  /** Arrow keys move the crosshair; Home and End jump to the first and last month. */
  protected keys(event: KeyboardEvent): void {
    const last = this.months().length - 1;
    const now = this.hovered();
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
        next = now === null ? last : Math.max(0, now - 1);
        break;
      case 'ArrowRight':
        next = now === null ? last : Math.min(last, now + 1);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = last;
        break;
      case 'Escape':
        this.hovered.set(null);
        return;
      default:
        return;
    }
    event.preventDefault();
    this.hovered.set(next);
  }
}
