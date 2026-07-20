const STORAGE_KEY = 'protrack-archived-section-collapsed';

/** Collapsed by default (also when nothing is stored yet) - archiving is meant to declutter. */
export function loadArchivedSectionCollapsed(): boolean {
  return localStorage.getItem(STORAGE_KEY) !== 'false';
}

export function saveArchivedSectionCollapsed(collapsed: boolean): void {
  localStorage.setItem(STORAGE_KEY, String(collapsed));
}
