import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { isoDate } from '../../shared/dates/months';
import { Database } from './database';
import { AppData } from './model';
import { SyncFile, normalizeData, toSyncFile } from './sync-file';

/**
 * Why a restore point was taken: the first one of a day, or right before data is replaced or
 * deleted.
 */
export type SnapshotReason =
  'daily' | 'import' | 'backupLoad' | 'restore' | 'deleteProject' | 'deleteCustomer';

/** A restore point of all user data, kept in IndexedDB on this device only. */
export interface StoredSnapshot {
  id: string;
  /** ISO date-time. */
  takenAt: string;
  reason: SnapshotReason;
  /** What the action was about, such as the name of a deleted project; null for none. */
  subject: string | null;
  counts: { customers: number; projects: number; bookings: number };
  /** The data as a sync file, read like an import when restored. */
  file: SyncFile;
}

/** A restore point without its data, for the list in Settings. */
export type SnapshotInfo = Omit<StoredSnapshot, 'file'>;

/** The restore points kept; the oldest go first. */
export const MAX_SNAPSHOTS = 30;

/**
 * Restore points of all user data on this device: one a day, taken at the first start or change
 * of the day, and one right before an import, a load from the backup file, a restore or the
 * deletion of a project or customer. They live next to the backup file, not in it, so a mistake
 * that reached the backup file can still be undone.
 */
@Injectable({ providedIn: 'root' })
export class Snapshots {
  private readonly db = inject(Database);
  private readonly listState = signal<SnapshotInfo[]>([]);
  /** The newest restore point's data as JSON, to skip one of unchanged data. */
  private latest: string | null = null;
  private loaded = false;
  /** Restore points are taken one after another. */
  private queue: Promise<unknown> = Promise.resolve();

  /** The restore points, newest first. */
  readonly list = this.listState.asReadonly();

  constructor() {
    // A change on a new day (the app may stay open past midnight) takes that day's point.
    effect(() => {
      const revision = this.db.revision();
      if (revision > 0) untracked(() => void this.takeDaily(new Date()).catch(logError));
    });
  }

  /** Takes the day's restore point unless there is one from that day. */
  takeDaily(now = new Date()): Promise<void> {
    return this.enqueue(async () => {
      await this.load();
      const newest = this.listState()[0];
      if (newest && isoDate(new Date(newest.takenAt)) === isoDate(now)) return;
      await this.store('daily', null, now);
    });
  }

  /** Takes a restore point of the data as it is now, before `reason` changes it. */
  take(reason: SnapshotReason, subject: string | null = null): Promise<void> {
    return this.enqueue(async () => {
      await this.load();
      await this.store(reason, subject, new Date());
    });
  }

  /** The data of a restore point as a sync file, or undefined when it is gone. */
  async file(id: string): Promise<SyncFile | undefined> {
    return (await this.db.getSnapshot(id))?.file;
  }

  /** Reads the list from IndexedDB once. */
  private async load(): Promise<void> {
    if (this.loaded) return;
    const all = await this.db.getSnapshots();
    const newest = all.at(-1);
    this.latest = newest ? JSON.stringify(newest.file.data) : null;
    this.listState.set(all.reverse().map(infoOf));
    this.loaded = true;
  }

  private async store(reason: SnapshotReason, subject: string | null, now: Date): Promise<void> {
    const data = normalizeData((await this.db.loadAll()) as unknown as Record<string, unknown>);
    if (isEmpty(data)) return;
    const json = JSON.stringify(data);
    if (json === this.latest) return;
    const snapshot: StoredSnapshot = {
      id: crypto.randomUUID(),
      takenAt: now.toISOString(),
      reason,
      subject,
      counts: {
        customers: data.customers.length,
        projects: data.projects.length,
        bookings: data.bookings.length,
      },
      file: toSyncFile(data, now),
    };
    const list = this.listState();
    const remove = list.slice(MAX_SNAPSHOTS - 1).map((s) => s.id);
    await this.db.saveSnapshot(snapshot, remove);
    this.latest = json;
    this.listState.set([infoOf(snapshot), ...list.slice(0, MAX_SNAPSHOTS - 1)]);
  }

  private enqueue(task: () => Promise<void>): Promise<void> {
    const run = this.queue.then(task);
    this.queue = run.catch(() => undefined);
    return run;
  }
}

function infoOf({ file: _file, ...info }: StoredSnapshot): SnapshotInfo {
  return info;
}

function isEmpty(data: AppData): boolean {
  return (
    data.customers.length === 0 &&
    data.projects.length === 0 &&
    data.bookings.length === 0 &&
    data.dayNotes.length === 0
  );
}

function logError(error: unknown): void {
  console.error('ProTrack could not take a restore point.', error);
}
