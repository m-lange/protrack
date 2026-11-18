import { Component, inject, input } from '@angular/core';
import { STRINGS } from '../../../i18n/strings';
import { formatDays } from '../../../shared/pipes/days';
import { DaysPipe } from '../../../shared/pipes/days-pipe';
import { DeltaPipe, deltaChip } from '../../../shared/pipes/delta-pipe';
import { BudgetRow } from './budgets';

/**
 * Remaining budget by project on Home: per active project a budget bar above a booked bar, with
 * its figures.
 */
@Component({
  selector: 'app-budget-overview',
  imports: [DaysPipe, DeltaPipe],
  templateUrl: './budget-overview.html',
  styleUrl: './budget-overview.css',
})
export class BudgetOverview {
  protected readonly t = inject(STRINGS);
  readonly rows = input.required<BudgetRow[]>();

  protected readonly deltaChip = deltaChip;

  protected barTitle(row: BudgetRow): string {
    return this.t.home.budgets.bar(
      row.name,
      formatDays(row.booked),
      this.t.common.days(formatDays(row.budget)),
    );
  }
}
