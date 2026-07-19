/** Formats hours German-style: one decimal place, comma separator, no trailing ".0" (e.g. `8`, `8,5`). */
export function formatHoursDe(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1).replace('.', ',');
}
