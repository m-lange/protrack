import { openDB, type DBSchema, type IDBPDatabase } from 'idb';
import { normalizeProject, type Project } from '../types/project';
import type { DayAssignment } from '../types/dayAssignment';
import { normalizeYearSettings, type YearSettings } from '../types/yearSettings';

interface BackupFileHandleRecord {
  id: 'backup';
  handle: FileSystemFileHandle;
}

interface ProTrackDB extends DBSchema {
  projects: {
    key: string;
    value: Project;
  };
  dayAssignments: {
    key: string;
    value: DayAssignment;
    indexes: { date: string };
  };
  yearSettings: {
    key: number;
    value: YearSettings;
  };
  fileHandles: {
    key: string;
    value: BackupFileHandleRecord;
  };
}

let dbPromise: Promise<IDBPDatabase<ProTrackDB>> | null = null;

function getDb(): Promise<IDBPDatabase<ProTrackDB>> {
  dbPromise ??= openDB<ProTrackDB>('protrack', 7, {
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        db.createObjectStore('projects', { keyPath: 'id' });
      }
      if (oldVersion < 2) {
        const store = db.createObjectStore('dayAssignments', { keyPath: 'id' });
        store.createIndex('date', 'date');
      }
      // v3/v5 had a day-level `dayLocations` store; v6 settled on `location` living directly on
      // each `DayAssignment` (see dayAssignment.ts), so the old store is dropped for good.
      const legacyDb = db as unknown as IDBPDatabase<unknown>;
      if (oldVersion < 6 && legacyDb.objectStoreNames.contains('dayLocations')) {
        legacyDb.deleteObjectStore('dayLocations');
      }
      if (oldVersion < 7) {
        db.createObjectStore('yearSettings', { keyPath: 'year' });
        db.createObjectStore('fileHandles', { keyPath: 'id' });
      }
    },
  });
  return dbPromise;
}

export async function getAllProjects(): Promise<Project[]> {
  const db = await getDb();
  const raw = await db.getAll('projects');
  const normalized = raw.map((entry, index) =>
    normalizeProject(entry as unknown as Record<string, unknown>, index),
  );

  // Persist any records that needed repairing, so this only has to happen once.
  await Promise.all(
    normalized
      .filter((project, index) => JSON.stringify(project) !== JSON.stringify(raw[index]))
      .map((project) => saveProject(project)),
  );

  return normalized;
}

export async function saveProject(project: Project): Promise<void> {
  const db = await getDb();
  await db.put('projects', project);
}

export async function deleteProject(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('projects', id);
}

export async function getAllDayAssignments(): Promise<DayAssignment[]> {
  const db = await getDb();
  const raw = await db.getAll('dayAssignments');
  // Repairs records written before `location` existed on this store.
  return raw.map((assignment) => ({ ...assignment, location: assignment.location ?? null }));
}

export async function saveDayAssignments(assignments: DayAssignment[]): Promise<void> {
  const db = await getDb();
  const tx = db.transaction('dayAssignments', 'readwrite');
  await Promise.all([...assignments.map((assignment) => tx.store.put(assignment)), tx.done]);
}

export async function deleteDayAssignment(id: string): Promise<void> {
  const db = await getDb();
  await db.delete('dayAssignments', id);
}

export async function getAllYearSettings(): Promise<YearSettings[]> {
  const db = await getDb();
  const raw = await db.getAll('yearSettings');
  return raw.map((entry) => normalizeYearSettings(entry as unknown as Record<string, unknown>, entry.year));
}

export async function saveYearSettings(settings: YearSettings): Promise<void> {
  const db = await getDb();
  await db.put('yearSettings', settings);
}

export async function getBackupHandle(): Promise<FileSystemFileHandle | null> {
  const db = await getDb();
  const record = await db.get('fileHandles', 'backup');
  return record?.handle ?? null;
}

export async function saveBackupHandle(handle: FileSystemFileHandle): Promise<void> {
  const db = await getDb();
  await db.put('fileHandles', { id: 'backup', handle });
}

export async function clearBackupHandle(): Promise<void> {
  const db = await getDb();
  await db.delete('fileHandles', 'backup');
}

export interface BackupPayload {
  version: 1;
  exportedAt: string;
  projects: Project[];
  dayAssignments: DayAssignment[];
  yearSettings: YearSettings[];
}

export async function exportAllData(): Promise<BackupPayload> {
  const [projects, dayAssignments, yearSettings] = await Promise.all([
    getAllProjects(),
    getAllDayAssignments(),
    getAllYearSettings(),
  ]);
  return { version: 1, exportedAt: new Date().toISOString(), projects, dayAssignments, yearSettings };
}

export async function replaceAllData(payload: BackupPayload): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['projects', 'dayAssignments', 'yearSettings'], 'readwrite');
  await Promise.all([
    tx.objectStore('projects').clear(),
    tx.objectStore('dayAssignments').clear(),
    tx.objectStore('yearSettings').clear(),
  ]);

  const projects = payload.projects.map((entry, index) =>
    normalizeProject(entry as unknown as Record<string, unknown>, index),
  );
  const yearSettings = payload.yearSettings.map((entry) =>
    normalizeYearSettings(entry as unknown as Record<string, unknown>, entry.year),
  );

  await Promise.all([
    ...projects.map((project) => tx.objectStore('projects').put(project)),
    ...payload.dayAssignments.map((assignment) => tx.objectStore('dayAssignments').put(assignment)),
    ...yearSettings.map((settings) => tx.objectStore('yearSettings').put(settings)),
    tx.done,
  ]);
}

export async function resetAllData(): Promise<void> {
  const db = await getDb();
  const tx = db.transaction(['projects', 'dayAssignments', 'yearSettings'], 'readwrite');
  await Promise.all([
    tx.objectStore('projects').clear(),
    tx.objectStore('dayAssignments').clear(),
    tx.objectStore('yearSettings').clear(),
    tx.done,
  ]);
}
