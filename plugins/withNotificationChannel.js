/**
 * Expo config plugin: Android FCM default notification channel meta-data
 *
 * FCM, channelId belirtilmeyen mesajlarda hangi kanalı kullanacağını
 * bu meta-data ile bilir. fcm_fallback_notification_channel, Firebase SDK
 * tarafından her kurulumda otomatik oluşturulur.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withNotificationChannel = (config) => {
  return withAndroidManifest(config, (mod) => {
    // tools namespace ekle (tools:replace için gerekli)
    const manifest = mod.modResults.manifest;
    if (!manifest.$) manifest.$ = {};
    manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

    const application = manifest.application[0];

    if (!application['meta-data']) {
      application['meta-data'] = [];
    }

    const META_NAME = 'com.google.firebase.messaging.default_notification_channel_id';

    const alreadyAdded = application['meta-data'].some(
      (m) => m.$?.['android:name'] === META_NAME
    );

    if (!alreadyAdded) {
      application['meta-data'].push({
        $: {
          'android:name': META_NAME,
          'android:value': 'fcm_fallback_notification_channel',
          'tools:replace': 'android:value',
        },
      });
    }

    return mod;
  });
};

module.exports = withNotificationChannel;
