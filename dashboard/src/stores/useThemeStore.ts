import { create } from 'zustand';

export type Theme = 'dark' | 'light';

type ThemeStore = {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
};

const STORAGE_KEY = 'saferoute-theme';

function getInitial(): Theme {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch { /* SSR / restricted storage */ }
  return 'dark';
}

function applyTheme(t: Theme) {
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem(STORAGE_KEY, t); } catch { /* noop */ }
}

const initial = getInitial();
applyTheme(initial);

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: initial,
  setTheme: (t) => { applyTheme(t); set({ theme: t }); },
  toggle: () =>
    set((s) => {
      const next: Theme = s.theme === 'dark' ? 'light' : 'dark';
      applyTheme(next);
      return { theme: next };
    }),
}));
