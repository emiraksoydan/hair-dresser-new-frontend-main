import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, NativeModules, PermissionsAndroid, Platform, type AppStateStatus } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useLanguage } from './useLanguage';

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
    // Firebase yoksa expo-notifications ile kontrol et (iOS prod dahil)
    try {
      const { getPermissionsAsync } = require('expo-notifications');
      const { status } = await getPermissionsAsync();
      return status === 'granted';
    } catch {
      return false;
    }
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
  const { t } = useLanguage();
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

  const openSystemSettings = useCallback(
    (_kind: 'notification' | 'location') => {
      if (isExpoGo()) {
        Alert.alert(t('profile.expoGoSettingsTitle'), t('profile.expoGoSettingsBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.openAppSettingsAnyway'), onPress: () => Linking.openSettings().catch(() => {}) },
        ]);
        return;
      }

      // iOS: app-settings: doğrudan uygulamanın Settings sayfasını açar (bildirim switch dahil).
      // Android: openSettings() → app info ekranı → Notifications satırı görünür.
      if (Platform.OS === 'ios') {
        Linking.openURL('app-settings:').catch(() => Linking.openSettings().catch(() => {}));
      } else {
        Linking.openSettings().catch(() => {});
      }
    },
    [t],
  );

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Ayarlar ekranından dönünce (konum/bildirim değişmiş olabilir) switch'leri yenile
  useEffect(() => {
    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (next === 'active') {
        refresh();
      }
    });
    return () => sub.remove();
  }, [refresh]);

  const handleLocationToggle = useCallback(
    async (value: boolean) => {
      // Product beklentisi: switch aç/kapat fark etmeksizin ilgili izin için
      // kullanıcıyı doğrudan sistem ayarına yönlendir.
      setLocationGranted(value);
      openSystemSettings('location');
    },
    [openSystemSettings],
  );

  const handleNotificationToggle = useCallback(
    async (value: boolean) => {
      // Product beklentisi: switch aç/kapat fark etmeksizin ilgili izin için
      // kullanıcıyı doğrudan sistem ayarına yönlendir.
      setNotificationGranted(value);
      openSystemSettings('notification');
    },
    [openSystemSettings],
  );

  return {
    locationGranted,
    notificationGranted,
    handleLocationToggle,
    handleNotificationToggle,
    refreshPermissions: refresh,
  };
}
