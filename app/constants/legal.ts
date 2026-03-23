/**
 * Legal document constants for KVKK, Terms of Service, and Privacy Policy
 * Texts are stored here (not in i18n) to keep translation files manageable
 */

import type { Language } from '../hook/useLanguage';

export type LegalDocumentType = 'kvkk' | 'terms' | 'privacy' | 'consent';

export const KVKK_EMAIL = 'gumusmakastr@gmail.com';

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
İşbu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, veri sorumlusu sıfatıyla sizleri bilgilendirmek amacıyla hazırlanmıştır.

Toplanan Kişisel Veriler
Uygulamamız aracılığıyla aşağıdaki kişisel verileriniz toplanmakta ve işlenmektedir:
• Kimlik Bilgileri: Ad, soyad
• İletişim Bilgileri: Telefon numarası
• Konum Bilgileri: Canlı konum verisi (yakındaki berber/kuaförleri göstermek için)
• Görsel Veriler: Profil fotoğrafı, işletme fotoğrafları, sertifika görselleri
• Hizmet Verileri: Randevu geçmişi, verilen/alınan hizmetler, değerlendirmeler ve puanlar
• İşlem Güvenliği: Cihaz bilgileri, oturum verileri

Kişisel Verilerin İşlenme Amaçları
Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:
• Üyelik hesabınızın oluşturulması ve yönetilmesi
• Randevu oluşturma, takip ve yönetim hizmetlerinin sunulması
• Konum tabanlı berber/kuaför eşleştirme hizmetinin sağlanması
• Hizmet kalitesinin değerlendirilmesi ve iyileştirilmesi
• Kullanıcılar arası iletişimin sağlanması (mesajlaşma)
• Bildirim gönderilmesi (randevu hatırlatma, durum güncellemeleri)
• Hukuki yükümlülüklerin yerine getirilmesi

Hukuki Dayanak
Kişisel verileriniz; açık rızanız, sözleşmenin ifası, hukuki yükümlülük ve meşru menfaat hukuki sebeplerine dayanılarak işlenmektedir.

Kişisel Verilerin Aktarılması
Kişisel verileriniz, hizmetin sunulması amacıyla aşağıdaki alıcı gruplarına aktarılabilir:
• SMS doğrulama hizmeti sağlayıcıları (Twilio)
• Bulut altyapı hizmeti sağlayıcıları
• Yasal zorunluluk halinde yetkili kamu kurum ve kuruluşları

Veri Saklama Süresi
Kişisel verileriniz, işlenme amaçlarının gerektirdiği süre boyunca ve yasal yükümlülükler kapsamında saklanmaktadır. Hesap silme talebiniz halinde verileriniz yasal süreler dahilinde silinir veya anonim hale getirilir.

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
• Kimlik bilgilerim (ad, soyad)
• İletişim bilgilerim (telefon numarası)
• Konum bilgilerim (yakındaki hizmet sağlayıcıları görmek için)
• Görsel verilerim (profil fotoğrafı, işletme fotoğrafları, sertifika görselleri)
• Hizmet verilerim (randevu geçmişi, değerlendirmeler, mesajlaşma içerikleri)

Verilerin İşlenme Amaçları
Kişisel verilerimin; üyelik hesabımın oluşturulması ve yönetilmesi, randevu hizmetlerinin sunulması, konum tabanlı hizmet eşleştirmesi, kullanıcılar arası iletişim, bildirim gönderimi ve hizmet kalitesinin iyileştirilmesi amacıyla işleneceğini,

Verilerin Aktarılması
Kişisel verilerimin; SMS doğrulama hizmeti sağlayıcıları (Twilio), bulut altyapı hizmeti sağlayıcıları ve yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarılabileceğini,

Veri Saklama
Kişisel verilerimin, hesabım aktif olduğu sürece ve yasal yükümlülükler kapsamında saklanacağını, hesap silme talebim halinde yasal süreler dahilinde silineceğini veya anonim hale getirileceğini,

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

Son Güncelleme: Şubat 2026

Bu gizlilik politikası, uygulamamızı kullanırken kişisel verilerinizin nasıl toplandığını, kullanıldığını ve korunduğunu açıklamaktadır.

1. Toplanan Veriler

Hesap Bilgileri:
• Ad ve soyad
• Telefon numarası
• Kullanıcı türü (müşteri, serbest berber, işletme)

Profil Bilgileri:
• Profil fotoğrafı
• İşletme fotoğrafları
• Berberlik ve güzellik uzmanı sertifika görselleri

Konum Verileri:
• Uygulama kullanımı sırasında konum bilginiz, yakınınızdaki hizmet sağlayıcıları göstermek amacıyla işlenir.
• Konum paylaşımı isteğe bağlıdır ve cihaz izinleri üzerinden kontrol edilir.

Hizmet Verileri:
• Randevu geçmişi ve detayları
• Verilen/alınan hizmetler ve fiyatlandırma
• Değerlendirmeler ve puanlar
• Mesajlaşma içerikleri (yalnızca ilgili taraflar görebilir)

2. Verilerin Kullanım Amaçları
• Hesap oluşturma ve kimlik doğrulama
• Randevu yönetimi ve hatırlatma bildirimleri
• Konum tabanlı hizmet eşleştirme
• Kullanıcılar arası güvenli iletişim
• Hizmet kalitesinin ölçülmesi ve iyileştirilmesi
• Uygulama güvenliğinin sağlanması

3. Üçüncü Taraf Hizmetler
Uygulamamız aşağıdaki üçüncü taraf hizmetleri kullanmaktadır:
• Twilio: SMS ile kimlik doğrulama (OTP) gönderimi için
• Firebase: Bildirim gönderimi ve analitik hizmetleri için
• Bulut Sunucu Altyapısı: Veri depolama ve uygulama barındırma için

Bu hizmet sağlayıcılar, kendi gizlilik politikaları çerçevesinde verilerinizi işlemektedir.

4. Veri Güvenliği
• Verileriniz şifreli bağlantılar (HTTPS/TLS) üzerinden aktarılmaktadır.
• Parolalar ve hassas veriler şifrelenmiş olarak saklanmaktadır.
• Düzenli güvenlik denetimleri ve güncellemeler yapılmaktadır.
• Yetkisiz erişime karşı teknik ve idari önlemler alınmaktadır.

5. Veri Saklama
• Hesabınız aktif olduğu sürece verileriniz saklanır.
• Hesap silme talebiniz halinde verileriniz 30 gün içinde silinir veya anonim hale getirilir.
• Yasal yükümlülükler gereği bazı veriler belirli sürelerde saklanmaya devam edebilir.

6. Kullanıcı Hakları
• Verilerinize erişim talep edebilirsiniz.
• Yanlış veya eksik verilerinizin düzeltilmesini isteyebilirsiniz.
• Verilerinizin silinmesini talep edebilirsiniz.
• Veri işleme faaliyetlerine itiraz edebilirsiniz.
• Verilerinizin taşınabilirliğini talep edebilirsiniz.

7. Çerezler ve İzleme
Mobil uygulamamız geleneksel çerezler kullanmamaktadır. Ancak cihaz tanımlayıcıları ve oturum bilgileri, uygulamanın düzgün çalışması için kullanılabilir.

8. Çocukların Gizliliği
Uygulamamız 18 yaşın altındaki bireylere yönelik değildir. Bilinçli olarak 18 yaşın altındaki kişilerden veri toplamıyoruz.

9. Politika Güncellemeleri
Bu gizlilik politikası zaman zaman güncellenebilir. Önemli değişiklikler hakkında uygulama içi bildirim ile bilgilendirilirsiniz.

10. İletişim
Gizlilik politikamız hakkında sorularınız için uygulama içi destek kanalı üzerinden bizimle iletişime geçebilirsiniz.`,
    },
  },

  en: {
    kvkk: {
      title: 'KVKK Disclosure Text',
      content: `DISCLOSURE TEXT UNDER THE LAW ON PROTECTION OF PERSONAL DATA (KVKK) NO. 6698

Data Controller
This disclosure text has been prepared to inform you in the capacity of data controller, within the scope of the Law on Protection of Personal Data No. 6698 ("KVKK").

Personal Data Collected
The following personal data is collected and processed through our application:
• Identity Information: First name, last name
• Contact Information: Phone number
• Location Information: Live location data (to show nearby barbers/hairdressers)
• Visual Data: Profile photos, business photos, certificate images
• Service Data: Appointment history, services provided/received, reviews and ratings
• Transaction Security: Device information, session data

Purposes of Processing
Your personal data is processed for the following purposes:
• Creation and management of your membership account
• Providing appointment creation, tracking and management services
• Providing location-based barber/hairdresser matching service
• Evaluating and improving service quality
• Enabling communication between users (messaging)
• Sending notifications (appointment reminders, status updates)
• Fulfilling legal obligations

Legal Basis
Your personal data is processed based on your explicit consent, performance of a contract, legal obligations, and legitimate interests.

Transfer of Personal Data
Your personal data may be transferred to the following recipient groups for the purpose of providing services:
• SMS verification service providers (Twilio)
• Cloud infrastructure service providers
• Authorized public institutions and organizations when legally required

Data Retention Period
Your personal data is stored for the duration required by the processing purposes and within the scope of legal obligations. Upon your request to delete your account, your data will be deleted or anonymized within legal periods.

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
• My identity information (first name, last name)
• My contact information (phone number)
• My location information (to see nearby service providers)
• My visual data (profile photos, business photos, certificate images)
• My service data (appointment history, reviews, messaging content)

Purposes of Processing
My personal data will be processed for the purposes of creating and managing my membership account, providing appointment services, location-based service matching, communication between users, sending notifications, and improving service quality.

Transfer of Data
My personal data may be transferred to SMS verification service providers (Twilio), cloud infrastructure service providers, and authorized public institutions when legally required.

Data Retention
My personal data will be stored as long as my account is active and within the scope of legal obligations. Upon my request to delete my account, my data will be deleted or anonymized within legal periods.

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

Last Updated: February 2026

This privacy policy explains how your personal data is collected, used, and protected when using our application.

1. Data Collected

Account Information:
• First and last name
• Phone number
• User type (customer, freelance barber, business)

Profile Information:
• Profile photo
• Business photos
• Barber and beauty professional certificate images

Location Data:
• Your location is processed during app usage to show nearby service providers.
• Location sharing is optional and controlled through device permissions.

Service Data:
• Appointment history and details
• Services provided/received and pricing
• Reviews and ratings
• Messaging content (only visible to relevant parties)

2. Purposes of Data Use
• Account creation and identity verification
• Appointment management and reminder notifications
• Location-based service matching
• Secure communication between users
• Measuring and improving service quality
• Ensuring application security

3. Third-Party Services
Our application uses the following third-party services:
• Twilio: For SMS identity verification (OTP) delivery
• Firebase: For notification delivery and analytics services
• Cloud Server Infrastructure: For data storage and application hosting

These service providers process your data within the framework of their own privacy policies.

4. Data Security
• Your data is transmitted over encrypted connections (HTTPS/TLS).
• Passwords and sensitive data are stored encrypted.
• Regular security audits and updates are performed.
• Technical and administrative measures are taken against unauthorized access.

5. Data Retention
• Your data is retained as long as your account is active.
• Upon your request to delete your account, your data will be deleted or anonymized within 30 days.
• Some data may continue to be stored for certain periods due to legal obligations.

6. User Rights
• You can request access to your data.
• You can request correction of incorrect or incomplete data.
• You can request deletion of your data.
• You can object to data processing activities.
• You can request data portability.

7. Cookies and Tracking
Our mobile application does not use traditional cookies. However, device identifiers and session information may be used for the proper functioning of the application.

8. Children's Privacy
Our application is not intended for individuals under the age of 18. We do not knowingly collect data from individuals under 18.

9. Policy Updates
This privacy policy may be updated from time to time. You will be notified of significant changes through in-app notifications.

10. Contact
For questions about our privacy policy, you can contact us through the in-app support channel.`,
    },
  },

  ar: {
    kvkk: {
      title: 'نص إفصاح KVKK',
      content: `نص الإفصاح بموجب قانون حماية البيانات الشخصية (KVKK) رقم 6698

مراقب البيانات
تم إعداد نص الإفصاح هذا لإبلاغكم بصفة مراقب البيانات، في نطاق قانون حماية البيانات الشخصية رقم 6698 ("KVKK").

البيانات الشخصية المجمعة
يتم جمع ومعالجة البيانات الشخصية التالية من خلال تطبيقنا:
• معلومات الهوية: الاسم الأول، اسم العائلة
• معلومات الاتصال: رقم الهاتف
• معلومات الموقع: بيانات الموقع المباشر (لعرض الحلاقين/مصففي الشعر القريبين)
• البيانات المرئية: صور الملف الشخصي، صور المنشأة، صور الشهادات
• بيانات الخدمة: سجل المواعيد، الخدمات المقدمة/المتلقاة، التقييمات والنقاط
• أمن المعاملات: معلومات الجهاز، بيانات الجلسة

أغراض المعالجة
تتم معالجة بياناتكم الشخصية للأغراض التالية:
• إنشاء وإدارة حساب عضويتكم
• تقديم خدمات إنشاء المواعيد وتتبعها وإدارتها
• توفير خدمة مطابقة الحلاقين/مصففي الشعر بناءً على الموقع
• تقييم جودة الخدمة وتحسينها
• تمكين التواصل بين المستخدمين (المراسلة)
• إرسال الإشعارات (تذكيرات المواعيد، تحديثات الحالة)
• الوفاء بالالتزامات القانونية

الأساس القانوني
تتم معالجة بياناتكم الشخصية بناءً على موافقتكم الصريحة، وتنفيذ العقد، والالتزامات القانونية، والمصالح المشروعة.

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
• معلومات هويتي (الاسم الأول، اسم العائلة)
• معلومات الاتصال الخاصة بي (رقم الهاتف)
• معلومات موقعي (لرؤية مقدمي الخدمات القريبين)
• بياناتي المرئية (صور الملف الشخصي، صور المنشأة، صور الشهادات)
• بيانات الخدمة الخاصة بي (سجل المواعيد، التقييمات، محتوى الرسائل)

أغراض المعالجة
ستتم معالجة بياناتي الشخصية لأغراض إنشاء وإدارة حساب عضويتي، وتقديم خدمات المواعيد، ومطابقة الخدمات بناءً على الموقع، والتواصل بين المستخدمين، وإرسال الإشعارات، وتحسين جودة الخدمة.

نقل البيانات
قد يتم نقل بياناتي الشخصية إلى مزودي خدمة التحقق عبر الرسائل القصيرة (Twilio)، ومزودي البنية التحتية السحابية، والمؤسسات العامة المختصة عند الاقتضاء قانونياً.

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

آخر تحديث: فبراير 2026

توضح سياسة الخصوصية هذه كيفية جمع بياناتكم الشخصية واستخدامها وحمايتها عند استخدام تطبيقنا.

1. البيانات المجمعة
• الاسم ورقم الهاتف
• صور الملف الشخصي وصور المنشأة
• بيانات الموقع (لعرض مقدمي الخدمات القريبين)
• سجل المواعيد والتقييمات ومحتوى الرسائل

2. أغراض الاستخدام
• إنشاء الحساب والتحقق من الهوية
• إدارة المواعيد وإرسال الإشعارات
• مطابقة الخدمات بناءً على الموقع
• التواصل الآمن بين المستخدمين

3. خدمات الطرف الثالث
• Twilio: للتحقق عبر الرسائل القصيرة
• Firebase: لخدمات الإشعارات والتحليلات
• البنية التحتية السحابية: لتخزين البيانات

4. أمن البيانات
• يتم نقل بياناتكم عبر اتصالات مشفرة (HTTPS/TLS).
• يتم تخزين كلمات المرور والبيانات الحساسة بشكل مشفر.

5. حقوق المستخدم
• يمكنكم طلب الوصول إلى بياناتكم أو تصحيحها أو حذفها.
• يمكنكم الاعتراض على أنشطة معالجة البيانات.

6. الاتصال
لأي استفسارات حول سياسة الخصوصية، يمكنكم التواصل معنا عبر قناة الدعم داخل التطبيق.`,
    },
  },

  de: {
    kvkk: {
      title: 'KVKK-Datenschutzerklärung',
      content: `AUFKLÄRUNGSTEXT GEMÄẞ DEM GESETZ ZUM SCHUTZ PERSONENBEZOGENER DATEN (KVKK) NR. 6698

Verantwortlicher
Dieser Aufklärungstext wurde erstellt, um Sie in der Eigenschaft als Verantwortlicher im Rahmen des Gesetzes zum Schutz personenbezogener Daten Nr. 6698 ("KVKK") zu informieren.

Erhobene personenbezogene Daten
Folgende personenbezogene Daten werden über unsere Anwendung erhoben und verarbeitet:
• Identitätsdaten: Vorname, Nachname
• Kontaktdaten: Telefonnummer
• Standortdaten: Live-Standortdaten (um nahegelegene Friseure anzuzeigen)
• Visuelle Daten: Profilfotos, Geschäftsfotos, Zertifikatsbilder
• Servicedaten: Terminverlauf, erbrachte/erhaltene Dienstleistungen, Bewertungen
• Transaktionssicherheit: Geräteinformationen, Sitzungsdaten

Zwecke der Verarbeitung
Ihre personenbezogenen Daten werden zu folgenden Zwecken verarbeitet:
• Erstellung und Verwaltung Ihres Mitgliedskontos
• Bereitstellung von Terminerstellungs-, Verfolgungs- und Verwaltungsdiensten
• Bereitstellung standortbasierter Friseur-Matching-Dienste
• Bewertung und Verbesserung der Servicequalität
• Ermöglichung der Kommunikation zwischen Benutzern
• Versand von Benachrichtigungen
• Erfüllung gesetzlicher Verpflichtungen

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
• Meine Identitätsdaten (Vorname, Nachname)
• Meine Kontaktdaten (Telefonnummer)
• Meine Standortdaten (um nahegelegene Dienstleister anzuzeigen)
• Meine visuellen Daten (Profilfotos, Geschäftsfotos, Zertifikatsbilder)
• Meine Servicedaten (Terminverlauf, Bewertungen, Nachrichteninhalte)

Zwecke der Verarbeitung
Meine personenbezogenen Daten werden zum Zwecke der Erstellung und Verwaltung meines Mitgliedskontos, der Bereitstellung von Termindiensten, der standortbasierten Dienstleistungszuordnung, der Kommunikation zwischen Benutzern, des Versands von Benachrichtigungen und der Verbesserung der Servicequalität verarbeitet.

Übertragung von Daten
Meine personenbezogenen Daten können an SMS-Verifizierungsdienstleister (Twilio), Cloud-Infrastrukturdienstleister und zuständige öffentliche Einrichtungen bei gesetzlicher Erforderlichkeit übertragen werden.

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

Letzte Aktualisierung: Februar 2026

Diese Datenschutzrichtlinie erläutert, wie Ihre personenbezogenen Daten bei der Nutzung unserer Anwendung erhoben, verwendet und geschützt werden.

1. Erhobene Daten
• Name und Telefonnummer
• Profilfotos und Geschäftsfotos
• Standortdaten (zur Anzeige nahegelegener Dienstleister)
• Terminverlauf, Bewertungen und Nachrichteninhalte

2. Verwendungszwecke
• Kontoerstellung und Identitätsüberprüfung
• Terminverwaltung und Erinnerungsbenachrichtigungen
• Standortbasierte Service-Zuordnung
• Sichere Kommunikation zwischen Benutzern

3. Drittanbieterdienste
• Twilio: Für SMS-Identitätsüberprüfung
• Firebase: Für Benachrichtigungs- und Analysedienste
• Cloud-Infrastruktur: Für Datenspeicherung

4. Datensicherheit
• Ihre Daten werden über verschlüsselte Verbindungen (HTTPS/TLS) übertragen.
• Passwörter und sensible Daten werden verschlüsselt gespeichert.

5. Benutzerrechte
• Sie können Zugang zu Ihren Daten, deren Berichtigung oder Löschung verlangen.
• Sie können der Datenverarbeitung widersprechen.

6. Kontakt
Bei Fragen zu unserer Datenschutzrichtlinie können Sie uns über den In-App-Support-Kanal kontaktieren.`,
    },
  },
};

export const getLegalDocuments = (lang: string): Record<LegalDocumentType, LegalDocument> => {
  const language = lang as Language;
  return legalTexts[language] || legalTexts.tr;
};
