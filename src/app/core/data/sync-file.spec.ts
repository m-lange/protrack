import { emptyData } from './model';
import {
  SCHEMA_VERSION,
  SyncFileError,
  SyncFileProblem,
  parseSyncFile,
  peekSavedAt,
  serializeSyncFile,
  toSyncFile,
} from './sync-file';

function problemOf(text: string): SyncFileProblem | undefined {
  try {
    parseSyncFile(text);
    return undefined;
  } catch (error) {
    return error instanceof SyncFileError ? error.problem : undefined;
  }
}

describe('sync file', () => {
  it('writes the versioned envelope and reads it back', () => {
    const data = emptyData();
    data.customers.push({
      id: 'a',
      name: 'Silberbach Bank',
      order: 0,
      logo: 'data:image/svg+xml;base64,PHN2Zy8+',
      createdAt: '2026-11-01T09:00:00.000Z',
      updatedAt: '2026-11-02T09:00:00.000Z',
    });
    data.settings.region = 'HB';
    const file = toSyncFile(data, new Date('2026-11-06T10:00:00Z'));
    expect(file).toEqual({
      format: 'protrack',
      schemaVersion: SCHEMA_VERSION,
      savedAt: '2026-11-06T10:00:00.000Z',
      data,
    });
    expect(parseSyncFile(serializeSyncFile(file))).toEqual(file);
  });

  it('names what is wrong with a file', () => {
    expect(problemOf('not json')).toBe('notJson');
    expect(problemOf('{"format":"other","schemaVersion":1}')).toBe('notProtrack');
    expect(problemOf('{"format":"protrack"}')).toBe('noVersion');
    expect(problemOf('{"format":"protrack","schemaVersion":0}')).toBe('noVersion');
    expect(
      problemOf(JSON.stringify({ format: 'protrack', schemaVersion: SCHEMA_VERSION + 1 })),
    ).toBe('newerVersion');
  });

  it('repairs what it can: drops broken customers, fills in settings, clamps targets', () => {
    const text = JSON.stringify({
      format: 'protrack',
      schemaVersion: SCHEMA_VERSION,
      savedAt: '2026-11-06T10:00:00.000Z',
      data: {
        customers: [
          { id: 'c', name: 'Without order' },
          { id: 'a', name: '  Kranich Logistik ', order: 7, logo: 'javascript:alert(1)' },
          { id: 'a', name: 'Duplicate id' },
          { id: 'b', name: '' },
          'nonsense',
        ],
        settings: { region: 'XX', chargeabilityTarget: 140, locationTargets: { home: -5 } },
      },
    });
    const { data } = parseSyncFile(text);
    expect(data.customers.map((c) => [c.id, c.name, c.order, c.logo])).toEqual([
      ['a', 'Kranich Logistik', 0, null],
      ['c', 'Without order', 1, null],
    ]);
    expect(data.settings).toEqual({
      language: 'en',
      region: null,
      chargeabilityTarget: 100,
      locationTargets: { onsite: 30, home: 0, reply: 25 },
      customColors: [],
      lockedMonths: [],
      yearEndDaysOff: 50,
    });
  });

  it('repairs projects, orders and bookings', () => {
    const text = JSON.stringify({
      format: 'protrack',
      schemaVersion: SCHEMA_VERSION,
      savedAt: '2026-11-06T10:00:00.000Z',
      data: {
        customers: [{ id: 's', name: 'Silberbach Bank', order: 0 }],
        projects: [
          {
            id: 'p',
            customerId: 's',
            name: ' Risk Data Platform ',
            color: '#2F9E8F',
            status: 'weird',
            orders: [
              {
                id: 'o',
                name: 'Mapping',
                start: '2026-12-18',
                end: '2026-09-01',
                budget: -3,
                location: 'moon',
                forecast: { '2026-10': 4, '2027-01': 2, '2026-11': 0, nonsense: 1 },
              },
              { id: 'x', name: 'Broken dates', start: '2026-02-30', end: '2026-03-01' },
            ],
          },
          { id: 'q', customerId: 'unknown', name: 'Orphan' },
        ],
        bookings: [
          { id: 'b1', orderId: 'o', date: '2026-10-05', days: 1 },
          { id: 'b2', orderId: 'x', date: '2026-10-05', days: 1 },
          { id: 'b3', orderId: 'o', date: '2026-10-06', days: 0 },
        ],
      },
    });
    const { data } = parseSyncFile(text);
    expect(data.projects.length).toBe(1);
    const [p] = data.projects;
    expect([p.name, p.color, p.status, p.billing]).toEqual([
      'Risk Data Platform',
      '#2f9e8f',
      'active',
      'chargeable',
    ]);
    expect(p.orders).toEqual([
      {
        id: 'o',
        name: 'Mapping',
        start: '2026-09-01',
        end: '2026-12-18',
        budget: 0,
        location: 'onsite',
        forecast: { '2026-10': 4 },
      },
    ]);
    expect(data.bookings.map((b) => b.id)).toEqual(['b1']);
  });

  it('keeps only real locked months, in order', () => {
    const current = JSON.stringify({
      format: 'protrack',
      schemaVersion: SCHEMA_VERSION,
      savedAt: '2026-11-07T10:00:00.000Z',
      data: { settings: { lockedMonths: ['2026-11', '2026-03', '2026-11', '2026-13', 7] } },
    });
    expect(parseSyncFile(current).data.settings.lockedMonths).toEqual(['2026-03', '2026-11']);
  });

  it('keeps a booking its own location only where it differs from its order', () => {
    const text = JSON.stringify({
      format: 'protrack',
      schemaVersion: SCHEMA_VERSION,
      savedAt: '2026-11-07T10:00:00.000Z',
      data: {
        customers: [{ id: 's', name: 'Silberbach Bank', order: 0 }],
        projects: [
          {
            id: 'p',
            customerId: 's',
            name: 'Risk',
            orders: [{ id: 'o', name: 'Mapping', start: '2026-11-01', end: '2026-11-30' }],
          },
        ],
        bookings: [
          { id: 'a', orderId: 'o', date: '2026-11-02', days: 1, location: 'home' },
          { id: 'b', orderId: 'o', date: '2026-11-03', days: 1, location: 'onsite' },
          { id: 'c', orderId: 'o', date: '2026-11-04', days: 1, location: 'moon' },
        ],
      },
    });
    expect(parseSyncFile(text).data.bookings.map((b) => b.location)).toEqual([
      'home',
      undefined,
      undefined,
    ]);
  });

  it('merges the orders of an open-booking project into one, with its bookings', () => {
    const text = JSON.stringify({
      format: 'protrack',
      schemaVersion: SCHEMA_VERSION,
      savedAt: '2026-11-07T10:00:00.000Z',
      data: {
        customers: [{ id: 's', name: 'Silberbach Bank', order: 0 }],
        projects: [
          {
            id: 'p',
            customerId: 's',
            name: 'Internal',
            booking: 'open',
            orders: [
              { id: 'b', name: 'Office', start: '2026-01-01', end: '2026-01-31', budget: 5 },
              { id: 'a', name: 'Home', location: 'home', forecast: { '2027-03': 2 } },
            ],
          },
          { id: 'q', customerId: 's', name: 'Sales', booking: 'open', orders: [] },
        ],
        bookings: [
          { id: 'k1', orderId: 'a', date: '2026-10-05', days: 0.5 },
          { id: 'k2', orderId: 'b', date: '2026-10-05', days: 0.25 },
          { id: 'k3', orderId: 'b', date: '2026-10-06', days: 1 },
          { id: 'k4', orderId: 'b', date: '2026-10-07', days: 1, location: 'home' },
        ],
      },
    });
    const { projects, bookings } = parseSyncFile(text).data;
    const [p, q] = projects;
    // The first order by name stays, named like the project; the forecasts add up.
    expect(p.orders).toEqual([
      {
        id: 'a',
        name: 'Internal',
        start: null,
        end: null,
        budget: null,
        location: 'home',
        forecast: { '2027-03': 2 },
      },
    ]);
    // A project without orders gets one.
    expect(q.orders).toEqual([
      expect.objectContaining({ id: 'q-booking', name: 'Sales', location: 'onsite' }),
    ]);
    // Days keep where they were worked; two bookings of one date become one.
    expect(bookings).toEqual([
      { id: 'k1', orderId: 'a', date: '2026-10-05', days: 0.75 },
      { id: 'k3', orderId: 'a', date: '2026-10-06', days: 1, location: 'onsite' },
      { id: 'k4', orderId: 'a', date: '2026-10-07', days: 1 },
    ]);
  });

  it('keeps one note with text per real day', () => {
    const current = JSON.stringify({
      format: 'protrack',
      schemaVersion: SCHEMA_VERSION,
      savedAt: '2026-11-07T10:00:00.000Z',
      data: {
        dayNotes: [
          { date: '2026-11-03', text: 'Workshop' },
          { date: '2026-11-03', text: 'Twice' },
          { date: '2026-02-30', text: 'No such day' },
          { date: '2026-11-04', text: ' ' },
        ],
      },
    });
    expect(parseSyncFile(current).data.dayNotes.map((n) => [n.date, n.text])).toEqual([
      ['2026-11-03', 'Workshop'],
    ]);
  });

  it('falls back to English for a missing or unknown language', () => {
    const text = (settings: object) =>
      JSON.stringify({
        format: 'protrack',
        schemaVersion: SCHEMA_VERSION,
        savedAt: '2026-11-06T10:00:00.000Z',
        data: { settings },
      });
    expect(parseSyncFile(text({ region: 'BY' })).data.settings.language).toBe('en');
    expect(parseSyncFile(text({ language: 'de' })).data.settings.language).toBe('de');
    expect(parseSyncFile(text({ language: 'fr' })).data.settings.language).toBe('en');
  });

  it('peeks at savedAt without validating the rest', () => {
    expect(peekSavedAt('{"format":"protrack","savedAt":"2026-11-06T10:00:00.000Z"}')).toBe(
      '2026-11-06T10:00:00.000Z',
    );
    expect(peekSavedAt('{}')).toBeUndefined();
    expect(peekSavedAt('broken')).toBeUndefined();
  });
});
