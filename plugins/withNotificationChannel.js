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
    const application = mod.modResults.manifest.application[0];

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
        },
      });
    }

    return mod;
  });
};

module.exports = withNotificationChannel;
