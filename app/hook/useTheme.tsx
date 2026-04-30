import { useMemo } from 'react';
import { useThemeContext } from '../context/ThemeContext';
import { COLORS } from '../constants/colors';

export type ColorScheme = 'light' | 'dark';

export interface ThemeColors {
  // Auth page
  background: string;
  backgroundSecondary: string;
  card: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  border: string;
  inputBackground: string;
  inputBorder: string;
  primary: string;
  primaryText: string;
  tagline: string;
  taglineLine: string;

  // App-specific screen backgrounds
  screenBg: string;       // main screen background
  panelBg: string;        // panel/header background
  cardBg: string;         // card/section background
  cardBg2: string;        // secondary card
  cardBg3: string;        // tertiary/deep card

  // App-specific borders
  borderColor: string;    // section borders
  borderColor2: string;   // subtle borders

  // Tab bar & header
  tabBarBg: string;       // tab bar background
  headerBg: string;       // header background
  headerText: string;     // header text

  // Bottom sheet
  sheetBg: string;        // bottom sheet background
  sheetHandle: string;    // sheet handle indicator

  // Map toggle button
  mapToggleBg: string;
  mapToggleBorder: string;

  // Section headers
  sectionHeaderText: string;
}

export const useTheme = () => {
  const { themeMode } = useThemeContext();
  const colorScheme: ColorScheme = themeMode;

  const colors: ThemeColors = useMemo(() => {
    if (colorScheme === 'dark') {
      return {
        // Auth
        background: '#121212',
        backgroundSecondary: '#1e1e1e',
        card: '#1e1e1e',
        text: '#ffffff',
        textSecondary: '#aaaaaa',
        textTertiary: '#777777',
        border: '#333333',
        inputBackground: '#2a2a2a',
        inputBorder: '#444444',
        primary: COLORS.UI.ACCENT_GOLD,
        primaryText: '#1f2937',
        tagline: '#c2a523',
        taglineLine: '#c2a523',

        // App-specific
        screenBg: '#151618',
        panelBg: '#0d0d12',
        cardBg: '#1a1b25',
        cardBg2: '#1e293b',
        cardBg3: '#0f172a',
        borderColor: '#334155',
        borderColor2: '#47494e',
        tabBarBg: '#1a1b25',
        headerBg: '#0d0d12',
        headerText: '#ffffff',
        sheetBg: '#151618',
        sheetHandle: '#47494e',
        mapToggleBg: '#1a1b25',
        mapToggleBorder: '#47494e',
        sectionHeaderText: '#ffffff',
      };
    } else {
      return {
        // Auth
        background: '#ffffff',
        backgroundSecondary: '#f5f5f5',
        card: '#ffffff',
        text: '#111111',
        textSecondary: '#555555',
        textTertiary: '#999999',
        border: '#d0d0d0',
        inputBackground: '#ffffff',
        inputBorder: '#d0d0d0',
        primary: COLORS.UI.ACCENT_GOLD,
        primaryText: '#1f2937',
        tagline: '#8b7355',
        taglineLine: '#8b7355',

        // App-specific
        screenBg: '#f5f7fa',
        panelBg: '#ffffff',
        cardBg: '#ffffff',
        cardBg2: '#f8fafc',
        cardBg3: '#f1f5f9',
        borderColor: '#e2e8f0',
        borderColor2: '#d1d5db',
        tabBarBg: '#ffffff',
        headerBg: '#ffffff',
        headerText: '#111827',
        sheetBg: '#ffffff',
        sheetHandle: '#d1d5db',
        mapToggleBg: '#ffffff',
        mapToggleBorder: '#e2e8f0',
        sectionHeaderText: '#111827',
      };
    }
  }, [colorScheme]);

  return {
    colorScheme,
    colors,
    isDark: colorScheme === 'dark',
    isLight: colorScheme === 'light',
  };
};
