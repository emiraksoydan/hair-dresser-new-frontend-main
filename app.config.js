const tr = require("./app/i18n/locales/tr.json");
const en = require("./app/i18n/locales/en.json");
const de = require("./app/i18n/locales/de.json");
const ar = require("./app/i18n/locales/ar.json");

/** iOS / expo-location native permission copy is baked at prebuild. Set EXPO_NATIVE_PERM_LANG=tr|en|de|ar to match your store listing; it does not follow in-app language changes without a new build. */
const localeBundles = { tr, en, de, ar };
const permLang = process.env.EXPO_NATIVE_PERM_LANG || "tr";
const np =
  localeBundles[permLang]?.nativePermissions ||
  localeBundles.tr.nativePermissions;

module.exports = {
  expo: {
    /**
     * Mağaza / yön / tablet:
     * - orientation: "portrait" → Üretim build'inde iOS ve Android manifest'te yalnızca dikey; yatay döndürme kapalı.
     * - ios.supportsTablet: false → App Store listesinde iPad için ayrı "universal" optimizasyonu yok (telefon odaklı).
     * - ios.requireFullScreen: true → iPad'de Split View / Slide Over ile küçük pencerede çoklu görev kısıtlı (Info.plist UIRequiresFullScreen).
     * Google Play'de tableti tamamen dışlamak: Play Console → Üretim → Cihaz kataloğu / form faktörü (telefon seç, tablet hariç tut).
     * Değişiklikten sonra: npx expo prebuild --clean veya EAS yeni native build.
     */
    owner: "emir.aksoydan",
    scheme: "hairdresser",
    name: "Gümüş Makas",
    slug: "HairDresser",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/adaptive-icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    // Görsel marka intro’su tamamen React (BrandIntro). Native: sadece düz renk.
    splash: {
      backgroundColor: "#ffffff",
      resizeMode: "cover",
    },
    ios: {
      supportsTablet: false,
      requireFullScreen: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: np.locationWhenInUse,
        NSLocationAlwaysAndWhenInUseUsageDescription: np.locationAlways,
        NSLocationAlwaysUsageDescription: np.locationAlways,
        NSMicrophoneUsageDescription: np.microphone,
        UIBackgroundModes: ["location", "fetch"],
      },
      bundleIdentifier: "com.hairdresser.app",
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "transparent",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "RECORD_AUDIO"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      package: "com.hairdresser.app",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: [
      "expo-router",
      "./plugins/withNotificationChannel",
      "./plugins/withGradleProperties",
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0",
          },
        },
      ],
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission: np.locationAlways,
          locationAlwaysPermission: np.locationAlways,
          locationWhenInUsePermission: np.locationWhenInUse,
        },
      ],
      "@react-native-firebase/app",
      "@react-native-firebase/messaging",
    ],
    fonts: [
      "./assets/fonts/centurygothic.ttf",
      "./assets/fonts/centurygothic_bold.ttf",
    ],
    extra: {
      eas: {
        projectId: "52f29e16-47ea-4f30-8271-0c88e10aa1b3",
      },
    },
  },
};
