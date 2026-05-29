/**
 * backend-message-audit-report.json → messageToKeyMap satırları + locale parçası.
 * Anahtar: errors.bm<12 hex> (Türkçe slug yok — karakter kaybı olmaz).
 *
 *   node scripts/generate-missing-message-mappings.mjs
 */
import crypto from "crypto";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const REPORT = path.join(ROOT, "scripts", "backend-message-audit-report.json");
const HANDLER = path.join(ROOT, "app", "utils", "errorHandler.ts");

function keyFor(s) {
  const h = crypto.createHash("sha256").update(s, "utf8").digest("hex").slice(0, 12);
  return `errors.bm${h}`;
}

function esc(s) {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

const report = JSON.parse(fs.readFileSync(REPORT, "utf8"));
const missing = report.missingFromMapFull;
const handler = fs.readFileSync(HANDLER, "utf8");

const existingKeys = new Set();
const keyRe =
  /:\s*'(errors\.[^']+|form\.[^']+|auth\.[^']+|common\.[^']+|booking\.[^']+|subscription\.[^']+|moderation\.[^']+|chatMessages\.[^']+|image\.[^']+|filters\.[^']+|favorites\.[^']+|rating\.[^']+|notification\.[^']+|additionalSuccess\.[^']+)'/g;
let m;
while ((m = keyRe.exec(handler)) !== null) existingKeys.add(m[1]);

/** Güvenli yönlendirme: yalnızca projede doğrulanmış anahtarlar */
const redirect = (s) => {
  const t = {
    "Kullanıcı bulunamadı": "errors.userNotFound",
    "Dükkan bulunamadı.": "errors.storeNotFound",
    "Koltuk bulunamadı.": "errors.chairNotFound",
    "Telefon numarası bulunamadı": "errors.userNotFound",
    "Telefon numarası bulunamadı.": "errors.userNotFound",
    "En az bir hizmet girilmelidir": "form.atLeastOneService",
    "Dükkan bulunamadı": "errors.storeNotFound",
  };
  return t[s] ?? null;
};

const needTr = new Map();
const lines = [];

for (const raw of missing) {
  const r = redirect(raw);
  if (r && existingKeys.has(r)) {
    lines.push(`  '${esc(raw)}': '${r}',`);
    continue;
  }
  let k = keyFor(raw);
  let n = 0;
  while (existingKeys.has(k) || needTr.has(k)) {
    n += 1;
    k = `${keyFor(raw)}_${n}`;
  }
  existingKeys.add(k);
  const shortKey = k.replace(/^errors\./, "");
  needTr.set(shortKey, raw);
  lines.push(`  '${esc(raw)}': '${k}',`);
}

fs.writeFileSync(path.join(ROOT, "scripts", "generated-message-to-key-map.txt"), lines.join("\n") + "\n", "utf8");

const enHuman = {
  "Abonelik dönem sonunda iptal edilecek": "Your subscription will cancel at the end of the billing period.",
  "Abonelik yeniden etkinleştirildi": "Subscription has been reactivated.",
  "Abonelik ödemesi tamamlanmamış": "Subscription payment is not complete.",
  "Aktif abonelik bulunamadı": "No active subscription found.",
  "Aktif abonelik yok, lütfen yeniden satın alın": "No active subscription. Please purchase again.",
  "FCM token is required": "FCM token is required.",
  "PAYTR notification failed: bad hash": "Payment notification verification failed.",
  "PAYTR notification failed: config missing": "Payment notification could not be processed (configuration).",
  "empty_message": "Message cannot be empty.",
  "ai_unavailable": "Assistant is temporarily unavailable.",
  "ai_rate_limit": "Too many requests. Please try again later.",
  "ai_error": "Assistant request failed.",
  "ai_invalid_response": "Assistant returned an invalid response.",
  "whisper_unavailable": "Speech service is unavailable.",
  "whisper_rate_limit": "Speech request limit reached. Try again later.",
  "whisper_failed": "Speech recognition failed.",
  "transcription_empty": "No speech detected in the audio.",
  "whisper_timeout": "Speech recognition timed out.",
  "transactionId gerekli": "Transaction ID is required.",
  "productId ve purchaseToken gerekli": "productId and purchaseToken are required.",
  "productId yok": "productId is missing.",
  "bundleId yok": "bundleId is missing.",
  "Geçersiz veya bulunamayan işlem": "Invalid or unknown transaction.",
  "İşlem bilgisi okunamadı": "Transaction details could not be read.",
  "Bu plan hesap türünüzle uyumlu değil": "This plan is not compatible with your account type.",
  "Google Play doğrulaması başarısız": "Google Play verification failed.",
  "Sunucu yapılandırması eksik": "Server configuration is incomplete.",
  "Ses dosyası boş.": "Audio file is empty.",
  "Ses çevirme servisi şu anda kullanılamıyor.": "Transcription service is currently unavailable.",
  "Mesaj boş olamaz.": "Message cannot be empty.",
  "Geçerli mağaza kimliği bulunamadı.": "No valid store identifier was found.",
  "Geçersiz ay sayısı": "Invalid month count.",
  "Geçersiz plan": "Invalid plan.",
  "Ödeme linki SMS olarak gönderildi.": "Payment link was sent by SMS.",
  "Telefon numarası bulunamadı": "Phone number not found.",
  "Telefon numarası bulunamadı.": "Phone number not found.",
};

const deHuman = {
  "Abonelik dönem sonunda iptal edilecek": "Das Abonnement wird zum Ende der Laufzeit gekündigt.",
  "Abonelik yeniden etkinleştirildi": "Abonnement wurde reaktiviert.",
  "Abonelik ödemesi tamamlanmamış": "Abonnementzahlung ist unvollständig.",
  "Aktif abonelik bulunamadı": "Kein aktives Abonnement gefunden.",
  "Aktif abonelik yok, lütfen yeniden satın alın": "Kein aktives Abonnement. Bitte erneut kaufen.",
  "FCM token is required": "FCM-Token ist erforderlich.",
  "PAYTR notification failed: bad hash": "Zahlungsbenachrichtigung konnte nicht verifiziert werden.",
  "PAYTR notification failed: config missing": "Zahlungsbenachrichtigung nicht verarbeitbar (Konfiguration).",
  "empty_message": "Nachricht darf nicht leer sein.",
  "ai_unavailable": "Assistent vorübergehend nicht verfügbar.",
  "ai_rate_limit": "Zu viele Anfragen. Bitte später erneut versuchen.",
  "ai_error": "Assistenten-Anfrage fehlgeschlagen.",
  "ai_invalid_response": "Ungültige Assistenten-Antwort.",
  "whisper_unavailable": "Sprachdienst nicht verfügbar.",
  "whisper_rate_limit": "Sprachlimit erreicht. Bitte später erneut.",
  "whisper_failed": "Spracherkennung fehlgeschlagen.",
  "transcription_empty": "Keine Sprache im Audio erkannt.",
  "whisper_timeout": "Spracherkennung: Zeitüberschreitung.",
  "transactionId gerekli": "transactionId ist erforderlich.",
  "productId ve purchaseToken gerekli": "productId und purchaseToken sind erforderlich.",
  "productId yok": "productId fehlt.",
  "bundleId yok": "bundleId fehlt.",
  "Geçersiz veya bulunamayan işlem": "Ungültige oder unbekannte Transaktion.",
  "İşlem bilgisi okunamadı": "Transaktionsdetails konnten nicht gelesen werden.",
  "Bu plan hesap türünüzle uyumlu değil": "Dieser Plan passt nicht zu Ihrem Kontotyp.",
  "Google Play doğrulaması başarısız": "Google-Play-Verifizierung fehlgeschlagen.",
  "Sunucu yapılandırması eksik": "Serverkonfiguration unvollständig.",
  "Ses dosyası boş.": "Audiodatei ist leer.",
  "Ses çevirme servisi şu anda kullanılamıyor.": "Transkriptionsdienst derzeit nicht verfügbar.",
  "Mesaj boş olamaz.": "Nachricht darf nicht leer sein.",
  "Geçerli mağaza kimliği bulunamadı.": "Keine gültige Geschäfts-ID gefunden.",
  "Geçersiz ay sayısı": "Ungültige Monatsanzahl.",
  "Geçersiz plan": "Ungültiger Plan.",
  "Ödeme linki SMS olarak gönderildi.": "Zahlungslink per SMS gesendet.",
  "Telefon numarası bulunamadı": "Telefonnummer nicht gefunden.",
  "Telefon numarası bulunamadı.": "Telefonnummer nicht gefunden.",
};

const arHuman = {
  "Abonelik dönem sonunda iptal edilecek": "سيتم إلغاء الاشتراك في نهاية الفترة.",
  "Abonelik yeniden etkinleştirildi": "تمت إعادة تفعيل الاشتراك.",
  "Abonelik ödemesi tamamlanmamış": "دفع الاشتراك غير مكتمل.",
  "Aktif abonelik bulunamadı": "لا يوجد اشتراك نشط.",
  "Aktif abonelik yok, lütfen yeniden satın alın": "لا يوجد اشتراك نشط. يرجى الشراء مرة أخرى.",
  "FCM token is required": "رمز FCM مطلوب.",
  "PAYTR notification failed: bad hash": "فشل التحقق من إشعار الدفع.",
  "PAYTR notification failed: config missing": "تعذر معالجة إشعار الدفع (الإعدادات).",
  "empty_message": "لا يمكن أن تكون الرسالة فارغة.",
  "ai_unavailable": "المساعد غير متاح مؤقتاً.",
  "ai_rate_limit": "طلبات كثيرة. حاول لاحقاً.",
  "ai_error": "فشل طلب المساعد.",
  "ai_invalid_response": "استجابة غير صالحة من المساعد.",
  "whisper_unavailable": "خدمة الصوت غير متاحة.",
  "whisper_rate_limit": "تم تجاوز حد الطلبات. حاول لاحقاً.",
  "whisper_failed": "فشل التعرف على الصوت.",
  "transcription_empty": "لم يُكتشف كلام في الملف الصوتي.",
  "whisper_timeout": "انتهت مهلة التعرف على الصوت.",
  "transactionId gerekli": "معرف المعاملة مطلوب.",
  "productId ve purchaseToken gerekli": "productId و purchaseToken مطلوبان.",
  "productId yok": "productId مفقود.",
  "bundleId yok": "bundleId مفقود.",
  "Geçersiz veya bulunamayan işlem": "معاملة غير صالحة أو غير معروفة.",
  "İşlem bilgisi okunamadı": "تعذر قراءة تفاصيل المعاملة.",
  "Bu plan hesap türünüzle uyumlu değil": "هذه الخطة غير متوافقة مع نوع حسابك.",
  "Google Play doğrulaması başarısız": "فشل التحقق من Google Play.",
  "Sunucu yapılandırması eksik": "إعدادات الخادم غير مكتملة.",
  "Ses dosyası boş.": "ملف الصوت فارغ.",
  "Ses çevirme servisi şu anda kullanılamıyor.": "خدمة النسخ غير متاحة حالياً.",
  "Mesaj boş olamaz.": "لا يمكن أن تكون الرسالة فارغة.",
  "Geçerli mağaza kimliği bulunamadı.": "لم يُعثر على معرف متجر صالح.",
  "Geçersiz ay sayısı": "عدد أشهر غير صالح.",
  "Geçersiz plan": "خطة غير صالحة.",
  "Ödeme linki SMS olarak gönderildi.": "تم إرسال رابط الدفع عبر الرسائل.",
  "Telefon numarası bulunamadı": "لم يُعثر على رقم الهاتف.",
  "Telefon numarası bulunamadı.": "لم يُعثر على رقم الهاتف.",
};

const tr = {};
const en = {};
const de = {};
const ar = {};
for (const [shortKey, trText] of needTr) {
  tr[shortKey] = trText;
  en[shortKey] = enHuman[trText] ?? trText;
  de[shortKey] = deHuman[trText] ?? trText;
  ar[shortKey] = arHuman[trText] ?? trText;
}

fs.writeFileSync(
  path.join(ROOT, "scripts", "generated-errors-locale-fragment.json"),
  JSON.stringify({ errors: { tr, en, de, ar } }, null, 2),
  "utf8",
);

console.log(`generated-message-to-key-map.txt: ${lines.length} lines`);
console.log(`New bm* keys: ${needTr.size}`);
console.log("generated-errors-locale-fragment.json updated");
