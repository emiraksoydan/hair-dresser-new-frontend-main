import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@app_theme_preference';

export type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  themeMode: ThemeMode;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

// Uygulama her zaman light moddan başlar; kullanıcının AsyncStorage tercihi varsa onu yükler
const ThemeContext = createContext<ThemeContextType>({
  themeMode: 'light',
  toggleTheme: () => {},
  setTheme: () => {},
});

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [themeMode, setThemeMode] = useState<ThemeMode>('light');

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY).then((stored) => {
      if (stored === 'dark' || stored === 'light') {
        setThemeMode(stored);
      }
    });
  }, []);

  // Functional setState: themeMode'a bağımlılık yok → fonksiyon hiç değişmez
  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeMode(mode);
    // Fire-and-forget: UI'ı bekletmeden arka planda kaydet
    AsyncStorage.setItem(THEME_KEY, mode).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeMode((prev) => {
      const newMode: ThemeMode = prev === 'light' ? 'dark' : 'light';
      AsyncStorage.setItem(THEME_KEY, newMode).catch(() => {});
      return newMode;
    });
  }, []);

  // Context value'yu memoize et: sadece themeMode değiştiğinde tüketiciler re-render olsun
  const contextValue = useMemo(
    () => ({ themeMode, toggleTheme, setTheme }),
    [themeMode, toggleTheme, setTheme],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useThemeContext = () => useContext(ThemeContext);
