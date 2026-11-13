import { Injectable, signal } from '@angular/core';
import { ProjectStatus } from '../../core/data/model';

/** Where the browser keeps the collapsed rows and the Forecast's folded months. */
const COLLAPSED_KEY = 'protrack.treeCollapsed';
const FOLDED_KEY = 'protrack.forecastFoldedThrough';

/**
 * Which customers and projects of the tree tables are collapsed, and which months the Forecast
 * folds into one column. Shared by the tabs of My projects. Settings of this browser: kept in
 * localStorage, out of the backup file. Everything starts expanded.
 */
@Injectable({ providedIn: 'root' })
export class TreeState {
  private readonly collapsed = signal<ReadonlySet<string>>(readCollapsed());

  private readonly folded = signal(readFolded());
  /** Forecast: January through this month (index 1–10) in one column; null for single months. */
  readonly foldedThrough = this.folded.asReadonly();

  isCollapsed(key: string): boolean {
    return this.collapsed().has(key);
  }

  toggle(key: string): void {
    const next = new Set(this.collapsed());
    if (!next.delete(key)) next.add(key);
    this.collapsed.set(next);
    store(COLLAPSED_KEY, JSON.stringify([...next]));
  }

  foldThrough(month: number | null): void {
    this.folded.set(month);
    store(FOLDED_KEY, month === null ? null : String(month));
  }
}

/** Saves a value in localStorage, or removes it for null. */
function store(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Storage blocked (private window, cleared site data): the state lasts until reload.
  }
}

/** The stored collapsed rows. */
function readCollapsed(): ReadonlySet<string> {
  try {
    const keys: unknown = JSON.parse(localStorage.getItem(COLLAPSED_KEY) ?? 'null');
    // Left behind: customers of the weekly timesheet (before 2026-11-10) and the project
    // groups (Active, Completed) of My projects (before the Archive tab, 2026-11-10).
    if (Array.isArray(keys)) {
      return new Set(
        keys.filter(
          (k) =>
            typeof k === 'string' &&
            !k.startsWith('customer:timesheet:') &&
            !k.startsWith('group:'),
        ),
      );
    }
  } catch {
    // Blocked or unreadable: start with nothing collapsed.
  }
  return new Set();
}

/** The stored fold, if it is a month that can be folded (February to November). */
function readFolded(): number | null {
  try {
    const month = Number(localStorage.getItem(FOLDED_KEY) ?? NaN);
    return Number.isInteger(month) && month >= 1 && month <= 10 ? month : null;
  } catch {
    return null;
  }
}

/**
 * The key of a customer in a tab: Projects and Forecast share the scope 'active', the Archive
 * has 'completed', so a customer collapses there on its own.
 */
export function customerKey(scope: ProjectStatus, customerId: string): string {
  return `customer:${scope}:${customerId}`;
}

/** The key of a project. */
export function projectKey(projectId: string): string {
  return `project:${projectId}`;
}
