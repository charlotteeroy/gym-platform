'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useGymSettings, GymSettings } from '@/hooks/use-gym-settings';

interface GymThemeContextValue {
  settings: GymSettings;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const GymThemeContext = createContext<GymThemeContextValue | null>(null);

const DEFAULT_SETTINGS: GymSettings = {
  id: '',
  name: 'GymFlow',
  logoUrl: null,
  tagline: null,
  primaryColor: '#6366f1',
  secondaryColor: '#f1f5f9',
  accentColor: '#10b981',
};

const DEFAULT_CONTEXT: GymThemeContextValue = {
  settings: DEFAULT_SETTINGS,
  isLoading: false,
  refetch: async () => {},
};

export function useGymTheme() {
  const context = useContext(GymThemeContext);
  // Return defaults if not inside provider (avoids crashes during SSR or outside provider)
  return context ?? DEFAULT_CONTEXT;
}

interface GymThemeProviderProps {
  children: ReactNode;
}

export function GymThemeProvider({ children }: GymThemeProviderProps) {
  const { settings, isLoading, refetch } = useGymSettings();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Apply CSS variables when settings change
  useEffect(() => {
    if (!mounted) return;

    const root = document.documentElement;

    // Set CSS variables for theme colors
    if (settings.primaryColor) {
      root.style.setProperty('--gym-primary', settings.primaryColor);
      root.style.setProperty('--gym-primary-rgb', hexToRgb(settings.primaryColor));
    }
    if (settings.secondaryColor) {
      root.style.setProperty('--gym-secondary', settings.secondaryColor);
      root.style.setProperty('--gym-secondary-rgb', hexToRgb(settings.secondaryColor));
    }
    if (settings.accentColor) {
      root.style.setProperty('--gym-accent', settings.accentColor);
      root.style.setProperty('--gym-accent-rgb', hexToRgb(settings.accentColor));
    }

    // Calculate derived colors
    if (settings.primaryColor) {
      const hsl = hexToHsl(settings.primaryColor);
      root.style.setProperty('--gym-primary-light', `hsl(${hsl.h}, ${hsl.s}%, ${Math.min(hsl.l + 35, 95)}%)`);
      root.style.setProperty('--gym-primary-dark', `hsl(${hsl.h}, ${hsl.s}%, ${Math.max(hsl.l - 15, 10)}%)`);
    }

  }, [settings, mounted]);

  return (
    <GymThemeContext.Provider value={{ settings, isLoading, refetch }}>
      {children}
    </GymThemeContext.Provider>
  );
}

// Helper functions
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0, 0, 0';
  return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
}

function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 0, l: 0 };

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}
