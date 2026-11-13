import { TestBed } from '@angular/core/testing';
import { FakeDatabase, customer, provideFakeDatabase } from '../../testing/fake-database';
import { AppDataService } from '../data/app-data';
import { CustomerStore } from '../data/customer-store';
import { emptyData } from '../data/model';
import { SyncFile, parseSyncFile, serializeSyncFile, toSyncFile } from '../data/sync-file';
import { Backup } from './backup';
import { FileAccess } from './file-access';

/** Files in memory, with a switch for the write permission. */
class FakeFileAccess implements Pick<FileAccess, keyof FileAccess> {
  readonly supported = true;
  contents = new Map<FileSystemFileHandle, string>();
  writable = true;
  next = handle('protrack-backup.json');

  async pickNewFile() {
    return this.next;
  }
  async pickExistingFile() {
    return this.next;
  }
  async canWrite() {
    return this.writable;
  }
  async requestWrite() {
    this.writable = true;
    return true;
  }
  async read(h: FileSystemFileHandle) {
    return this.contents.get(h) ?? '';
  }
  async write(h: FileSystemFileHandle, text: string) {
    this.contents.set(h, text);
  }
  file(h = this.next): SyncFile {
    return parseSyncFile(this.contents.get(h)!);
  }
}

function handle(name: string): FileSystemFileHandle {
  return { name } as FileSystemFileHandle;
}

describe('Backup', () => {
  let files: FakeFileAccess;
  let db: FakeDatabase;
  let backup: Backup;
  let customers: CustomerStore;

  beforeEach(() => {
    files = new FakeFileAccess();
    TestBed.configureTestingModule({
      providers: [provideFakeDatabase(), { provide: FileAccess, useValue: files }],
    });
    db = TestBed.inject(FakeDatabase);
    backup = TestBed.inject(Backup);
    customers = TestBed.inject(CustomerStore);
  });

  it('writes the data into a new file at once', async () => {
    await customers.create({ name: 'Silberbach Bank', logo: null });
    await backup.createFile();
    expect(files.file().data.customers.map((c) => c.name)).toEqual(['Silberbach Bank']);
    expect(backup.status().kind).toBe('saved');
    expect(backup.fileName()).toBe('protrack-backup.json');
  });

  it('saves after every change', async () => {
    vi.useFakeTimers();
    try {
      await backup.createFile();
      await customers.create({ name: 'Kranich Logistik', logo: null });
      TestBed.tick();
      await vi.runAllTimersAsync();
      expect(files.file().data.customers.map((c) => c.name)).toEqual(['Kranich Logistik']);
    } finally {
      vi.useRealTimers();
    }
  });

  it('reports a conflict instead of overwriting a file saved elsewhere', async () => {
    await backup.createFile();
    const elsewhere = emptyData();
    elsewhere.customers.push(customer('Brennwald Retail'));
    const later = new Date(Date.now() + 60_000);
    files.contents.set(files.next, serializeSyncFile(toSyncFile(elsewhere, later)));

    await customers.create({ name: 'Kranich Logistik', logo: null });
    await backup.saveNow();
    const status = backup.status();
    expect(status.kind).toBe('conflict');

    await backup.loadFromFile();
    expect(customers.customers().map((c) => c.name)).toEqual(['Brennwald Retail']);
    expect(backup.status().kind).toBe('saved');
  });

  it('asks before linking an existing file with other data', async () => {
    await customers.create({ name: 'Kranich Logistik', logo: null });
    const other = emptyData();
    other.customers.push(customer('Brennwald Retail'));
    files.contents.set(files.next, serializeSyncFile(toSyncFile(other)));

    await backup.openFile();
    expect(backup.pending()?.file.data.customers[0].name).toBe('Brennwald Retail');
    expect(backup.fileName()).toBeNull();

    await backup.overwritePending();
    expect(files.file().data.customers.map((c) => c.name)).toEqual(['Kranich Logistik']);
    expect(backup.pending()).toBeNull();
  });

  it('reconnects after a reload and waits for permission', async () => {
    await backup.createFile();
    files.writable = false;
    const reloaded = TestBed.runInInjectionContext(() => new Backup());
    await reloaded.init();
    expect(reloaded.fileName()).toBe('protrack-backup.json');
    expect(reloaded.status().kind).toBe('paused');
    await reloaded.resume();
    expect(reloaded.status().kind).toBe('saved');
  });

  it('forgets the file on unlink and keeps the file as it is', async () => {
    await backup.createFile();
    await backup.disconnect();
    expect(backup.status().kind).toBe('off');
    expect(db.device.size).toBe(0);
    expect(files.contents.size).toBe(1);
    await TestBed.inject(AppDataService).reset();
  });
});
