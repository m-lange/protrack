/** Working hours in one person-day: the timesheet takes hours and keeps days. */
export const HOURS_PER_DAY = 8;

/**
 * The decimal separator of the UI language: "." in English, "," in German. The Language
 * service sets it once at app start; a change of language reloads the app.
 */
let decimalSeparator = '.';

export function setDecimalSeparator(separator: string): void {
  decimalSeparator = separator;
}

/**
 * A number of person-days with up to two decimals (or `decimals`) and the language's decimal
 * separator: "12", "0.5" (German "0,5"), "−2.25".
 */
export function formatDays(value: number, decimals = 2): string {
  const factor = 10 ** decimals;
  const rounded = Math.round(value * factor) / factor;
  const text = String(Math.abs(rounded)).replace('.', decimalSeparator);
  return rounded < 0 ? `−${text}` : text;
}

/** Person-days as hours, formatted like days: 1.5 d → "12". */
export function formatHours(days: number): string {
  return formatDays(days * HOURS_PER_DAY);
}

/**
 * Reads person-days as typed, with a decimal point or comma, rounded to `step` (0.25 for plans,
 * 0.01 for budgets). Empty input is null; anything that is not a number of 0 or more is undefined.
 */
export function parseDays(text: string, step = 0.25): number | null | undefined {
  const value = parseAmount(text);
  if (value === null || value === undefined) return value;
  return Number((Math.round(value / step) * step).toFixed(2));
}

/**
 * Reads hours as typed, rounds them up to a whole or half hour (7.2 → 7.5, 7.6 → 8) and returns
 * them as person-days. Empty input is null; anything that is not a number of 0 or more is undefined.
 */
export function parseHours(text: string): number | null | undefined {
  const value = parseAmount(text);
  if (value === null || value === undefined) return value;
  return Math.ceil(Number((value * 2).toFixed(6))) / 2 / HOURS_PER_DAY;
}

/** A number of 0 or more as typed, with a decimal point or comma; null when empty. */
function parseAmount(text: string): number | null | undefined {
  const trimmed = text.trim().replace(',', '.');
  if (!trimmed) return null;
  if (!/^\d*\.?\d+$|^\d+\.$/.test(trimmed)) return undefined;
  return Number(trimmed);
}
