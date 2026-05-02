import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { getFarTokens, FarTokens } from './theme';

export type ThemeMode = 'auto' | 'light' | 'dark';

const THEME_MODE_KEY = 'brewed_theme_mode';

interface ThemeContextValue {
  tokens: FarTokens;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  tokens: getFarTokens(false),
  themeMode: 'auto',
  setThemeMode: () => {},
  isDark: false,
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [themeMode, setThemeModeState] = useState<ThemeMode>('auto');

  useEffect(() => {
    SecureStore.getItemAsync(THEME_MODE_KEY).then((stored) => {
      if (stored === 'auto' || stored === 'light' || stored === 'dark') {
        setThemeModeState(stored);
      }
    });
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    SecureStore.setItemAsync(THEME_MODE_KEY, mode).catch(() => {});
  }, []);

  const isDark = themeMode === 'auto' ? systemScheme === 'dark' : themeMode === 'dark';
  const tokens = getFarTokens(isDark);

  return (
    <ThemeContext.Provider value={{ tokens, themeMode, setThemeMode, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
