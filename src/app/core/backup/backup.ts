import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { AppDataService } from '../data/app-data';
import { Database } from '../data/database';
import { AppData } from '../data/model';
import { Snapshots } from '../data/snapshots';
import {
  SyncFile,
  SyncFileError,
  SyncFileProblem,
  parseSyncFile,
  peekSavedAt,
  serializeSyncFile,
  toSyncFile,
} from '../data/sync-file';
import { FileAccess } from './file-access';

/** Where the link to the backup file is kept in IndexedDB. Never part of the sync file. */
const DEVICE_KEY = 'backup';
const SAVE_DELAY_MS = 800;

interface BackupRecord {
  handle: FileSystemFileHandle;
  /** The `savedAt` of the file as this device last wrote or loaded it. */
  lastSavedAt: string | null;
}

export type BackupStatus =
  /** The browser can't write files. */
  | { kind: 'unsupported' }
  /** No backup file is set. */
  | { kind: 'off' }
  /** A backup file is set, but the browser needs the user's permission again. */
  | { kind: 'paused' }
  | { kind: 'saving' }
  | { kind: 'saved'; at: string }
  /** The file was changed elsewhere after this device last saved it. */
  | { kind: 'conflict'; file: SyncFile }
  | { kind: 'error'; problem: BackupProblem };

/** What went wrong with the backup file: a sync file problem or one of writing it. */
export type BackupProblem =
  SyncFileProblem | 'needsPermission' | 'gone' | 'notAllowed' | 'writeFailed';

/** A problem the user can read about; the strings file has a message for each. */
export class BackupError extends Error {
  constructor(readonly problem: BackupProblem) {
    super(problem);
  }
}

/** A file the user opened as backup file that holds other data than this device. */
export interface PendingFile {
  handle: FileSystemFileHandle;
  file: SyncFile;
}

/**
 * Keeps a JSON backup file in sync with IndexedDB. After every change the data is written
 * to the file, unless the file was changed on another machine since this one last saved it.
 */
@Injectable({ providedIn: 'root' })
export class Backup {
  private readonly db = inject(Database);
  private readonly appData = inject(AppDataService);
  private readonly files = inject(FileAccess);
  private readonly snapshots = inject(Snapshots);

  private record: BackupRecord | null = null;
  /** The data revision the file holds. */
  private syncedRevision = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private saving = false;
  private saveAgain = false;

  private readonly statusState = signal<BackupStatus>(
    this.files.supported ? { kind: 'off' } : { kind: 'unsupported' },
  );
  private readonly fileNameState = signal<string | null>(null);
  private readonly pendingState = signal<PendingFile | null>(null);

  readonly status = this.statusState.asReadonly();
  readonly fileName = this.fileNameState.asReadonly();
  /** An opened file that waits for the user to load or overwrite it. */
  readonly pending = this.pendingState.asReadonly();
  readonly connected = computed(() => this.fileNameState() !== null);

  constructor() {
    effect(() => {
      const revision = this.db.revision();
      untracked(() => this.schedule(revision));
    });
  }

  /** Restores the link to the backup file after a reload. Runs once at app start. */
  async init(): Promise<void> {
    if (!this.files.supported) return;
    const record = await this.db.getDevice<BackupRecord>(DEVICE_KEY);
    if (!record?.handle) return;
    this.connect(record);
    if (await this.files.canWrite(record.handle)) {
      void this.sync();
    } else {
      this.statusState.set({ kind: 'paused' });
    }
  }

  /** Lets the user pick a new file and writes the current data into it. */
  async createFile(): Promise<void> {
    const handle = await this.files.pickNewFile(`protrack-backup.json`);
    this.pendingState.set(null);
    this.connect({ handle, lastSavedAt: null });
    await this.write();
  }

  /**
   * Lets the user pick an existing backup file. An empty file or one with the same data is
   * linked at once; one with other data waits in `pending` for the user's choice.
   */
  async openFile(): Promise<void> {
    const handle = await this.files.pickExistingFile();
    if (!(await this.files.requestWrite(handle))) {
      throw new BackupError('needsPermission');
    }
    const text = await this.files.read(handle);
    if (!text.trim()) {
      this.pendingState.set(null);
      this.connect({ handle, lastSavedAt: null });
      await this.write();
      return;
    }
    const file = parseSyncFile(text);
    if (sameData(file.data, this.appData.snapshot())) {
      this.pendingState.set(null);
      this.connect({ handle, lastSavedAt: file.savedAt });
      await this.persistRecord();
      this.syncedRevision = this.db.revision();
      this.statusState.set({ kind: 'saved', at: file.savedAt });
      return;
    }
    this.pendingState.set({ handle, file });
  }

  /** Links the pending file and replaces the data on this device with its data. */
  async loadPending(): Promise<void> {
    const pending = this.pendingState();
    if (!pending) return;
    this.pendingState.set(null);
    this.connect({ handle: pending.handle, lastSavedAt: null });
    await this.load(pending.file);
  }

  /** Links the pending file and overwrites it with the data on this device. */
  async overwritePending(): Promise<void> {
    const pending = this.pendingState();
    if (!pending) return;
    this.pendingState.set(null);
    this.connect({ handle: pending.handle, lastSavedAt: null });
    await this.write();
  }

  cancelPending(): void {
    this.pendingState.set(null);
  }

  /** Resolves a conflict with the data from the file. */
  async loadFromFile(): Promise<void> {
    const status = this.statusState();
    if (status.kind === 'conflict') await this.load(status.file);
  }

  /** Resolves a conflict by writing the data on this device over the file. */
  async overwriteFile(): Promise<void> {
    await this.write();
  }

  /** Asks for permission again after a reload, then catches up on changes. */
  async resume(): Promise<void> {
    if (!this.record) return;
    if (!(await this.files.requestWrite(this.record.handle))) {
      this.statusState.set({ kind: 'paused' });
      return;
    }
    await this.sync();
  }

  /** Writes the data now, unless the file was changed elsewhere. */
  async saveNow(): Promise<void> {
    clearTimeout(this.timer);
    await this.sync();
  }

  /** Forgets the backup file. The file itself stays as it is. */
  async disconnect(): Promise<void> {
    clearTimeout(this.timer);
    this.record = null;
    this.fileNameState.set(null);
    this.pendingState.set(null);
    await this.db.deleteDevice(DEVICE_KEY);
    this.statusState.set(this.files.supported ? { kind: 'off' } : { kind: 'unsupported' });
  }

  private connect(record: BackupRecord): void {
    this.record = record;
    this.fileNameState.set(record.handle.name);
  }

  private schedule(revision: number): void {
    if (!this.record || revision <= this.syncedRevision) return;
    const kind = this.statusState().kind;
    if (kind === 'paused' || kind === 'conflict') return;
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.sync(), SAVE_DELAY_MS);
  }

  /**
   * Compares the file with the data on this device: reports a conflict when the file is
   * newer than this device's last save, and writes when the data differs.
   */
  private async sync(): Promise<void> {
    if (this.saving) {
      this.saveAgain = true;
      return;
    }
    const record = this.record;
    if (!record) return;
    this.saving = true;
    try {
      if (!(await this.files.canWrite(record.handle))) {
        this.statusState.set({ kind: 'paused' });
        return;
      }
      const text = await this.files.read(record.handle);
      const savedAt = peekSavedAt(text);
      const snapshot = this.appData.snapshot();
      if (savedAt) {
        const file = parseSyncFile(text);
        if (sameData(file.data, snapshot)) {
          this.syncedRevision = this.db.revision();
          await this.adopt(file.savedAt);
          return;
        }
        const newer = !record.lastSavedAt || Date.parse(savedAt) > Date.parse(record.lastSavedAt);
        if (newer) {
          this.statusState.set({ kind: 'conflict', file });
          return;
        }
      }
      await this.writeUnchecked();
    } catch (error) {
      this.statusState.set({ kind: 'error', problem: problemOf(error) });
    } finally {
      this.saving = false;
      if (this.saveAgain) {
        this.saveAgain = false;
        void this.sync();
      } else {
        this.schedule(this.db.revision());
      }
    }
  }

  /** Writes the data over the file without looking at what the file holds. */
  private async write(): Promise<void> {
    try {
      await this.writeUnchecked();
      this.schedule(this.db.revision());
    } catch (error) {
      this.statusState.set({ kind: 'error', problem: problemOf(error) });
    }
  }

  private async writeUnchecked(): Promise<void> {
    const record = this.record;
    if (!record) return;
    this.statusState.set({ kind: 'saving' });
    const revision = this.db.revision();
    const file = toSyncFile(this.appData.snapshot());
    await this.files.write(record.handle, serializeSyncFile(file));
    this.syncedRevision = revision;
    await this.adopt(file.savedAt);
  }

  private async load(file: SyncFile): Promise<void> {
    try {
      await this.snapshots.take('backupLoad').catch((error) => console.error(error));
      await this.appData.replaceAll(file.data);
      this.syncedRevision = this.db.revision();
      await this.adopt(file.savedAt);
    } catch (error) {
      this.statusState.set({ kind: 'error', problem: problemOf(error) });
    }
  }

  /** Notes that the file and this device hold the same data as of `savedAt`. */
  private async adopt(savedAt: string): Promise<void> {
    if (!this.record) return;
    this.record = { ...this.record, lastSavedAt: savedAt };
    await this.persistRecord();
    this.statusState.set({ kind: 'saved', at: savedAt });
  }

  private async persistRecord(): Promise<void> {
    if (this.record) await this.db.setDevice(DEVICE_KEY, this.record);
  }
}

function sameData(a: AppData, b: AppData): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The problem behind an error, for the message the user reads. */
export function problemOf(error: unknown): BackupProblem {
  if (error instanceof SyncFileError || error instanceof BackupError) return error.problem;
  if (error instanceof DOMException && error.name === 'NotFoundError') return 'gone';
  if (error instanceof DOMException && error.name === 'NotAllowedError') return 'notAllowed';
  return 'writeFailed';
}
