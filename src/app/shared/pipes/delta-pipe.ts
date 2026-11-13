import { Pipe, PipeTransform, inject } from '@angular/core';
import { STRINGS } from '../../i18n/strings';
import { formatDays } from './days';

/**
 * The delta chip of a difference in person-days (Chip README): from 3 days short a strong minus,
 * below zero a minus, above zero a plus.
 */
export function deltaChip(delta: number): string {
  if (delta <= -3) return 'pt-chip--minus-strong';
  if (delta < 0) return 'pt-chip--minus';
  return delta > 0 ? 'pt-chip--plus' : 'pt-chip--zero';
}

/**
 * Formats a difference in person-days with its sign and a true minus: "+3 d", "−2 d", "0 d"; up
 * to two decimals, or `decimals`.
 */
@Pipe({ name: 'delta' })
export class DeltaPipe implements PipeTransform {
  private readonly t = inject(STRINGS);

  transform(value: number, decimals = 2): string {
    const text = formatDays(value, decimals);
    return this.t.common.days(Math.round(value * 10 ** decimals) > 0 ? `+${text}` : text);
  }
}
