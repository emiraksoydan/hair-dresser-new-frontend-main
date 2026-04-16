/**
 * Legal document constants for KVKK, Terms of Service, and Privacy Policy
 * Texts are stored here (not in i18n) to keep translation files manageable
 */

import type { Language } from '../hook/useLanguage';

export type LegalDocumentType = 'kvkk' | 'terms' | 'privacy' | 'consent';

/** Mağaza / KVKK metinlerinde veri sorumlusu unvanı */
export const COMPANY_LEGAL_NAME =
  'YAVUZAN TEKNOLOJİ VE TİCARET LİMİTED ŞİRKETİ';

/** KVKK ve gizlilik başvuruları */
export const KVKK_EMAIL = 'yavuzanteknoloji@gmail.com';

/** Mağaza / web üzerinde kullanılan herkese açık site adresi */
export const COMPANY_PUBLIC_WEBSITE = 'https://yavuzan.com';

export interface LegalDocument {
  title: string;
  content: string;
}

type LegalTextsMap = Record<Language, Record<LegalDocumentType, LegalDocument>>;

const legalTexts: LegalTextsMap = {
  tr: {
    kvkk: {
      title: 'KVKK Aydınlatma Metni',
      content: `6698 SAYILI KİŞİSEL VERİLERİN KORUNMASI KANUNU KAPSAMINDA AYDINLATMA METNİ

Veri Sorumlusu
${COMPANY_LEGAL_NAME}

İşbu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, veri sorumlusu sıfatıyla sizleri bilgilendirmek amacıyla hazırlanmıştır.

Toplanan Kişisel Veriler
Uygulamamız aracılığıyla aşağıdaki kişisel verileriniz, kullandığınız rol ve özelliklere bağlı olarak toplanmakta ve işlenmektedir:
• Kimlik Bilgileri: Ad, soyad; yasal zorunluluk veya kayıt/doğrulama süreçlerinde toplanması halinde T.C. kimlik numarası, vergi kimlik numarası veya ticari sicil numarası gibi tanımlayıcılar
• İletişim Bilgileri: Telefon numarası; işletme kaydı veya iletişim için talep edilen hallerde açık adres (metin)
• Konum Bilgileri: Canlı konum verisi (yakındaki berber/kuaförleri göstermek ve serbest berber rolünde güncel yakınlık sunmak için); işletme kaydında harita ile ilişkilendirilen koordinatlar
• Görsel Veriler: Profil fotoğrafı, işletme fotoğrafları, sertifika görselleri; işletme kayıtlarında vergi veya benzeri belge görselleri (görsel üzerinde yer alan kimlik veya vergi bilgileri dahil, işlendiği ölçüde)
• Kayıt ve İşletme Profili Verileri: İşletme adı/unvanı, dükkan numarası, çalışma saatleri, hizmet ve fiyat tanımları, koltuk ve manuel berber kayıtları (içerdikleri ölçüde kişisel veri)
• Hizmet Verileri: Randevu geçmişi; tarafların onayı, bekleme veya ret süreçleri, iptal ve durum kayıtları; verilen/alınan hizmetler; değerlendirmeler ve puanlar; şikâyet, engelleme ve talep kayıtları
• Ödeme ve Abonelikle İlgili Veriler: Ödeme başlatma, işlem durumu ve abonelik süresi gibi kayıtlar (kart bilgileri uygulama kodumuzda işlenmez; PayTR tarafında işlenir)
• İşlem Güvenliği: Cihaz bilgileri, oturum verileri, teknik günlükler

Kişisel Verilerin İşlenme Amaçları
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
• Üyelik hesabınızın oluşturulması ve yönetilmesi
• Randevu oluşturma, takip ve yönetim hizmetlerinin sunulması (farklı randevu senaryoları ve çok taraflı onay süreçleri dahil)
• Konum tabanlı berber/kuaför eşleştirme hizmetinin sağlanması
• Hizmet kalitesinin değerlendirilmesi ve iyileştirilmesi
• Kullanıcılar arası iletişimin sağlanması (mesajlaşma)
• Bildirim gönderilmesi (randevu hatırlatma, durum güncellemeleri)
• Faturalandırma ve diğer mali işlemler (ücret tahsilatı ve abonelik yönetimi; ödeme hizmeti sağlayıcısı PayTR aracılığıyla işlem ve mutabakat; muhasebe, kayıt tutma ve vergi mevzuatından doğan yükümlülükler dahil)
• Hukuki yükümlülüklerin yerine getirilmesi

Hukuki Dayanak
Kişisel verileriniz; açık rızanız, sözleşmenin ifası, hukuki yükümlülük ve meşru menfaat hukuki sebeplerine dayanılarak işlenmektedir.

Kişisel Verilerin Aktarılması
Kişisel verileriniz, hizmetin sunulması amacıyla aşağıdaki alıcı gruplarına aktarılabilir:
• SMS doğrulama hizmeti sağlayıcıları (NetGSM)
• Ödeme hizmeti sağlayıcıları (PayTR — ödeme ve abonelik işlemleri)
• Yapay zekâ, sesin metne dönüştürülmesi ve içerik güvenliği hizmeti sağlayıcıları (ör. Google Gemini, Groq, Microsoft Azure — hizmetin ifası için; yurt dışına aktarım söz konusu olabilir)
• Bulut altyapı hizmeti sağlayıcıları
• Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşları

Veri Saklama Süresi
Kişisel verileriniz, işlenme amaçlarının gerektirdiği süre boyunca ve yasal yükümlülükler kapsamında saklanmaktadır. Uygulama üzerinden hesap silme talebinizde sunucu tarafında ad, soyad ve telefon numarası gibi doğrudan tanımlayıcı veriler derhal anonimleştirilir, hesap pasifleştirilir ve yenileme oturumları (refresh token) iptal edilir. Veritabanında teknik kayıt kimliği, yasal yükümlülükler veya geçmiş hizmet kayıtları (ör. randevu ilişkileri) nedeniyle tutulabilir. Yasal saklama süreleri saklıdır.

KVKK Madde 11 Kapsamındaki Haklarınız
KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:
• Kişisel verilerinizin işlenip işlenmediğini öğrenme
• Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme
• Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme
• Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme
• Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme
• KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme
• Yapılan işlemlerin, kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme
• İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme
• Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme

Başvuru ve İletişim
Yukarıda belirtilen haklarınızı kullanmak için ${KVKK_EMAIL} e-posta adresi üzerinden veya uygulama içi destek kanalı aracılığıyla bizimle iletişime geçebilirsiniz. KVKK kapsamındaki tüm başvurularınızı bu e-posta adresine iletebilirsiniz.`,
    },
    consent: {
      title: 'Açık Rıza Metni',
      content: `KİŞİSEL VERİLERİN İŞLENMESİNE İLİŞKİN AÇIK RIZA METNİ

6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, kişisel verilerimin işlenmesine ilişkin aşağıdaki hususlarda bilgilendirildim:

İşlenecek Kişisel Veriler
• Kimlik bilgilerim (ad, soyad; yasal veya kayıt süreçlerinde talep edilmesi halinde T.C. kimlik numarası, vergi kimlik numarası veya benzeri tanımlayıcılar)
• İletişim bilgilerim (telefon numarası; işletme veya talep edilen hallerde açık adres)
• Konum bilgilerim (yakındaki hizmet sağlayıcıları ve serbest berber konum güncellemesi için; işletme kaydında koordinatlar)
• Görsel verilerim (profil fotoğrafı, işletme fotoğrafları, sertifika ve vergi/levha benzeri belge görselleri)
• Kayıt ve işletme profil verilerim (işletme adı/unvanı, dükkan numarası, çalışma saatleri, hizmet ve fiyat tanımları, koltuk/manuel berber kayıtları — kişisel veri içermesi halinde)
• Hizmet verilerim (randevu geçmişi, onay/bekleme/iptal kayıtları, değerlendirmeler, mesajlaşma içerikleri, şikâyet/engelleme/talep kayıtları)
• Ödeme ve abonelikle ilgili verilerim (işlem ve abonelik durumu; kart bilgisi uygulama kodunda işlenmez)

Verilerin İşlenme Amaçları
Kişisel verilerimin; üyelik hesabımın oluşturulması ve yönetilmesi, randevu hizmetlerinin sunulması (farklı randevu senaryoları ve çok taraflı onay süreçleri dahil), konum tabanlı hizmet eşleştirmesi, kullanıcılar arası iletişim, bildirim gönderimi, hizmet kalitesinin iyileştirilmesi, faturalandırma ve diğer mali işlemler (ücret tahsilatı ve abonelik yönetimi, ödeme sağlayıcısı PayTR aracılığıyla işlem takibi, muhasebe ve vergi mevzuatından doğan yükümlülükler dahil) amacıyla işleneceğini,

Verilerin Aktarılması
Kişisel verilerimin; SMS doğrulama hizmeti sağlayıcıları (NetGSM), ödeme hizmeti sağlayıcıları (PayTR), yapay zekâ/ses-metin/içerik güvenliği hizmeti sağlayıcıları (ör. Google Gemini, Groq, Microsoft Azure), bulut altyapı hizmeti sağlayıcıları ve yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarılabileceğini,

Veri Saklama
Hesabım aktifken ve yasal yükümlülükler kapsamında kişisel verilerimin saklanacağını; uygulama üzerinden hesap silme talebimde sunucuda ad, soyad ve telefon gibi doğrudan tanımlayıcıların derhal anonimleştirildiğini, hesabın pasifleştirildiğini ve yenileme oturumlarının iptal edildiğini; teknik kimlik ve ilişkisel kayıtların yasal saklama süreleri saklı kalmak üzere tutulabileceğini,

Haklarım
KVKK'nın 11. maddesi kapsamında; kişisel verilerimin işlenip işlenmediğini öğrenme, bilgi talep etme, düzeltilmesini isteme, silinmesini veya yok edilmesini isteme ve kanuna aykırı işleme sebebiyle zararın giderilmesini talep etme haklarıma sahip olduğumu,

bilgilendirme metnini okuduğumu ve anladığımı beyan ederek, yukarıda belirtilen kişisel verilerimin belirtilen amaçlarla işlenmesine, saklanmasına ve aktarılmasına özgür iradem ile açık rıza veriyorum.

Başvuru ve İletişim
KVKK kapsamındaki tüm başvurularınızı ${KVKK_EMAIL} e-posta adresine iletebilirsiniz.`,
    },
    terms: {
      title: 'Kullanım Koşulları',
      content: `KULLANIM KOŞULLARI

Son Güncelleme: Şubat 2026

1. Hizmet Tanımı
Bu uygulama, berber, kuaför ve güzellik uzmanları ile müşterileri bir araya getiren bir randevu yönetim platformudur. Uygulama üzerinden randevu oluşturabilir, hizmet sağlayıcıları değerlendirebilir ve mesajlaşabilirsiniz.

2. Üyelik ve Hesap
• Uygulamayı kullanabilmek için telefon numaranız ile kayıt olmanız gerekmektedir.
• Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olması sizin sorumluluğunuzdadır.
• Hesabınızın güvenliğinden siz sorumlusunuz. Hesabınızla yapılan tüm işlemlerden siz sorumlu tutulursunuz.
• Her kullanıcı yalnızca bir hesap oluşturabilir.

3. Kullanıcı Türleri
• Müşteri: Randevu alabilir, hizmet sağlayıcıları değerlendirebilir.
• Serbest Berber/Kuaför: Bireysel olarak hizmet sunabilir, randevu yönetebilir.
• İşletme (Dükkan): İşletme paneli oluşturabilir, koltuk ve berber yönetimi yapabilir.

4. Randevu Kuralları
• Randevular, belirtilen saat ve tarihte geçerlidir.
• Randevu iptal işlemleri, randevu saatinden önce yapılmalıdır.
• Tekrarlayan iptal veya randevuya gelmeme durumlarında hesabınız kısıtlanabilir.
• Hizmet sağlayıcılar, uygun gördükleri durumlarda randevuları reddedebilir.

5. Değerlendirme ve Yorumlar
• Değerlendirmeleriniz gerçek deneyimlerinize dayanmalıdır.
• Hakaret, küfür, tehdit içeren yorumlar yasaktır.
• Sahte veya yanıltıcı değerlendirmeler yapılması durumunda hesabınız askıya alınabilir.

6. Yasaklanan Davranışlar
• Uygulamayı kötüye kullanmak veya başkalarının kullanımını engellemek
• Sahte hesap oluşturmak veya başkasının kimliğini kullanmak
• Spam mesaj göndermek veya rahatsız edici davranışlarda bulunmak
• Uygulamayı ticari amaçla izinsiz kullanmak
• Uygulamanın güvenlik mekanizmalarını atlatmaya çalışmak

7. Hizmet Sağlayıcıların Sorumlulukları
• Hizmet sağlayıcılar, sundukları hizmetlerin kalitesinden ve güvenliğinden sorumludur.
• İşletme bilgilerinin (çalışma saatleri, fiyatlar, hizmetler) güncel tutulması hizmet sağlayıcının sorumluluğundadır.
• Geçerli sertifika ve izin belgelerinin bulunması yasal bir zorunluluktur.

8. Sorumluluk Sınırlaması
• Uygulama, bir aracı platform olarak hizmet vermektedir. Hizmet sağlayıcılar ile müşteriler arasındaki ilişkiden doğan uyuşmazlıklardan doğrudan sorumlu değildir.
• Uygulama, hizmetin kesintisiz veya hatasız olacağını garanti etmez.
• Teknik arızalar, bakım çalışmaları veya mücbir sebeplerden kaynaklanan kesintilerden sorumluluk kabul edilmez.

9. Fikri Mülkiyet
Uygulamadaki tüm içerik, tasarım, logo ve yazılım hakları saklıdır. İzinsiz kopyalama, çoğaltma veya dağıtma yasaktır.

10. Değişiklikler
Bu kullanım koşulları önceden bildirim yapılarak güncellenebilir. Güncellemeler sonrasında uygulamayı kullanmaya devam etmeniz, değişiklikleri kabul ettiğiniz anlamına gelir.

11. Uygulanacak Hukuk
Bu koşullar Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda Türkiye Cumhuriyeti mahkemeleri yetkilidir.`,
    },
    privacy: {
      title: 'Gizlilik Politikası',
      content: `GİZLİLİK POLİTİKASI

Son güncelleme: 16 Nisan 2026

Veri sorumlusu
${COMPANY_LEGAL_NAME}
Uygulama adı: Gümüş Makas
Android paket adı: com.hairdresser.app — iOS bundle: com.hairdresser.app

Gizlilik ve KVKK başvuruları: ${KVKK_EMAIL}

Bu politika, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") ve ilgili mevzuat çerçevesinde bilgilendirme amaçlıdır. KVKK kapsamındaki ayrıntılı aydınlatma ve açık rıza metinleri uygulama içinde de sunulmaktadır.

1. Kapsam
Bu metin, Gümüş Makas mobil uygulamasını kullanırken kişisel verilerinizin nasıl işlendiğini açıklar. Hizmet; berber, kuaför ve güzellik hizmeti sunanlar ile müşterileri buluşturan randevu, konum, iletişim ve bildirim özellikleri sunar.

2. Hesap silme ve kişisel veri talepleri (mağaza şeffaflığı)
Bu bölüm; Google Play ve benzeri uygulama mağazalarının şeffaflık beklentileriyle uyumlu olarak hesap kapatma ve kişisel veri taleplerinizi nasıl iletebileceğinizi özetler.

2.1 Uygulama içinden hesap silme (müşteri, serbest berber ve işletme hesapları)
1) Gümüş Makas uygulamasında oturum açın.
2) Alt menüden Profil ekranına gidin.
3) "Hesap sil" (veya aynı anlama gelen) seçeneğine dokunun.
4) Onaylayın; kayıtlı telefon numaranıza SMS ile tek kullanımlık doğrulama kodu (OTP) gönderilir.
5) Kodu girerek işlemi tamamlayın. Ardından hesabınız pasifleştirilir; doğrudan tanımlayıcılar anonimleştirilir ve oturum yenileme belirteçleri iptal edilir (ayrıntılı sonuçlar için bölüm 8).

2.2 Uygulamaya erişemediğiniz veya ek talepler
Hesap silme veya kişisel verilerinizle ilgili her türlü talebi ${KVKK_EMAIL} adresine iletebilirsiniz. E-postanızda kayıtlı telefon numaranızı ve talebinizi (ör. hesap silme; belirli verilerin düzeltilmesi veya silinmesi) açıkça yazın.

2.3 Hesap silmeden veri talepleri
KVKK md. 11 kapsamında; hesabınızı kapatmadan da kişisel verilerinizin düzeltilmesini veya şartlarında silinmesini/yok edilmesini ${KVKK_EMAIL} veya uygulama içi destek kanalı üzerinden talep edebilirsiniz.

2.4 Silinen ve saklanan veriler (özet)
Hesap silme sonrası teknik sonuçların özeti bölüm 8 (Saklama süreleri) ile aynıdır.

3. İşlenen veri kategorileri
Aşağıdakiler, kullandığınız özelliklere ve verdiğiniz izinlere bağlı olarak işlenebilir:

Kimlik ve hesap: ad, soyad, telefon numarası, kullanıcı türü (müşteri, serbest berber, işletme); yasal zorunluluk veya kayıt/doğrulama süreçlerinde toplanması halinde T.C. kimlik numarası, vergi kimlik numarası veya ticari sicil numarası gibi tanımlayıcılar.

Adres ve yer (metin): işletme kaydında girilen adres açıklaması; harita üzerinden kaydedilen koordinatlar (enlem/boylam); kullanıcıların sohbet veya profil kapsamında paylaştığı adres veya konum içeriği.

Kayıt ve işletme operasyon verileri: işletme adı/unvanı, dükkan numarası, çalışma saatleri, sunduğunuz hizmet ve fiyat tanımları, koltuk ve manuel berber kayıtları; bu kayıtlar hizmet sunucu unvanı veya iletişim bilgisi gibi kişisel veri öğeleri içerebilir.

Kimlik doğrulama: telefonunuza SMS ile gönderilen tek kullanımlık doğrulama kodu (OTP) sürecinde işlenen veriler.

Oturum ve güvenlik: oturumun sürdürülmesi için kullanılan erişim belirteçleri (ör. JWT); mümkün olduğunda cihazda güvenli depolama (ör. iOS Keychain / Android güvenli depolama), aksi halde cihaz içi depolama; teknik günlükler, IP adresi, bağlantı zamanı (sunucu güvenliği ve destek için).

Konum:
• Ön planda: yakın hizmet sağlayıcıları, harita, adres tahmini (ters jeokodlama), sohbette konum paylaşımı, yapay zekâ asistanında (izin verirseniz) bağlamsal yanıtlar.
• Arka planda: yalnızca serbest berber rolündeki kullanıcılar için, kullanıcı bu özelliği etkinleştirip ilgili sistem izinlerini açıkça verdiğinde; uygulama arka plandayken belirli sıklık ve mesafe koşullarıyla toplanan konumun sunucularımıza iletilmesi ve müşterilere güncel yakınlık bilgisinin sunulması.
• Arka plan konum verisi reklamcılık, profil çıkarma veya veri satışı amacıyla kullanılmaz ve bu amaçlarla üçüncü taraflarla paylaşılmaz.

Görsel ve dosya: profil ve işletme fotoğrafları, sertifika görselleri, işletme kayıtlarında vergi veya benzeri belge görselleri (görsel üzerinde yer alan kimlik veya vergi bilgileri dahil, işlendiği ölçüde); sohbette paylaşılan görsel veya dosyalar; galeri veya kamera ile eklenen içerikler.

Hizmet verileri: randevular; tarafların onayı, bekleme veya ret süreçleri, zaman aşımı ve durum geçmişi; iptal ve tamamlanma kayıtları; koltuk veya manuel berber ataması; fiyatlandırma, kazanç özetleri (ilgili paneller), değerlendirme ve yorumlar, şikâyet, engelleme ve talep kayıtları (farklı randevu senaryoları kapsamında oluşan kayıtlar dahil).

İletişim içeriği: uygulama içi mesajların metin ve ekleri; gerçek zamanlı bildirim ve mesajlaşma trafiği SignalR protokolü üzerinden şirket sunucularınıza bağlanır.

Push bildirimleri: Firebase Cloud Messaging (FCM) cihaz kayıt belirteci ve platform bilgisinin sunucuya kaydı; randevu ve durum bildirimleri.

Yapay zekâ asistanı (sesli): mikrofon izniyle kısa süreli ses kaydı; kaydın sunucularımıza yüklenerek metne dönüştürülmesi; metnin (ve izin verirseniz anlık konumun) yapay zekâ uç noktasına gönderilmesi.

Ödeme (abonelik): ödeme işlemi PayTR güvenli ödeme sayfasında, uygulama içi WebView ile açılır; kart bilgileri uygulama kodumuzda doğrudan işlenmez. Abonelik süresi, ödeme işlem durumu ve mutabakat için gerekli teknik/iş kayıtları tarafımızca tutulabilir.

Haritalar: Google Haritalar (Maps SDK) ile harita ve konum görselleştirmesi.

Tercihler: dil ve tema gibi ayarlar cihaz içi depolamada tutulabilir.

Kazanç dışa aktarma: kazanç verilerine dayalı PDF veya CSV üretimi cihazınızda yapılabilir; paylaşım ekranıyla seçtiğiniz üçüncü taraf uygulamalara aktarılır (bu aktarım o uygulamaların politikalarına tabidir).

4. İşleme amaçları
Hesap ve kimlik doğrulama; randevu yönetimi; konuma dayalı eşleştirme; serbest berber konumunun güncellenmesi (izin ve rol uygunsa); mesajlaşma ve bildirimler; ödeme başlatma, ücret tahsilatı ve abonelik yönetimi; faturalandırma, muhasebe ve ödeme mutabakatı; vergi ve ilgili mevzuattan doğan saklama yükümlülükleri; dolandırıcılık önleme ve güvenlik; içerik moderasyonu; hizmeti geliştirme; yasal yükümlülükler ve resmi talepler.

5. Hukuki sebepler
KVKK md. 5 kapsamında özetle: sözleşmenin kurulması veya ifası, açık rıza (gerekli hallerde), hukuki yükümlülük, meşru menfaat (ör. güvenlik), kanunda açıkça öngörülme.

6. Üçüncü taraflar ve aktarım
Hizmetin ifası için veriler sınırlı olarak şunlarla paylaşılabilir veya onların altyapısında işlenebilir:
• NetGSM — SMS ile OTP gönderimi
• Google Firebase — push bildirimleri (FCM)
• Google Gemini — yapay zekâ asistanı metin işleme (sunucularımız üzerinden)
• Groq — ses kaydının metne dönüştürülmesi
• Microsoft Azure (Content Safety) — metin ve görsel içerik güvenliği / moderasyon
• Google Haritalar — harita hizmeti
• PayTR — ödeme işlemi
• Bulut / barındırma — API ve veri depolama

Yurt dışına aktarım söz konusu olduğunda KVKK ve ilgili mevzuata uygun teknik ve hukuki tedbirler uygulanır.

7. Veri güvenliği
Veri aktarımında HTTPS/TLS; erişim kontrolleri; hassas verilerin korunması için teknik ve idari tedbirler uygulanır. Hiçbir sistem mutlak güvenli değildir; şüpheli durumda ${KVKK_EMAIL} üzerinden bildirimde bulunabilirsiniz.

8. Saklama süreleri
Hesabınız aktifken ve işleme amaçları için gerekli süre boyunca veriler işlenir.
Uygulama içi "hesap sil" akışında sunucu tarafında ad, soyad ve telefon gibi doğrudan tanımlayıcı kişisel veriler anonimleştirilir, hesap pasif yapılır ve oturum yenileme belirteçleri iptal edilir.
Veritabanında kullanıcıya ait teknik kimlik (GUID vb.) yasal yükümlülükler veya geçmiş randevu/sohbet gibi ilişkisel kayıtlar nedeniyle kalabilir; bu durumda içerik mümkün olduğunca anonim veya işlevsiz tanımlayıcılarla tutulur.
Yedekleme, muhasebe veya resmi talep gibi nedenlerle bazı veriler yasal süre boyunca saklanabilir.
Arka plan konum verisi yalnızca belirtilen hizmet amacı için ve gerekli olduğu süre kadar işlenir; kullanıcı izinlerini kapattığında arka plan konum güncellemeleri durdurulur.

9. Haklarınız (KVKK md. 11)
İşlenip işlenmediğini öğrenme, bilgi talep etme, amaca uygun kullanılıp kullanılmadığını öğrenme, aktarılan üçüncü kişileri bilme, düzeltme, şartlarında silme veya yok etme, aktarılanlara bildirim talep etme, otomatik işlemeye itiraz, zarar halinde tazminat talep etme.

Başvuru: ${KVKK_EMAIL} veya uygulama içi destek kanalı.

10. İzinlerin yönetimi (kullanıcı kontrolü)
Konum, bildirim, mikrofon gibi izinleri cihazınızın işletim sistemi ayarlarından istediğiniz zaman değiştirebilir veya kapatabilirsiniz.
Arka plan konum izni kapatıldığında, arka planda konum güncellemesi yapılmaz.
İzinlerin kapatılması bazı özelliklerin çalışmasını sınırlayabilir (ör. yakındaki hizmet sağlayıcıları listeleme, canlı konum güncellemesi).

11. Çerezler ve mobil izleme
Mobil uygulama geleneksel web çerezleri kullanmaz; cihaz tanımlayıcıları ve oturum bilgileri hizmetin çalışması için kullanılabilir.

12. Çocuklar ve mağaza hedefi
Uygulama 18 yaş altı bireylere yönelik değildir; bilerek 18 yaş altından veri toplamıyoruz.

13. Politika güncellemeleri
Güncellemeler yapılabilir; önemli değişiklikler uygulama içi veya mağaza açıklaması ile duyurulabilir.

14. Üçüncü taraf bağlantılar
PayTR ödeme sayfası, harici web içerikleri ve paylaşım ile seçtiğiniz uygulamalar kendi gizlilik politikalarına tabidir.`,
    },
  },

  en: {
    kvkk: {
      title: 'KVKK Disclosure Text',
      content: `DISCLOSURE TEXT UNDER THE LAW ON PROTECTION OF PERSONAL DATA (KVKK) NO. 6698

Data Controller
${COMPANY_LEGAL_NAME}

This disclosure text has been prepared to inform you in the capacity of data controller, within the scope of the Law on Protection of Personal Data No. 6698 ("KVKK").

Personal Data Collected
Depending on your role and features used, the following personal data may be collected and processed through our application:
• Identity Information: First name, last name; where collected under legal obligations or registration/verification flows, Turkish ID number (TCKN), tax ID (VKN), or similar identifiers (e.g. trade registry number)
• Contact Information: Phone number; where required, postal address in text form (e.g. business registration)
• Location Information: Live location (to show nearby providers and, for freelance barbers, proximity updates); coordinates linked to a business listing on the map
• Visual Data: Profile photos, business photos, certificate images; tax or similar document images for business accounts (including identity or tax details visible on the image, to the extent processed)
• Registration and Business Profile Data: Business name/title, shop number, working hours, service and price definitions, chair and manual barber records (personal data only to the extent contained)
• Service Data: Appointment history; approval, pending, or rejection flows; cancellations and status; services provided/received; reviews and ratings; complaints, blocks, and requests
• Payment and Subscription-Related Data: Payment initiation, transaction status, subscription period, and similar records (card data is not processed in our app code; processed by PayTR)
• Transaction Security: Device information, session data, technical logs

Purposes of Processing
Your personal data is processed for the following purposes:
• Creation and management of your membership account
• Providing appointment creation, tracking and management services (including multi-party approval scenarios)
• Providing location-based barber/hairdresser matching service
• Evaluating and improving service quality
• Enabling communication between users (messaging)
• Sending notifications (appointment reminders, status updates)
• Invoicing, fee collection, and subscription management; transaction tracking and reconciliation via the payment provider (PayTR)
• Accounting, record-keeping, and fulfilling tax-related obligations
• Fulfilling legal obligations

Legal Basis
Your personal data is processed based on your explicit consent, performance of a contract, legal obligations, and legitimate interests.

Transfer of Personal Data
Your personal data may be transferred to the following recipient groups for the purpose of providing services:
• SMS verification service providers (NetGSM)
• Payment service providers (PayTR — payments and subscriptions)
• AI, speech-to-text, and content-safety service providers (e.g. Google Gemini, Groq, Microsoft Azure — for service delivery; transfers abroad may occur)
• Cloud infrastructure service providers
• Authorized public institutions and organizations when legally required

Data Retention Period
Your personal data is stored for the duration required by the processing purposes and within the scope of legal obligations. When you delete your account via the app, direct identifiers on the server (name, phone) are anonymized immediately, the account is deactivated, and refresh tokens are revoked. A technical user identifier may remain for legal obligations or relational records (e.g. appointments). Some data may be retained for legal periods (backups, accounting, official requests).

Your Rights Under KVKK Article 11
Under Article 11 of KVKK, you have the following rights:
• To learn whether your personal data is being processed
• To request information about the processing of your personal data
• To learn the purpose of processing your personal data and whether they are used in accordance with their purpose
• To know the third parties to whom your personal data is transferred domestically or abroad
• To request correction of your personal data if it has been processed incompletely or incorrectly
• To request deletion or destruction of your personal data under the conditions set forth in Article 7 of KVKK
• To request notification of the operations carried out to third parties to whom your personal data has been transferred
• To object to the emergence of a result against you through the exclusive analysis of processed data via automated systems
• To claim compensation if you suffer damage due to unlawful processing of your personal data

Application and Contact
You can contact us at ${KVKK_EMAIL} or through the in-app support channel to exercise your rights stated above. All KVKK-related applications can be sent to this email address.`,
    },
    consent: {
      title: 'Explicit Consent Text',
      content: `EXPLICIT CONSENT FOR PROCESSING OF PERSONAL DATA

Within the scope of the Law on Protection of Personal Data No. 6698 ("KVKK"), I have been informed about the following matters regarding the processing of my personal data:

Personal Data to Be Processed
• My identity information (first name, last name; TCKN, tax ID, or similar identifiers if required for legal or registration processes)
• My contact information (phone number; postal address where required for business or contact)
• My location information (nearby providers and freelance barber proximity; business listing coordinates)
• My visual data (profile photos, business photos, certificate and tax/ledger-style document images)
• My registration and business profile data (business name/title, shop number, working hours, service and price definitions, chair/manual barber records — if they contain personal data)
• My service data (appointment history, approval/pending/rejection records, reviews, messaging content, complaints/blocks/requests)
• My payment and subscription-related data (transaction and subscription status; card data not processed in app code)

Purposes of Processing
My personal data will be processed for the purposes of creating and managing my membership account, providing appointment services (including different appointment scenarios and multi-party approvals), location-based service matching, communication between users, sending notifications, improving service quality, invoicing and fee collection, subscription management, transaction tracking via PayTR, and fulfilling accounting and tax-related obligations.

Transfer of Data
My personal data may be transferred to SMS verification service providers (NetGSM), payment service providers (PayTR), AI/speech-to-text/content-safety service providers (e.g. Google Gemini, Groq, Microsoft Azure), cloud infrastructure service providers, and authorized public institutions when legally required.

Data Retention
My personal data will be stored as long as my account is active and within the scope of legal obligations. When I delete my account via the app, direct identifiers are anonymized immediately, my account is deactivated, and refresh tokens are revoked, subject to legal retention of certain records.

My Rights
I have the rights under Article 11 of KVKK to learn whether my personal data is being processed, to request information, to request correction, to request deletion or destruction, and to claim compensation for damages due to unlawful processing.

I declare that I have read and understood the information text, and I give my explicit consent with my free will for the processing, storage, and transfer of my personal data stated above for the stated purposes.

Application and Contact
All KVKK-related applications can be sent to ${KVKK_EMAIL}.`,
    },
    terms: {
      title: 'Terms of Service',
      content: `TERMS OF SERVICE

Last Updated: February 2026

1. Service Description
This application is an appointment management platform that connects barbers, hairdressers, and beauty professionals with customers. You can create appointments, rate service providers, and communicate through the app.

2. Membership and Account
• You must register with your phone number to use the application.
• You are responsible for ensuring that the information you provide during registration is accurate and up-to-date.
• You are responsible for the security of your account. You will be held responsible for all transactions made with your account.
• Each user may only create one account.

3. User Types
• Customer: Can make appointments and rate service providers.
• Freelance Barber/Hairdresser: Can offer services individually and manage appointments.
• Business (Shop): Can create a business panel, manage chairs and barbers.

4. Appointment Rules
• Appointments are valid at the specified time and date.
• Appointment cancellations must be made before the appointment time.
• Your account may be restricted in case of repeated cancellations or no-shows.
• Service providers may reject appointments at their discretion.

5. Reviews and Comments
• Your reviews must be based on your actual experiences.
• Comments containing insults, profanity, or threats are prohibited.
• Your account may be suspended if you make fake or misleading reviews.

6. Prohibited Conduct
• Misusing the application or preventing others from using it
• Creating fake accounts or impersonating others
• Sending spam messages or engaging in harassing behavior
• Using the application for unauthorized commercial purposes
• Attempting to bypass the application's security mechanisms

7. Service Provider Responsibilities
• Service providers are responsible for the quality and safety of the services they provide.
• Keeping business information (working hours, prices, services) up-to-date is the responsibility of the service provider.
• Having valid certificates and permits is a legal requirement.

8. Limitation of Liability
• The application serves as an intermediary platform. It is not directly responsible for disputes arising from the relationship between service providers and customers.
• The application does not guarantee that the service will be uninterrupted or error-free.
• No liability is accepted for interruptions caused by technical failures, maintenance, or force majeure.

9. Intellectual Property
All content, design, logos, and software rights in the application are reserved. Unauthorized copying, reproduction, or distribution is prohibited.

10. Changes
These terms of service may be updated with prior notice. Continuing to use the application after updates means you accept the changes.

11. Applicable Law
These terms are subject to the laws of the Republic of Turkey. Turkish courts have jurisdiction over disputes.`,
    },
    privacy: {
      title: 'Privacy Policy',
      content: `PRIVACY POLICY

Last updated: April 16, 2026

Data controller
${COMPANY_LEGAL_NAME}
Application name: Gümüş Makas
Android package name: com.hairdresser.app — iOS bundle: com.hairdresser.app

Privacy and KVKK requests: ${KVKK_EMAIL}

This policy is provided for information purposes under the Turkish Personal Data Protection Law No. 6698 ("KVKK") and related rules. Detailed KVKK disclosure and explicit consent texts are also available inside the app.

1. Scope
This policy explains how we process your personal data when you use the Gümüş Makas mobile app. The service connects barbers, hairdressers, and beauty professionals with customers and offers appointment, location, messaging, and notification features.

2. Account deletion and data requests (store transparency)
This section summarizes how you can close your account or submit personal data requests, aligned with transparency expectations of Google Play and similar app stores.

2.1 Deleting your account in the app (customer, freelance barber, and business accounts)
1) Open the Gümüş Makas app and sign in.
2) Go to the Profile tab/screen from the bottom menu.
3) Tap "Delete account" (or the equivalent label).
4) Confirm; a one-time verification code (OTP) is sent by SMS to your registered phone number.
5) Enter the code to complete the process. Your account is then deactivated; direct identifiers are anonymized and refresh tokens are revoked (see section 8 for details).

2.2 If you cannot access the app or need other requests
You may email ${KVKK_EMAIL} for account deletion or any personal data request. Include your registered phone number and clearly state your request (e.g. account deletion; correction or erasure of specific data).

2.3 Requests without closing your account
Under KVKK Article 11, you may request correction or erasure/destruction of specific personal data without closing your account, via ${KVKK_EMAIL} or in-app support.

2.4 Summary of what is deleted or retained
The outcome of account deletion is summarized in section 8 (Retention).

3. Categories of personal data
Depending on the features you use and permissions you grant, we may process:

Identity and account: first name, last name, phone number, user type (customer, freelance barber, business); where collected under legal or registration/verification flows, Turkish ID number (TCKN), tax ID (VKN), or similar identifiers (e.g. trade registry number).

Address and place (text): address description entered for a business listing; coordinates saved via the map; address or location content you share in chat or profile.

Registration and business operations: business name/title, shop number, working hours, service and price definitions, chair and manual barber records; these records may contain personal data such as business title or contact details.

Authentication: data processed when sending a one-time password (OTP) by SMS to your phone.

Session and security: access tokens (e.g. JWT) to keep you signed in; secure on-device storage where available (e.g. iOS Keychain / Android Keystore), otherwise local device storage; technical logs, IP address, connection time (for server security and support).

Location:
• Foreground: nearby providers, maps, address estimation (reverse geocoding), sharing location in chat, and (if you allow) contextual replies in the AI assistant.
• Background: only for users with the freelance barber role, after you enable the feature and explicitly grant the relevant system permissions; while the app is in the background, location may be collected at defined time/distance intervals and sent to our servers so customers receive up-to-date proximity information.
• Background location data is not used for advertising, profiling, or sale, and is not shared with third parties for those purposes.

Images and files: profile and business photos, certificate images, tax or similar document images for business registration (including identity or tax details visible on the image, to the extent processed); images or files shared in chat; content added via gallery or camera.

Service data: appointments; approval, pending, or rejection flows, timeouts, and status history; cancellations and completion; chair or manual barber assignment; pricing, earnings summaries (where applicable), ratings and reviews, complaints, blocks, and support-style requests (including records arising from different appointment scenarios).

Communication content: text and attachments in in-app messages; real-time traffic uses the SignalR protocol to our company servers.

Push notifications: Firebase Cloud Messaging (FCM) device registration token and platform information registered on our servers; appointment and status notifications.

AI voice assistant: short audio recordings with microphone permission; upload to our servers for transcription; sending the resulting text (and, if permitted, current location) to our AI endpoint.

Payments (subscription): PayTR’s secure payment page opened in an in-app WebView; card data is not processed directly in our application code. We may retain technical/business records needed for subscription period, payment status, and reconciliation.

Maps: Google Maps (Maps SDK) for maps and location visualization.

Preferences: language and theme may be stored on the device.

Earnings export: PDF or CSV may be generated on your device; sharing passes data to the third-party app you choose (subject to that app’s policies).

4. Purposes of processing
Account and authentication; appointment management; location-based matching; updating freelance barber location (where permitted); messaging and notifications; initiating payments, fee collection, and subscription management; invoicing, accounting, and payment reconciliation; statutory retention arising from tax and related law; fraud prevention and security; content moderation; service improvement; legal obligations and official requests.

5. Legal bases (summary under KVKK Art. 5)
Performance of a contract, explicit consent where required, legal obligation, legitimate interests (e.g. security), and other grounds foreseen by law.

6. Third parties and transfers
We may share or process data with limited processors such as:
• NetGSM — SMS OTP delivery
• Google Firebase — push notifications (FCM)
• Google Gemini — AI assistant text processing (via our servers)
• Groq — speech-to-text for voice input
• Microsoft Azure (Content Safety) — text and image safety / moderation
• Google Maps — mapping
• PayTR — payment processing
• Cloud hosting — API and data storage

Where cross-border transfers occur, we apply appropriate technical and legal safeguards under applicable law.

7. Security
We use HTTPS/TLS, access controls, and technical and organizational measures. No system is perfectly secure; report concerns to ${KVKK_EMAIL}.

8. Retention
While your account is active and as needed for the purposes above.
When you delete your account via the in-app flow, our servers anonymize direct identifiers (first name, last name, phone fields), deactivate the account, and revoke refresh tokens.
A technical user identifier may remain for legal obligations or relational records (e.g. appointments); content is kept as anonymous or non-identifying as practicable.
Some data may be retained for legal periods (backups, accounting, official requests).
Background location data is processed only for the stated service purpose and only as long as necessary; when you revoke permissions, background location updates stop.

9. Your rights (KVKK Art. 11)
You may request information, correction, deletion/destruction where conditions are met, learn recipients, object to certain automated outcomes, and seek compensation for unlawful processing where applicable.

Contact: ${KVKK_EMAIL} or in-app support.

10. Managing permissions (user control)
You can change or revoke permissions such as location, notifications, and microphone at any time in your device operating system settings.
If background location permission is turned off, we do not perform background location updates.
Turning off permissions may limit some features (e.g. nearby provider listings, live location updates).

11. Cookies and mobile tracking
The mobile app does not use traditional web cookies; device identifiers and session data may be used for operation.

12. Children and store targeting
The app is not directed at users under 18. We do not knowingly collect personal data from anyone under 18.

13. Policy updates
We may update this policy; material changes may be communicated in-app or via store listings.

14. Third-party links
PayTR pages, external web content, and apps you choose for sharing are governed by their own policies.`,
    },
  },

  ar: {
    kvkk: {
      title: 'نص إفصاح KVKK',
      content: `نص الإفصاح بموجب قانون حماية البيانات الشخصية (KVKK) رقم 6698

مراقب البيانات
${COMPANY_LEGAL_NAME}

تم إعداد نص الإفصاح هذا لإبلاغكم بصفة مراقب البيانات، في نطاق قانون حماية البيانات الشخصية رقم 6698 ("KVKK").

البيانات الشخصية المجمعة
حسب دوركم والميزات المستخدمة، قد يتم جمع ومعالجة البيانات التالية:
• معلومات الهوية: الاسم الأول واسم العائلة؛ عند الجمع بموجب التزام قانوني أو تسجيل/تحقق: رقم الهوية التركية (TCKN)، الرقم الضريبي (VKN)، أو معرفات مشابهة (مثل السجل التجاري)
• معلومات الاتصال: رقم الهاتف؛ عنوان بريدي نصي عند الحاجة (مثل تسجيل المنشأة)
• معلومات الموقع: الموقع المباشر (لعرض مقدمي الخدمة القريبين ولتحديث قرب الحلاق المستقل)؛ الإحداثيات المرتبطة بمنشأة على الخريطة
• البيانات المرئية: صور الملف والمنشأة والشهادات؛ مستندات ضريبية أو مشابهة (بما في ذلك بيانات الهوية أو الضريبة الظاهرة على الصورة، بقدر المعالجة)
• بيانات التسجيل وملف المنشأة: اسم/عنوان المنشأة، رقم المحل، ساعات العمل، تعريفات الخدمة والأسعار، سجلات الكراسي والحلاق اليدوي (إن احتوت بيانات شخصية)
• بيانات الخدمة: سجل المواعيد؛ موافقة/انتظار/رفض؛ الإلغاء والحالة؛ الخدمات المقدمة/المتلقاة؛ التقييمات؛ الشكاوى والحظر والطلبات
• بيانات الدفع والاشتراك: بدء الدفع وحالة المعاملة وفترة الاشتراك (لا تُعالج بيانات البطاقة في كود التطبيق؛ تُعالج لدى PayTR)
• أمن المعاملات: معلومات الجهاز، بيانات الجلسة، السجلات التقنية

أغراض المعالجة
تتم معالجة بياناتكم الشخصية للأغراض التالية:
• إنشاء وإدارة حساب عضويتكم
• تقديم خدمات إنشاء المواعيد وتتبعها وإدارتها (بما في ذلك سيناريوهات موافقة متعددة الأطراف)
• توفير خدمة مطابقة الحلاقين/مصففي الشعر بناءً على الموقع
• تقييم جودة الخدمة وتحسينها
• تمكين التواصل بين المستخدمين (المراسلة)
• إرسال الإشعارات (تذكيرات المواعيد، تحديثات الحالة)
• الفوترة وتحصيل الرسوم وإدارة الاشتراكات؛ تتبع المعاملات والتسوية عبر مزود الدفع (PayTR)
• المحاسبة والسجلات والالتزامات الضريبية
• الوفاء بالالتزامات القانونية

الأساس القانوني
تتم معالجة بياناتكم الشخصية بناءً على موافقتكم الصريحة، وتنفيذ العقد، والالتزامات القانونية، والمصالح المشروعة.

نقل البيانات
قد تُنقل بياناتكم إلى: NetGSM (OTP)؛ PayTR (الدفع والاشتراكات)؛ مزودي الذكاء الاصطناعي/الكلام/سلامة المحتوى؛ البنية السحابية؛ جهات عامة عند الاقتضاء القانوني.

حقوقكم
بموجب المادة 11 من KVKK، لديكم الحق في معرفة ما إذا كانت بياناتكم تُعالج، وطلب تصحيحها أو حذفها، والاعتراض على نتائج المعالجة الآلية.

الاتصال
يمكنكم التواصل معنا عبر البريد الإلكتروني ${KVKK_EMAIL} أو عبر قناة الدعم داخل التطبيق لممارسة حقوقكم. يمكن إرسال جميع طلبات KVKK إلى عنوان البريد الإلكتروني هذا.`,
    },
    consent: {
      title: 'نص الموافقة الصريحة',
      content: `الموافقة الصريحة على معالجة البيانات الشخصية

في نطاق قانون حماية البيانات الشخصية رقم 6698 ("KVKK")، تم إبلاغي بالأمور التالية المتعلقة بمعالجة بياناتي الشخصية:

البيانات الشخصية المراد معالجتها
• معلومات هويتي (الاسم؛ TCKN أو الرقم الضريبي أو معرفات مشابهة عند طلبها قانونياً أو في التسجيل)
• معلومات الاتصال الخاصة بي (رقم الهاتف؛ عنوان بريدي نصي عند الحاجة)
• معلومات موقعي (مقدمو الخدمة القريبون وقرب الحلاق المستقل؛ إحداثيات منشأة)
• بياناتي المرئية (صور الملف والمنشأة والشهادات ومستندات ضريبية مشابهة)
• بيانات تسجيل وملف المنشأة (اسم المنشأة، رقم المحل، ساعات العمل، الخدمات والأسعار، الكراسي/الحلاق اليدوي — إن احتوت بيانات شخصية)
• بيانات الخدمة الخاصة بي (المواعيد، موافقة/انتظار/رفض، التقييمات، الرسائل، الشكاوى/الحظر/الطلبات)
• بيانات الدفع والاشتراك (حالة المعاملة والاشتراك؛ لا تُعالج بيانات البطاقة في كود التطبيق)

أغراض المعالجة
ستتم معالجة بياناتي الشخصية لأغراض إنشاء وإدارة حساب عضويتي، وتقديم خدمات المواعيد (بما في ذلك سيناريوهات متعددة الأطراف)، ومطابقة الخدمات بناءً على الموقع، والتواصل بين المستخدمين، وإرسال الإشعارات، وتحسين جودة الخدمة، والفوترة وتحصيل الرسوم وإدارة الاشتراكات، وتتبع المعاملات عبر PayTR، والمحاسبة والالتزامات الضريبية.

نقل البيانات
قد يتم نقل بياناتي الشخصية إلى NetGSM، وPayTR، ومزودي الذكاء الاصطناعي/الكلام/سلامة المحتوى (مثل Google Gemini وGroq وMicrosoft Azure)، ومزودي البنية التحتية السحابية، والمؤسسات العامة عند الاقتضاء قانونياً.

حقوقي
لدي حقوق بموجب المادة 11 من KVKK لمعرفة ما إذا كانت بياناتي تُعالج، وطلب المعلومات، وطلب التصحيح أو الحذف.

أُصرّح بأنني قرأت وفهمت نص المعلومات، وأمنح موافقتي الصريحة بإرادتي الحرة على معالجة وتخزين ونقل بياناتي الشخصية المذكورة أعلاه للأغراض المذكورة.

الاتصال
يمكن إرسال جميع طلبات KVKK إلى ${KVKK_EMAIL}.`,
    },
    terms: {
      title: 'شروط الاستخدام',
      content: `شروط الاستخدام

آخر تحديث: فبراير 2026

1. وصف الخدمة
هذا التطبيق هو منصة لإدارة المواعيد تربط الحلاقين ومصففي الشعر وخبراء التجميل بالعملاء. يمكنك إنشاء مواعيد وتقييم مقدمي الخدمات والتواصل عبر التطبيق.

2. العضوية والحساب
• يجب عليك التسجيل برقم هاتفك لاستخدام التطبيق.
• أنت مسؤول عن دقة المعلومات التي تقدمها أثناء التسجيل.
• أنت مسؤول عن أمان حسابك وجميع المعاملات التي تتم من خلاله.
• يمكن لكل مستخدم إنشاء حساب واحد فقط.

3. قواعد المواعيد
• المواعيد صالحة في الوقت والتاريخ المحددين.
• يجب إجراء إلغاء المواعيد قبل وقت الموعد.
• قد يتم تقييد حسابك في حالة الإلغاء المتكرر أو عدم الحضور.

4. السلوك المحظور
• إساءة استخدام التطبيق أو منع الآخرين من استخدامه
• إنشاء حسابات مزيفة أو انتحال شخصية الآخرين
• إرسال رسائل مزعجة أو التصرف بشكل مضايق

5. حدود المسؤولية
• يعمل التطبيق كمنصة وسيطة. لا يتحمل مسؤولية مباشرة عن النزاعات بين مقدمي الخدمات والعملاء.
• لا يضمن التطبيق أن الخدمة ستكون بدون انقطاع أو أخطاء.

6. القانون المطبق
تخضع هذه الشروط لقوانين جمهورية تركيا.`,
    },
    privacy: {
      title: 'سياسة الخصوصية',
      content: `سياسة الخصوصية

آخر تحديث: 16 أبريل 2026

مراقب البيانات
${COMPANY_LEGAL_NAME}
اسم التطبيق: Gümüş Makas
حزمة Android: com.hairdresser.app — معرّف iOS: com.hairdresser.app

خصوصية وطلبات KVKK: ${KVKK_EMAIL}

تهدف هذه السياسة إلى الإفادة بموجب قانون حماية البيانات الشخصية التركي رقم 6698 ("KVKK") والقواعد ذات الصلة. نصوص الإفصاح والموافقة الصريحة التفصيلية متوفرة أيضاً داخل التطبيق.

1. النطاق
توضح هذه السياسة كيفية معالجة بياناتكم الشخصية عند استخدام تطبيق Gümüş Makas. تربط الخدمة الحلاقين ومصففي الشعر وخبراء التجميل بالعملاء وتقدم المواعيد والموقع والمراسلة والإشعارات.

2. حذف الحساب وطلبات البيانات (شفافية المتاجر)
يُلخّص هذا القسم كيفية إغلاق حسابكم أو تقديم طلبات بيانات شخصية، بما يتوافق مع توقعات الشفافية في Google Play والمتاجر المشابهة.

2.1 حذف الحساب من التطبيق (عملاء، حلاقون مستقلون، حسابات منشآت)
1) افتحوا تطبيق Gümüş Makas وسجّلوا الدخول.
2) انتقلوا إلى شاشة الملف الشخصي من القائمة السفلية.
3) اضغطوا «حذف الحساب» (أو ما يعادلها).
4) أكّدوا؛ يُرسل رمز تحقق لمرة واحدة (OTP) عبر الرسائل القصيرة إلى رقم هاتفكم المسجّل.
5) أدخلوا الرمز لإتمام العملية. يُعطَّل حسابكم؛ تُجهَّل المعرفات المباشرة وتُلغى رموز تجديد الجلسة (للتفاصيل راجعوا القسم 8).

2.2 إذا تعذّر الوصول إلى التطبيق أو لطلبات إضافية
يمكنكم إرسال أي طلب لحذف الحساب أو البيانات الشخصية إلى ${KVKK_EMAIL}. اذكروا في بريدكم رقم الهاتف المسجّل واطلبكم (مثل حذف الحساب؛ تصحيح أو محو بيانات محددة) بوضوح.

2.3 طلبات بيانات دون إغلاق الحساب
بموجب المادة 11 من KVKK، يمكنكم طلب تصحيح بياناتكم أو محوها/إتلافها دون إغلاق الحساب عبر ${KVKK_EMAIL} أو دعم التطبيق.

2.4 ملخص ما يُحذف ويُحتفَظ به
يُطابق ملخص نتائج حذف الحساب القسم 8 (مدة الاحتفاظ).

3. فئات البيانات
حسب الميزات والأذونات:

الهوية والحساب: الاسم، رقم الهاتف، نوع المستخدم (عميل، حلاق مستقل، منشأة)؛ عند الجمع بموجب التزام قانوني أو تسجيل/تحقق: TCKN أو الرقم الضريبي أو معرفات مشابهة.

العنوان والمكان (نص): وصف عنوان المنشأة؛ الإحداثيات عبر الخريطة؛ عنوان أو موقع يشاركه المستخدم في الدردشة أو الملف.

تسجيل المنشأة والعمليات: اسم/عنوان المنشأة، رقم المحل، ساعات العمل، الخدمات والأسعار، الكراسي والحلاق اليدوي؛ قد تحتوي على بيانات شخصية.

التحقق: بيانات تتعلق بإرسال رمز تحقق لمرة واحدة (OTP) عبر الرسائل القصيرة.

الجلسة والأمان: رموز وصول (مثل JWT)؛ تخزين آمن على الجهاز عند الإمكان؛ سجلات تقنية، عنوان IP، وقت الاتصال.

الموقع:
• أمامي: مقدمو خدمات قريبون، خرائط، تقدير العنوان، مشاركة الموقع في الدردشة، والمساعد الذكي (إذا سمحتم).
• خلفي: فقط لمستخدمي دور «الحلاق المستقل»، بعد تفعيلكم للميزة ومنحكم أذونات النظام صراحة؛ أثناء عمل التطبيق في الخلفية قد يُجمع الموقع بفواصل زمنية/مسافات محددة ويُرسل إلى خوادمنا لعرض معلومات قرب محدثة للعملاء.
• لا تُستخدم بيانات الموقع في الخلفية للإعلان أو إنشاء ملفات تعريف أو بيع البيانات، ولا تُشارك مع أطراف ثالثة لهذه الأغراض.

الصور والملفات: صور الملف والمنشأة والشهادات، مستندات ضريبية (بما في ذلك بيانات الهوية/الضريبة الظاهرة على الصورة بقدر المعالجة)، مرفقات الدردشة، محتوى الكاميرا/المعرض.

بيانات الخدمة: المواعيد؛ موافقة/انتظار/رفض ومهلة زمنية وسجل الحالة؛ الإلغاء والإكمال؛ تعيين كرسي/حلاق يدوي؛ الأسعار وملخصات الأرباح (حيث ينطبق)، التقييمات، الشكاوى والحظر والطلبات.

محتوى التواصل: نص الرسائل والمرفقات؛ الاتصال اللحظي عبر بروتوكول SignalR إلى خوادمنا.

الإشعارات الفورية: رمز تسجيل FCM ونوع المنصة على خوادمنا.

مساعد الذكاء الصوتي: تسجيل صوتي قصير؛ رفع للخوادم للنسخ إلى نص؛ إرسال النص (والموقع الحالي إن سمحتم) إلى نقطة الذكاء الاصطناعي.

الدفع (اشتراك): صفحة PayTR الآمنة داخل WebView؛ لا تُعالج بيانات البطاقة مباشرة في كود التطبيق. قد نحتفظ بسجلات تقنية/تجارية لفترة الاشتراك وحالة الدفع والتسوية.

الخرائط: Google Maps (Maps SDK).

التفضيلات: اللغة والسمة قد تُخزَّن محلياً.

تصدير الأرباح: قد يُنشأ PDF/CSV على جهازكم؛ المشاركة تخضع لتطبيق الطرف الثالث الذي تختارونه.

4. أغراض المعالجة
الحساب والتحقق؛ إدارة المواعيد؛ المطابقة حسب الموقع؛ تحديث موقع الحلاق المستقل (عند الإذن)؛ المراسلة والإشعارات؛ بدء المدفوعات وتحصيل الرسوم وإدارة الاشتراكات؛ الفوترة والمحاسبة وتسوية المدفوعات؛ الالتزامات القانونية للاحتفاظ الناشئة عن الضرائب والقوانين ذات الصلة؛ منع الاحتيال والأمان؛ مراجعة المحتوى؛ تحسين الخدمة؛ الالتزامات القانونية والطلبات الرسمية.

5. الأسس القانونية (ملخص KVKK المادة 5)
تنفيذ العقد، الموافقة الصريحة عند الحاجة، الالتزام القانوني، المصالح المشروعة، وغيرها المنصوص عليها في القانون.

6. أطراف ثالثة ونقل البيانات
• NetGSM — OTP عبر الرسائل القصيرة
• Google Firebase — إشعارات FCM
• Google Gemini — معالجة نص المساعد الذكي عبر خوادمنا
• Groq — تحويل الكلام إلى نص
• Microsoft Azure (Content Safety) — سلامة النص والصورة
• Google Maps — الخرائط
• PayTR — الدفع
• البنية السحابية — التخزين وواجهة API

عند النقل عبر الحدود نطبق الضمانات المناسبة بموجب القانون.

7. الأمان
HTTPS/TLS وضوابط الوصول وتدابير تنظيمية. لا يوجد نظام آمن بالكامل؛ أبلغوا ${KVKK_EMAIL} عن المخاوف.

8. الاحتفاظ
أثناء نشاط الحساب وحسب الغرض.
عند حذف الحساب من التطبيق، تُجهَّل المعرفات المباشرة على الخادم (الاسم والهاتف)، يُعطَّل الحساب وتُلغى رموز تجديد الجلسة.
قد يبقى معرف تقني لالتزامات قانونية أو سجلات مرتبطة (مواعيد)؛ نُبقي المحتوى مجهولاً أو غير معرّف قدر الإمكان.
قد تُحفظ بعض البيانات لمدد قانونية (نسخ احتياطية، محاسبة، طلبات رسمية).
تُعالج بيانات الموقع في الخلفية فقط للغرض الخدمي المذكور وما دام ذلك ضرورياً؛ عند إلغاء الأذونات تتوقف تحديثات الموقع في الخلفية.

9. حقوقكم (KVKK المادة 11)
الاستعلام والتصحيح والحذف حيث تنطبق الشروط، معرفة المستلمين، الاعتراض على بعض النتائج الآلية، التعويض عند الإخلال.

الاتصال: ${KVKK_EMAIL} أو الدعم داخل التطبيق.

10. إدارة الأذونات (تحكم المستخدم)
يمكنكم تغيير أو إلغاء أذونات مثل الموقع والإشعارات والميكروفون في أي وقت من إعدادات نظام التشغيل.
عند إلغاء إذن الموقع في الخلفية، لا نجري تحديثات للموقع في الخلفية.
قد يؤدي إيقاف الأذونات إلى تقييد بعض الميزات (مثل قوائم مقدمي الخدمة القريبين، تحديثات الموقع المباشر).

11. ملفات تعريف الارتباط والتتبع
التطبيق لا يستخدم ملفات تعريف ارتباط ويب تقليدية؛ قد تُستخدم معرفات الجهاز وبيانات الجلسة.

12. الأطفال والمتاجر
التطبيق غير موجه لمن دون 18 عاماً؛ لا نجمع عن قصد بياناتهم الشخصية.

13. تحديثات السياسة
قد تُحدَّث؛ قد نُعلن بالتطبيق أو قوائم المتاجر.

14. روابط الطرف الثالث
صفحات PayTR والمحتوى الخارجي وتطبيقات المشاركة تخضع لسياساتها.`,
    },
  },

  de: {
    kvkk: {
      title: 'KVKK-Datenschutzerklärung',
      content: `AUFKLÄRUNGSTEXT GEMÄẞ DEM GESETZ ZUM SCHUTZ PERSONENBEZOGENER DATEN (KVKK) NR. 6698

Verantwortlicher
${COMPANY_LEGAL_NAME}

Dieser Aufklärungstext wurde erstellt, um Sie in der Eigenschaft als Verantwortlicher im Rahmen des Gesetzes zum Schutz personenbezogener Daten Nr. 6698 ("KVKK") zu informieren.

Erhobene personenbezogene Daten
Je nach Rolle und genutzten Funktionen können folgende personenbezogene Daten erhoben und verarbeitet werden:
• Identitätsdaten: Vor- und Nachname; bei gesetzlichen oder Registrierungs-/Verifizierungsvorgängen ggf. türkische ID-Nummer (TCKN), Steuer-ID (VKN) oder ähnliche Kennungen (z. B. Handelsregisternummer)
• Kontaktdaten: Telefonnummer; ggf. postalische Adresse in Textform (z. B. Geschäftsregistrierung)
• Standortdaten: Live-Standort (für nahe Dienstleister und Nähe-Updates freiberuflicher Friseure); Koordinaten eines Geschäftsstandorts auf der Karte
• Visuelle Daten: Profil-, Geschäfts- und Zertifikatsfotos; Steuer- oder ähnliche Dokumentenbilder (einschließlich auf dem Bild erkennbarer Identitäts-/Steuerdaten, soweit verarbeitet)
• Registrierungs- und Geschäftsprofildaten: Geschäftsname/-titel, Ladennummer, Öffnungszeiten, Leistungs- und Preisdefinitionen, Stuhl- und manuelle Friseurdatensätze (soweit personenbezogen)
• Servicedaten: Terminverlauf; Genehmigungs-, Warte- oder Ablehnungsvorgänge; Stornierungen und Status; erbrachte/erhaltene Leistungen; Bewertungen; Beschwerden, Sperren und Anfragen
• Zahlungs- und Abo-bezogene Daten: Zahlungsauslösung, Transaktionsstatus, Abozeitraum (Kartendaten werden nicht im App-Code verarbeitet; Verarbeitung bei PayTR)
• Transaktionssicherheit: Geräteinformationen, Sitzungsdaten, technische Protokolle

Zwecke der Verarbeitung
Ihre personenbezogenen Daten werden zu folgenden Zwecken verarbeitet:
• Erstellung und Verwaltung Ihres Mitgliedskontos
• Bereitstellung von Terminerstellungs-, Verfolgungs- und Verwaltungsdiensten (einschließlich mehrseitiger Freigabeprozesse)
• Bereitstellung standortbasierter Friseur-Matching-Dienste
• Bewertung und Verbesserung der Servicequalität
• Ermöglichung der Kommunikation zwischen Benutzern
• Versand von Benachrichtigungen
• Rechnungsstellung, Gebühreneinzug und Abo-Verwaltung; Transaktionsverfolgung und Abgleich über den Zahlungsdienstleister (PayTR)
• Buchführung und steuerliche Pflichten
• Erfüllung gesetzlicher Verpflichtungen

Übermittlung
An NetGSM (OTP), PayTR (Zahlungen/Abos), KI-/Sprache-zu-Text-/Content-Safety-Anbieter, Cloud-Anbieter und ggf. Behörden nach gesetzlicher Grundlage.

Ihre Rechte
Gemäß Artikel 11 des KVKK haben Sie das Recht zu erfahren, ob Ihre Daten verarbeitet werden, deren Berichtigung oder Löschung zu verlangen und der automatisierten Verarbeitung zu widersprechen.

Kontakt
Sie können uns unter ${KVKK_EMAIL} oder über den In-App-Support-Kanal kontaktieren, um Ihre Rechte auszuüben. Alle KVKK-bezogenen Anträge können an diese E-Mail-Adresse gesendet werden.`,
    },
    consent: {
      title: 'Einwilligungserklärung',
      content: `AUSDRÜCKLICHE EINWILLIGUNG ZUR VERARBEITUNG PERSONENBEZOGENER DATEN

Im Rahmen des Gesetzes zum Schutz personenbezogener Daten Nr. 6698 ("KVKK") wurde ich über folgende Punkte bezüglich der Verarbeitung meiner personenbezogenen Daten informiert:

Zu verarbeitende personenbezogene Daten
• Meine Identitätsdaten (Vor- und Nachname; ggf. TCKN, Steuer-ID oder ähnliche Kennungen bei gesetzlichen oder Registrierungsvorgängen)
• Meine Kontaktdaten (Telefonnummer; ggf. postalische Adresse)
• Meine Standortdaten (nahe Dienstleister und Nähe freiberuflicher Friseure; Geschäftsstandort-Koordinaten)
• Meine visuellen Daten (Profil-, Geschäfts-, Zertifikats- und Steuer-/Belegbilder)
• Meine Registrierungs- und Geschäftsprofildaten (Geschäftsname, Ladennummer, Öffnungszeiten, Leistungen/Preise, Stuhl-/manuelle Friseurdaten — soweit personenbezogen)
• Meine Servicedaten (Termine, Genehmigung/Warte/Ablehnung, Bewertungen, Nachrichten, Beschwerden/Sperren/Anfragen)
• Meine zahlungs- und abo-bezogenen Daten (Transaktions- und Abostatus; keine Kartendaten im App-Code)

Zwecke der Verarbeitung
Meine personenbezogenen Daten werden zur Erstellung und Verwaltung meines Mitgliedskontos, zur Bereitstellung von Termindiensten (einschließlich mehrseitiger Freigaben), zur standortbasierten Zuordnung, zur Kommunikation zwischen Benutzern, zum Versand von Benachrichtigungen, zur Verbesserung der Servicequalität, zur Rechnungsstellung und Gebühreneinzug, zur Abo-Verwaltung, zur Transaktionsverfolgung über PayTR sowie zur Buchführung und Erfüllung steuerlicher Pflichten verarbeitet.

Übertragung von Daten
Meine personenbezogenen Daten können an SMS-Verifizierungsdienstleister (NetGSM), Zahlungsdienstleister (PayTR), KI-/Sprache-zu-Text-/Content-Safety-Dienstleister (z. B. Google Gemini, Groq, Microsoft Azure), Cloud-Infrastrukturdienstleister und zuständige öffentliche Einrichtungen bei gesetzlicher Erforderlichkeit übertragen werden.

Meine Rechte
Ich habe gemäß Artikel 11 des KVKK das Recht zu erfahren, ob meine Daten verarbeitet werden, Informationen anzufordern, Berichtigung oder Löschung zu verlangen.

Ich erkläre, dass ich den Informationstext gelesen und verstanden habe, und gebe meine ausdrückliche Einwilligung aus freiem Willen zur Verarbeitung, Speicherung und Übertragung meiner oben genannten personenbezogenen Daten für die genannten Zwecke.

Kontakt
Alle KVKK-bezogenen Anträge können an ${KVKK_EMAIL} gesendet werden.`,
    },
    terms: {
      title: 'Nutzungsbedingungen',
      content: `NUTZUNGSBEDINGUNGEN

Letzte Aktualisierung: Februar 2026

1. Dienstbeschreibung
Diese Anwendung ist eine Terminverwaltungsplattform, die Friseure, Hairstylisten und Schönheitsexperten mit Kunden verbindet. Sie können Termine erstellen, Dienstleister bewerten und über die App kommunizieren.

2. Mitgliedschaft und Konto
• Sie müssen sich mit Ihrer Telefonnummer registrieren, um die Anwendung nutzen zu können.
• Sie sind dafür verantwortlich, dass die bei der Registrierung angegebenen Informationen korrekt und aktuell sind.
• Sie sind für die Sicherheit Ihres Kontos verantwortlich.
• Jeder Benutzer darf nur ein Konto erstellen.

3. Terminregeln
• Termine gelten zum angegebenen Zeitpunkt und Datum.
• Terminabsagen müssen vor der Terminzeit erfolgen.
• Bei wiederholten Absagen oder Nichterscheinen kann Ihr Konto eingeschränkt werden.

4. Verbotenes Verhalten
• Missbrauch der Anwendung oder Behinderung anderer Benutzer
• Erstellen gefälschter Konten oder Identitätsdiebstahl
• Versenden von Spam-Nachrichten oder belästigendes Verhalten

5. Haftungsbeschränkung
• Die Anwendung dient als Vermittlungsplattform. Sie ist nicht direkt verantwortlich für Streitigkeiten zwischen Dienstleistern und Kunden.
• Die Anwendung garantiert keinen unterbrechungsfreien oder fehlerfreien Service.

6. Anwendbares Recht
Diese Bedingungen unterliegen den Gesetzen der Republik Türkei.`,
    },
    privacy: {
      title: 'Datenschutzrichtlinie',
      content: `DATENSCHUTZRICHTLINIE

Letzte Aktualisierung: 16. April 2026

Verantwortlicher
${COMPANY_LEGAL_NAME}
Anwendungsname: Gümüş Makas
Android-Paketname: com.hairdresser.app — iOS-Bundle: com.hairdresser.app

Datenschutz- und KVKK-Anfragen: ${KVKK_EMAIL}

Diese Richtlinie dient der Information gemäß dem türkischen Gesetz zum Schutz personenbezogener Daten Nr. 6698 („KVKK“) und verwandter Vorschriften. Ausführliche KVKK-Aufklärung und Einwilligungstexte finden Sie auch in der App.

1. Geltungsbereich
Die Richtlinie beschreibt die Verarbeitung personenbezogener Daten bei Nutzung der mobilen App Gümüş Makas. Der Dienst verbindet Friseure, Hairstylisten und Beauty-Anbieter mit Kunden und bietet Termine, Standort, Nachrichten und Benachrichtigungen.

2. Kontolöschung und Datenanfragen (Transparenz in App-Stores)
Dieser Abschnitt fasst zusammen, wie Sie Ihr Konto schließen oder Anfragen zu personenbezogenen Daten stellen können – im Einklang mit Transparenzanforderungen von Google Play und ähnlichen Stores.

2.1 Kontolöschung in der App (Kunden, freiberufliche Friseure, Betriebskonten)
1) Öffnen Sie die App Gümüş Makas und melden Sie sich an.
2) Wechseln Sie über das untere Menü zum Profilbildschirm.
3) Tippen Sie auf „Konto löschen“ (oder die gleichbedeutende Bezeichnung).
4) Bestätigen Sie; an Ihre registrierte Telefonnummer wird per SMS ein Einmalcode (OTP) gesendet.
5) Geben Sie den Code ein, um den Vorgang abzuschließen. Ihr Konto wird deaktiviert; direkte Identifikatoren werden anonymisiert und Sitzungs-Refresh-Tokens widerrufen (Einzelheiten in Abschnitt 8).

2.2 Wenn Sie die App nicht nutzen können oder weitere Anfragen haben
Sie können jede Anfrage zur Kontolöschung oder zu personenbezogenen Daten an ${KVKK_EMAIL} senden. Geben Sie in der E-Mail Ihre registrierte Telefonnummer und Ihr Anliegen (z. B. Kontolöschung; Berichtigung oder Löschung bestimmter Daten) klar an.

2.3 Datenanfragen ohne Kontoschließung
Gemäß KVKK Art. 11 können Sie Berichtigung oder Löschung/Vernichtung bestimmter personenbezogener Daten auch ohne Kontoschließung über ${KVKK_EMAIL} oder den In-App-Support beantragen.

2.4 Zusammenfassung: was gelöscht oder aufbewahrt wird
Das Ergebnis der Kontolöschung ist in Abschnitt 8 (Speicherdauer) beschrieben.

3. Kategorien personenbezogener Daten
Je nach genutzten Funktionen und erteilten Berechtigungen:

Identität und Konto: Vor- und Nachname, Telefonnummer, Nutzertyp (Kunde, freiberuflicher Friseur, Betrieb); bei gesetzlichen oder Registrierungs-/Verifizierungsvorgängen ggf. TCKN, Steuer-ID (VKN) oder ähnliche Kennungen.

Adresse und Ort (Text): Adressbeschreibung im Geschäftseintrag; über die Karte gespeicherte Koordinaten; von Ihnen im Chat oder Profil geteilte Adress- oder Ortsangaben.

Registrierung und Geschäftsbetrieb: Geschäftsname/-titel, Ladennummer, Öffnungszeiten, Leistungs- und Preisdefinitionen, Stuhl- und manuelle Friseurdatensätze; diese Datensätze können personenbezogene Angaben (z. B. Geschäftsbezeichnung, Kontakt) enthalten.

Authentifizierung: Daten im Zusammenhang mit SMS-Einmalcodes (OTP).

Sitzung und Sicherheit: Zugriffstoken (z. B. JWT); sichere Gerätespeicherung wo möglich (z. B. iOS Keychain / Android Keystore), sonst lokale Speicherung; technische Protokolle, IP-Adresse, Verbindungszeitpunkt.

Standort:
• Vordergrund: nahe Dienstleister, Karten, Adressschätzung (Reverse Geocoding), Standortfreigabe im Chat, ggf. KI-Kontext.
• Hintergrund: nur für Nutzer mit der Rolle „freiberuflicher Friseur“, nachdem Sie die Funktion aktivieren und die relevanten Systemberechtigungen ausdrücklich erteilen; im Hintergrund kann der Standort in definierten Zeit-/Entfernungsintervallen an unsere Server übermittelt werden, damit Kunden aktuelle Näheinformationen erhalten.
• Standortdaten im Hintergrund werden nicht für Werbung, Profilbildung oder Datenverkauf genutzt und aus diesen Gründen nicht an Dritte weitergegeben.

Bilder und Dateien: Profil- und Geschäftsfotos, Zertifikatsbilder, Steuer- oder ähnliche Dokumente (einschließlich auf dem Bild erkennbarer Identitäts-/Steuerdaten, soweit verarbeitet), Chat-Anhänge, Inhalte aus Galerie oder Kamera.

Servicedaten: Termine; Genehmigungs-, Warte- oder Ablehnungsvorgänge, Fristen und Statusverlauf; Stornierungen und Abschluss; Stuhl- oder manuelle Friseurzuweisung; Preise, Verdienstübersichten (soweit zutreffend), Bewertungen, Beschwerden, Sperren, Anfragen.

Kommunikationsinhalte: Text und Anhänge in App-Nachrichten; Echtzeit über SignalR zu unseren Servern.

Push-Benachrichtigungen: FCM-Geräteregistrierungstoken und Plattforminformation auf unseren Servern.

KI-Sprachassistent: kurze Audioaufnahmen mit Mikrofonberechtigung; Upload zur Transkription; Übermittlung des Texts (und ggf. Standort) an den KI-Endpunkt.

Zahlungen (Abo): sichere PayTR-Seite in einer In-App-WebView; Kartendaten werden nicht direkt im App-Code verarbeitet. Technische/geschäftliche Aufzeichnungen zu Abozeitraum, Zahlungsstatus und Abgleich können wir speichern.

Karten: Google Maps (Maps SDK).

Einstellungen: Sprache und Design können lokal gespeichert werden.

Verdienstexport: PDF/CSV kann auf dem Gerät erzeugt werden; Teilen unterliegt der gewählten Drittanbieter-App.

4. Zwecke der Verarbeitung
Konto und Authentifizierung; Terminverwaltung; standortbasierte Zuordnung; Aktualisierung des Standorts freiberuflicher Friseure (soweit erlaubt); Nachrichten und Push; Zahlungsinitiierung, Gebühreneinzug und Abo-Verwaltung; Rechnungsstellung, Buchführung und Zahlungsabgleich; gesetzliche Aufbewahrungspflichten aus Steuer- und verwandtem Recht; Betrugsprävention und Sicherheit; Inhaltsmoderation; Serviceverbesserung; gesetzliche Pflichten und behördliche Anfragen.

5. Rechtsgrundlagen (Kurzüberblick KVKK Art. 5)
Vertragserfüllung, ausdrückliche Einwilligung wo erforderlich, Rechtspflicht, berechtigtes Interesse (z. B. Sicherheit) und weitere gesetzliche Grundlagen.

6. Drittanbieter und Übermittlungen
• NetGSM — SMS-OTP
• Google Firebase — Push (FCM)
• Google Gemini — KI-Textverarbeitung über unsere Server
• Groq — Sprache-zu-Text
• Microsoft Azure (Content Safety) — Text- und Bildsicherheit/Moderation
• Google Maps — Karten
• PayTR — Zahlung
• Cloud-Hosting — Speicher und API

Bei grenzüberschreitenden Übermittlungen wenden wir geeignete technische und rechtliche Maßnahmen nach anwendbarem Recht an.

7. Sicherheit
HTTPS/TLS, Zugriffskontrollen, technische und organisatorische Maßnahmen. Kein System ist absolut sicher; Hinweise an ${KVKK_EMAIL}.

8. Speicherdauer
Solange das Konto aktiv ist und für die genannten Zwecke erforderlich.
Bei Kontolöschung in der App werden direkte Identifikatoren auf dem Server anonymisiert (Vor-/Nachname, Telefon), das Konto deaktiviert und Refresh-Tokens widerrufen.
Ein technischer Benutzerbezeichner kann aus rechtlichen Gründen oder für Beziehungsdaten (z. B. Termine) verbleiben; Inhalte werden möglichst anonym oder nicht identifizierend gehalten.
Einige Daten können aus gesetzlichen Gründen länger aufbewahrt werden (Backups, Buchhaltung, behördliche Anfragen).
Standortdaten im Hintergrund werden nur für den genannten Servicezweck und nur so lange verarbeitet, wie nötig; wenn Sie Berechtigungen widerrufen, enden Hintergrund-Standortaktualisierungen.

9. Ihre Rechte (KVKK Art. 11)
Auskunft, Berichtigung, Löschung/Vernichtung unter den gesetzlichen Voraussetzungen, Empfängerinformation, Widerspruch gegen bestimmte automatisierte Ergebnisse, Schadensersatz bei rechtswidriger Verarbeitung.

Kontakt: ${KVKK_EMAIL} oder In-App-Support.

10. Verwaltung von Berechtigungen (Nutzerkontrolle)
Sie können Berechtigungen wie Standort, Benachrichtigungen und Mikrofon jederzeit in den Betriebssystemeinstellungen ändern oder widerrufen.
Wird die Hintergrund-Standortberechtigung deaktiviert, führen wir keine Standortaktualisierungen im Hintergrund durch.
Das Deaktivieren von Berechtigungen kann einige Funktionen einschränken (z. B. Listen naher Anbieter, Live-Standortaktualisierung).

11. Cookies und mobiles Tracking
Die App verwendet keine klassischen Web-Cookies; Gerätekennungen und Sitzungsdaten können für den Betrieb genutzt werden.

12. Kinder und Store-Zielgruppe
Die App richtet sich nicht an Personen unter 18 Jahren; wir erheben wissentlich keine personenbezogenen Daten von unter 18-Jährigen.

13. Aktualisierungen
Die Richtlinie kann geändert werden; wesentliche Änderungen können in-app oder in Store-Texten mitgeteilt werden.

14. Drittanbieter-Links
PayTR-Seiten, externe Webinhalte und Apps für Teilen unterliegen deren eigenen Richtlinien.`,
    },
  },
};

export const getLegalDocuments = (lang: string): Record<LegalDocumentType, LegalDocument> => {
  const language = lang as Language;
  return legalTexts[language] || legalTexts.tr;
};
