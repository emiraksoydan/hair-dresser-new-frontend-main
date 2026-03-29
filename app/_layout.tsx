
import 'react-native-reanimated';
import { StatusBar, StyleSheet, View } from 'react-native'
import { Text } from './components/common/Text'
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react'
import { useFonts } from 'expo-font';
import { DancingScript_700Bold } from '@expo-google-fonts/dancing-script';
import '../global.css';
import { Provider as ReduxProvider } from 'react-redux';
import { Provider as PaperProvider, DefaultTheme } from "react-native-paper";
import { store } from './store/redux-store';
import { Platform } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { rehydrateTokens } from './store/baseQuery';
import { Stack, Tabs, Link } from 'expo-router';
import {
  BottomSheetModalProvider,
} from '@gorhom/bottom-sheet';
import { clearStoredTokens } from './lib/tokenStorage';
import { tokenStore } from './lib/tokenStore';
import { useSignalRV2 } from './hook/useSignalRV2';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { useFcmToken } from './hook/useFcmToken';
import { GlobalSnackbar } from './hook/useSnackbar';
import { GlobalAlert } from './components/common/GlobalAlert';
// Background location task'ı kaydet (Expo Go'da çalışmaz)
import './tasks/backgroundLocation';
// i18n initialization
import './i18n/config';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './hook/useTheme';
import { BrandIntro } from './components/splash/BrandIntro';

SplashScreen.preventAutoHideAsync();

function ThemedStatusBar() {
  const { isDark } = useTheme();
  return (
    <StatusBar
      barStyle={isDark ? 'light-content' : 'dark-content'}
      backgroundColor="transparent"
      translucent
    />
  );
}

function ThemedStack() {
  const { colors } = useTheme();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.screenBg },
      }}
    >
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(barberstoretabs)" />
      <Stack.Screen name="(freebarbertabs)" />
      <Stack.Screen name="(customertabs)" />
      <Stack.Screen name="(screens)" />
    </Stack>
  );
}

const RootLayout = () => {
  const [bootReady, setBootReady] = useState(false);
  const [brandIntroDone, setBrandIntroDone] = useState(false);

  const [fontsLoaded] = useFonts({
    'CenturyGothic': require('../assets/fonts/centurygothic.ttf'),
    'CenturyGothic-Bold': require('../assets/fonts/centurygothic_bold.ttf'),
    DancingScript_700Bold,
  });

  useEffect(() => {
    if (!fontsLoaded) return;
    (async () => {
      try {
        await rehydrateTokens();
      } catch {
        // Ignore token errors
      }
      setBootReady(true);
      try {
        await SplashScreen.hideAsync();
      } catch {
        // Ignore splash screen errors
      }
    })();
  }, [fontsLoaded]);

  if (!fontsLoaded || !bootReady) return null;

  if (!brandIntroDone) {
    return <BrandIntro onFinish={() => setBrandIntroDone(true)} />;
  }

  // Century Gothic fontunu tüm Paper component'lerinde kullan
  const centuryGothicFont = 'CenturyGothic';
  const centuryGothicBoldFont = 'CenturyGothic-Bold';

  // Tüm font variant'larını Century Gothic ile yapılandır
  const paperTheme = {
    ...DefaultTheme,
    fonts: {
      ...DefaultTheme.fonts,
      displayLarge: { ...DefaultTheme.fonts.displayLarge, fontFamily: centuryGothicBoldFont },
      displayMedium: { ...DefaultTheme.fonts.displayMedium, fontFamily: centuryGothicBoldFont },
      displaySmall: { ...DefaultTheme.fonts.displaySmall, fontFamily: centuryGothicBoldFont },
      headlineLarge: { ...DefaultTheme.fonts.headlineLarge, fontFamily: centuryGothicBoldFont },
      headlineMedium: { ...DefaultTheme.fonts.headlineMedium, fontFamily: centuryGothicBoldFont },
      headlineSmall: { ...DefaultTheme.fonts.headlineSmall, fontFamily: centuryGothicBoldFont },
      titleLarge: { ...DefaultTheme.fonts.titleLarge, fontFamily: centuryGothicBoldFont },
      titleMedium: { ...DefaultTheme.fonts.titleMedium, fontFamily: centuryGothicFont },
      titleSmall: { ...DefaultTheme.fonts.titleSmall, fontFamily: centuryGothicFont },
      labelLarge: { ...DefaultTheme.fonts.labelLarge, fontFamily: centuryGothicFont },
      labelMedium: { ...DefaultTheme.fonts.labelMedium, fontFamily: centuryGothicFont },
      labelSmall: { ...DefaultTheme.fonts.labelSmall, fontFamily: centuryGothicFont },
      bodyLarge: { ...DefaultTheme.fonts.bodyLarge, fontFamily: centuryGothicFont },
      bodyMedium: { ...DefaultTheme.fonts.bodyMedium, fontFamily: centuryGothicFont },
      bodySmall: { ...DefaultTheme.fonts.bodySmall, fontFamily: centuryGothicFont },
    },
  };

  return (
    <ErrorBoundary>
      <ThemeProvider>
      <ReduxProvider store={store}>
        <GestureHandlerRootView className="flex flex-1">
          <PaperProvider theme={paperTheme}>
            <BottomSheetModalProvider>
              <SignalRBootstrap />
              <FcmTokenBootstrap />
              <ThemedStack />
              <ThemedStatusBar />
              <GlobalSnackbar />
              <GlobalAlert />
            </BottomSheetModalProvider>
          </PaperProvider>
        </GestureHandlerRootView>
      </ReduxProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

function SignalRBootstrap() {
  useSignalRV2();
  return null;
}

function FcmTokenBootstrap() {
  useFcmToken();
  return null;
}

export default RootLayout

