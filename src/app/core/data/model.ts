/** The data model of ProTrack. Everything here goes into IndexedDB and the sync file. */

/** A German federal state; its public holidays are taken out of the working days. */
export type RegionCode =
  | 'BW'
  | 'BY'
  | 'BE'
  | 'BB'
  | 'HB'
  | 'HH'
  | 'HE'
  | 'MV'
  | 'NI'
  | 'NW'
  | 'RP'
  | 'SL'
  | 'SN'
  | 'ST'
  | 'SH'
  | 'TH';

/** All federal states. Their names are in the strings file (`regions`). */
export const REGION_CODES: readonly RegionCode[] = [
  'BW',
  'BY',
  'BE',
  'BB',
  'HB',
  'HH',
  'HE',
  'MV',
  'NI',
  'NW',
  'RP',
  'SL',
  'SN',
  'ST',
  'SH',
  'TH',
];

/** Where a day is booked. Out of office is absence. */
export type Location = 'onsite' | 'home' | 'reply' | 'ooo';

/** The locations that count as booked days and have a target share. */
export type WorkLocation = Exclude<Location, 'ooo'>;

export const WORK_LOCATION_IDS: readonly WorkLocation[] = ['onsite', 'reply', 'home'];

/** The image types a customer logo can have. SVG is preferred. */
export const LOGO_TYPES = ['image/svg+xml', 'image/png', 'image/jpeg'] as const;
export type LogoType = (typeof LOGO_TYPES)[number];

export interface Customer {
  id: string;
  name: string;
  /** Position in the customer list, from 0. */
  order: number;
  /** The logo as a data URL (SVG, PNG or JPEG), or null for none. */
  logo: string | null;
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. */
  updatedAt: string;
}

/** How the days of a project are billed. */
export type Billing = 'chargeable' | 'nonChargeable' | 'neutral';

export const BILLING_IDS: readonly Billing[] = ['chargeable', 'nonChargeable', 'neutral'];

/**
 * How a project is booked. PO-restricted projects have orders with a budget and a timeline from
 * a purchase order; open-booking orders have neither and only tell the locations apart.
 */
export type BookingMode = 'po' | 'open';

export const BOOKING_MODE_IDS: readonly BookingMode[] = ['po', 'open'];

/** Active projects take bookings and forecasts; completed ones are kept for the record. */
export type ProjectStatus = 'active' | 'completed';

export const PROJECT_STATUS_IDS: readonly ProjectStatus[] = ['active', 'completed'];

/** The preset project colors of the design system (`--project-*`), in their order. */
export const PROJECT_COLOR_PRESETS = [
  'indigo',
  'pink',
  'orange',
  'cyan',
  'violet',
  'green',
  'blue',
  'amber',
] as const;

/** A custom project color: `#rrggbb`. */
export const HEX_COLOR = /^#[0-9a-f]{6}$/i;

/** A month as `YYYY-MM`. */
export type MonthKey = string;

/** A part of a project with its own budget and timeline. */
export interface Order {
  id: string;
  name: string;
  /** First day, ISO date `YYYY-MM-DD`; null in an open-booking project, which has no timeline. */
  start: string | null;
  /** Last day, ISO date `YYYY-MM-DD`, not before `start`; null like `start`. */
  end: string | null;
  /** Budget in person-days; null in an open-booking project. */
  budget: number | null;
  /** Where the order is usually worked. */
  location: Location;
  /**
   * Planned person-days per month of the timeline (any month without one), by month. Months
   * without a plan are absent.
   */
  forecast: Record<MonthKey, number>;
}

export interface Project {
  id: string;
  customerId: string;
  name: string;
  /** A preset (`indigo`…) or a custom color as `#rrggbb`. */
  color: string;
  status: ProjectStatus;
  billing: Billing;
  booking: BookingMode;
  /** The place among its customer's projects: 0, 1, 2… (version 11, user 2026-11-10). */
  order: number;
  /** The orders, by start date (by name in an open-booking project). */
  orders: Order[];
  /** ISO date-time. */
  createdAt: string;
  /** ISO date-time. */
  updatedAt: string;
}

/** Days booked on an order on one day, from the timesheet. */
export interface Booking {
  id: string;
  orderId: string;
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** Person-days, more than 0. */
  days: number;
  /**
   * Where this day was worked, when it differs from the order's location; absent means the
   * order's location. See `locationOf` in orders.ts.
   */
  location?: Location;
}

/** The languages of the UI. Their texts are in src/app/i18n (en.ts, de.ts). */
export type LanguageCode = 'en' | 'de';

export const LANGUAGE_CODES: readonly LanguageCode[] = ['en', 'de'];

export interface Settings {
  /** The language of the UI (version 12, user 2026-11-10). */
  language: LanguageCode;
  /** Null until the user picks a federal state. */
  region: RegionCode | null;
  /** Target share of chargeable days, in percent. */
  chargeabilityTarget: number;
  /** Target share of booked days per location, in percent; they should add up to 100. */
  locationTargets: Record<WorkLocation, number>;
  /** The user's own project colors as `#rrggbb`, offered beside the presets, oldest first. */
  customColors: string[];
  /**
   * The months of My timesheet locked against changes, as `YYYY-MM`, in order. A locked month
   * can always be unlocked again.
   */
  lockedMonths: MonthKey[];
  /**
   * How much of December 24 and 31 the company gives off, in percent (one of
   * YEAR_END_DAYS_OFF): they count as working days only for the rest.
   */
  yearEndDaysOff: number;
}

/** The choices for `Settings.yearEndDaysOff`: working days, half days off, days off. */
export const YEAR_END_DAYS_OFF = [0, 50, 100] as const;

/** The note of one day in My timesheet, plain text. */
export interface DayNote {
  /** ISO date `YYYY-MM-DD`. */
  date: string;
  /** Never blank: a note without text is deleted. */
  text: string;
  /** ISO date-time. */
  updatedAt: string;
}

/** All user data: what the sync file holds in `data`. */
export interface AppData {
  customers: Customer[];
  projects: Project[];
  bookings: Booking[];
  /** By date. */
  dayNotes: DayNote[];
  settings: Settings;
}

export function defaultSettings(): Settings {
  return {
    // English, as ProTrack was before it had a choice of language.
    language: 'en',
    region: null,
    chargeabilityTarget: 80,
    locationTargets: { onsite: 30, home: 45, reply: 25 },
    customColors: [],
    lockedMonths: [],
    // The user's company gives half of December 24 and 31 off (user, 2026-11-10).
    yearEndDaysOff: 50,
  };
}

export function emptyData(): AppData {
  return { customers: [], projects: [], bookings: [], dayNotes: [], settings: defaultSettings() };
}
