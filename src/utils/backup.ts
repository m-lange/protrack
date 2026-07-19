import {
  clearBackupHandle,
  exportAllData,
  getBackupHandle,
  replaceAllData,
  resetAllData,
  saveBackupHandle,
  type BackupPayload,
} from '../db/database';

export function isFileSystemAccessSupported(): boolean {
  return 'showSaveFilePicker' in window;
}

async function verifyWritePermission(handle: FileSystemFileHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const };
  if ((await handle.queryPermission(opts)) === 'granted') return true;
  return (await handle.requestPermission(opts)) === 'granted';
}

async function writeBackup(handle: FileSystemFileHandle, payload: BackupPayload): Promise<void> {
  const writable = await handle.createWritable();
  await writable.write(JSON.stringify(payload, null, 2));
  await writable.close();
}

/** Öffnet den Datei-Dialog, merkt sich das Handle und schreibt sofort eine erste Sicherung. */
export async function requestBackupFile(): Promise<FileSystemFileHandle> {
  const handle = await window.showSaveFilePicker({
    suggestedName: 'protrack-backup.json',
    types: [{ description: 'ProTrack Sicherung', accept: { 'application/json': ['.json'] } }],
  });
  await saveBackupHandle(handle);
  await writeBackup(handle, await exportAllData());
  return handle;
}

export async function clearBackupFile(): Promise<void> {
  await clearBackupHandle();
}

export type ManualBackupResult = 'success' | 'error' | 'no-handle';

/** Für den Speichern-Button im Header/den Einstellungen: schreibt zur zuvor festgelegten Datei. */
export async function triggerManualBackup(): Promise<ManualBackupResult> {
  const handle = await getBackupHandle();
  if (!handle) return 'no-handle';

  try {
    if (!(await verifyWritePermission(handle))) return 'error';
    await writeBackup(handle, await exportAllData());
    return 'success';
  } catch {
    return 'error';
  }
}

/** Für Browser ohne File System Access API: löst einen Download der aktuellen Sicherung aus. */
export async function downloadBackupFallback(): Promise<void> {
  const payload = await exportAllData();
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `protrack-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

/** Ersetzt alle lokalen Daten durch den Inhalt der Sicherungsdatei (keine Zusammenführung). */
export async function importBackupFile(file: File): Promise<void> {
  const text = await file.text();
  const payload = JSON.parse(text) as BackupPayload;
  await replaceAllData(payload);
}

export { exportAllData, resetAllData };
