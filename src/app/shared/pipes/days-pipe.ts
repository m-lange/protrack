import { Pipe, PipeTransform, inject } from '@angular/core';
import { STRINGS } from '../../i18n/strings';
import { formatDays } from './days';

/**
 * Formats person-days: "12 d", or "12" with `unit` false for table cells; up to two decimals, or
 * `decimals`. Empty values render "–"; pass `value || null` where 0 means nothing.
 */
@Pipe({ name: 'days' })
export class DaysPipe implements PipeTransform {
  private readonly t = inject(STRINGS);

  transform(value: number | null | undefined, unit = true, decimals = 2): string {
    if (value === null || value === undefined) return '–';
    const text = formatDays(value, decimals);
    return unit ? this.t.common.days(text) : text;
  }
}
