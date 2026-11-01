export type Theme = 'system' | 'light' | 'dark';
const KEY = 'theme';

// A per-viewer convenience: storage may be unavailable (private mode), so every access is guarded.
export function readTheme(): Theme {
  try {
    return (localStorage.getItem(KEY) as Theme | null) ?? 'system';
  } catch {
    return 'system';
  }
}

export function applyTheme(theme: Theme) {
  if (theme === 'system') delete document.documentElement.dataset.theme;
  else document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(KEY, theme);
  } catch {
    /* ignore */
  }
}
