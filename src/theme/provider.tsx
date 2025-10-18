// src/theme/provider.tsx
import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { themeFor, Theme } from './tokens';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeContextValue = {
  mode: ThemeMode;
  resolvedMode: 'light' | 'dark';
  theme: Theme;
  // ✅ allow both direct values and functional updates
  setMode: React.Dispatch<React.SetStateAction<ThemeMode>>;
  toggleLightDark: () => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

export function ThemeProvider({
  children,
  initialMode = 'system',
}: {
  children: React.ReactNode;
  initialMode?: ThemeMode;
}) {
  const [mode, setMode] = useState<ThemeMode>(initialMode);
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null

  const resolvedMode: 'light' | 'dark' = useMemo(() => {
    if (mode === 'system') return systemScheme === 'dark' ? 'dark' : 'light';
    return mode;
  }, [mode, systemScheme]);

  const theme = useMemo(() => themeFor(resolvedMode), [resolvedMode]);

  const toggleLightDark = useCallback(() => {
    // ✅ functional update works now
    setMode(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ mode, resolvedMode, theme, setMode, toggleLightDark }),
    [mode, resolvedMode, theme, toggleLightDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme() must be used within <ThemeProvider>');
  return ctx;
}