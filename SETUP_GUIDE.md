# 🚀 HairDresser Uygulaması - Kurulum Rehberi

Bu dosya, uygulamanın tüm servis yapılandırmalarını içerir.

---

## 📋 İçindekiler

1. [Firebase Push Notification](#1-firebase-push-notification)
2. [Harita Servisi (Maps)](#2-harita-servisi-maps)
3. [Lokasyon Servisi](#3-lokasyon-servisi)
4. [Diğer Servisler](#4-diğer-servisler)
5. [Kontrol Listesi](#5-kontrol-listesi)

---

## 1. Firebase Push Notification

### ✅ Tamamlanan Adımlar

- ✅ `expo-dev-client` yüklendi
- ✅ `@react-native-firebase/app` ve `@react-native-firebase/messaging` yüklendi
- ✅ `app.json` güncellendi (Firebase plugin eklendi)
- ✅ `useFcmToken` hook'u React Native Firebase'i destekliyor

### 📋 Yapılması Gerekenler

#### 1.1. Firebase Console'dan Yapılandırma Dosyalarını İndirin

**Android için:**
1. Firebase Console'a gidin: https://console.firebase.google.com/
2. Projenizi seçin (veya yeni proje oluşturun)
3. Android uygulaması ekleyin (package name: `com.hairdresser.app` - app.json'dan kontrol edin)
4. `google-services.json` dosyasını indirin
5. Proje root'una ekleyin: `./google-services.json`

**iOS için:**
1. Firebase Console'da iOS uygulaması ekleyin (bundle ID: `com.hairdresser.app` - app.json'dan kontrol edin)
2. `GoogleService-Info.plist` dosyasını indirin
3. Proje root'una ekleyin: `./GoogleService-Info.plist`

#### 1.2. Backend'de Firebase Admin SDK Yapılandırması

Firebase Admin SDK artık **service account JSON dosyası** kullanıyor (eski Server Key yöntemi deprecated).

**Service Account JSON Dosyası Nasıl Alınır:**

1. Firebase Console'a gidin: https://console.firebase.google.com/
2. Projenizi seçin
3. **Project Settings** (⚙️) → **Service accounts** sekmesi
4. **Generate new private key** butonuna tıklayın
5. JSON dosyasını indirin (örn: `firebase-service-account.json`)

**Backend Yapılandırması:**

1. İndirdiğiniz JSON dosyasını backend projenizin root'una ekleyin (örn: `Api/firebase-service-account.json`)
2. `appsettings.json` dosyasına Firebase yapılandırmasını ekleyin:

```json
{
  "Firebase": {
    "ServiceAccountPath": "firebase-service-account.json"
  }
}
```

**Veya environment variable kullanarak (Önerilir - Production için):**

```json
{
  "Firebase": {
    "ServiceAccountPath": "${FIREBASE_SERVICE_ACCOUNT_PATH}"
  }
}
```

**Güvenlik Notları:**
- ✅ JSON dosyasını `.gitignore`'a ekleyin (güvenlik için)
- ✅ Production'da environment variable kullanın
- ✅ JSON dosyasını asla repository'ye commit etmeyin

#### 1.3. Native Build Yapın

Artık Expo Go kullanılamaz, development build yapmanız gerekiyor:

**Android için:**
```bash
# 1. Native kodları oluştur (android/ klasörü)
npx expo prebuild --platform android

# 2. Android Studio'da açın veya direkt çalıştırın
npx expo run:android

# VEYA Android Studio ile:
# - android/ klasörünü Android Studio'da açın
# - Run butonuna tıklayın
```

**iOS için:**
```bash
# 1. Native kodları oluştur (ios/ klasörü)
npx expo prebuild --platform ios

# 2. Xcode'da açın veya direkt çalıştırın
npx expo run:ios

# VEYA Xcode ile:
# - ios/ klasöründeki .xcworkspace dosyasını Xcode'da açın
# - Run butonuna tıklayın
```

**⚠️ İlk Build:**
- İlk build biraz uzun sürebilir (10-30 dakika)
- Tüm native bağımlılıklar indirilecek
- Sonraki build'ler daha hızlı olacak

#### 1.4. Development Build Oluşturun

```bash
# Android
eas build --profile development --platform android

# iOS
eas build --profile development --platform ios
```

**Not:** EAS Build kullanmak için `eas.json` dosyası oluşturmanız gerekebilir.

### ⚠️ Önemli Notlar

1. **Expo Go Artık Kullanılamaz**: React Native Firebase native modül gerektirdiği için Expo Go ile çalışmaz. Development build kullanmanız gerekir.

2. **Package Name / Bundle ID**: Firebase Console'da eklediğiniz package name ve bundle ID'nin app.json'daki değerlerle eşleşmesi gerekir.

3. **Fallback Mekanizması**: Hook, React Native Firebase mevcut değilse Expo Notifications'a fallback yapar. Ancak production'da React Native Firebase kullanılmalıdır.

### 🐛 Sorun Giderme

- **"Firebase messaging permission not granted"**: iOS: Info.plist'e notification permission description ekleyin
- **"React Native Firebase not available"**: Native build yapıldı mı kontrol edin, yapılandırma dosyaları doğru konumda mı?
- **Token backend'e kaydedilmiyor**: Backend'de Firebase Server Key doğru mu? Network isteklerini kontrol edin.

---

## 2. Harita Servisi (Maps)

### Platform Bazlı Durum

#### ✅ iOS - Apple Maps (ÜCRETSİZ)

**Durum:**
- ✅ `react-native-maps` iOS'ta **varsayılan olarak Apple Maps kullanır**
- ✅ **API Key GEREKMEZ** - Tamamen ücretsiz
- ✅ Ekstra yapılandırma gerekmez

**Avantajlar:**
- Ücretsiz (sınırsız kullanım)
- iOS ile native entegrasyon
- Ekstra yapılandırma yok
- Performanslı

#### ⚠️ Android - Google Maps SDK (API Key Gerekli)

**Durum:**
- ⚠️ Android'de **Google Maps SDK zorunlu**
- ⚠️ **API Key GEREKLİ** (ücretsiz tier mevcut)
- ⚠️ `app.json`'da yapılandırma gerekli

**Ücretsiz Tier:**
- İlk **$200/ay kredi** ücretsiz
- Çoğu uygulama için yeterli
- Sonrası ücretli

### 📋 Yapılandırma

#### iOS (Apple Maps) - ✅ HAZIR

**Hiçbir şey yapmanıza gerek yok!**
- `react-native-maps` otomatik olarak Apple Maps kullanır
- API key gerekmez
- Ekstra yapılandırma yok

#### Android (Google Maps) - ⚠️ YAPILMASI GEREKENLER

**1. Google Cloud Console'dan API Key Alın:**

1. [Google Cloud Console](https://console.cloud.google.com/) → Proje oluştur/seç
2. **APIs & Services** → **Library**
3. **Maps SDK for Android** etkinleştir
4. **Credentials** → **Create API Key**
5. Key'i kopyala

**2. API Key'i app.json'a Ekleyin:**

`app.json` dosyasında `android.config.googleMaps.apiKey` bölümüne API key'inizi ekleyin:

```json
{
  "expo": {
    "android": {
      "config": {
        "googleMaps": {
          "apiKey": "YOUR_ACTUAL_GOOGLE_MAPS_API_KEY"
        }
      }
    }
  }
}
```

**Not:** iOS için ekstra ayar gerekmez, Apple Maps otomatik kullanılır.

**3. SHA-1 Certificate Fingerprint Nasıl Alınır:**

### 🔵 Development (Debug) - ŞİMDİ ALIN

**Ne zaman:** Development/test için, şimdi alabilirsiniz

**Nasıl:**
```bash
# Windows (PowerShell) - Android klasörüne gidin
cd android
.\gradlew signingReport

# Veya direkt keytool ile
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android
```

**SHA-1'i Bulun:**
Çıktıda `SHA1:` satırını bulun ve değeri kopyalayın (örn: `A1:B2:C3:...`)

**Google Cloud Console'a Ekleyin:**
- API Key → Application restrictions → Android apps
- Package name: `com.hairdresser.app`
- SHA-1 fingerprint: Debug fingerprint'i ekleyin

### 🟢 Production (Release) - PRODUCTION KEYSTORE OLUŞTURDUĞUNUZDA ALIN

**Ne zaman:** 
- Production keystore oluşturduğunuzda
- Release build yapmadan önce
- Play Store'a yüklemeden önce

**Önce Production Keystore Oluşturun:**

**⚠️ ÖNEMLİ:** Production keystore'u **SADECE BİR KEZ** oluşturun ve **GÜVENLİ** bir yerde saklayın. Kaybederseniz Play Store'da güncelleme yapamazsınız!

```bash
# Proje root'unda production keystore oluştur
keytool -genkeypair -v -storetype PKCS12 -keystore android-release-key.keystore -alias hairdresser-release -keyalg RSA -keysize 2048 -validity 10000

# Soruları cevaplayın:
# - Password: Güçlü bir şifre (MUTLAKA KAYDEDİN!)
# - Name: HairDresser (veya istediğiniz isim)
# - Organizational Unit: IT
# - Organization: HairDresser
# - City: İstanbul
# - State: İstanbul
# - Country: TR
```

**Keystore'u Güvenli Yerde Saklayın:**
- Proje klasörüne ekleyin (ama `.gitignore`'a ekleyin!)
- Yedekleyin (cloud storage, USB, vb.)
- Şifresini güvenli bir yerde saklayın

**Sonra SHA-1'i Alın:**
```bash
# Release keystore'unuzun yolunu kullanın
keytool -list -v -keystore my-release-key.keystore -alias my-key-alias
# Şifre sorulacak, keystore oluştururken girdiğiniz şifreyi girin
```

**Google Cloud Console'a Ekleyin:**
- Aynı API Key'e gidin
- Application restrictions → Android apps
- **Yeni bir satır ekleyin** (debug'ın altına)
- Package name: `com.hairdresser.app` (aynı)
- SHA-1 fingerprint: **Production fingerprint'i ekleyin**

**⚠️ ÖNEMLİ:**
- Debug ve Production fingerprint'lerini **AYRI AYRI** ekleyin
- Her ikisi de aynı API Key'e eklenebilir
- Production keystore'u **GÜVENLİ** bir yerde saklayın (yedekleyin!)

**4. API Key Kısıtlamaları (Önerilir - Production için):**

Güvenlik için mutlaka kısıtlayın:

1. Google Cloud Console → **Credentials** → API Key'inizi seçin
2. **Application restrictions**:
   - **Android apps** seçin
   - Package name: `com.hairdresser.app`
   - SHA-1 certificate fingerprint ekleyin (hem debug hem release için)
3. **API restrictions**:
   - Sadece **Maps SDK for Android** seçin
   - **Geocoding API** ekleyin (adres çözümleme için - aşağıda açıklanıyor)

**5. Geocoding API Nedir ve Neden Gerekli?**

**Geocoding:** Koordinat (lat/lng) → Adres dönüşümü
**Reverse Geocoding:** Adres → Koordinat dönüşümü

**Kullanım Senaryosu:**
- Kullanıcı haritada bir noktaya tıkladığında
- Koordinatları alırsınız (lat, lng)
- Geocoding API ile bu koordinatların adresini alırsınız
- Örnek: `41.0082, 28.9784` → `"İstanbul, Türkiye"`

**Geocoding API'yi Etkinleştirin:**
1. Google Cloud Console → **APIs & Services** → **Library**
2. **Geocoding API** arayın ve etkinleştirin
3. API Key kısıtlamalarına **Geocoding API** ekleyin

**6. React Native Maps Zoom Kontrolü:**

✅ **Evet, React Native Maps zoom destekliyor!**

**Mevcut Kodunuzda:**
```typescript
// initialRegion ile başlangıç zoom
initialRegion={{
  latitude: coord.latitude,
  longitude: coord.longitude,
  latitudeDelta: 0.01,  // ← Bu zoom seviyesini belirler (küçük = yakın)
  longitudeDelta: 0.01
}}

// animateCamera ile programatik zoom
mapRef.current?.animateCamera({ 
  center: next, 
  zoom: 16  // ← Zoom seviyesi (1-20 arası)
}, { duration: 350 });
```

**Zoom Seviyeleri:**
- `1-5`: Dünya/Kıta görünümü
- `6-10`: Ülke/Şehir görünümü
- `11-15`: Mahalle görünümü
- `16-20`: Sokak/Bina görünümü (en yakın)

**8. Geocoding Kullanım Örneği (Koordinat → Adres):**

Haritada tıklanan noktanın adresini almak için:

```typescript
// utils/geocoding.ts
export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string | null> => {
  try {
    const apiKey = 'YOUR_GOOGLE_MAPS_API_KEY'; // app.json'dan veya env'den
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${apiKey}&language=tr`;
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.status === 'OK' && data.results.length > 0) {
      return data.results[0].formatted_address;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};
```

**MapPicker'da Kullanım:**
```typescript
const handlePress = useCallback(async (e: MapPressEvent) => {
  const { latitude, longitude } = e.nativeEvent.coordinate;
  onChange(latitude, longitude);
  
  // Adres bilgisini al
  const address = await getAddressFromCoordinates(latitude, longitude);
  if (address) {
    console.log('Adres:', address); // "İstanbul, Türkiye" gibi
  }
}, [onChange]);
```

**Geocoding API Maliyeti:**
- İlk 40,000 istek/ay: ✅ ÜCRETSİZ
- Sonrası: $5.00 per 1,000 istek

**9. Native Build Sonrası:**

Native build yaptığınızda, `AndroidManifest.xml`'e otomatik eklenir.

### 💰 Maliyet

- **iOS (Apple Maps)**: ✅ Tamamen ÜCRETSİZ, sınırsız kullanım
- **Android (Google Maps)**: ✅ İlk $200/ay ÜCRETSİZ, sonrası ücretli

**Maliyet Örneği:**
- 1000 map load/gün ≈ $0.07/gün ≈ $2/ay
- 10,000 map load/gün ≈ $0.70/gün ≈ $21/ay

**Not:** Kullanımı Google Cloud Console → Billing'den izleyebilirsiniz.

---

## 3. Lokasyon Servisi

### ✅ Mevcut Durum

- `expo-location` paketi yüklü
- `app.json`'da permission'lar tanımlı:
  - **Android**: `ACCESS_FINE_LOCATION` ✅
  - **iOS**: `NSLocationWhenInUseUsageDescription` ✅

### ⚠️ Yapılması Gerekenler

**Hiçbir şey gerekmez!** ✅

Expo managed workflow'da `app.json` yeterli, native build sonrası otomatik eklenir.

**Not:** Background location kullanıyorsanız, iOS'ta `Info.plist`'e ekleme gerekebilir (şu an gerekli değil).

---

## 4. Diğer Servisler

### ✅ Hazır (Ek Ayar Gerektirmez)

- ✅ **Image Picker** (`expo-image-picker`) - Permission'lar otomatik yönetiliyor
- ✅ **Document Picker** (`expo-document-picker`) - Ekstra yapılandırma yok
- ✅ **SignalR** - Backend'de yapılandırılmış

---

## 5. Kontrol Listesi

### 🔴 Zorunlu (Production için)

- [ ] **Firebase Yapılandırması**
  - [ ] `google-services.json` dosyası proje root'unda
  - [ ] `GoogleService-Info.plist` dosyası proje root'unda
  - [ ] Backend'de Firebase service account JSON dosyası eklendi
- [ ] `appsettings.json`'da Firebase yapılandırması yapıldı
  - [ ] Native build yapıldı
  - [ ] Development build oluşturuldu
  - [ ] FCM token backend'e kaydediliyor
  - [ ] Push notification'lar çalışıyor

- [ ] **Google Maps API Key (Android)**
  - [ ] Google Cloud Console'dan API Key alındı
  - [ ] Maps SDK for Android etkinleştirildi
  - [ ] API Key `app.json`'a eklendi
  - [ ] API Key kısıtlamaları yapıldı (production için önemli!)

### ✅ Hazır (Ek Ayar Gerektirmez)

- [x] Lokasyon permission'ları (app.json'da mevcut)
- [x] iOS Apple Maps (otomatik, ücretsiz)
- [x] Image Picker
- [x] Document Picker
- [x] SignalR (backend'de yapılandırılmış)

---

## 🚀 Hızlı Başlangıç

### Firebase Kurulumu (10 dakika)

1. Firebase Console → Proje oluştur/seç
2. Android ve iOS uygulamaları ekle
3. `google-services.json` ve `GoogleService-Info.plist` dosyalarını indir
4. Proje root'una ekle
5. Backend'de Firebase Server Key ayarla
6. Native build yap

### Google Maps API Key (Android) (5 dakika)

1. [Google Cloud Console](https://console.cloud.google.com/) → Proje oluştur
2. **Maps SDK for Android** etkinleştir
3. **API Key** oluştur
4. `app.json`'daki `YOUR_ANDROID_GOOGLE_MAPS_API_KEY_HERE` değerini değiştir
5. API Key kısıtlamaları yap (production için önemli!)
6. Native build yap

### iOS için

**Hiçbir şey yapmanıza gerek yok!** ✅
- Apple Maps otomatik kullanılıyor
- Firebase için sadece yapılandırma dosyalarını ekleyin

---

## ⚠️ Önemli Notlar

1. **Expo Go Artık Kullanılamaz**: React Native Firebase native modül gerektirdiği için Expo Go ile çalışmaz. Development build kullanmanız gerekir.

2. **iOS'ta API Key Gerekmez**: Apple Maps tamamen ücretsiz, `app.json`'da iOS için API key alanı yok.

3. **Android'de Alternatif Yok**: Google Maps SDK zorunlu, OpenStreetMap gibi alternatifler `react-native-maps` ile çalışmaz.

4. **Maliyet Kontrolü**: 
   - Google Maps: Google Cloud Console → Billing'den kullanımı izleyin
   - Ücretsiz tier genellikle yeterli

5. **Production için**: 
   - API key kısıtlamaları yapın (güvenlik)
   - Android: Package name + SHA-1
   - Sadece gerekli API'leri etkinleştirin

6. **Development vs Production**: 
   - Development: Expo Go default key (limitli)
   - Production: Kendi API key'iniz (app.json'da)

---

## 📞 Destek

Sorun yaşarsanız:
1. Native build yapıldı mı kontrol edin
2. Yapılandırma dosyaları doğru konumda mı?
3. Backend loglarını kontrol edin
4. Network isteklerini kontrol edin

