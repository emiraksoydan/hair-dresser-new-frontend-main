/**
 * Firebase Cloud Messaging background handler & notification presentation config.
 *
 * Bu modül modül düzeyinde (React ağacının DIŞINDA) yüklenir. Expo Router
 * `app/_layout.tsx` en tepesinden import edildiği için React Native bundle
 * açıldığı anda — uygulama background'da bile olsa — çalışır. Bu, FCM
 * `setBackgroundMessageHandler` için zorunludur.
 *
 * - Background/Terminated: `setBackgroundMessageHandler` tetiklenir. iOS'ta
 *   `content-available=1` ile sistem bildirimi zaten gösterilir; burada sadece
 *   gerekirse data-only mesajlar için lokal bildirim göstermek gerekir.
 * - Foreground: Expo Notifications handler sayesinde `onMessage` içinde
 *   göstereceğimiz lokal bildirimler banner/alert şeklinde görünür.
 */

import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { NativeModules, Platform } from 'react-native';

const isExpoGo = Constants.appOwnership === 'expo';

// Foreground sunum kuralı:
// - Uzak push (FCM `notification` bloğu içeren) iOS'ta UNUserNotificationCenter delegate
//   üzerinden bu handler'a düşer. Eğer izin verirsek: native banner gösterilir + ardından
//   `messaging().onMessage` da fire eder ve orada `scheduleNotificationAsync` çağırırsak
//   ÇİFT banner çıkar (kullanıcının raporladığı sorun #1).
// - Bu nedenle uzak push'lar burada SUSTURULUR; göstermeyi tek bir noktadan
//   (`useFirebaseMessaging.ts` foreground branch'inden) yönetiriz.
// - Yerel olarak `scheduleNotificationAsync(...trigger:null)` ile schedule edilmiş
//   bildirimler ise gösterilir.
// - silentBadgeSync data-only push'lar zaten `notification` bloğu taşımadığı için
//   bu handler'a alert olarak düşmez.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    // expo-notifications: trigger.type === 'push' → uzaktan gelen FCM push
    const trigger: any = notification?.request?.trigger;
    const isRemotePush =
      trigger?.type === 'push' ||
      // iOS bazı sürümlerde type yerine class bilgisi taşıyabilir
      (typeof trigger === 'object' && trigger !== null && 'payload' in trigger);
    return {
      shouldShowBanner: !isRemotePush,
      shouldShowList: !isRemotePush,
      shouldPlaySound: !isRemotePush,
      shouldSetBadge: false, // rozeti biz manuel set ediyoruz (badge.updated SignalR + FCM data.badge)
      shouldShowAlert: !isRemotePush,
    } as any;
  },
});

// Android bildirim kanalı (8.0+): kendi ChannelId'imizi oluşturuyoruz.
// FCM payload'ında channelId belirtmiyoruz; Firebase SDK fallback kanalını
// kullanacak. Lokal bildirimlerde bu kanalı kullanıyoruz.
if (Platform.OS === 'android' && !isExpoGo) {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Default',
    importance: Notifications.AndroidImportance.HIGH,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FACC15',
    sound: 'default',
  }).catch(() => {
    // Ignore channel errors (dev build yoksa düşebilir).
  });
}

// Expo Go'da native FCM yok; module'u yükleme.
// Native Firebase app yoksa messaging() JS tarafında patlayabilir.
if (!isExpoGo && NativeModules.RNFBAppModule) {
  try {
    // Race condition guard: native modül var ama Firebase app henüz JS tarafına register edilmemiş olabilir.
    // getApp atarsa tüm blok sessizce atlanır.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { getApp } = require('@react-native-firebase/app');
    getApp('[DEFAULT]');

    // Require (import değil): native modül yoksa sessizce geç.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const messagingModule = require('@react-native-firebase/messaging');
    const messaging = messagingModule?.default;

    if (messaging && typeof messaging === 'function') {
      messaging().setBackgroundMessageHandler(async (remoteMessage: any) => {
        try {
          const { notification, data } = remoteMessage ?? {};

          // Sadece rozet senkronu (mark-all-read vb.): tray'de sahte bildirim gösterme.
          if (data?.silentBadgeSync === '1') {
            const badgeRaw = data?.badge;
            if (typeof badgeRaw === 'string' && badgeRaw.length > 0) {
              const badgeNum = parseInt(badgeRaw, 10);
              if (!Number.isNaN(badgeNum) && badgeNum >= 0) {
                try {
                  await Notifications.setBadgeCountAsync(badgeNum);
                } catch { /* ignore */ }
              }
            }
            return;
          }

          // Cihaz ikonu rozeti: backend data.badge gönderiyor.
          // iOS'ta APNs aps.badge zaten otomatik uygulanır, ama Android'de
          // launcher badge'i için manuel set etmek gerek (cihaz/launcher destekliyorsa).
          const badgeRaw = data?.badge;
          if (typeof badgeRaw === 'string' && badgeRaw.length > 0) {
            const badgeNum = parseInt(badgeRaw, 10);
            if (!Number.isNaN(badgeNum) && badgeNum >= 0) {
              try {
                await Notifications.setBadgeCountAsync(badgeNum);
              } catch { /* ignore */ }
            }
          }

          // Android background: FCM payload'ında "notification" bloğu varsa
          // sistem otomatik tray bildirimi gösterir. Data-only geldiyse biz
          // lokal bildirim gösteririz ki kullanıcı görsün.
          const hasNotificationBlock = !!notification;
          if (!hasNotificationBlock && Platform.OS === 'android') {
            const title = (data?.title as string) || 'Yeni bildirim';
            const body = (data?.body as string) || (data?.payload as string) || '';
            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                data: data ?? {},
                sound: 'default',
              },
              trigger: null,
            });
          }
        } catch {
          // Arka plan hatası asla crash'a sebep olmamalı.
        }
      });
    }
  } catch {
    // @react-native-firebase/messaging yoksa (expo go vs.) sessizce geç.
  }
}

export {};
