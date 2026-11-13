import { Injectable } from '@angular/core';

/** The parts of the File System Access API that TypeScript's DOM types don't have yet. */
interface PickerOptions {
  suggestedName?: string;
  multiple?: boolean;
  types?: { description: string; accept: Record<string, string[]> }[];
}

interface PickerWindow {
  showSaveFilePicker?(options: PickerOptions): Promise<FileSystemFileHandle>;
  showOpenFilePicker?(options: PickerOptions): Promise<FileSystemFileHandle[]>;
}

interface PermissionHandle {
  queryPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'read' | 'readwrite' }): Promise<PermissionState>;
}

const JSON_TYPES: PickerOptions['types'] = [
  { description: 'ProTrack backup', accept: { 'application/json': ['.json'] } },
];

/** True when the user closed a file picker without choosing a file. */
export function isAbort(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** Reads and writes files the user picks, through the File System Access API. */
@Injectable({ providedIn: 'root' })
export class FileAccess {
  private readonly picker = (typeof window === 'undefined' ? {} : window) as PickerWindow;

  /** False in browsers without the File System Access API, such as Firefox and Safari. */
  readonly supported =
    typeof this.picker.showSaveFilePicker === 'function' &&
    typeof this.picker.showOpenFilePicker === 'function';

  /** Asks for a new file (or one to overwrite). Rejects with an AbortError on cancel. */
  pickNewFile(suggestedName: string): Promise<FileSystemFileHandle> {
    return this.picker.showSaveFilePicker!({ suggestedName, types: JSON_TYPES });
  }

  /** Asks for an existing file. Rejects with an AbortError on cancel. */
  async pickExistingFile(): Promise<FileSystemFileHandle> {
    const [handle] = await this.picker.showOpenFilePicker!({ multiple: false, types: JSON_TYPES });
    return handle;
  }

  /** Whether the app may write the file now, without asking. */
  async canWrite(handle: FileSystemFileHandle): Promise<boolean> {
    const query = (handle as PermissionHandle).queryPermission;
    if (!query) return true;
    return (await query.call(handle, { mode: 'readwrite' })) === 'granted';
  }

  /** Asks the user for write access. Needs a user gesture such as a click. */
  async requestWrite(handle: FileSystemFileHandle): Promise<boolean> {
    const request = (handle as PermissionHandle).requestPermission;
    if (!request) return true;
    return (await request.call(handle, { mode: 'readwrite' })) === 'granted';
  }

  async read(handle: FileSystemFileHandle): Promise<string> {
    return (await handle.getFile()).text();
  }

  async write(handle: FileSystemFileHandle, text: string): Promise<void> {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }
}

/** Hands the browser a file to save to the downloads folder. */
export function downloadFile(name: string, text: string, type = 'application/json'): void {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
}
