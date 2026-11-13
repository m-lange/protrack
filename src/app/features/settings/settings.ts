import { Component, LOCALE_ID, computed, inject, signal } from '@angular/core';
import { DatePipe, formatDate } from '@angular/common';
import { Backup, BackupProblem, problemOf } from '../../core/backup/backup';
import { FileAccess, downloadFile, isAbort } from '../../core/backup/file-access';
import { BILLING, Billing, LOCATIONS, category } from '../../core/categories';
import { AppDataService } from '../../core/data/app-data';
import {
  LANGUAGE_CODES,
  LanguageCode,
  REGION_CODES,
  RegionCode,
  WorkLocation,
  YEAR_END_DAYS_OFF,
} from '../../core/data/model';
import { SettingsStore } from '../../core/data/settings-store';
import { MAX_SNAPSHOTS, SnapshotInfo, Snapshots } from '../../core/data/snapshots';
import {
  SyncFile,
  SyncFileError,
  SyncFileProblem,
  parseSyncFile,
  serializeSyncFile,
  toSyncFile,
} from '../../core/data/sync-file';
import { STRINGS } from '../../i18n/strings';
import { BackupStatus } from '../../shared/backup-status/backup-status';
import { Icon } from '../../shared/icon/icon';
import { IconName } from '../../shared/icon/icons';
import { SplitSegment, SplitSlider, SplitValues } from '../../shared/split-slider/split-slider';

interface PendingImport {
  fileName: string;
  file: SyncFile;
}

/** The order of the location targets in Settings. */
const TARGET_ORDER: readonly WorkLocation[] = ['onsite', 'reply', 'home'];
/** Restore points shown before "Show all". */
const FIRST_SNAPSHOTS = 5;

/** Settings: region, targets, backup file, restore points, import and export, reset. */

@Component({
  selector: 'app-settings',
  imports: [DatePipe, Icon, BackupStatus, SplitSlider],
  templateUrl: './settings.html',
  styleUrl: './settings.css',
})
export class Settings {
  private readonly store = inject(SettingsStore);
  private readonly appData = inject(AppDataService);
  private readonly files = inject(FileAccess);
  protected readonly backup = inject(Backup);
  protected readonly snapshots = inject(Snapshots);
  private readonly locale = inject(LOCALE_ID);
  protected readonly t = inject(STRINGS);

  protected readonly languages = LANGUAGE_CODES;
  /** The flag of each language, from public/flags: the United Kingdom's for English. */
  protected readonly flags: Record<LanguageCode, string> = {
    en: 'flags/gb.svg',
    de: 'flags/de.svg',
  };
  protected readonly regions = REGION_CODES;
  protected readonly yearEndChoices = YEAR_END_DAYS_OFF;
  /** The Harvey ball of each choice: empty, half, full. */
  protected readonly yearEndIcons: Record<number, IconName> = {
    0: 'harvey-0',
    50: 'harvey-50',
    100: 'harvey-100',
  };
  /**
   * The locations with a target, with their colors from src/categories.css. The targets list
   * them as On-site, Reply, Home office (the user's order); charts keep the design system's.
   */
  protected readonly locations = TARGET_ORDER.map((id) =>
    category(LOCATIONS, id),
  ) as ((typeof LOCATIONS)[number] & {
    id: WorkLocation;
  })[];
  /** Whether the browser can keep a backup file at all. */
  protected readonly backupSupported = this.files.supported;

  protected readonly settings = this.store.settings;
  /** The chargeability target as a split of chargeable and non-chargeable time. */
  protected readonly chargeabilitySegments = computed<SplitSegment[]>(() => {
    const target = this.settings().chargeabilityTarget;
    return [
      { ...this.billingSegment('chargeable'), value: target },
      { ...this.billingSegment('nonChargeable'), value: 100 - target },
    ];
  });

  /** The location targets as the segments of the split slider. */
  protected readonly locationSegments = computed<SplitSegment[]>(() =>
    this.locations.map((location) => ({
      id: location.id,
      label: this.t.locations[location.id],
      color: location.color,
      value: this.settings().locationTargets[location.id],
    })),
  );

  /** When the backup file was last saved, while it is up to date. */
  protected readonly savedAt = computed(() => {
    const status = this.backup.status();
    return status.kind === 'saved' ? status.at : null;
  });
  /** The message for a failed background save. */
  protected readonly backupStatusError = computed(() => {
    const status = this.backup.status();
    return status.kind === 'error' ? this.backupMessage(status.problem) : null;
  });
  /** The problem of the last backup action the user started. */
  protected readonly backupError = signal<BackupProblem | 'unknown' | null>(null);
  protected readonly pendingImport = signal<PendingImport | null>(null);
  protected readonly importError = signal<SyncFileProblem | null>(null);
  protected readonly importDone = signal(false);
  protected readonly confirmingReset = signal(false);
  /** The restore point the user is about to restore. */
  protected readonly confirmingRestore = signal<SnapshotInfo | null>(null);
  protected readonly restoredAt = signal<string | null>(null);
  protected readonly restoreGone = signal(false);
  protected readonly showAllSnapshots = signal(false);
  protected readonly maxSnapshots = MAX_SNAPSHOTS;
  /** The newest few restore points, or all of them. */
  protected readonly visibleSnapshots = computed(() => {
    const list = this.snapshots.list();
    return this.showAllSnapshots() ? list : list.slice(0, FIRST_SNAPSHOTS);
  });
  protected readonly hiddenSnapshots = computed(
    () => this.snapshots.list().length - this.visibleSnapshots().length,
  );
  protected readonly resetDone = signal(false);

  protected setRegion(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    void this.store.update({ region: (value || null) as RegionCode | null });
  }

  /** How much of December 24 and 31 is off, in percent. */
  protected setYearEndDaysOff(yearEndDaysOff: number): void {
    void this.store.update({ yearEndDaysOff });
  }

  /** Saves the language; Language then saves the backup and reloads the app in it. */
  protected setLanguage(language: LanguageCode): void {
    if (language !== this.settings().language) void this.store.update({ language });
  }

  /** Slider moves preview the value; letting go saves it. The first share is chargeable. */
  protected setChargeability([chargeabilityTarget]: SplitValues, save: boolean): void {
    this.apply({ chargeabilityTarget }, save);
  }

  private billingSegment(id: Billing): Omit<SplitSegment, 'value'> {
    return { id, label: this.t.billing[id], color: category(BILLING, id).color };
  }

  /** The split slider's shares, in the order of `locations`; they add up to 100. */
  protected setLocations(values: SplitValues, save: boolean): void {
    const locationTargets = { ...this.settings().locationTargets };
    this.locations.forEach((location, i) => (locationTargets[location.id] = values[i]));
    this.apply({ locationTargets }, save);
  }

  protected readonly createBackupFile = () => this.runBackup(() => this.backup.createFile());
  protected readonly openBackupFile = () => this.runBackup(() => this.backup.openFile());
  protected readonly resume = () => this.runBackup(() => this.backup.resume());
  protected readonly saveNow = () => this.runBackup(() => this.backup.saveNow());
  protected readonly unlink = () => this.runBackup(() => this.backup.disconnect());
  protected readonly loadPending = () => this.runBackup(() => this.backup.loadPending());
  protected readonly overwritePending = () => this.runBackup(() => this.backup.overwritePending());
  protected readonly loadFromFile = () => this.runBackup(() => this.backup.loadFromFile());
  protected readonly overwriteFile = () => this.runBackup(() => this.backup.overwriteFile());

  protected backupMessage(problem: BackupProblem | 'unknown'): string {
    const errors = this.t.settings.backupErrors;
    return problem in errors
      ? errors[problem as keyof typeof errors]
      : this.t.syncFileErrors[problem as SyncFileProblem];
  }

  protected exportData(): void {
    const file = toSyncFile(this.appData.snapshot());
    downloadFile(`protrack-${file.savedAt.slice(0, 10)}.json`, serializeSyncFile(file));
  }

  protected async pickImport(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const picked = input.files?.[0];
    input.value = '';
    this.importError.set(null);
    this.importDone.set(false);
    this.pendingImport.set(null);
    if (!picked) return;
    try {
      this.pendingImport.set({ fileName: picked.name, file: parseSyncFile(await picked.text()) });
    } catch (error) {
      this.importError.set(error instanceof SyncFileError ? error.problem : 'notJson');
    }
  }

  protected async confirmImport(): Promise<void> {
    const pending = this.pendingImport();
    if (!pending) return;
    await this.snapshots.take('import').catch((error) => console.error(error));
    await this.appData.replaceAll(pending.file.data);
    this.pendingImport.set(null);
    this.importDone.set(true);
  }

  protected async confirmReset(): Promise<void> {
    await this.backup.disconnect();
    await this.appData.reset();
    this.confirmingReset.set(false);
    this.pendingImport.set(null);
    this.importDone.set(false);
    this.resetDone.set(true);
  }

  /** What a restore point was taken for: "Daily", "Before deleting Website". */
  protected snapshotReason(snapshot: SnapshotInfo): string {
    const reasons = this.t.settings.snapshots.reasons;
    switch (snapshot.reason) {
      case 'deleteProject':
      case 'deleteCustomer':
        return reasons[snapshot.reason](snapshot.subject ?? '');
      default:
        return reasons[snapshot.reason];
    }
  }

  protected snapshotDate(snapshot: SnapshotInfo): string {
    return formatDate(snapshot.takenAt, this.t.formats.dateTime, this.locale);
  }

  /**
   * Replaces all data with a restore point's, read like an import. The data as it is now
   * gets a restore point first, so a restore can be undone.
   */
  protected async restore(snapshot: SnapshotInfo): Promise<void> {
    this.confirmingRestore.set(null);
    this.restoredAt.set(null);
    this.restoreGone.set(false);
    const file = await this.snapshots.file(snapshot.id);
    if (!file) {
      this.restoreGone.set(true);
      return;
    }
    const data = parseSyncFile(JSON.stringify(file)).data;
    await this.snapshots.take('restore').catch((error) => console.error(error));
    await this.appData.replaceAll(data);
    this.restoredAt.set(this.snapshotDate(snapshot));
  }

  /** Saves a restore point as a sync file, to keep it or import it elsewhere. */
  protected async downloadSnapshot(snapshot: SnapshotInfo): Promise<void> {
    const file = await this.snapshots.file(snapshot.id);
    if (!file) {
      this.restoreGone.set(true);
      return;
    }
    const stamp = formatDate(snapshot.takenAt, 'yyyy-MM-dd-HHmm', this.locale);
    downloadFile(`protrack-restore-point-${stamp}.json`, serializeSyncFile(file));
  }

  private async runBackup(action: () => Promise<void>): Promise<void> {
    this.backupError.set(null);
    try {
      await action();
    } catch (error) {
      if (!isAbort(error)) {
        this.backupError.set(error instanceof Error ? problemOf(error) : 'unknown');
      }
    }
  }

  private apply(change: Parameters<SettingsStore['update']>[0], save: boolean): void {
    if (save) {
      void this.store.update(change);
    } else {
      this.store.preview(change);
    }
  }
}
