import { TestBed } from '@angular/core/testing';
import { FakeDatabase, customer, provideFakeDatabase } from '../../testing/fake-database';
import { MAX_SNAPSHOTS, Snapshots } from './snapshots';

describe('Snapshots', () => {
  let db: FakeDatabase;
  let snapshots: Snapshots;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: provideFakeDatabase() });
    db = TestBed.inject(FakeDatabase);
    snapshots = TestBed.inject(Snapshots);
  });

  it('takes nothing while there is no data', async () => {
    await snapshots.takeDaily(new Date(2026, 10, 8, 9));
    expect(snapshots.list()).toEqual([]);
  });

  it('takes one a day, and one before a change unless the data is the same', async () => {
    await db.putCustomer(customer('Acme'));
    await snapshots.takeDaily(new Date(2026, 10, 8, 9));
    await snapshots.takeDaily(new Date(2026, 10, 8, 17));
    expect(snapshots.list().map((s) => s.reason)).toEqual(['daily']);

    await snapshots.take('deleteCustomer', 'Acme'); // same data as the daily one
    expect(snapshots.list()).toHaveLength(1);

    await db.putCustomer(customer('Globex'));
    await snapshots.take('deleteCustomer', 'Globex');
    const [newest] = snapshots.list();
    expect([newest.reason, newest.subject, newest.counts.customers]).toEqual([
      'deleteCustomer',
      'Globex',
      2,
    ]);
    const file = await snapshots.file(newest.id);
    expect(file?.data.customers.map((c) => c.name).sort()).toEqual(['Acme', 'Globex']);
  });

  it(`keeps the newest ${MAX_SNAPSHOTS}`, async () => {
    for (let i = 0; i < MAX_SNAPSHOTS + 3; i++) {
      await db.putCustomer(customer(`C${i}`));
      await snapshots.take('import');
    }
    expect(snapshots.list()).toHaveLength(MAX_SNAPSHOTS);
    expect(db.snapshots.size).toBe(MAX_SNAPSHOTS);
    expect(snapshots.list()[0].counts.customers).toBe(MAX_SNAPSHOTS + 3);
  });
});
