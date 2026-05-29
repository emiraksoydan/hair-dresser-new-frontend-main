import { NativeModules, PermissionsAndroid, Platform } from 'react-native';
import Constants from 'expo-constants';

/** Expo Go'da @react-native-firebase yok; require() bile paketi yüklerken patlayabilir. */
export function isExpoGoClient(): boolean {
  return Constants.executionEnvironment === 'storeClient';
}

/**
 * Native Firebase yoksa veya require başarısızsa null — asla throw etmez.
 */
function tryLoadMessaging():
  | typeof import('@react-native-firebase/messaging').default
  | null {
  if (isExpoGoClient()) return null;
  if (!NativeModules.RNFBAppModule) return null;
  try {
    const mod = require('@react-native-firebase/messaging');
    const messaging = mod?.default;
    return typeof messaging === 'function' ? messaging : null;
  } catch {
    return null;
  }
}

/**
 * iOS / Android'de bildirim izninin DURUMUNU döner.
 * RNFB: -1=NotDetermined, 0=Denied, 1=Authorized, 2=Provisional
 */
export type NotificationPermissionStatus = 'notDetermined' | 'authorized' | 'denied';

export async function getNotificationPermissionStatus(): Promise<NotificationPermissionStatus> {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const hasPostPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (hasPostPermission) return 'authorized';
    } catch {
      // devam — Firebase / expo fallback
    }
  }

  const messaging = tryLoadMessaging();
  if (messaging) {
    try {
      const status = await messaging().hasPermission();
      if (status === 1 || status === 2) return 'authorized';
      if (status === -1) return 'notDetermined';
      return 'denied';
    } catch {
      // expo-notifications fallback
    }
  }

  try {
    const { getPermissionsAsync } = require('expo-notifications');
    const res = await getPermissionsAsync();
    if (res.status === 'granted') return 'authorized';
    if (res.canAskAgain) return 'notDetermined';
    return 'denied';
  } catch {
    return 'notDetermined';
  }
}

/** OS bildirim izni açık mı (POST_NOTIFICATIONS + RNFB / expo). */
export async function getNotificationPermissionGranted(): Promise<boolean> {
  return (await getNotificationPermissionStatus()) === 'authorized';
}

/**
 * Native bildirim izni ister (iOS dialog'unu BURADA tetikler).
 */
let notificationPermissionInflight: Promise<boolean> | null = null;

export async function requestNotificationPermissionNative(): Promise<boolean> {
  if (notificationPermissionInflight) return notificationPermissionInflight;

  notificationPermissionInflight = (async () => {
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const result = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (result !== PermissionsAndroid.RESULTS.GRANTED) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const messaging = tryLoadMessaging();
  if (messaging) {
    try {
      const status = await messaging().requestPermission({
        alert: true,
        badge: true,
        sound: true,
      });
      if (Platform.OS === 'ios' && (status === 1 || status === 2)) {
        try {
          await messaging().registerDeviceForRemoteMessages();
        } catch {
          /* sessiz */
        }
      }
      return status === 1 || status === 2;
    } catch {
      /* expo fallback */
    }
  }

  try {
    const { requestPermissionsAsync } = require('expo-notifications');
    const res = await requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return res.status === 'granted';
  } catch {
    return false;
  }
  })();

  try {
    return await notificationPermissionInflight;
  } finally {
    notificationPermissionInflight = null;
  }
}
