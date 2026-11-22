import { Customer, Location, MonthKey, Project } from '../../../core/data/model';
import { runsIn } from '../../../core/data/orders';
import { buildTree } from '../../../core/data/tree';
import { monthKey } from '../../../shared/dates/months';
import { formatDays } from '../../../shared/pipes/days';

/** How many months the copy shows at most: the current one and the two after it. */
const MONTHS = 3;

/** About the width of a character in bold mail fonts, so the longest text fits. */
const EM_PER_CHAR = 0.65;

/** Where the days are worked, as the copy groups them: Reply and home office are remote. */
type Place = 'onsite' | 'remote';

const PLACES: Partial<Record<Location, Place>> = {
  onsite: 'onsite',
  reply: 'remote',
  home: 'remote',
};

/** The texts of the copy. */
export interface ForecastCopyTexts {
  /** "Website relaunch › On-site". */
  row: (project: string, place: Place) => string;
  /** "Nov 2026". */
  month: (month: MonthKey) => string;
  /** The head of the first column. */
  project: string;
}

/**
 * The Forecast's Copy button (user, 2026-11-16): the planned days of the active projects in the
 * current month and the two after it, as far as they are in the current year (in November only
 * November and December), a row per project and place (on-site, or remote for Reply
 * and home office), in the order of My projects. Out-of-office orders and rows without planned
 * days are left out.
 *
 * A minimal HTML table that Outlook and Teams take as it is, and the same as tab-separated text.
 * Inline styles only, no colors; as narrow as its content, the month columns centered and of
 * one width, just wide enough for the longest of them (mail clients can't even out columns on
 * their own, so the width is worked out from the number of characters).
 */
export function forecastCopy(
  customers: Customer[],
  projects: Project[],
  today: Date,
  texts: ForecastCopyTexts,
): { html: string; text: string } | null {
  const year = today.getFullYear();
  const months = Array.from({ length: MONTHS }, (_, i) => today.getMonth() + i)
    .filter((month) => month < 12)
    .map((month) => monthKey(year, month));
  const rows = plannedRows(customers, projects, months, texts);
  if (!rows.length) return null;

  const heads = months.map(texts.month);
  const values = rows.map((row) => row.days.map((d) => formatDays(d)));
  const widest = Math.max(...[...heads, ...values.flat()].map((text) => text.length));
  const left = 'padding:2px 16px 2px 0;text-align:left;white-space:nowrap;';
  const center =
    `width:${Math.ceil(widest * EM_PER_CHAR * 10) / 10}em;` +
    'padding:2px 8px;text-align:center;white-space:nowrap;';
  // The align attribute as well as the style: Teams drops some styles when pasted into.
  const align = (style: string) => (style === center ? 'center' : 'left');
  const th = (text: string, style: string) =>
    `<th align="${align(style)}" style="${style}font-weight:bold;border-bottom:1px solid;">${escape(text)}</th>`;
  const td = (text: string, style: string) =>
    `<td align="${align(style)}" style="${style}">${escape(text)}</td>`;
  const html = [
    '<table width="auto" style="width:auto;border-collapse:collapse;">',
    '<thead><tr>',
    th(texts.project, left),
    ...heads.map((head) => th(head, center)),
    '</tr></thead><tbody>',
    ...rows.map(
      (row, i) => `<tr>${td(row.name, left)}${values[i].map((v) => td(v, center)).join('')}</tr>`,
    ),
    '</tbody></table>',
  ].join('');
  const text = [[texts.project, ...heads], ...rows.map((row, i) => [row.name, ...values[i]])]
    .map((line) => line.join('\t'))
    .join('\n');
  return { html, text };
}

/** A row per project and place with planned days in the months, in the order of My projects. */
function plannedRows(
  customers: Customer[],
  projects: Project[],
  months: readonly MonthKey[],
  texts: ForecastCopyTexts,
): { name: string; days: number[] }[] {
  const rows: { name: string; days: number[] }[] = [];
  for (const node of buildTree(customers, projects, 'active')) {
    for (const { project, orders } of node.projects) {
      for (const place of ['onsite', 'remote'] as const) {
        const days = months.map((month) => {
          let total = 0;
          for (const order of orders) {
            if (PLACES[order.location] === place && runsIn(order, month)) {
              total += order.forecast[month] ?? 0;
            }
          }
          return total;
        });
        if (days.some((d) => d > 0)) rows.push({ name: texts.row(project.name, place), days });
      }
    }
  }
  return rows;
}

function escape(text: string): string {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
