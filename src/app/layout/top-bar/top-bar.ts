import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Backup } from '../../core/backup/backup';
import { SelectedYear } from '../../core/selected-year';
import { STRINGS } from '../../i18n/strings';
import { backupTone } from '../../shared/backup-status/backup-status';
import { Icon } from '../../shared/icon/icon';
import { YearSwitcher } from '../../shared/year-switcher/year-switcher';

/** The app header: logo, the year switcher in the middle, backup status and settings. */
@Component({
  selector: 'app-top-bar',
  imports: [RouterLink, RouterLinkActive, Icon, YearSwitcher],
  templateUrl: './top-bar.html',
  styleUrl: './top-bar.css',
})
export class TopBar {
  protected readonly t = inject(STRINGS);
  protected readonly selectedYear = inject(SelectedYear);
  private readonly backup = inject(Backup);

  protected readonly backupTone = computed(() => backupTone(this.backup.status().kind));
  protected readonly backupLabel = computed(() => this.t.backupStatus[this.backup.status().kind]);
}
