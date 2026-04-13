import { useCallback, useEffect, useState } from 'react';
import { Linking, NativeModules, Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';

/** Expo Go'da @react-native-firebase yok; require() bile paketi yüklerken patlayabilir. */
function isExpoGo(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Native Firebase yoksa veya require başarısızsa null — asla throw etmez.
 * useFcmToken ile aynı strateji (storeClient + RNFBAppModule + try/catch).
 * Not: `ReturnType<typeof messaging>` modül örneğidir; burada varsayılan export olan
 * `messaging()` fonksiyonunun kendisi dönüyor.
 */
function tryLoadMessaging():
  | typeof import('@react-native-firebase/messaging').default
  | null {
  if (isExpoGo()) return null;
  if (!NativeModules.RNFBAppModule) return null;
  try {
    const mod = require('@react-native-firebase/messaging');
    const messaging = mod?.default;
    return typeof messaging === 'function' ? messaging : null;
  } catch {
    return null;
  }
}

async function getLocationGranted(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

async function getNotificationGranted(): Promise<boolean> {
  const messaging = tryLoadMessaging();
  if (!messaging) return false;
  try {
    const status = await messaging().hasPermission();
    // 1 = AUTHORIZED, 2 = PROVISIONAL
    return status === 1 || status === 2;
  } catch {
    return false;
  }
}

export function usePermissionSwitches() {
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);

  const refresh = useCallback(async () => {
    const [loc, notif] = await Promise.all([
      getLocationGranted(),
      getNotificationGranted(),
    ]);
    setLocationGranted(loc);
    setNotificationGranted(notif);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLocationToggle = useCallback(async (value: boolean) => {
    if (value) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setLocationGranted(status === 'granted');
    } else {
      Linking.openSettings();
    }
  }, []);

  const handleNotificationToggle = useCallback(async (value: boolean) => {
    if (value) {
      try {
        const messaging = tryLoadMessaging();
        if (!messaging) {
          Linking.openSettings();
          return;
        }
        const status = await messaging().requestPermission();
        const granted = status === 1 || status === 2;
        setNotificationGranted(granted);
        if (!granted && Platform.OS === 'ios') Linking.openSettings();
      } catch {
        setNotificationGranted(false);
      }
    } else {
      Linking.openSettings();
    }
  }, []);

  return {
    locationGranted,
    notificationGranted,
    handleLocationToggle,
    handleNotificationToggle,
    refreshPermissions: refresh,
  };
}
