import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '@fluentui/react-components';
import { paletteDarkTheme, paletteLightTheme } from './palette';

export type ThemeMode = 'light' | 'dark' | 'system';

const STORAGE_KEY = 'protrack-theme-mode';

function getSystemPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function readStoredMode(): ThemeMode {
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';
}

export interface UseThemeModeResult {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  isDark: boolean;
  theme: Theme;
}

export function useThemeMode(): UseThemeModeResult {
  const [mode, setModeState] = useState<ThemeMode>(readStoredMode);
  const [systemPrefersDark, setSystemPrefersDark] = useState(getSystemPrefersDark);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next);
    localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const isDark = mode === 'dark' || (mode === 'system' && systemPrefersDark);

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  }, [isDark]);

  return { mode, setMode, isDark, theme: isDark ? paletteDarkTheme : paletteLightTheme };
}
