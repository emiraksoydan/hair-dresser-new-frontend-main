import { useCallback, useEffect, useState } from 'react';
import { Alert, AppState, Linking, Platform, type AppStateStatus } from 'react-native';
import * as Location from 'expo-location';
import { useLanguage } from './useLanguage';
import {
  getNotificationPermissionGranted,
  getNotificationPermissionStatus,
  isExpoGoClient,
  requestNotificationPermissionNative,
} from '../lib/notificationPlatformPermission';

async function getLocationGranted(): Promise<boolean> {
  const { status } = await Location.getForegroundPermissionsAsync();
  return status === 'granted';
}

/** Bildirim anahtarıyla aynı mantık: henüz sorulmadıysa veya tekrar sorulabiliyorsa uygulama içi istek. */
async function requestLocationForegroundIfPossible(): Promise<boolean> {
  const perm = await Location.getForegroundPermissionsAsync();
  if (perm.status === 'granted') return true;
  if (perm.status === 'undetermined' || perm.canAskAgain) {
    const next = await Location.requestForegroundPermissionsAsync();
    return next.status === 'granted';
  }
  return false;
}

export function usePermissionSwitches() {
  const { t } = useLanguage();
  const [locationGranted, setLocationGranted] = useState(false);
  const [notificationGranted, setNotificationGranted] = useState(false);

  const refresh = useCallback(async () => {
    const [loc, notif] = await Promise.all([
      getLocationGranted(),
      getNotificationPermissionGranted(),
    ]);
    setLocationGranted(loc);
    setNotificationGranted(notif);
  }, []);

  const openSystemSettings = useCallback(
    (_kind: 'notification' | 'location') => {
      if (isExpoGoClient()) {
        Alert.alert(t('profile.expoGoSettingsTitle'), t('profile.expoGoSettingsBody'), [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('profile.openAppSettingsAnyway'), onPress: () => Linking.openSettings().catch(() => {}) },
        ]);
        return;
      }

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
      if (value) {
        const granted = await requestLocationForegroundIfPossible();
        setLocationGranted(granted);
        if (!granted) {
          openSystemSettings('location');
        }
        return;
      }
      // İzin kapatılamaz; kullanıcıyı sistem ayarlarına yönlendir (bildirim anahtarıyla aynı model).
      setLocationGranted(value);
      openSystemSettings('location');
    },
    [openSystemSettings],
  );

  const handleNotificationToggle = useCallback(
    async (value: boolean) => {
      const status = await getNotificationPermissionStatus();

      if (status === 'notDetermined') {
        const granted = await requestNotificationPermissionNative();
        setNotificationGranted(granted);
        return;
      }

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
