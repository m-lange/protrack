const STORAGE_KEY = 'protrack-last-view';

export function saveLastView(path: string): void {
  localStorage.setItem(STORAGE_KEY, path);
}

export function getLastView(): string | null {
  return localStorage.getItem(STORAGE_KEY);
}
