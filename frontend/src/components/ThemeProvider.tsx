'use client';

import { createContext, useContext, useState, useCallback, useEffect, useLayoutEffect, type ReactNode } from 'react';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  theme: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  followSystem: () => void;
  isSystem: boolean;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const STORAGE_KEY = 'theme';

function getSystemPreference(): ThemeMode {
  try {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

function readStoredTheme(): ThemeMode | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
    if (stored !== null) localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

function writeStoredTheme(mode: ThemeMode): void {
  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {}
}

function clearStoredTheme(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

function applyTheme(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-theme', mode);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>('dark');
  const [isSystem, setIsSystem] = useState(true);
  const [mounted, setMounted] = useState(false);

  useLayoutEffect(() => {
    const stored = readStoredTheme();
    if (stored) {
      setThemeState(stored);
      setIsSystem(false);
      applyTheme(stored);
    } else {
      const sys = getSystemPreference();
      setThemeState(sys);
      setIsSystem(true);
      applyTheme(sys);
    }
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    let mediaQuery: MediaQueryList | null = null;
    try {
      mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    } catch {
      return;
    }

    const handler = (e: MediaQueryListEvent) => {
      if (!isSystem) return;
      const newTheme: ThemeMode = e.matches ? 'light' : 'dark';
      setThemeState(newTheme);
      applyTheme(newTheme);
    };

    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [isSystem, mounted]);

  const toggleTheme = useCallback(() => {
    setThemeState(prev => {
      const next: ThemeMode = prev === 'dark' ? 'light' : 'dark';
      writeStoredTheme(next);
      applyTheme(next);
      return next;
    });
    setIsSystem(false);
  }, []);

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    writeStoredTheme(mode);
    applyTheme(mode);
    setIsSystem(false);
  }, []);

  const followSystem = useCallback(() => {
    clearStoredTheme();
    const sys = getSystemPreference();
    setThemeState(sys);
    applyTheme(sys);
    setIsSystem(true);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme, followSystem, isSystem }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
