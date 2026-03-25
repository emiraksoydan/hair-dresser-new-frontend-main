# Store Release Status (Current Project Snapshot)

Bu dosya mevcut repoya gore "tamam / eksik" durumunu ozetler.

## Quick Answer: Message Badge Logic

- Ana mesaj ikonu `chatUnreadCount` degerini gosteriyor.
- Bu deger thread sayisi degil, tum thread'lerdeki okunmamis mesajlarin toplami.
- Kaynak:
  - Frontend: `app/components/layout/BaseTabLayout.tsx`
  - Backend hesaplama: `Business/Concrete/BadgeService.cs` (`chatUnreadCount += unreadCount`)

## 1) Config / Identity

- [x] `ios.bundleIdentifier` ayarli: `com.hairdresser.app`
- [x] `android.package` ayarli: `com.hairdresser.app`
- [x] `eas.json` eklendi
- [x] `expo.name` bosluktan duzeltildi (`Gumus Makas`)

## 2) Firebase / Push

- [x] `google-services.json` mevcut (Android)
- [x] `GoogleService-Info.plist` mevcut (iOS)
- [x] Firebase messaging pluginleri `app.json` icinde var
- [x] Android default notification channel config plugin var (`plugins/withNotificationChannel.js`)

## 3) Location / Policy Risk

- [x] Background location izinleri acik
- [ ] App Store + Play policy metinleri ve formlari hazirlanmali
- [ ] Privacy Policy URL repoda tespit edilemedi (store girisinde zorunlu)

## 4) Security / Secrets

- [ ] Google Maps API key su an `app.json` icinde acik metin. Restrict edilmesi sart:
  - Android package + SHA-1/SHA-256 kisiti
  - iOS bundle id kisiti (kullaniyorsan)

## 5) Subscription / Backend

- [x] Subscription renewal flags migration uretilmis:
  - `20260325171924_AddSubscriptionRenewalFlags`
- [x] SQL script uretilmis:
  - `DataAccess/Migrations/sql/20260325171924_AddSubscriptionRenewalFlags.sql`
  - `DataAccess/Migrations/sql/idempotent_up_to_AddSubscriptionRenewalFlags.sql`
- [x] Reminder 30 dakika kala olacak sekilde ayarlandi

## 6) Next Actions (Order)

1. Privacy policy + support URL hazirla.
2. Maps key kisitlarini Google Cloud'da uygula.
3. Internal builds al:
   - `npx eas build -p android --profile preview`
   - `npx eas build -p ios --profile preview`
4. Gercek cihazda push + location + payment smoke test.
5. Production build + submit.

