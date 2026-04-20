
import 'react-native-reanimated';
import { StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native'
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
import { useFirebaseMessaging } from './hook/useFirebaseMessaging';
import { GlobalSnackbar } from './hook/useSnackbar';
import { GlobalAlert } from './components/common/GlobalAlert';
import { GlobalKeyboardDismisser } from './components/common/GlobalKeyboardDismisser';
// Background location task'ı kaydet (Expo Go'da çalışmaz)
import './tasks/backgroundLocation';
// FCM background message handler (React ağacının DIŞINDA, modül yüklenince çalışır)
import './lib/firebaseMessagingBackground';
// i18n initialization
import './i18n/config';
import { ThemeProvider } from './context/ThemeContext';
import { useTheme } from './hook/useTheme';
// import { BrandIntro } from './components/splash/BrandIntro';
import { MultiAccountProvider, useMultiAccount } from './context/MultiAccountContext';
import { NotificationOpenerProvider } from './context/NotificationOpenerContext';

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
  // const [brandIntroDone, setBrandIntroDone] = useState(false);

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
        // Android: native splash kapanmadan önce bir kare bekle — font + ilk paint ile titreme azalır
        if (Platform.OS === 'android') {
          await new Promise<void>((resolve) => {
            requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
          });
        }
        await SplashScreen.hideAsync();
      } catch {
        // Ignore splash screen errors
      }
    })();
  }, [fontsLoaded]);

  if (!fontsLoaded || !bootReady) return null;

  // if (!brandIntroDone) {
  //   return <BrandIntro onFinish={() => setBrandIntroDone(true)} />;
  // }

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
              <MultiAccountProvider>
                <NotificationOpenerProvider>
                <SignalRBootstrap />
                <FcmTokenBootstrap />
                <FirebaseMessagingBootstrap />
                {/* Klavye dışına dokunulduğunda klavye kapanır. Butonlar / input'lar */}
                {/* kendi touch'larını tükettiği için yalnızca boş alanlarda tetiklenir. */}
                <GlobalKeyboardDismisser>
                  <ThemedStack />
                </GlobalKeyboardDismisser>
                <ThemedStatusBar />
                <GlobalSnackbar />
                <GlobalAlert />
                <AccountSwitchOverlay />
                </NotificationOpenerProvider>
              </MultiAccountProvider>
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

function FirebaseMessagingBootstrap() {
  useFirebaseMessaging();
  return null;
}

/** Hesap geçişi sırasında tüm ekranı kapatan tam saydam overlay. */
function AccountSwitchOverlay() {
  const { isSwitchingAccount } = useMultiAccount();
  if (!isSwitchingAccount) return null;
  return (
    <View
      style={{
        ...StyleSheet.absoluteFillObject,
        // Android'de zIndex çalışması için elevation şart
        elevation: 9999,
        zIndex: 9999,
        backgroundColor: 'rgba(0,0,0,0.6)',
        alignItems: 'center',
        justifyContent: 'center',
        // pointerEvents style içinde olmalı (JSX prop React Native'de deprecated)
        pointerEvents: 'auto',
      }}
    >
      <ActivityIndicator size="large" color="#fea60e" />
    </View>
  );
}

export default RootLayout

