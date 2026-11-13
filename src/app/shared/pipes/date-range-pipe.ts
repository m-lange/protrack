import { formatDate } from '@angular/common';
import { LOCALE_ID, Pipe, PipeTransform, inject } from '@angular/core';
import { STRINGS } from '../../i18n/strings';
import { parseIsoDate } from '../dates/months';

/**
 * Formats a range of ISO dates: "Sep 1 – Dec 18", or with `years` "Sep 1, 2026 – Jan 29, 2027".
 * An empty range renders "–".
 */
@Pipe({ name: 'dateRange' })
export class DateRangePipe implements PipeTransform {
  private readonly t = inject(STRINGS);
  private readonly locale = inject(LOCALE_ID);

  transform(range: { start: string; end: string } | null | undefined, years = false): string {
    if (!range) return '–';
    const format = years ? this.t.formats.date : this.t.formats.dayMonth;
    const day = (value: string) => formatDate(parseIsoDate(value), format, this.locale);
    return `${day(range.start)} – ${day(range.end)}`;
  }
}
