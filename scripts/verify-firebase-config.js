/**
 * Yerel google-services.json ve GoogleService-Info.plist dosyalarında
 * paket / bundle ID'nin app.config.js ile uyumunu kontrol eder.
 * Dosyalar yoksa (EAS'te sadece secret varsa) uyarı verir, hata sayılmaz.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const EXPECTED_ANDROID = "com.hairdresser.app";
const EXPECTED_IOS = "com.hairdresser.app";

function readText(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) return null;
  return fs.readFileSync(p, "utf8");
}

function extractPlistBundleId(xml) {
  const m = xml.match(
    /<key>\s*BUNDLE_ID\s*<\/key>\s*<string>\s*([^<]+)\s*<\/string>/i
  );
  return m ? m[1].trim() : null;
}

function main() {
  let errors = 0;

  const jsonRaw = readText("google-services.json");
  if (jsonRaw) {
    try {
      const j = JSON.parse(jsonRaw);
      const clients = j.client || [];
      const pkgs = clients
        .map((c) => c.client_info?.android_client_info?.package_name)
        .filter(Boolean);
      if (!pkgs.includes(EXPECTED_ANDROID)) {
        console.error(
          `[firebase] google-services.json: package_name beklenen "${EXPECTED_ANDROID}" değil. Bulunan: ${pkgs.join(", ") || "(yok)"}`
        );
        errors++;
      } else {
        console.log(`[firebase] google-services.json: package_name OK (${EXPECTED_ANDROID})`);
      }
    } catch (e) {
      console.error("[firebase] google-services.json parse hatası:", e.message);
      errors++;
    }
  } else {
    console.warn(
      "[firebase] google-services.json bulunamadı (yerelde yoksa normal; EAS secret kullanıyorsanız sorun değil)."
    );
  }

  const plistRaw = readText("GoogleService-Info.plist");
  if (plistRaw) {
    const bid = extractPlistBundleId(plistRaw);
    if (bid && bid !== EXPECTED_IOS) {
      console.error(
        `[firebase] GoogleService-Info.plist: BUNDLE_ID "${bid}" — beklenen "${EXPECTED_IOS}"`
      );
      errors++;
    } else if (bid) {
      console.log(`[firebase] GoogleService-Info.plist: BUNDLE_ID OK (${EXPECTED_IOS})`);
    } else {
      console.warn("[firebase] GoogleService-Info.plist içinde BUNDLE_ID bulunamadı.");
    }
  } else {
    console.warn(
      "[firebase] GoogleService-Info.plist bulunamadı (yerelde yoksa normal; EAS secret kullanıyorsanız sorun değil)."
    );
  }

  process.exit(errors > 0 ? 1 : 0);
}

main();
