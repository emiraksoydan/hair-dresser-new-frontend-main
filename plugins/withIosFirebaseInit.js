/**
 * AppDelegate.swift'e Firebase init kodunu manuel ekler.
 *
 * NEDEN GEREKLI:
 * Expo SDK 54+ AppDelegate'i Swift olarak oluşturuyor (eskiden Objective-C .mm).
 * @react-native-firebase/app v21.x plugin'i Swift AppDelegate'e Firebase ekleme
 * insertion point'i bulamıyor ve şu uyarıyla atlıyor:
 *   "Unable to determine correct Firebase insertion point in AppDelegate.swift. Skipping Firebase addition."
 *
 * Sonuç: Firebase pod'ları yüklü olsa bile FirebaseApp.configure() çağrılmıyor →
 * runtime'da "No Firebase App '[DEFAULT]' has been created" hatası.
 *
 * Bu plugin RNFB plugin'inden SONRA çalışmalı — atlanan adımı manuel yapar:
 *   1. import FirebaseCore (yoksa)
 *   2. application(_:didFinishLaunchingWithOptions:) içine FirebaseApp.configure() ekler (yoksa)
 */
const { withAppDelegate } = require("expo/config-plugins");

module.exports = function withIosFirebaseInit(config) {
  return withAppDelegate(config, (config) => {
    // Sadece Swift AppDelegate'e müdahale et — Objective-C için RNFB plugin zaten çalışıyor
    if (config.modResults.language !== "swift") {
      return config;
    }

    let src = config.modResults.contents;

    // Adım 1: import FirebaseCore (yoksa ekle)
    if (!src.includes("import FirebaseCore") && !src.includes("import Firebase")) {
      // İlk import'tan sonra ekle
      const importMatch = src.match(/^import\s+\w+/m);
      if (importMatch) {
        const idx = src.indexOf(importMatch[0]) + importMatch[0].length;
        src = src.slice(0, idx) + "\nimport FirebaseCore" + src.slice(idx);
      } else {
        // Hiç import yoksa dosyanın başına
        src = `import FirebaseCore\n${src}`;
      }
    }

    // Adım 2: FirebaseApp.configure() çağrısını didFinishLaunchingWithOptions'a ekle
    if (!src.includes("FirebaseApp.configure()")) {
      // Expo SDK 54 default AppDelegate.swift formatı:
      //   public override func application(
      //     _ application: UIApplication,
      //     didFinishLaunchingWithOptions launchOptions: ...
      //   ) -> Bool {
      //     ...kod...
      //   }
      // Fonksiyonun açılış parantezinden sonra ilk satıra ekleyeceğiz.

      // didFinishLaunchingWithOptions fonksiyonunu bul
      const fnRegex = /func\s+application\s*\(\s*_\s+application:\s*UIApplication\s*,\s*didFinishLaunchingWithOptions[\s\S]*?\)\s*->\s*Bool\s*\{/;
      const match = src.match(fnRegex);

      if (match) {
        const insertionPoint = match.index + match[0].length;
        const indent = "    "; // Swift'te 4-space indent
        const insertion = `\n${indent}FirebaseApp.configure()\n`;
        src = src.slice(0, insertionPoint) + insertion + src.slice(insertionPoint);
      } else {
        // Fonksiyon imza pattern'ı eşleşmedi — log uyarısı bırak ama build'i bozmasın
        console.warn(
          "[withIosFirebaseInit] application(_:didFinishLaunchingWithOptions:) bulunamadı. " +
          "AppDelegate.swift'in formatı değişmiş olabilir, plugin güncellemesi gerekiyor."
        );
      }
    }

    config.modResults.contents = src;
    return config;
  });
};
