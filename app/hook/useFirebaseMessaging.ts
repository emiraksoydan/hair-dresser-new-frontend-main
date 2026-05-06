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
  const { token, userId } = useAuth();
  const dispatch = useDispatch();
  const { openNotifications } = useNotificationOpener();
  const lastHandledRef = useRef<string | null>(null);
  // Aynı messageId iki kez işlenmesin (FCM bazı koşullarda tekrar deliver edebilir,
  // veya iOS aynı mesajı hem foreground hem background event olarak verebilir).
  const handledMessageIdsRef = useRef<Set<string>>(new Set());

  // userId'i ref'e koyuyoruz — closure'lar her token değişiminde yeniden bağlanmasın.
  const currentUserIdRef = useRef<string | null>(userId ?? null);
  currentUserIdRef.current = userId ?? null;

  // Bu push mevcut aktif kullanıcı için mi?
  // ÖNEMLİ TASARIM KARARI: Multi-account cross-account push görünürlüğü AÇIK.
  // - Banner / ses: HER push için gösterilir (cihazda kayıtlı hangi hesaba ait olursa olsun).
  //   Çünkü kullanıcı diğer hesaplarına gelen bildirimleri de görmek istiyor (Gmail/Slack pattern).
  // - Launcher rakamı (app icon badge): SADECE aktif hesaba ait push'larda güncellenir,
  //   yoksa "A hesabındayım ama ikonda B'nin sayısı görünüyor" karmaşası olur.
  // - Cache invalidate: SADECE aktif hesabın cache'i için. Aktif olmayan hesabın listesi
  //   zaten yüklü değil; gereksiz refetch yapmıyoruz.
  const isPushForCurrentUser = (data: Record<string, string> | undefined): boolean => {
    const recipient = data?.recipientUserId;
    const me = currentUserIdRef.current;
    if (!recipient || !me) return true; // legacy push veya henüz user resolved değil → izin ver
    return recipient.toLowerCase() === me.toLowerCase();
  };

  // FCM mesajı geldiğinde sadece HAFİF tazeleme yap. Önemli not: 'Notification' tag'ini
  // invalidate ETMİYORUZ — çünkü SignalR `notification.received` event'i bildirimi
  // cache'e otoritatif olarak ekliyor; aynı anda FCM-tetikli refetch yarışırsa
  // SignalR ile eklenen item kaybolup refresh sonrası geri geliyor (sorun #4).
  const refreshAfterPush = useCallback(() => {
    try {
      // Yalnızca rozet sayaçları + randevu listeleri tazelensin.
      // Bildirim listesi tazelemesi SignalR notification.received/updated tarafından yönetilir.
      dispatch(api.util.invalidateTags([{ type: 'Appointment', id: 'LIST' }]));
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

      const forCurrentUser = isPushForCurrentUser(msg.data);

      try {
        // Cache'i sadece aktif hesabın push'unda tazele.
        if (forCurrentUser) refreshAfterPush();
        // Ekranın hazır olduğundan emin olmak için küçük bir gecikme.
        // NOT: Yabancı hesap bildirimi tap'lenirse, openNotifications mevcut hesabın
        // bildirim listesini açar — aradığı bildirimi görmez. Hesap geçişi entegrasyonu
        // ileride eklenebilir; şimdilik en az bilgi olsun, app açılsın.
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
    [openNotifications, refreshAfterPush],
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
          const data = remoteMessage?.data as Record<string, string> | undefined;
          // Bu push aktif kullanıcı için mi? — banner her zaman gösterilir, ama
          // launcher rakamı + cache invalidate sadece aktif kullanıcıya uygulanır.
          const forCurrentUser = isPushForCurrentUser(data);

          // Aynı messageId iki kez işlenmesin (silent + alert vb.).
          const dedupeKey = remoteMessage?.messageId || data?.notificationId;
          if (dedupeKey) {
            if (handledMessageIdsRef.current.has(dedupeKey)) return;
            handledMessageIdsRef.current.add(dedupeKey);
            if (handledMessageIdsRef.current.size > 100) {
              const firstKey = handledMessageIdsRef.current.values().next().value;
              if (firstKey) handledMessageIdsRef.current.delete(firstKey);
            }
          }

          if (data?.silentBadgeSync === '1') {
            // Sessiz rozet senkronu: banner/ses YOK, sadece launcher rakamı.
            // Yabancı hesabın silentBadgeSync'i bizim launcher'ımızı bozmasın.
            if (forCurrentUser) {
              const badgeRaw = data?.badge;
              if (typeof badgeRaw === 'string' && badgeRaw.length > 0) {
                const badgeNum = parseInt(badgeRaw, 10);
                if (!Number.isNaN(badgeNum) && badgeNum >= 0) {
                  Notifications.setBadgeCountAsync(badgeNum).catch(() => { /* ignore */ });
                }
              }
              refreshAfterPush();
            }
            return;
          }

          const title = remoteMessage?.notification?.title || 'Yeni bildirim';
          const body =
            remoteMessage?.notification?.body ||
            (remoteMessage?.data?.payload as string) ||
            '';

          // Aktif kullanıcı için: cache + launcher rakamı tazele.
          // Yabancı hesap için: cache'e dokunma, launcher'ı değiştirme — sadece banner göstereceğiz.
          if (forCurrentUser) {
            refreshAfterPush();
            const badgeRaw = remoteMessage?.data?.badge;
            if (typeof badgeRaw === 'string' && badgeRaw.length > 0) {
              const badgeNum = parseInt(badgeRaw, 10);
              if (!Number.isNaN(badgeNum) && badgeNum >= 0) {
                Notifications.setBadgeCountAsync(badgeNum).catch(() => { /* ignore */ });
              }
            }
          }

          // Foreground banner: cross-account görünürlük açık, hangi hesaba olursa olsun göster.
          // setNotificationHandler uzak push'ları susturduğu için sadece BURADAN tek banner çıkar.
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
  }, [token, refreshAfterPush]);

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
  //    (background'dayken SignalR kopmuş ve event'ler kaçmış olabilir).
  //    Bu, FCM-tetikli refresh'ten farklıdır: burada SignalR yokluğunu telafi ediyoruz.
  useEffect(() => {
    if (!token) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        try {
          dispatch(api.util.invalidateTags([
            { type: 'Notification', id: 'LIST' },
            { type: 'Appointment', id: 'LIST' },
          ]));
        } catch { /* ignore */ }
      }
    });
    return () => {
      try { sub.remove(); } catch { /* ignore */ }
    };
  }, [token, dispatch]);

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
