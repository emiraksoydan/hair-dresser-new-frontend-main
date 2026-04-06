/**
 * Expo config plugin: Android'de tablet desteğini kapatır.
 * Google Play Store'un tablet ekran görüntüsü istememesi için
 * large ve xlarge ekranları desteklenmiyor olarak işaretler.
 */
const { withAndroidManifest } = require('@expo/config-plugins');

const withPhoneOnly = (config) => {
  return withAndroidManifest(config, (mod) => {
    const manifest = mod.modResults.manifest;

    // <supports-screens> zaten varsa üzerine yaz, yoksa ekle
    manifest['supports-screens'] = [
      {
        $: {
          'android:smallScreens': 'true',
          'android:normalScreens': 'true',
          'android:largeScreens': 'false',
          'android:xlargeScreens': 'false',
          'android:requiresSmallestWidthDp': '320',
        },
      },
    ];

    return mod;
  });
};

module.exports = withPhoneOnly;
