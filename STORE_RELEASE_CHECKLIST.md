# Store Release Checklist (iOS + Android)

Bu dokuman, bu projeyi App Store ve Google Play'e cikarmadan once adim adim kontrol etmen icin hazirlandi.

## 0) Bu projede tespit edilen kritik durumlar

- `app.json` icindeki `expo.name` su an bos/space gorunuyor. Gercek uygulama adini yaz.
- `android.config.googleMaps.apiKey` dogrudan repoda. Production key'i kısıtla (package + SHA-1/SHA-256).
- `ACCESS_BACKGROUND_LOCATION` kullaniyorsun; Play Store ve iOS tarafinda cok net gerekce/policy metni gerekiyor.
- `eas.json` dosyasi yok. EAS Build submit sureci icin olusturman onerilir.

## 1) Ortam ve hesap hazirligi

1. Apple Developer ve Google Play Developer hesaplari aktif olsun.
2. Bundle/package id sabit olsun:
   - iOS: `com.hairdresser.app`
   - Android: `com.hairdresser.app`
3. App Store Connect ve Play Console'da uygulama kayitlarini ac.
4. Domain, privacy policy, support URL hazirla.

## 2) Surerli kimlikler ve gizli dosyalar

1. Firebase dosyalari:
   - iOS: `GoogleService-Info.plist`
   - Android: `google-services.json`
2. Bu dosyalarin her platform icin dogru app id ile uretildigini Firebase Console'dan teyit et.
3. API key ve benzeri gizli degerleri mumkunse EAS secrets veya CI secret'ta tut.

## 3) Expo/EAS konfigurasyonu

1. `app.json` kontrol:
   - `expo.name` gercek ad
   - `version` (marketing version)
   - `ios.bundleIdentifier`
   - `android.package`
2. `eas.json` olustur (ornek):

```json
{
  "cli": { "version": ">= 14.0.0" },
  "build": {
    "development": { "developmentClient": true, "distribution": "internal" },
    "preview": { "distribution": "internal" },
    "production": { "autoIncrement": true }
  },
  "submit": {
    "production": {}
  }
}
```

3. Komutlar:
   - `npx expo doctor`
   - `npx expo install --check`
   - `npx eas build:configure`

## 4) Plugin ve kutuphane uyumluluk kontrolu (bu projeye ozel)

### 4.1 Firebase / Push

- Paketler:
  - `@react-native-firebase/app`
  - `@react-native-firebase/messaging`
- Pluginler:
  - `@react-native-firebase/app`
  - `@react-native-firebase/messaging`
  - `./plugins/withNotificationChannel`
- Kontrol:
  1. Android notification channel meta-data ekleniyor mu (`withNotificationChannel`)?
  2. iOS'ta push capability + APNs key sertifikasi tam mi?
  3. Token register/unregister endpointleri calisiyor mu?
  4. Foreground/background/terminated push senaryolari test edildi mi?

### 4.2 Konum ve arkaplan

- Paketler:
  - `expo-location`
  - `expo-task-manager`
- Mevcut izinler:
  - Android: `ACCESS_FINE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`
  - iOS Info.plist: `NSLocationWhenInUseUsageDescription`, `NSLocationAlways...`, `UIBackgroundModes(location, fetch)`
- Kontrol:
  1. "Always" izni gercekten gerekli mi? Gerekliyse policy metnini hazirla.
  2. iOS'ta arkaplan konum kullanimini App Review notunda acikla.
  3. Android Data safety formunda background location beyanini dogru doldur.

### 4.3 Harita

- Paket: `react-native-maps`
- Ayar: `android.config.googleMaps.apiKey`
- Kontrol:
  1. Android API key package+SHA ile kisitli mi?
  2. iOS map key (gerekiyorsa) ve plist ayarlari dogru mu?

### 4.4 Media/UI kritik paketler

- `lottie-react-native`, `@gorhom/bottom-sheet`, `react-native-reanimated`, `react-native-gesture-handler`, `react-native-screens`, `react-native-svg`, `react-native-webview`
- Kontrol:
  1. App startup crash yok.
  2. Gesture + bottom sheet + reanimated animasyonlari release buildde sorunsuz.
  3. WebView (PayTR) iOS/Android release buildde aciliyor.

## 5) Uygulama ici fonksiyonel test plani (release oncesi)

1. Auth: OTP login/register, logout, token refresh.
2. Push:
   - Yeni bildirim geldi -> badge artiyor.
   - Mesaj geldi -> ana tab mesaj badge artiyor.
   - Mesaj odasi acik -> unread dogru sifirlaniyor.
3. Chat:
   - Thread bazli mesajlasma
   - Read receipt
   - Typing
4. Randevu:
   - Olusturma / onay / red / iptal / complete
   - Reminder bildirimi (30 dk kala)
5. Abonelik:
   - PayTR token alma
   - WebView odeme akisi
   - Cancel at period end
   - Reactivate auto-renew

## 6) Store policy ve icerik gereksinimleri

1. Privacy Policy URL canli.
2. Terms/Support URL canli.
3. Data safety / privacy nutrition:
   - Konum
   - Push token/device id
   - Profil verileri
4. Background location gerekcesi net yazilmali (hem Play hem Apple).

## 7) Build ve dagitim adimlari

1. Uretim build:
   - `npx eas build -p android --profile production`
   - `npx eas build -p ios --profile production`
2. Internal test:
   - Android internal testing track
   - iOS TestFlight
3. Crash-free smoke test:
   - Login -> mesaj -> bildirim -> randevu -> abonelik
4. Submit:
   - `npx eas submit -p android --profile production`
   - `npx eas submit -p ios --profile production`

## 8) Sunucu tarafi release checklist (bu proje icin)

1. EF migrationlar uygulanmis mi?
2. Push/Firebase servis account dogru mu?
3. PayTR ayarlari production degerlere cekildi mi?
4. API SSL + callback URL'leri dogru mu?

## 9) Son kontrol (go/no-go)

- [ ] Expo doctor temiz
- [ ] Buildler temiz
- [ ] TestFlight/Internal test onaylandi
- [ ] Policy formlari dolduruldu
- [ ] Privacy URL aktif
- [ ] Background location gerekcesi store notlarina eklendi
- [ ] Push ve badge gercek cihazda dogrulandi

