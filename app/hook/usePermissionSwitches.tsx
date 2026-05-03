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

/**
 * iOS / Android'de bildirim izninin DURUMUNU döner.
 * 0 = NotDetermined (henüz sorulmadı) — KRİTİK, native dialog tetiklenebilir
 * 1 = Authorized (kabul) / Provisional
 * 2 = Denied (reddedildi) — Settings'ten manuel açılabilir
 */
type NotificationStatus = 'notDetermined' | 'authorized' | 'denied';

async function getNotificationStatus(): Promise<NotificationStatus> {
  // Android 13+ için önce POST_NOTIFICATIONS iznini kontrol et
  if (Platform.OS === 'android' && Platform.Version >= 33) {
    try {
      const hasPostPermission = await PermissionsAndroid.check(
        PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
      );
      if (hasPostPermission) return 'authorized';
      // Android'de check yalnızca true/false döner; "henüz sorulmadı" ayrımı yok.
      // İlk request'te sistem otomatik olarak dialog açar — toggle handler'da requestPermission çağıracağız.
    } catch {
      // Sessizce devam — Firebase tarafını da kontrol et
    }
  }

  const messaging = tryLoadMessaging();
  if (messaging) {
    try {
      const status = await messaging().hasPermission();
      // RNFB: -1=NotDetermined, 0=Denied, 1=Authorized, 2=Provisional
      if (status === 1 || status === 2) return 'authorized';
      if (status === -1) return 'notDetermined';
      return 'denied';
    } catch {
      // Firebase çağrısı başarısızsa expo-notifications'a düş
    }
  }

  // Firebase native modülü yok / hata — expo-notifications fallback (iOS dev/prod dahil)
  try {
    const { getPermissionsAsync } = require('expo-notifications');
    const res = await getPermissionsAsync();
    if (res.status === 'granted') return 'authorized';
    // expo-notifications: status undetermined olduğunda canAskAgain true gelir
    if (res.canAskAgain) return 'notDetermined';
    return 'denied';
  } catch {
    return 'notDetermined';
  }
}

async function getNotificationGranted(): Promise<boolean> {
  return (await getNotificationStatus()) === 'authorized';
}

/**
 * Native bildirim izni ister (iOS dialog'unu BURADA tetikler).
 * Apple kuralı: requestPermission çağrılmadan iOS Settings'te "Notifications" satırı GÖZÜKMEZ.
 * Bu fonksiyon kullanıcının "ilk kez" açma deneyiminde çalışır — sonrasında Settings'e yönlendirme.
 */
async function requestNotificationPermissionNative(): Promise<boolean> {
  // Android 13+ POST_NOTIFICATIONS — Firebase'den önce bunu iste
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
      // iOS'ta registerDeviceForRemoteMessages — APNs token alabilmesi için zorunlu
      if (Platform.OS === 'ios' && (status === 1 || status === 2)) {
        try {
          await messaging().registerDeviceForRemoteMessages();
        } catch {
          /* sessiz — useFcmToken da deneyecek */
        }
      }
      return status === 1 || status === 2;
    } catch {
      // Firebase patladıysa expo-notifications fallback
    }
  }

  // Fallback: expo-notifications (Firebase native yoksa veya hata varsa)
  try {
    const { requestPermissionsAsync } = require('expo-notifications');
    const res = await requestPermissionsAsync({
      ios: { allowAlert: true, allowBadge: true, allowSound: true },
    });
    return res.status === 'granted';
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
      // KRİTİK iOS davranışı:
      // - "notDetermined" → ilk kez switch'e dokunan kullanıcıya iOS native dialog'unu GÖSTER.
      //   (Apple kuralı: requestPermission çağrılmadan iOS Settings'te "Notifications" satırı GÖZÜKMEZ.)
      // - "denied" / "authorized" → artık sistem ayarına yönlendir (Apple bir daha dialog göstermez).
      const status = await getNotificationStatus();

      if (status === 'notDetermined') {
        const granted = await requestNotificationPermissionNative();
        setNotificationGranted(granted);
        // İzin verildiyse FCM token register useFcmToken hook'u tarafından otomatik alınır
        // (token state değişimine bağlı useEffect zincirinde).
        if (!granted) {
          // Kullanıcı dialog'da reddetti → Settings'e yönlendirme bir UX seçeneği,
          // ancak reddetmenin hemen ardından açmak agresif. Burada açmıyoruz; ikinci dokunuşta açılır.
        }
        return;
      }

      // Karar verilmiş — Settings'e yönlendir (orada açıp/kapatabilir)
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
