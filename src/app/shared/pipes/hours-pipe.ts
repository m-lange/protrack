import { Pipe, PipeTransform, inject } from '@angular/core';
import { STRINGS } from '../../i18n/strings';
import { formatHours } from './days';

/**
 * Shows person-days as hours (8 h = 1 d): "12 h", or "12" with `unit` false for table cells.
 * Empty values render "–"; pass `value || null` where 0 means nothing.
 */
@Pipe({ name: 'hours' })
export class HoursPipe implements PipeTransform {
  private readonly t = inject(STRINGS);

  transform(days: number | null | undefined, unit = true): string {
    if (days === null || days === undefined) return this.t.common.empty;
    const text = formatHours(days);
    return unit ? this.t.common.hours(text) : text;
  }
}
