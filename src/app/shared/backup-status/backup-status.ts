import { Component, computed, inject } from '@angular/core';
import { Backup, BackupStatus as Status } from '../../core/backup/backup';
import { STRINGS } from '../../i18n/strings';

/**
 * How a backup status is colored: `ok` (green) when the file is up to date, `pending` (blue)
 * while changes aren't in the file yet, `error` (red) when something is wrong.
 */
export type BackupTone = 'ok' | 'pending' | 'error';

export function backupTone(kind: Status['kind']): BackupTone {
  switch (kind) {
    case 'saved':
      return 'ok';
    case 'saving':
    case 'paused':
      return 'pending';
    default:
      return 'error';
  }
}

/** The backup file's status as a chip, for the backup card in settings. */
@Component({
  selector: 'app-backup-status',
  template: `<span class="pt-chip" [attr.data-tone]="tone()" role="status">{{
    t.backupStatus[kind()]
  }}</span>`,
  styles: `
    [data-tone='ok'] {
      background: var(--backup-ok-bg);
      color: var(--backup-ok-text);
    }
    [data-tone='pending'] {
      background: var(--backup-pending-bg);
      color: var(--backup-pending-text);
    }
    [data-tone='error'] {
      background: var(--backup-error-bg);
      color: var(--backup-error-text);
    }
  `,
})
export class BackupStatus {
  protected readonly t = inject(STRINGS);
  private readonly backup = inject(Backup);

  protected readonly kind = computed(() => this.backup.status().kind);
  protected readonly tone = computed(() => backupTone(this.kind()));
}
