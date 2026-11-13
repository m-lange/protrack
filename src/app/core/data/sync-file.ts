import { isIsoDay, isMonthKey } from '../../shared/dates/months';
import { moveBookings, singleOrder } from './open-booking';
import { compareOrders } from './orders';
import {
  AppData,
  BILLING_IDS,
  BOOKING_MODE_IDS,
  Billing,
  Booking,
  BookingMode,
  Customer,
  DayNote,
  HEX_COLOR,
  LANGUAGE_CODES,
  LOGO_TYPES,
  LanguageCode,
  Location,
  MonthKey,
  Order,
  PROJECT_COLOR_PRESETS,
  PROJECT_STATUS_IDS,
  Project,
  ProjectStatus,
  REGION_CODES,
  RegionCode,
  Settings,
  WORK_LOCATION_IDS,
  YEAR_END_DAYS_OFF,
  defaultSettings,
} from './model';

const LOCATION_IDS: readonly Location[] = [...WORK_LOCATION_IDS, 'ooo'];

/**
 * The version of the data model. Raise it on every data model change. Files of other versions
 * are not read.
 *
 * 1: customers, projects with their orders and forecast, bookings, day notes and settings.
 */
export const SCHEMA_VERSION = 1;

/** The JSON file ProTrack writes as backup, export and transfer between machines. */
export interface SyncFile {
  format: 'protrack';
  schemaVersion: number;
  /** ISO date-time of the moment the file was written. */
  savedAt: string;
  data: AppData;
}

/** What can be wrong with a file. The strings file has a message for each (`syncFileErrors`). */
export type SyncFileProblem = 'notJson' | 'notProtrack' | 'noVersion' | 'newerVersion';

/** A file that is not a ProTrack file, is broken or comes from a newer version. */
export class SyncFileError extends Error {
  constructor(readonly problem: SyncFileProblem) {
    super(problem);
  }
}

type RawData = Record<string, unknown>;

export function toSyncFile(data: AppData, now = new Date()): SyncFile {
  return { format: 'protrack', schemaVersion: SCHEMA_VERSION, savedAt: now.toISOString(), data };
}

export function serializeSyncFile(file: SyncFile): string {
  return JSON.stringify(file, null, 2);
}

/** Parses a sync file of the current schema version and repairs what it can. */
export function parseSyncFile(text: string): SyncFile {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new SyncFileError('notJson');
  }
  if (!isRecord(raw) || raw['format'] !== 'protrack') throw new SyncFileError('notProtrack');
  const version = raw['schemaVersion'];
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SyncFileError('noVersion');
  }
  if (version > SCHEMA_VERSION) throw new SyncFileError('newerVersion');
  const data = isRecord(raw['data']) ? raw['data'] : {};
  const savedAt = isIsoDate(raw['savedAt']) ? raw['savedAt'] : new Date(0).toISOString();
  return { format: 'protrack', schemaVersion: SCHEMA_VERSION, savedAt, data: normalizeData(data) };
}

/** Reads the `savedAt` of a sync file without validating the rest, or undefined. */
export function peekSavedAt(text: string): string | undefined {
  try {
    const raw: unknown = JSON.parse(text);
    if (isRecord(raw) && raw['format'] === 'protrack' && isIsoDate(raw['savedAt'])) {
      return raw['savedAt'];
    }
  } catch {
    // Not a sync file.
  }
  return undefined;
}

/**
 * Brings data into shape: drops broken records, fills in missing values and numbers the
 * customers 0, 1, 2… in their order. Also repairs what IndexedDB returns.
 */
export function normalizeData(data: RawData): AppData {
  const now = new Date().toISOString();
  const seen = new Set<string>();
  const customers: Customer[] = [];
  for (const item of Array.isArray(data['customers']) ? data['customers'] : []) {
    if (!isRecord(item)) continue;
    const id = item['id'];
    const name = item['name'];
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    if (typeof name !== 'string' || !name.trim()) continue;
    seen.add(id);
    const order = item['order'];
    customers.push({
      id,
      name: name.trim(),
      order: typeof order === 'number' && Number.isFinite(order) ? order : Infinity,
      logo: isLogo(item['logo']) ? item['logo'] : null,
      createdAt: isIsoDate(item['createdAt']) ? item['createdAt'] : now,
      updatedAt: isIsoDate(item['updatedAt']) ? item['updatedAt'] : now,
    });
  }
  // Customers without a position go last, by name.
  customers.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  customers.forEach((customer, index) => (customer.order = index));
  const repaired = normalizeProjects(data['projects'], new Set(seen), now);
  const orderLocations = new Map(
    repaired.flatMap((p) => p.orders.map((o) => [o.id, o.location] as const)),
  );
  let bookings = normalizeBookings(data['bookings'], orderLocations);
  // Open-booking projects keep one order; the bookings of the others move onto it.
  const projects = repaired.map((project) => {
    const single = singleOrder(project);
    if (single.merged.size > 0) {
      bookings = moveBookings(bookings, single.merged, single.project.orders[0]).bookings;
    }
    return single.project;
  });
  return {
    customers,
    projects,
    bookings,
    dayNotes: normalizeDayNotes(data['dayNotes'], now),
    settings: normalizeSettings(data['settings']),
  };
}

/** Keeps one note per valid day with text, by date. */
function normalizeDayNotes(raw: unknown, now: string): DayNote[] {
  const notes = new Map<string, DayNote>();
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!isRecord(item)) continue;
    const { date, text, updatedAt } = item;
    if (!isIsoDay(date) || notes.has(date)) continue;
    if (typeof text !== 'string' || !text.trim()) continue;
    notes.set(date, { date, text, updatedAt: isIsoDate(updatedAt) ? updatedAt : now });
  }
  return [...notes.values()].sort((a, b) => a.date.localeCompare(b.date));
}

/** Keeps the projects of known customers with a name; repairs their orders. */
function normalizeProjects(raw: unknown, customerIds: Set<string>, now: string): Project[] {
  const seen = new Set<string>();
  const orderIds = new Set<string>();
  const projects: Project[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!isRecord(item)) continue;
    const { id, name, customerId, color, status, billing } = item;
    const booking = BOOKING_MODE_IDS.includes(item['booking'] as BookingMode)
      ? (item['booking'] as BookingMode)
      : 'po';
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    if (typeof name !== 'string' || !name.trim()) continue;
    if (typeof customerId !== 'string' || !customerIds.has(customerId)) continue;
    seen.add(id);
    const orders: Order[] = [];
    for (const order of Array.isArray(item['orders']) ? item['orders'] : []) {
      const repaired = normalizeOrder(order, orderIds, booking);
      if (repaired) orders.push(repaired);
    }
    orders.sort(compareOrders);
    projects.push({
      id,
      customerId,
      name: name.trim(),
      color:
        typeof color === 'string' &&
        (HEX_COLOR.test(color) || (PROJECT_COLOR_PRESETS as readonly string[]).includes(color))
          ? color.toLowerCase()
          : PROJECT_COLOR_PRESETS[0],
      status: PROJECT_STATUS_IDS.includes(status as ProjectStatus)
        ? (status as ProjectStatus)
        : 'active',
      billing: BILLING_IDS.includes(billing as Billing) ? (billing as Billing) : 'chargeable',
      booking,
      order:
        typeof item['order'] === 'number' && Number.isFinite(item['order'])
          ? item['order']
          : Infinity,
      orders,
      createdAt: isIsoDate(item['createdAt']) ? item['createdAt'] : now,
      updatedAt: isIsoDate(item['updatedAt']) ? item['updatedAt'] : now,
    });
  }
  // Each customer's projects are numbered 0, 1, 2… in their order; those without a place go
  // last, by name.
  projects.sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
  );
  const next = new Map<string, number>();
  for (const project of projects) {
    const order = next.get(project.customerId) ?? 0;
    project.order = order;
    next.set(project.customerId, order + 1);
  }
  return projects;
}

/**
 * An order with a name. In a PO-restricted project it needs real dates (swapped if reversed)
 * and keeps its forecast only inside its timeline; in an open-booking project it has no dates
 * and no budget, and keeps its forecast in any month.
 */
function normalizeOrder(raw: unknown, seen: Set<string>, booking: BookingMode): Order | undefined {
  if (!isRecord(raw)) return undefined;
  const { id, name, location, budget } = raw;
  let { start, end } = raw;
  if (typeof id !== 'string' || !id || seen.has(id)) return undefined;
  if (typeof name !== 'string' || !name.trim()) return undefined;
  const open = booking === 'open';
  if (!open) {
    if (!isIsoDay(start) || !isIsoDay(end)) return undefined;
    if (end < start) [start, end] = [end, start];
  }
  seen.add(id);
  const forecast: Record<MonthKey, number> = {};
  if (isRecord(raw['forecast'])) {
    for (const [month, days] of Object.entries(raw['forecast'])) {
      if (!isMonthKey(month)) continue;
      if (!open && (month < (start as string).slice(0, 7) || month > (end as string).slice(0, 7))) {
        continue;
      }
      if (isPositive(days)) forecast[month] = days;
    }
  }
  return {
    id,
    name: name.trim(),
    start: open ? null : (start as string),
    end: open ? null : (end as string),
    budget: open
      ? null
      : typeof budget === 'number' && Number.isFinite(budget) && budget >= 0
        ? budget
        : 0,
    location: LOCATION_IDS.includes(location as Location) ? (location as Location) : 'onsite',
    forecast,
  };
}

/**
 * Keeps the bookings of known orders with a real date and more than 0 days. A booking keeps a
 * location of its own only where it is a known one other than its order's.
 */
function normalizeBookings(raw: unknown, orderLocations: Map<string, Location>): Booking[] {
  const seen = new Set<string>();
  const bookings: Booking[] = [];
  for (const item of Array.isArray(raw) ? raw : []) {
    if (!isRecord(item)) continue;
    const { id, orderId, date, days, location } = item;
    if (typeof id !== 'string' || !id || seen.has(id)) continue;
    if (typeof orderId !== 'string' || !orderLocations.has(orderId)) continue;
    if (!isIsoDay(date) || !isPositive(days)) continue;
    seen.add(id);
    const booking: Booking = { id, orderId, date, days };
    if (LOCATION_IDS.includes(location as Location) && location !== orderLocations.get(orderId)) {
      booking.location = location as Location;
    }
    bookings.push(booking);
  }
  return bookings;
}

function isPositive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

function normalizeSettings(raw: unknown): Settings {
  const settings = defaultSettings();
  if (!isRecord(raw)) return settings;
  const language = raw['language'];
  if (LANGUAGE_CODES.includes(language as LanguageCode)) {
    settings.language = language as LanguageCode;
  }
  const region = raw['region'];
  if (REGION_CODES.includes(region as RegionCode)) settings.region = region as RegionCode;
  settings.chargeabilityTarget = percent(raw['chargeabilityTarget'], settings.chargeabilityTarget);
  const targets = raw['locationTargets'];
  if (isRecord(targets)) {
    for (const id of WORK_LOCATION_IDS) {
      settings.locationTargets[id] = percent(targets[id], settings.locationTargets[id]);
    }
  }
  if (Array.isArray(raw['lockedMonths'])) {
    settings.lockedMonths = [
      ...new Set(raw['lockedMonths'].filter((month): month is string => isMonthKey(month))),
    ].sort();
  }
  const colors = Array.isArray(raw['customColors']) ? raw['customColors'] : [];
  settings.customColors = [
    ...new Set(
      colors
        .filter((c): c is string => typeof c === 'string' && HEX_COLOR.test(c))
        .map((c) => c.toLowerCase()),
    ),
  ];
  const yearEnd = raw['yearEndDaysOff'];
  if ((YEAR_END_DAYS_OFF as readonly unknown[]).includes(yearEnd)) {
    settings.yearEndDaysOff = yearEnd as number;
  }
  return settings;
}

function percent(value: unknown, fallback: number): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) return fallback;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function isLogo(value: unknown): value is string {
  return typeof value === 'string' && LOGO_TYPES.some((type) => value.startsWith(`data:${type};`));
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && !Number.isNaN(Date.parse(value));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
