'use client';

import { useEffect, useState } from 'react';

export type ResolvedTheme = 'light' | 'dark';

export type ThemePalette = {
  page: string;
  surface: string;
  surface2: string;
  surface3: string;
  border: string;
  borderStrong: string;
  track: string;
  fg: string;
  fg2: string;
  fg3: string;
  ink: string;
  inkFg: string;
  ok: string;
  warn: string;
  danger: string;
  shadow: string;
  shadowSoft: string;
};

export const THEMES: Record<ResolvedTheme, ThemePalette> = {
  light: {
    page: '#f4f5f6',
    surface: '#ffffff',
    surface2: '#f6f7f8',
    surface3: '#eceef1',
    border: '#e6e8ec',
    borderStrong: '#d4d8dd',
    track: '#e8eaee',
    fg: '#191b1f',
    fg2: '#5e656e',
    fg3: '#969ca4',
    ink: '#1b1d21',
    inkFg: '#ffffff',
    ok: '#157f4a',
    warn: '#a8620a',
    danger: '#bf2440',
    shadow: 'rgba(22,27,34,.15)',
    shadowSoft: 'rgba(22,27,34,.07)',
  },
  dark: {
    page: '#0b0c0e',
    surface: '#161719',
    surface2: '#1d1f22',
    surface3: '#272a2e',
    border: '#2a2d31',
    borderStrong: '#3a3e44',
    track: '#2a2d31',
    fg: '#eaecee',
    fg2: '#a0a6ae',
    fg3: '#71777f',
    ink: '#f4f5f6',
    inkFg: '#16181a',
    ok: '#4cc079',
    warn: '#e0a44a',
    danger: '#f0697e',
    shadow: 'rgba(0,0,0,.6)',
    shadowSoft: 'rgba(0,0,0,.4)',
  },
};

export function useResolvedTheme(theme: 'light' | 'dark' | 'auto'): ResolvedTheme {
  const [resolved, setResolved] = useState<ResolvedTheme>('light');

  useEffect(() => {
    if (theme !== 'auto') {
      setResolved(theme);
      return;
    }
    if (typeof window === 'undefined' || !window.matchMedia) {
      setResolved('light');
      return;
    }
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    setResolved(mq.matches ? 'dark' : 'light');
    const handler = (e: MediaQueryListEvent) => {
      setResolved(e.matches ? 'dark' : 'light');
    };
    mq.addEventListener('change', handler);
    return () => {
      mq.removeEventListener('change', handler);
    };
  }, [theme]);

  return resolved;
}

export function buildCssVars(palette: ThemePalette, accent: string): Record<string, string> {
  return {
    '--ez-page': palette.page,
    '--ez-surface': palette.surface,
    '--ez-surface2': palette.surface2,
    '--ez-surface3': palette.surface3,
    '--ez-border': palette.border,
    '--ez-borderStrong': palette.borderStrong,
    '--ez-track': palette.track,
    '--ez-fg': palette.fg,
    '--ez-fg2': palette.fg2,
    '--ez-fg3': palette.fg3,
    '--ez-ink': palette.ink,
    '--ez-inkFg': palette.inkFg,
    '--ez-ok': palette.ok,
    '--ez-warn': palette.warn,
    '--ez-danger': palette.danger,
    '--ez-shadow': palette.shadow,
    '--ez-shadowSoft': palette.shadowSoft,
    '--ez-accent': accent,
  };
}
