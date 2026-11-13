import { Component, booleanAttribute, computed, inject, input } from '@angular/core';
import { TODAY } from '../../core/today';
import { STRINGS } from '../../i18n/strings';
import { elapsedPercent } from '../dates/months';
import { DateRangePipe } from '../pipes/date-range-pipe';

/**
 * The design system's TimelinePill: a date range whose fill shows how much of it has passed.
 * Set `--row-color` on a parent. The title has the range with its years. Without a range (an
 * open-booking project or order) the pill reads "Open booking", filled all through in a lighter
 * shade of the row color.
 */
@Component({
  selector: 'app-timeline-pill',
  imports: [DateRangePipe],
  template: `
    @if (span(); as span) {
      <span
        class="pt-timeline"
        [class.pt-timeline--order]="order()"
        [style.--elapsed]="elapsed() + '%'"
        [attr.title]="span | dateRange: true"
      >
        <span class="pt-timeline__fill"></span>
        <span class="pt-timeline__label">{{ span | dateRange }}</span>
      </span>
    } @else {
      <span class="pt-timeline open" [class.pt-timeline--order]="order()">
        <span class="pt-timeline__label">{{ t.bookingModes.open }}</span>
      </span>
    }
  `,
  styles: `
    :host {
      display: flex;
      flex: 1;
      min-width: 0;
    }

    /* Open booking: no elapsed part, the whole pill in a light shade of the row color. */
    .open {
      background: color-mix(in srgb, var(--row-color) 28%, var(--surface));
    }

    .open.pt-timeline--order {
      background: color-mix(in srgb, var(--row-color) 20%, var(--surface));
    }
  `,
})
export class TimelinePill {
  protected readonly t = inject(STRINGS);
  private readonly today = inject(TODAY);

  /** The date range; null for open booking, which has none. */
  readonly span = input.required<{ start: string; end: string } | null>();
  /** The thinner, lighter pill of an order row. */
  readonly order = input(false, { transform: booleanAttribute });

  protected readonly elapsed = computed(() => {
    const span = this.span();
    return span ? elapsedPercent(span.start, span.end, this.today) : 0;
  });
}
