import { useEffect, useRef, useCallback } from 'react';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { AppState, NativeModules } from 'react-native';
import { useDispatch } from 'react-redux';
import { useAuth } from './useAuth';
import { useNotificationOpener } from '../context/NotificationOpenerContext';
import { api } from '../store/api';

type RemoteMessage = {
  messageId?: string;
  notification?: { title?: string; body?: string };
  data?: Record<string, string>;
};

const isExpoGo = Constants.executionEnvironment === 'storeClient';

/**
 * Native Firebase app hazır mı?
 * RNFBAppModule varlığı gerekli ama yeterli değil — native init tamamlanmadan
 * messaging() "No Firebase App '[DEFAULT]'" fırlatır. getApp() ile doğruluyoruz.
 */
function isNativeFirebaseReady(): boolean {
  if (!NativeModules.RNFBAppModule) return false;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getApp } = require('@react-native-firebase/app');
    getApp('[DEFAULT]');
    return true;
  } catch {
    return false;
  }
}

/**
 * FCM + expo-notifications köprüsü (foreground + tap).
 *
 * Görev dağılımı:
 * - Background/terminated mesaj: `app/lib/firebaseMessagingBackground.ts`
 *   (module-level; React ağacının dışında).
 * - Foreground mesaj: `messaging().onMessage` → iOS'ta otomatik banner
 *   gösterilmez; biz Expo Notifications ile lokal bildirim planlıyoruz.
 * - Bildirime tıklama:
 *   • Uygulama background'daysa: `messaging().onNotificationOpenedApp`
 *   • Uygulama kapalıyken soğuk başlatmada: `messaging().getInitialNotification`
 *   • Foreground'dayken lokal bildirime tıklanırsa:
 *     `Notifications.addNotificationResponseReceivedListener`
 *
 * Tap sonrası davranış: `NotificationOpenerContext.openNotifications`
 * çağrılır — hangi tab'daysa orada bildirim bottom sheet'i açılır.
 * Kullanıcı oradan ilgili randevuya gider (mevcut akışa uyumlu).
 */
export function useFirebaseMessaging() {
  const { token } = useAuth();
  const dispatch = useDispatch();
  const { openNotifications } = useNotificationOpener();
  const lastHandledRef = useRef<string | null>(null);

  // RTK Query cache'ini invalidate etmek için helper
  const refreshNotifications = useCallback(() => {
    try {
      // Bildirim listeleri ve rozet sayacı tazelensin.
      dispatch(api.util.invalidateTags(['Notification', 'Appointment']));
    } catch {
      // ignore
    }
  }, [dispatch]);

  // Tap geldiğinde uygulamayı uygun yere yönlendir.
  const handleNotificationTap = useCallback(
    (msg: RemoteMessage | null | undefined) => {
      if (!msg) return;
      const id = msg.messageId || msg.data?.notificationId;
      if (id && lastHandledRef.current === id) return;
      if (id) lastHandledRef.current = id;

      try {
        refreshNotifications();
        // Ekranın hazır olduğundan emin olmak için küçük bir gecikme.
        setTimeout(() => {
          try {
            openNotifications();
          } catch {
            // Context provider henüz yoksa sessizce geç.
          }
        }, 250);
      } catch {
        // ignore
      }
    },
    [openNotifications, refreshNotifications],
  );

  // 1) Foreground mesajı (uygulama açıkken geldiğinde)
  useEffect(() => {
    if (!token || isExpoGo || !isNativeFirebaseReady()) return;

    let messagingModule: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      messagingModule = require('@react-native-firebase/messaging');
    } catch {
      return;
    }
    const messaging = messagingModule?.default;
    if (!messaging || typeof messaging !== 'function') return;

    let unsub: (() => void) | undefined;
    try {
      unsub = messaging().onMessage(async (remoteMessage: RemoteMessage) => {
        try {
          const title = remoteMessage?.notification?.title || 'Yeni bildirim';
          const body =
            remoteMessage?.notification?.body ||
            (remoteMessage?.data?.payload as string) ||
            '';

          // Cache'i tazele (notification list / badge)
          refreshNotifications();

          // Cihaz ikonu rozeti: backend data.badge gönderiyor (APNs aps.badge ile aynı değer)
          const badgeRaw = remoteMessage?.data?.badge;
          if (typeof badgeRaw === 'string' && badgeRaw.length > 0) {
            const badgeNum = parseInt(badgeRaw, 10);
            if (!Number.isNaN(badgeNum) && badgeNum >= 0) {
              Notifications.setBadgeCountAsync(badgeNum).catch(() => { /* ignore */ });
            }
          }

          // Foreground'daysa lokal bildirim olarak göster.
          await Notifications.scheduleNotificationAsync({
            content: {
              title,
              body,
              data: (remoteMessage?.data as any) ?? {},
              sound: 'default',
            },
            trigger: null,
          });
        } catch {
          // Foreground gösterim hataları sessizce düşsün.
        }
      });
    } catch {
      return;
    }

    return () => {
      try { unsub?.(); } catch { /* ignore */ }
    };
  }, [token, refreshNotifications]);

  // 2) Uygulama background'dayken bildirime tıklandı
  useEffect(() => {
    if (!token || isExpoGo || !isNativeFirebaseReady()) return;

    let messagingModule: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      messagingModule = require('@react-native-firebase/messaging');
    } catch {
      return;
    }
    const messaging = messagingModule?.default;
    if (!messaging || typeof messaging !== 'function') return;

    let unsub: (() => void) | undefined;
    try {
      unsub = messaging().onNotificationOpenedApp(
        (remoteMessage: RemoteMessage) => handleNotificationTap(remoteMessage),
      );
    } catch {
      return;
    }

    return () => {
      try { unsub?.(); } catch { /* ignore */ }
    };
  }, [token, handleNotificationTap]);

  // 3) Uygulama kapalıyken bildirime tıklanıp açıldı (cold start)
  useEffect(() => {
    if (!token || isExpoGo || !isNativeFirebaseReady()) return;

    let cancelled = false;
    (async () => {
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const messagingModule = require('@react-native-firebase/messaging');
        const messaging = messagingModule?.default;
        if (!messaging || typeof messaging !== 'function') return;
        const initial = await messaging().getInitialNotification();
        if (!cancelled && initial) {
          handleNotificationTap(initial);
        }
      } catch {
        // ignore
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token, handleNotificationTap]);

  // 4) Foreground'da lokal bildirime tıklama (expo-notifications)
  useEffect(() => {
    if (!token) return;

    // App local bildirime tıklanarak cold start ile açıldıysa
    // son notification response'u bir kez işle.
    Notifications.getLastNotificationResponseAsync()
      .then((resp) => {
        try {
          const data = resp?.notification?.request?.content?.data as any;
          if (data) {
            handleNotificationTap({ data, messageId: data?.notificationId });
          }
        } catch {
          // ignore
        }
      })
      .catch(() => {
        // ignore
      });

    const sub = Notifications.addNotificationResponseReceivedListener((resp) => {
      try {
        const data = resp?.notification?.request?.content?.data as any;
        handleNotificationTap({ data, messageId: data?.notificationId });
      } catch {
        // ignore
      }
    });

    return () => {
      try { sub.remove(); } catch { /* ignore */ }
    };
  }, [token, handleNotificationTap]);

  // 5) App foreground'a döndüğünde bildirim listesini tazele
  //    (background'da sessiz push geldiyse listelerde yoktu).
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshNotifications();
      }
    });
    return () => {
      try { sub.remove(); } catch { /* ignore */ }
    };
  }, [token, refreshNotifications]);

  // Uygulama active olduğunda app icon badge'ini in-app sayaçla SENKRONİZE et.
  // Eskiden 0'a setliyorduk ama kullanıcı app'i açıp hiçbir bildirimi okumadan
  // kapatırsa launcher 0, in-app 5 olup tutarsızlık çıkıyordu. Şimdi gerçek
  // okunmamış toplamını (notification + chat) yansıtıyoruz; bildirimler içeride
  // okundukça SignalR badge.updated → senkron düşer.
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      // RTK Query: cache'te varsa hemen, yoksa fetch ederek getir.
      const promise: any = dispatch(
        api.endpoints.getBadgeCounts.initiate(undefined, { forceRefetch: false }),
      );
      promise?.unwrap?.()
        .then((resp: any) => {
          const notif = resp?.data?.notificationUnreadCount ?? 0;
          const chat = resp?.data?.chatUnreadCount ?? 0;
          const total = Math.max(0, notif + chat);
          Notifications.setBadgeCountAsync(total).catch(() => { /* ignore */ });
        })
        .catch(() => { /* ignore */ });
    });
    return () => {
      try { sub.remove(); } catch { /* ignore */ }
    };
  }, [token, dispatch]);
}
