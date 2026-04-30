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

    const upsertMetaData = (name, attrs) => {
      const existing = application['meta-data'].find(
        (m) => m.$?.['android:name'] === name
      );

      if (existing) {
        existing.$ = {
          ...existing.$,
          ...attrs,
        };
        return;
      }

      application['meta-data'].push({
        $: {
          'android:name': name,
          ...attrs,
        },
      });
    };

    upsertMetaData('com.google.firebase.messaging.default_notification_channel_id', {
      'android:value': 'default',
      'tools:replace': 'android:value',
    });

    upsertMetaData('com.google.firebase.messaging.default_notification_color', {
      'android:resource': '@color/notification_icon_color',
      'tools:replace': 'android:resource',
    });

    return mod;
  });
};

module.exports = withNotificationChannel;
