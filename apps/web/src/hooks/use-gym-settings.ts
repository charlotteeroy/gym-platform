'use client';

import { useState, useEffect, useCallback } from 'react';

export interface GymSettings {
  id: string;
  name: string;
  logoUrl: string | null;
  tagline: string | null;
  primaryColor: string | null;
  secondaryColor: string | null;
  accentColor: string | null;
}

const DEFAULT_SETTINGS: GymSettings = {
  id: '',
  name: 'GymFlow',
  logoUrl: null,
  tagline: null,
  primaryColor: '#6366f1',
  secondaryColor: '#f1f5f9',
  accentColor: '#10b981',
};

export function useGymSettings() {
  const [settings, setSettings] = useState<GymSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/gym/branding');

      if (!response.ok) {
        // User might not have access, use defaults
        return;
      }

      const data = await response.json();

      if (data.success && data.data) {
        setSettings({
          id: data.data.id,
          name: data.data.name || DEFAULT_SETTINGS.name,
          logoUrl: data.data.logoUrl,
          tagline: data.data.tagline,
          primaryColor: data.data.primaryColor || DEFAULT_SETTINGS.primaryColor,
          secondaryColor: data.data.secondaryColor || DEFAULT_SETTINGS.secondaryColor,
          accentColor: data.data.accentColor || DEFAULT_SETTINGS.accentColor,
        });
      }
    } catch {
      // Silent fail - use defaults
      setError('Failed to load gym settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return { settings, isLoading, error, refetch: fetchSettings };
}
