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
    owner: "emiraksoydann",
    scheme: "hairdresser",
    name: "Gümüş Makas",
    slug: "HairDresser",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    newArchEnabled: true,
    ios: {
      supportsTablet: false,
      requireFullScreen: true,
      infoPlist: {
        NSLocationWhenInUseUsageDescription: np.locationWhenInUse,
        NSLocationAlwaysAndWhenInUseUsageDescription: np.locationAlways,
        NSLocationAlwaysUsageDescription: np.locationAlways,
        NSMicrophoneUsageDescription: np.microphone,
        UIBackgroundModes: ["location", "fetch", "remote-notification"],
        /** App Store export compliance: yalnızca standart/muaf şifreleme (HTTPS vb.) — ITSAppUsesNonExemptEncryption = false */
        ITSAppUsesNonExemptEncryption: false,
      },
      bundleIdentifier: "com.hairdresser.app",
      buildNumber: "12",
      /** EAS: production ortamında GOOGLE_SERVICES_PLIST (type: file) secret — build sırasında geçici dosya yolu olur. */
      googleServicesFile: process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
      /**
       * APNs entitlement — iOS push bildirimleri için ZORUNLU.
       * @react-native-firebase/messaging plugin'i bunu eklemesi gerek ama bazı
       * sürümlerde atlanabiliyor. Burada açıkça belirterek garanti altına alıyoruz.
       *
       * BU OLMADAN:
       *   - iOS Settings → uygulama altında "Bildirimler" satırı GÖRÜNMEZ
       *   - messaging().getToken() boş döner
       *   - APNs token oluşmaz → backend "No active FCM tokens" der
       *
       * "production" değeri TestFlight + App Store build'leri için doğru.
       * Lokal dev build (eas build --profile development) için "development" lazım,
       * ancak production'a gönderilen build'lerde "production" olmalı.
       */
      entitlements: {
        "aps-environment": "production",
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff",
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      permissions: ["ACCESS_FINE_LOCATION", "ACCESS_BACKGROUND_LOCATION", "RECORD_AUDIO", "POST_NOTIFICATIONS"],
      config: {
        googleMaps: {
          apiKey: process.env.GOOGLE_MAPS_API_KEY,
        },
      },
      /** EAS: GOOGLE_SERVICES_JSON (type: file) — aynı şekilde cloud build'de yol inject edilir. */
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
      package: "com.hairdresser.app",
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    /** Mağaza / native splash önizlemesi (expo-splash-screen plugin ile aynı görsel) */
    splash: {
      image: "./assets/icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff",
    },
    plugins: [
      "expo-router",
      "./plugins/withNotificationChannel",
      "./plugins/withGradleProperties",
      /** Android manifest: büyük/tablet ekranları desteklenmiyor (telefon odaklı). */
      "./plugins/withPhoneOnly",
      [
        "expo-splash-screen",
        {
          image: "./assets/icon.png",
          backgroundColor: "#ffffff",
          resizeMode: "contain",
          /** Plugin modunda Android varsayılanı 100dp; üretimde logo küçük kalmasın diye yükseltildi */
          imageWidth: 320,
        },
      ],
      [
        "expo-build-properties",
        {
          android: {
            compileSdkVersion: 35,
            targetSdkVersion: 35,
            buildToolsVersion: "35.0.0",
          },
          /** iOS: Firebase Swift pod'ları + EAS pod install için sık gerekir */
          ios: {
            deploymentTarget: "15.1",
            useFrameworks: "static",
          },
        },
      ],
      /** Podfile: use_modular_headers! — Firebase Swift pod'ları + static frameworks */
      "./plugins/withIosFirebaseModularHeaders",
      /** Podfile: RNFBApp + React — non-modular header (EAS archive) */
      "./plugins/withIosAllowNonModularIncludes",
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
      /**
       * KRİTİK: Expo SDK 54+ AppDelegate'i Swift olarak oluşturuyor.
       * @react-native-firebase/app v21.x plugin'i Swift AppDelegate'e Firebase init
       * eklemeyi atlıyor ("Unable to determine correct Firebase insertion point" uyarısı).
       * Bu custom plugin atlanan adımı manuel yapar:
       *   1. import FirebaseCore ekler
       *   2. application(_:didFinishLaunchingWithOptions:) içine FirebaseApp.configure() ekler
       *
       * SIRA ÖNEMLİ: @react-native-firebase/app'TAN SONRA olmalı ki plist kopyalandıktan
       * sonra init kodu eklensin.
       */
      "./plugins/withIosFirebaseInit",
      /**
       * iOS: entitlements içine `aps-environment` yazar (Push). Sadece app.json'da olursa
       * app.config.js baskın geldiği için prebuild'te uygulanmaz — burada da tanımlı olmalı.
       * Mağaza: EAS production profili → mode production.
       */
      [
        "expo-notifications",
        {
          icon: "./assets/icon.png",
          color: "#FACC15",
          defaultChannel: "default",
          mode:
            process.env.EAS_BUILD_PROFILE === "production"
              ? "production"
              : "development",
        },
      ],
    ],
    fonts: [
      "./assets/fonts/centurygothic.ttf",
      "./assets/fonts/centurygothic_bold.ttf",
    ],

    extra: {
      eas: {
        projectId: "3fb82360-1dd9-43f5-9e45-a795bbc5b652",
      },
    },

  },
};
