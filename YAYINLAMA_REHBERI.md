# Gümüş Makas — App Store & Play Store Yayın Rehberi

---

## MEVCUT DURUM

| Adım | Durum |
|---|---|
| EAS kurulumu (`eas init`) | ✅ Tamamlandı |
| `app.config.js` güncellendi | ✅ Tamamlandı |
| `eas.json` hazır | ✅ Tamamlandı |
| Apple Developer hesabı | ⏳ Onay bekleniyor |
| Google Play Console hesabı | ⏳ Onay bekleniyor |
| Adım 1–20 | ⬜ Yapılmadı |

---

## AŞAMA 1 — Apple Onayı Sonrası (iOS)

### Adım 1 — Bundle ID Kaydet
1. https://developer.apple.com/account/resources/identifiers adresini aç
2. Sağ üstte `+` → **App IDs** → **App** → Continue
3. Alanları doldur:
   - Description: `Gümüş Makas`
   - Bundle ID → **Explicit** → `com.hairdresser.app`
4. Aşağıdan işaretle:
   - `Push Notifications` ✓
   - `Background Modes` ✓
5. Continue → **Register**

---

### Adım 2 — APNs Auth Key Oluştur
1. https://developer.apple.com/account/resources/authkeys adresini aç
2. `+` → Key Name: `GümüşMakasAPNs`
3. `Apple Push Notifications service (APNs)` ✓
4. Continue → Register → **Download** butonuna bas
5. `.p8` dosyasını güvenli bir klasöre kaydet **(sadece 1 kez indirilir, kaybet!)**
6. Sayfada görünen **Key ID**'yi not al
7. Üst menü → Membership Details → **Team ID**'yi not al

---

### Adım 3 — Firebase'e APNs Key Yükle
1. https://console.firebase.google.com → Projeyi aç
2. Sol alttaki dişli → **Project Settings**
3. **Cloud Messaging** sekmesine geç
4. iOS app bölümünü bul → **APNs Authentication Key** → Upload
5. `.p8` dosyasını seç
6. **Key ID** ve **Team ID** gir → Upload

---

### Adım 4 — App Store Connect'te App Oluştur
1. https://appstoreconnect.apple.com giriş yap
2. **My Apps** → `+` → **New App**
   - Platform: iOS
   - Name: `Gümüş Makas`
   - Bundle ID: `com.hairdresser.app`
   - SKU: `gumusmakas-001`
   - User Access: Full Access
3. **Create**
4. Tarayıcı URL'sine bak → `apps/XXXXXXXXXX` — bu sayı `ascAppId`'dir, not al

---

### Adım 5 — eas.json iOS Alanlarını Doldur
`eas.json` dosyasını aç, `submit.production.ios` bölümünü doldur:

```json
"ios": {
  "appleId": "apple_hesabın@email.com",
  "ascAppId": "Adım 4'te aldığın sayı",
  "appleTeamId": "Adım 2'de aldığın Team ID"
}
```

---

## AŞAMA 2 — Google Play Onayı Sonrası (Android)

### Adım 6 — Play Console'da App Oluştur
1. https://play.google.com/console giriş yap
2. **Create app**
   - App name: `Gümüş Makas`
   - Default language: Turkish (Turkey)
   - App or game: App
   - Free or paid: seçimini yap
3. **Create app**

---

### Adım 7 — Service Account Oluştur (EAS Submit için)
1. Play Console → Sol menü → **Setup** → **API access**
2. `Link to a Google Cloud project` → izin ver
3. Google Cloud Console açılır → **IAM & Admin** → **Service Accounts** → `+ Create Service Account`
   - Name: `eas-submit`
   - Continue → Role: `Service Account User` → Done
4. Oluşan hesabın yanındaki `⋮` → **Manage keys** → **Add Key** → **JSON** → Create
5. İnen `.json` dosyasını proje köküne **`pc-api-key.json`** olarak koy
6. Play Console'a geri dön → API access → `eas-submit` hesabına **Grant access** → **Release Manager** rolü ver

---

### Adım 8 — Play Console Zorunlu Formları Doldur
Play Console sol menüde sırayla aç, hepsini tamamla:

| Form | Yapılacak |
|---|---|
| App content → Privacy policy | Adım 11'deki URL'yi gir |
| App content → Ads | No seç |
| App content → Content rating | Questionnaire doldur, tamamla |
| App content → Target audience | 18+ seç |
| App content → Data safety | Aşağıdaki tabloyu doldur |
| App content → Background location | Declaration doldur |

**Data Safety tablosu:**

| Veri Türü | Topluyor musun | Açıklama |
|---|---|---|
| Precise location | Evet | Yakın berber/dükkan bulma |
| Name | Evet | Kullanıcı profili |
| Phone number | Evet | Hesap ve kimlik doğrulama |
| Photos / videos | Evet | Profil ve işletme görselleri |
| App interactions | Evet | Randevu geçmişi |

**Background location declaration açıklaması:**
> "Serbest berberler müşteri bulabilmek için arka planda konum paylaşır. Bu özellik yalnızca serbest berber rolündeki kullanıcılar için aktiftir ve isteğe bağlıdır."

---

## AŞAMA 3 — EAS Secrets Tanımla

### Adım 9 — Google Maps API Key'i Secret Olarak Ekle
Terminal'de proje klasöründe çalıştır:

```bash
eas secret:create --scope project --name GOOGLE_MAPS_API_KEY --value "API_KEY_BURAYA"
```

Firebase dosyaları için (isteğe bağlı):
```bash
eas secret:create --scope project --name GOOGLE_SERVICES_JSON --type file --value ./google-services.json
eas secret:create --scope project --name GOOGLE_SERVICES_PLIST --type file --value ./GoogleService-Info.plist
```

---

## AŞAMA 4 — Uygulama İçi Kontroller

### Adım 10 — Hesap Silme Özelliği Kontrol Et
Her iki store da zorunlu tutuyor. Uygulamanda:
- Profil → Hesabı Sil akışı var mı?
- Yoksa eklemek gerekiyor
- App Store Connect → App Privacy → Account Deletion kısmına URL veya açıklama eklenecek

---

### Adım 11 — Privacy Policy Sayfası Yayınla
Bir web sayfası oluştur (GitHub Pages, Notion public page veya Carrd.co).

**Minimum içermesi gerekenler:**
- Hangi veriler toplanıyor: konum, fotoğraf, isim, telefon
- Firebase ve Google Maps ile paylaşım olduğu
- Kullanıcı verilerini nasıl silebilir
- İletişim e-posta adresi

URL hazır olunca:
- App Store Connect → App Information → Privacy Policy URL
- Play Console → App content → Privacy policy → URL ekle

---

### Adım 12 — Splash Screen Görseli Ekle
1. `./assets/splash.png` dosyasını oluştur
   - Boyut: **1284 x 2778 px**
   - Arka plan: beyaz (`#ffffff`)
   - Ortaya logo eklenebilir
2. `app.config.js` splash bölümünü güncelle:

```js
splash: {
  image: "./assets/splash.png",
  backgroundColor: "#ffffff",
  resizeMode: "cover",
},
```

---

### Adım 13 — Icon Dosyalarını Kontrol Et
| Dosya | Boyut | Kural |
|---|---|---|
| `./assets/icon.png` | 1024x1024 px | PNG, **şeffaflık olmamalı** (iOS) |
| `./assets/adaptive-icon.png` | 1024x1024 px | PNG, şeffaf arka plan olabilir (Android) |

---

### Adım 14 — iOS infoPlist Eksiklerini Ekle
`app.config.js` → `ios.infoPlist` bölümüne ekle:

```js
NSPhotoLibraryUsageDescription: "Profil ve işletme fotoğrafları için",
NSCameraUsageDescription: "Profil fotoğrafı çekmek için",
NSPhotoLibraryAddUsageDescription: "Fotoğrafları kütüphaneye kaydetmek için",
```

---

## AŞAMA 5 — Store Listing Hazırla

### Adım 15 — Ekran Görüntüleri Çek
| Platform | Boyut | Min. Adet |
|---|---|---|
| iPhone 6.5" (App Store) | 1284x2778 px | 3 |
| iPhone 5.5" (App Store) | 1242x2208 px | 3 |
| Android (Play Store) | 1080x1920 px | 2 |

**Önerilen ekranlar:** Ana panel, randevu listesi, harita görünümü, profil sayfası, randevu detayı

---

### Adım 16 — Uygulama Açıklaması Yaz
Her iki store için hem Türkçe hem İngilizce hazırla:

**Kısa açıklama (80 karakter):**
> Yakınındaki berberleri bul, anında randevu al

**Uzun açıklama (4000 karakter) içermesi gerekenler:**
- Uygulamanın ne yaptığı
- Müşteri, serbest berber, işletme rolleri
- Harita ile çevredeki berber/dükkan bulma
- 3'lü randevu sistemi
- Gerçek zamanlı bildirimler ve mesajlaşma

---

## AŞAMA 6 — Build ve Yayın

### Adım 17 — Test Build Al (Önce bunu yap)
```bash
# Android APK — gerçek cihazda test için
eas build --platform android --profile preview
```

İndirilen APK'yı gerçek Android cihazda test et:
- Lokasyon çalışıyor mu?
- Push bildirimler geliyor mu?
- Harita yükleniyor mu?
- Tüm randevu akışları çalışıyor mu?

---

### Adım 18 — Production Build Al
Her şey hazır ve test edilince:

```bash
eas build --platform all --profile production
```

> Bu işlem 15-30 dakika sürer, EAS sunucularında çalışır. Terminali kapatabilirsin.

---

### Adım 19 — Store'lara Gönder
```bash
# Android → Play Store (Internal Testing track)
eas submit --platform android --profile production

# iOS → App Store Connect
eas submit --platform ios --profile production
```

---

### Adım 20 — Store Review Sonrası

**App Store Connect'te yapılacaklar:**
- App Store → Pricing and Availability → fiyat seç (ücretsiz)
- App Review Information → Demo hesap bilgisi ekle (berber + müşteri + serbest berber)
- Submit for Review

**Play Console'da yapılacaklar:**
- Internal Testing → test kullanıcıları ekle, test et
- Ardından Production track'e promote et
- Yayınla

---

## Review Süreçleri

| | Apple App Store | Google Play |
|---|---|---|
| Süre | 1–3 gün | 1–7 gün |
| İlk uygulama | Genelde daha uzun | Genelde daha uzun |
| Sık red sebebi | Background location açıklaması | Data safety formu eksik |
| Red gelirse | Gerekçeyi oku, düzelt, tekrar gönder | Aynı |

---

## Kontrol Listesi (Tümü)

```
HESAPLAR
[ ] Apple Developer Program onaylandı
[ ] Google Play Console onaylandı

iOS
[ ] Adım 1  — Bundle ID register edildi
[ ] Adım 2  — APNs Auth Key oluşturuldu ve .p8 kaydedildi
[ ] Adım 3  — Firebase'e APNs Key yüklendi
[ ] Adım 4  — App Store Connect'te app oluşturuldu
[ ] Adım 5  — eas.json iOS alanları dolduruldu

ANDROID
[ ] Adım 6  — Play Console'da app oluşturuldu
[ ] Adım 7  — Service Account oluşturuldu, pc-api-key.json eklendi
[ ] Adım 8  — Tüm Play Console formları dolduruldu

EAS
[ ] Adım 9  — GOOGLE_MAPS_API_KEY secret eklendi

UYGULAMA İÇİ
[ ] Adım 10 — Hesap silme özelliği kontrol edildi
[ ] Adım 11 — Privacy Policy sayfası yayınlandı, URL eklendi
[ ] Adım 12 — Splash screen görseli eklendi
[ ] Adım 13 — Icon dosyaları kontrol edildi
[ ] Adım 14 — iOS infoPlist eksikleri eklendi

STORE LİSTİNG
[ ] Adım 15 — Ekran görüntüleri hazırlandı
[ ] Adım 16 — Açıklamalar yazıldı (TR + EN)

BUILD VE YAYINLAMA
[ ] Adım 17 — Preview build alındı, gerçek cihazda test edildi
[ ] Adım 18 — Production build alındı
[ ] Adım 19 — Her iki store'a gönderildi
[ ] Adım 20 — Review bilgileri tamamlandı, yayına alındı
```

---

*Son güncelleme: 2026-04-03*
