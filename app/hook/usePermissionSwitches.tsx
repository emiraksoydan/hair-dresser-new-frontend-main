import { useCallback, useEffect, useState } from 'react';
import { Linking, NativeModules, PermissionsAndroid, Platform } from 'react-native';
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
  // Android 13+ için önce POST_NOTIFICATIONS iznini kontrol et
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const hasPostPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (!hasPostPermission) {
        return false;
      }
    } catch {
      // Sessizce devam et, Firebase tarafını kontrol etmeye çalış
    }
  }

  const messaging = tryLoadMessaging();
  if (!messaging) {
    // Expo Go veya native Firebase olmayan ortamlarda sadece OS seviyesini baz al
    // Android 13+ için yukarıdaki check zaten yapıldı; diğer durumlarda "açık" kabul etmiyoruz
    return Platform.OS === 'android' && Platform.Version >= 33;
  }

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
        let granted = false;

        // Android 13+ için önce POST_NOTIFICATIONS iznini iste
        if (Platform.OS === 'android' && Platform.Version >= 33) {
          try {
            const permissionResult = await PermissionsAndroid.request(
              PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
            );
            if (permissionResult !== PermissionsAndroid.RESULTS.GRANTED) {
              setNotificationGranted(false);
              return;
            }
          } catch {
            setNotificationGranted(false);
            return;
          }
        }

        if (messaging) {
          const status = await messaging().requestPermission();
          granted = status === 1 || status === 2;
          setNotificationGranted(granted);
          if (!granted && Platform.OS === 'ios') {
            Linking.openSettings();
          }
        } else {
          // Firebase yoksa, kullanıcıyı ayarlara yönlendir ve switch değerini
          // yalnızca OS tarafında izin verilmişse true'ya çek
          Linking.openSettings();
          const osGranted = await getNotificationGranted();
          setNotificationGranted(osGranted);
        }
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
