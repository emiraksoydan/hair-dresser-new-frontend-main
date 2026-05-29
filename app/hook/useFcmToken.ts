import { useEffect, useRef, useState, useCallback } from 'react';
import { AppState, NativeModules, Platform, PermissionsAndroid } from 'react-native';
import Constants from 'expo-constants';
import * as Location from 'expo-location';
import { useAuth } from './useAuth';
import { api } from '../store/api';
import { getNotificationPermissionGranted } from '../lib/notificationPlatformPermission';

/**
 * Firebase Cloud Messaging token management hook
 * Handles FCM token registration and updates
 * Note: Requires native build (expo-dev-client) - does not work in Expo Go
 */

// Module-level ref: auth temizlenmeden önce logout'ta erişilebilmesi için.
let _currentFcmToken: string | null = null;

/**
 * Konum "henüz karar verilmedi" iken bildirim zincirini geciktir (üst üste iki sistem diyaloğu olmasın).
 * Üst sınır: kullanıcı konumu hiç sormayan senaryoda FCM sonsuza dek bloklanmasın.
 */
async function waitForLocationDialogToSettle(maxWaitMs = 45_000): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    try {
      const perm = await Location.getForegroundPermissionsAsync();
      if (perm.status !== 'undetermined') {
        // Ön plan izni bittikten sonra arka plan izni diyaloğu (FreeBarber) için stabilizasyon.
        await new Promise((resolve) => setTimeout(resolve, 2000));
        return;
      }
    } catch {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

type UseFcmTokenOptions = {
  autoRegisterOnMount?: boolean;
};

export const useFcmToken = ({ autoRegisterOnMount = true }: UseFcmTokenOptions = {}) => {
  const { token } = useAuth();
  const [fcmToken, setFcmToken] = useState<string | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registerFcmToken] = api.useRegisterFcmTokenMutation();
  const [unregisterFcmToken] = api.useUnregisterFcmTokenMutation();

  // executionEnvironment === 'storeClient' → Expo Go
  const isExpoGo = Constants.executionEnvironment === 'storeClient';

  // Kayıtlı olup olmadığını ref ile takip et — effect deps'e fcmToken koymadan erişelim.
  const fcmTokenRef = useRef<string | null>(null);

  const setFcmTokenSynced = useCallback((t: string | null) => {
    fcmTokenRef.current = t;
    _currentFcmToken = t;
    setFcmToken(t);
  }, []);

  // Get FCM token using React Native Firebase
  // Get FCM token using React Native Firebase
  // iOS production stratejisi:
  //   1. Önce expo-notifications.requestPermissionsAsync (iOS Settings'te "Bildirimler"
  //      kategorisi oluşması GARANTİSİ — RNFB henüz init olmasa bile)
  //   2. RNFBAppModule var → Firebase yolu (FCM token al + register)
  //   3. RNFBAppModule yok → log + null (kullanıcıya net hata)
  //   4. APNs token gecikmesi için 1.5sn bekleme + 3 retry — ilk açılışta tipik
  const getFcmToken = useCallback(async (): Promise<string | null> => {
    if (isExpoGo) {
      console.log('[FCM] Expo Go detected, skipping');
      return null;
    }

    // iOS + RNFB yüklüyken expo ile AYRI bir requestPermissionsAsync ÇAĞIRMA —
    // ardından messaging().requestPermission() gelince iki kez sistem diyaloğu çıkabiliyordu.
    // RNFB yokken (native yapılandırma eksik) eski davranış: expo ile en azından izin satırı.
    if (Platform.OS === 'ios' && !NativeModules.RNFBAppModule) {
      try {
        const { requestPermissionsAsync, getPermissionsAsync } = require('expo-notifications');
        const current = await getPermissionsAsync();
        if (current.status !== 'granted' && current.canAskAgain !== false) {
          await requestPermissionsAsync({
            ios: { allowAlert: true, allowBadge: true, allowSound: true },
          });
        }
      } catch (err: any) {
        console.warn('[FCM] iOS expo-notifications fallback hata:', err?.message ?? err);
      }
    }

    if (!NativeModules.RNFBAppModule) {
      console.warn(
        '[FCM] Native Firebase yüklü değil — GoogleService-Info.plist / google-services.json eksik veya bundle id uyumsuz.\n' +
        '  • app.config.js -> ios.googleServicesFile ve bundleIdentifier doğru mu?\n' +
        '  • EAS: GOOGLE_SERVICES_PLIST env var production secret olarak yüklü mü?\n' +
        '  • Build log\'unda RNFBApp pod install başarılı mı?'
      );
      return null;
    }

    try {
      const { getApp } = require('@react-native-firebase/app');
      getApp('[DEFAULT]');
    } catch {
      console.warn('[FCM] Firebase default app henüz init olmadı, token fetch atlanıyor');
      return null;
    }

    let messaging;
    try {
      const messagingModule = require('@react-native-firebase/messaging');
      if (!messagingModule || typeof messagingModule.default === 'undefined') {
        console.warn('[FCM] messaging modülü mevcut değil');
        return null;
      }
      messaging = messagingModule.default;
    } catch (requireError: any) {
      console.warn('[FCM] require başarısız:', requireError?.message);
      return null;
    }

    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const permissionResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (permissionResult !== PermissionsAndroid.RESULTS.GRANTED) {
          console.warn('[FCM] Android POST_NOTIFICATIONS reddedildi:', permissionResult);
          return null;
        }
      }

      const Auth = messaging.AuthorizationStatus;
      let authStatus = await messaging().hasPermission();
      if (authStatus !== Auth.AUTHORIZED && authStatus !== Auth.PROVISIONAL) {
        authStatus = await messaging().requestPermission({
          alert: true,
          badge: true,
          sound: true,
        });
      }

      const enabled =
        authStatus === Auth.AUTHORIZED ||
        authStatus === Auth.PROVISIONAL;

      console.log('[FCM] notification authStatus =', authStatus, '(enabled:', enabled, ')');

      if (!enabled) {
        console.warn('[FCM] Bildirim izni alınamadı (kullanıcı reddetti veya Settings kapalı).');
        return null;
      }

      if (Platform.OS === 'ios') {
        try {
          await messaging().registerDeviceForRemoteMessages();
          // APNs token'ın hazırlanması 1-2sn sürebilir — getToken() öncesi bekle.
          await new Promise((r) => setTimeout(r, 1500));
        } catch (regErr: any) {
          console.warn('[FCM] registerDeviceForRemoteMessages başarısız:', regErr?.message ?? regErr);
        }
      }

      // Retry: APNs token bazen hemen hazır olmaz (özellikle ilk açılışta)
      let fcmTok: string | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          fcmTok = await messaging().getToken();
          if (fcmTok) break;
        } catch (tokErr: any) {
          console.warn(`[FCM] getToken() attempt ${attempt + 1} hata:`, tokErr?.message ?? tokErr);
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!fcmTok) {
        console.warn('[FCM] getToken() 3 denemede de boş — iOS\'ta APNs entitlement (aps-environment) eksik olabilir.');
        return null;
      }

      console.log('[FCM] Token başarıyla alındı (length:', fcmTok.length, ')');
      return fcmTok;
    } catch (firebaseError: any) {
      console.error('[FCM] Firebase hata:', firebaseError?.message ?? firebaseError);
      return null;
    }
  }, [isExpoGo]);

  // Register FCM token with backend
  const registerToken = useCallback(async (tokenToRegister: string) => {
    if (!tokenToRegister?.trim() || !token) {
      return false;
    }

    const trimmed = tokenToRegister.trim();

    try {
      const result = await registerFcmToken({
        fcmToken: trimmed,
        deviceId: Platform.OS,
        platform: Platform.OS === 'ios' ? 'ios' : 'android',
      });

      if ('error' in result) {
        return false;
      }

      if (result.data?.success) {
        setFcmTokenSynced(trimmed);
        setIsRegistered(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [token, registerFcmToken, setFcmTokenSynced]);

  // Unregister FCM token — token kontrolü olmadan; auth geçerliyken çağrılmalı.
  const unregisterToken = useCallback(async (tokenToUnregister: string) => {
    if (!tokenToUnregister?.trim()) {
      return false;
    }

    const trimmed = tokenToUnregister.trim();

    try {
      const result = await unregisterFcmToken({
        fcmToken: trimmed,
      });

      if ('error' in result) {
        return false;
      }

      if (result.data?.success) {
        setFcmTokenSynced(null);
        setIsRegistered(false);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [unregisterFcmToken, setFcmTokenSynced]);

  // Initialize FCM token on mount and when user logs in.
  // fcmToken intentionally NOT in deps — prevents double-registration loop.
  useEffect(() => {
    if (!autoRegisterOnMount) return;

    if (!token) {
      // Auth temizlendi; local state sıfırla (unregister logout / hesap silmede yapılır).
      setFcmTokenSynced(null);
      setIsRegistered(false);
      return;
    }

    let cancelled = false;

    const initializeFcm = async () => {
      // 4 saniyelik gecikme: konum izni diyaloğu bitmeden bildirim izni açılmasın.
      await new Promise((resolve) => setTimeout(resolve, 4000));
      if (cancelled) return;
      await waitForLocationDialogToSettle();
      if (cancelled) return;
      const newFcmToken = await getFcmToken();
      if (cancelled || !newFcmToken) return;
      await registerToken(newFcmToken);
    };

    initializeFcm().catch(() => {});
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, autoRegisterOnMount, getFcmToken, registerToken, setFcmTokenSynced]);

  // FCM token rotation: backend kaydı güncel kalsın (özellikle iOS).
  useEffect(() => {
    if (!autoRegisterOnMount) return;
    if (!token || isExpoGo || !NativeModules.RNFBAppModule) return;

    try {
      const { getApp } = require('@react-native-firebase/app');
      getApp('[DEFAULT]');
    } catch {
      return;
    }

    let messagingModule: any;
    try {
      messagingModule = require('@react-native-firebase/messaging');
      if (!messagingModule?.default) return;
    } catch {
      return;
    }

    let unsubscribe: (() => void) | undefined;
    try {
      unsubscribe = messagingModule.default().onTokenRefresh(async (newToken: string) => {
        if (!newToken) return;
        await registerToken(newToken);
      });
    } catch {
      return;
    }

    return unsubscribe;
  }, [token, isExpoGo, registerToken, autoRegisterOnMount]);

  /**
   * OS izni kapalıyken backend'den token SİLİNMEZ (logout / hesap silme hariç — yaygın "temiz" model).
   * Uygulama active + izin açıksa: mevcut veya yeni FCM token'ı backend'e yaz (ayarlardan açıp dönen kullanıcı).
   */
  useEffect(() => {
    if (!autoRegisterOnMount || !token || isExpoGo) return;

    let cancelled = false;

    const syncRegisterIfOsAllows = async () => {
      if (cancelled) return;
      const granted = await getNotificationPermissionGranted();
      if (!granted) return;

      let fcmTok = getCurrentFcmToken();
      if (!fcmTok) {
        fcmTok = await getFcmToken();
      }
      if (fcmTok?.trim()) {
        await registerToken(fcmTok);
      }
    };

    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') void syncRegisterIfOsAllows();
    });

    // İlk kayıt initializeFcm içinde; mount'ta burayı da çağırmak aynı oturumda ikinci
    // getFcmToken / izin zincirini tetikliyordu.

    return () => {
      cancelled = true;
      try {
        sub.remove();
      } catch {
        /* ignore */
      }
    };
  }, [token, isExpoGo, autoRegisterOnMount, getFcmToken, registerToken]);

  /**
   * Manuel diagnostik: profil ekranındaki "Bildirimleri Etkinleştir" butonu kullanır.
   * iOS Settings'te "Bildirimler" satırı yokken / push çalışmıyorken
   * kullanıcı bu butonla token alma sürecini manuel tetikler. Sonuç string'i
   * UI'da Alert ile gösterilebilir — gerçek hata mesajı görünür hale gelir.
   */
  const runFcmDiagnostic = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
    detail?: string;
  }> => {
    const log: string[] = [];
    try {
      if (isExpoGo) {
        return { ok: false, message: 'Expo Go ortamında çalışmaz' };
      }
      log.push(`Platform: ${Platform.OS}`);
      log.push(`RNFBAppModule: ${NativeModules.RNFBAppModule ? 'YÜKLÜ ✓' : 'YOK ✗'}`);

      if (!NativeModules.RNFBAppModule) {
        return {
          ok: false,
          message: '⛔ Native Firebase yüklü değil',
          detail: log.join('\n') + '\n\nGoogleService-Info.plist eksik veya bundle id uyumsuz.',
        };
      }

      // Adım 1: Firebase default app init kontrolü
      try {
        const { getApp } = require('@react-native-firebase/app');
        const app = getApp('[DEFAULT]');
        log.push(`Firebase app: ${app?.name ?? 'unknown'} ✓`);
        // RNFB v21 options: { appId, projectId, apiKey, bundleId, clientId, ... }
        // bundleId iOS'ta genellikle var; appId daha güvenilir.
        const opts = app?.options as any;
        const bundleStr =
          opts?.bundleId ||
          opts?.iosBundleId ||
          opts?.appId ||  // formatı: "1:xxxx:ios:yyyy"
          'n/a';
        log.push(`Bundle/appId: ${bundleStr}`);
      } catch (e: any) {
        log.push(`Firebase init: HATA — ${e?.message}`);
        return {
          ok: false,
          message: '⛔ Firebase init başarısız',
          detail: log.join('\n'),
        };
      }

      // Adım 2: Messaging modülü
      let messaging: any;
      try {
        messaging = require('@react-native-firebase/messaging').default;
      } catch (e: any) {
        log.push(`messaging() require: HATA — ${e?.message}`);
        return { ok: false, message: '⛔ Messaging modülü yüklenmedi', detail: log.join('\n') };
      }

      // Adım 3: hasPermission — şu anki izin durumu
      let permStatus: number = -99;
      try {
        permStatus = await messaging().hasPermission();
        const permLabel =
          permStatus === -1 ? 'NotDetermined (sorulmamış)' :
          permStatus === 0 ? 'DENIED (reddedilmiş!)' :
          permStatus === 1 ? 'AUTHORIZED ✓' :
          permStatus === 2 ? 'PROVISIONAL ✓' :
          `Bilinmeyen (${permStatus})`;
        log.push(`İzin durumu: ${permLabel}`);
      } catch (e: any) {
        log.push(`hasPermission() HATA: ${e?.message}`);
      }

      // Adım 4: izin yoksa iste
      if (permStatus !== 1 && permStatus !== 2) {
        try {
          permStatus = await messaging().requestPermission({
            alert: true,
            badge: true,
            sound: true,
          });
          log.push(`requestPermission sonrası: ${permStatus}`);
        } catch (e: any) {
          log.push(`requestPermission HATA: ${e?.message}`);
        }
      }

      if (permStatus !== 1 && permStatus !== 2) {
        return {
          ok: false,
          message: '⛔ Bildirim izni alınamadı',
          detail: log.join('\n') + '\n\niOS Settings > Gümüş Makas > Notifications açık mı?',
        };
      }

      // Adım 5: registerDeviceForRemoteMessages (iOS)
      if (Platform.OS === 'ios') {
        try {
          await messaging().registerDeviceForRemoteMessages();
          log.push('registerDeviceForRemoteMessages: OK ✓');
        } catch (e: any) {
          log.push(`registerDeviceForRemoteMessages HATA: ${e?.message}`);
        }
        // 1.5sn bekle — APNs token oluşması için
        await new Promise((r) => setTimeout(r, 1500));

        // Adım 6: APNs token kontrolü — KRİTİK!
        // Bu null ise APNs entitlement (aps-environment) build'de YOK demektir.
        try {
          const apnsToken = await messaging().getAPNSToken();
          if (apnsToken) {
            log.push(`APNs token: VAR ✓ (${apnsToken.substring(0, 16)}...)`);
          } else {
            log.push('APNs token: NULL ✗');
            return {
              ok: false,
              message: '⛔ APNs token alınamadı',
              detail:
                log.join('\n') +
                '\n\nKESİN SEBEP: Build\'de aps-environment entitlement YOK.' +
                '\n\nÇözüm: app.config.js\'te ios.entitlements.aps-environment="production" eklendi mi?' +
                ' EAS build\'i --clear-cache ile yeniden alınmalı.',
            };
          }
        } catch (e: any) {
          log.push(`getAPNSToken HATA: ${e?.message}`);
        }
      }

      // Adım 7: FCM token al
      let fcmTok: string | null = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          fcmTok = await messaging().getToken();
          if (fcmTok) {
            log.push(`FCM token (deneme ${attempt + 1}): VAR ✓`);
            break;
          }
          log.push(`FCM token (deneme ${attempt + 1}): null`);
        } catch (e: any) {
          log.push(`getToken deneme ${attempt + 1} HATA: ${e?.message}`);
        }
        await new Promise((r) => setTimeout(r, 1000));
      }

      if (!fcmTok) {
        return {
          ok: false,
          message: '⛔ FCM token alınamadı',
          detail: log.join('\n'),
        };
      }

      // Adım 8: Backend register
      const registered = await registerToken(fcmTok);
      log.push(`Backend register: ${registered ? 'BAŞARILI ✓' : 'BAŞARISIZ ✗'}`);

      if (!registered) {
        return {
          ok: false,
          message: '⛔ Backend register başarısız',
          detail: log.join('\n') + '\n\nNetwork veya auth sorunu olabilir.',
        };
      }

      return {
        ok: true,
        message: '✅ Tüm adımlar başarılı!',
        detail: log.join('\n'),
      };
    } catch (err: any) {
      return {
        ok: false,
        message: '⚠️ Beklenmeyen hata',
        detail: log.join('\n') + '\n\nException: ' + (err?.message ?? String(err)),
      };
    }
  }, [isExpoGo, registerToken]);

  return {
    fcmToken,
    isRegistered,
    registerToken,
    unregisterToken,
    runFcmDiagnostic,
    getFcmToken,
  };
};

/**
 * Logout öncesi FCM token'ı sil. Auth token hâlâ geçerliyken çağrılmalı.
 * handleLogout içinde `await logout(...)` çağrısından ÖNCE kullanılır.
 */
export function getCurrentFcmToken(): string | null {
  return _currentFcmToken;
}
