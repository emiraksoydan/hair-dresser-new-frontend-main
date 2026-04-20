import React, { useCallback } from "react";
import { Keyboard, Pressable } from "react-native";

/**
 * Uygulama genelinde klavye DIŞINDAKİ boş bir alana dokunulduğunda klavyeyi
 * kapatır. Root layout seviyesinde `<ThemedStack />`'i sarmalar.
 *
 * Nasıl çalışır (React Native Responder System):
 * - Kullanıcı ekrana dokunduğunda touch en derin view'dan başlayıp parent'lara
 *   doğru `onStartShouldSetResponder` zinciriyle yukarı çıkar.
 * - TextInput / TouchableOpacity / Pressable / Button / ScrollView gibi
 *   interaktif bileşenler kendi dokunuşlarını ÖNCE tüketir.
 * - Dolayısıyla bu root-Pressable'ın `onPress`'i yalnızca "hiçbir çocuğun
 *   sahiplenmediği" dokunuşlarda (pasif View'lar, arka plan boşlukları)
 *   tetiklenir. Buton ya da input'a dokununca tetiklenmez.
 *
 * Neden state / Keyboard listener yok:
 * - `Keyboard.dismiss()` klavye zaten kapalıyken no-op'tur, ekstra maliyet yok.
 * - Listener tutmayıp her dokunuşta çağırmak daha basit, remount / conditional
 *   wrapper risklerini ortadan kaldırır (çocuklar asla yeniden mount olmaz).
 *
 * UX notları:
 * - `accessible={false}` → screen reader'da "button" olarak duyrulmaz.
 * - `android_disableSound` → her dokunuşta klik sesi çıkmaz.
 * - Pressable'ın `pressRetentionOffset` / `hitSlop` ayarlamıyoruz çünkü tüm
 *   alanı kaplasın istiyoruz.
 */
export function GlobalKeyboardDismisser({ children }: { children: React.ReactNode }) {
  const handlePress = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  return (
    <Pressable
      style={{ flex: 1 }}
      onPress={handlePress}
      accessible={false}
      android_disableSound
    >
      {children}
    </Pressable>
  );
}
