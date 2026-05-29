/**
 * Unified Message Handler
 * Backend'den gelen tüm mesajları (error ve success) işler ve kullanıcı dostu mesajlara çevirir
 * 
 * Kullanım:
 *   import { getErrorMessage, getMessage } from '../utils/errorHandler';
 *   
 *   // Error için:
 *   const errorMsg = getErrorMessage(error);
 *   
 *   // Success mesajı için:
 *   const successMsg = getMessage(result.message);
 */

import i18n from '../i18n/config';

// ============================================================================
// MESSAGE MAPPINGS
// ============================================================================

/**
 * Backend mesajlarını frontend i18n key'lerine map eden obje
 * Backend Messages.cs, FluentValidation ve hardcoded mesajlar burada birleştirildi
 */
const messageToKeyMap: Record<string, string> = {
  // ============================================================================
  // APPOINTMENT MESSAGES
  // ============================================================================
  'Randevu bulunamadı': 'errors.appointmentNotFound',
  'Randevu süresi dolmuş': 'errors.appointmentExpired',
  'Randevu zaten tamamlanmış': 'errors.appointmentAlreadyCompleted',
  'Randevu zaten iptal edilmiş': 'errors.appointmentAlreadyCancelled',
  'İptal edilemez': 'errors.appointmentCannotBeCancelled',
  'Randevu saati dolduktan sonra iptal edilemez, yalnızca tamamlanabilir.': 'errors.appointmentCannotBeCancelledAfterTimePassed',
  'Randevu süresi dolmadan tamamlanamaz': 'errors.appointmentTimeNotPassed',
  'Kabul edilmemiş randevu': 'errors.appointmentNotApproved',
  'Beklemede değil': 'errors.appointmentNotPending',
  'Bekleme yok': 'errors.appointmentNotPendingStatus',
  'Karar zaten verilmiş': 'errors.appointmentDecisionAlreadyGiven',
  'Bu randevu zamanı başka bir kullanıcı tarafından alındı. Lütfen başka bir saat seçin.': 'errors.duplicateSlot',
  'Bu koltuk için seçilen saat aralığında başka bir randevu var.': 'errors.appointmentSlotOverlap',
  'Bitiş tarihi başlangıçtan önce olamaz.': 'errors.availabilityRangeInvalid',
  'Müsaitlik aralığı en fazla 7 gün olabilir.': 'errors.availabilityRangeTooLarge',
  'Geçmiş tarih için randevu alınamaz.': 'errors.appointmentPastDate',
  'Geçmiş saat için randevu alınamaz.': 'errors.appointmentPastTime',
  'Randevu süresi dolmuş (yanıtlanmadı).': 'errors.appointmentTimeoutExpired',
  'Randevu başarıyla oluşturuldu.': 'booking.appointmentCreated',
  'Randevu onaylandı.': 'appointment.alerts.approved',
  'Randevu reddedildi.': 'appointment.alerts.rejected',
  'Randevu iptal edildi.': 'appointment.alerts.cancelled',
  'Randevu tamamlandı.': 'appointment.alerts.completed',
  'Bu randevuya dükkan eklenemez.': 'errors.appointmentCannotAddStore',
  'Bu randevuda serbest berber onay adımı yok. Dükkan seçimi bekleniyor.': 'errors.freebarberApprovalStepNotAvailable',
  'Müşteri onay verdiği için bu randevu artık reddedilemez.': 'notification.cannotRejectAfterCustomerApproval',
  'Randevu onaylandı, artık red edemezsiniz.': 'errors.cannotRejectAfterApproval',
  'Randevu iptal edildi, artık red edemezsiniz.': 'errors.cannotRejectAfterCancellation',
  'Randevu tamamlandı, artık red edemezsiniz.': 'errors.cannotRejectAfterCompletion',
  'Reddetme süresi doldu.': 'errors.rejectionTimeoutExpired',
  'Serbest berber onayı bekleniyor.': 'errors.freebarberApprovalPending',
  'Bu randevu için müşteri kararı verilemez.': 'errors.customerDecisionNotAllowed',
  'Dükkan onayı bekleniyor.': 'errors.storeApprovalPending',
  'Pending veya Approved durumundaki randevular silinemez': 'errors.cannotDeletePendingOrApproved',
  'Beklemede veya onaylanmış durumdaki randevular silinemez.': 'errors.cannotDeletePendingOrApproved',
  'Silinecek randevu bulunamadı.': 'errors.appointmentNotFoundForDelete',
  'Hiçbir randevu silinemedi. {0} adet randevu Pending veya Approved durumunda.': 'errors.noAppointmentsDeleted',
  'Hiçbir randevu silinemedi. {0} adet randevu beklemede veya onaylanmış durumda.': 'errors.noAppointmentsDeleted',
  'Randevu tarihi zorunludur.': 'booking.appointmentDateRequired',
  'Randevu notu zorunludur.': 'booking.appointmentNoteRequired',

    'İptal nedeni en fazla 500 karakter olabilir.': 'errors.backendAppointmentCancellationReasonTooLong',
  'Randevu oluşturmak için önce serbest berber panelinizi oluşturmanız gerekmektedir.': 'errors.backendFreeBarberPanelRequired',
  'Bu hizmet bir veya daha fazla pakette kullanılıyor. Önce ilgili paketlerden çıkarın veya paketleri güncelleyin.': 'errors.backendServiceOfferingUsedInPackages',
  'Bekleyen veya onaylanmış randevunuz varken hesabınızı silemezsiniz. Önce randevularınızı tamamlayın, iptal edin veya sonuçlanmasını bekleyin.': 'errors.backendAccountDeleteBlockedByActiveAppointments',
  'Engelleme nedeniyle bu randevu üzerinde onay veya red veremezsiniz.': 'errors.backendUserBlockedCannotDecideAppointment',
  'Randevun oluşturuldu': 'errors.backendAppointmentCreatedNotification',
  'Randevu onaylandı': 'errors.backendAppointmentApprovedNotification',
  'Randevu reddedildi': 'errors.backendAppointmentRejectedNotification',
  'Randevu iptal edildi': 'errors.backendAppointmentCancelledNotification',
  'Randevu tamamlandı': 'errors.backendAppointmentCompletedNotification',
  'Randevu yanıtlanmadı': 'errors.backendAppointmentUnansweredNotification',
  'Kullanıcı Yetkileri Eklendi': 'errors.backendUserOperationClaimsAddedSuccess',
  'Kullanıcı yetkileri bulunamadı': 'errors.backendUserOperationClaimsNotFound',
  'Yetkiler getirilemedi': 'errors.backendOperationClaimsGetFailed',
  'Müşteri': 'errors.backendChatThreadTitleCustomer',
  'Serbest Berber': 'errors.backendChatThreadTitleFreeBarber',
  'Berber Dükkanı': 'errors.backendChatThreadTitleBarberStore',
  'Bildirim': 'errors.backendNotificationDefault',
  'Yeni randevu isteği': 'errors.backendNotificationNewAppointmentRequest',
  'Yeni randevu talebi': 'errors.backendNotificationNewAppointmentRequestForStore',
  'Geçersiz hedef. Sadece Store ID, FreeBarber ID veya Customer UserId ile değerlendirme yapılabilir. ManuelBarber\'a değerlendirme yapılamaz.': 'errors.backendInvalidTargetForRating',
  'Engellediğiniz veya sizi engelleyen kullanıcılar favorilenemez.': 'errors.backendCannotFavoriteBlockedUser',
  'Bu metod sadece favori thread\'ler için kullanılabilir': 'errors.backendMethodOnlyForFavoriteThreads',
  'Mesaj gönderebilmek için bu kişiyi favorilerinize eklemelisiniz.': 'errors.backendFavoriteRequiredToSend',
  'Mesajları görüntüleyebilmek için bu kişiyi favorilerinize eklemelisiniz.': 'errors.backendFavoriteRequiredToReadMessages',
  'Bu konuşmaya erişmek için karşı tarafı favorilerinize ekleyin.': 'errors.backendThreadRestrictedNoFavorite',
  'Müsait değilken panelinizi silemezsiniz. Önce müsait olarak işaretleyin.': 'errors.backendFreeBarberNotAvailableCannotDeletePanel',
  'Filtrelenmiş serbest berberler getirildi': 'errors.backendFilteredFreeBarbersRetrieved',
  '1 Kilometreye sınırdaki berberler getirildi': 'errors.backendNearbyBarbersRetrieved',
  'Filtrelenmiş berber dükkanları getirildi': 'errors.backendFilteredBarberStoresRetrieved',
  'Kategori Eklendi': 'errors.backendCategoryAddedSuccess',
  'Kategori Silindi': 'errors.backendCategoryDeletedSuccess',
  'Ana kategoriler getirildi': 'errors.backendMainCategoriesRetrieved',
  'Alt kategoriler getirildi': 'errors.backendSubCategoriesRetrieved',
  'Kategoriler getirildi': 'errors.backendCategoriesRetrieved',
  'Resim sahibi ID\'si boş olamaz': 'errors.backendImageOwnerIdRequired',
  'Resim ID\'si boş olamaz': 'errors.backendImageIdRequired',
  'Dosya boş veya gönderilmedi.': 'errors.backendUploadFileRequired',
  'Profil ve galeri uploadlarında yalnızca resim dosyaları kabul edilir.': 'errors.backendUploadOnlyImagesAllowed',
  'Berber': 'errors.backendBarberDefaultName',
  'Kullanıcı': 'errors.backendUserDefaultName',
  'Hesabınız askıya alınmıştır. Sebep: {0}': 'errors.backendUserBannedWithReason',
  'Kullanıcı başarıyla engellendi.': 'errors.backendUserBannedSuccess',
  'Kullanıcı engeli başarıyla kaldırıldı.': 'errors.backendUserUnbannedSuccess',
  'Aboneliğiniz sona ermiştir. Uygulamayı kullanmaya devam etmek için lütfen yenileyiniz.': 'errors.backendSubscriptionExpired',
  'Hizmet paketi bulunamadı.': 'errors.backendServicePackageNotFound',
  'En fazla 20 hizmet paketi ekleyebilirsiniz.': 'errors.backendServicePackageLimitReached',
  'Aynı hizmetleri içeren bir paket zaten mevcut. En az bir farklı hizmet ekleyin.': 'errors.backendServicePackageDuplicateServices',
  'Bu paketin aktif veya bekleyen randevusu olduğundan silinemez/güncellenemez.': 'errors.backendServicePackageHasActiveAppointments',
  'Hizmet paketi başarıyla eklendi.': 'errors.backendServicePackageAddedSuccess',
  'Hizmet paketi başarıyla güncellendi.': 'errors.backendServicePackageUpdatedSuccess',
  'Hizmet paketi başarıyla silindi.': 'errors.backendServicePackageDeletedSuccess',
  'Seçilen hizmetlerden bazıları bulunamadı.': 'errors.backendServicePackageServiceNotFound',
  'Hizmet paketi başka bir işlem tarafından güncellendi veya silindi. Lütfen listeyi yenileyip tekrar deneyin.': 'errors.backendServicePackageModifiedByAnotherProcess',
  'Randevu için ya hizmet ya da paket seçilmelidir, ikisi birden seçilemez.': 'errors.backendServicePackageOrServiceRequired',
  'Seçilen paketlerden biri, ayrıca seçtiğiniz hizmetlerden biriyle çakışıyor. Paket yalnızca seçmediğiniz hizmetleri içerebilir.': 'errors.backendServicePackageOverlapsSelectedServices',
  'Seçilen paketlerin bazıları ortak hizmet içeriyor. Aynı hizmeti içeren birden fazla paket seçilemez.': 'errors.backendServicePackageConflictingServices',
  'Seçilen paketler bu kullanıcıya ait değil.': 'errors.backendServicePackageOwnerMismatch',
  'En az bir hizmet veya paket seçilmelidir.': 'errors.backendServiceOfferingOrPackageRequired',
  'Bu isimde kayıtlı bir filtre zaten var.': 'errors.backendSavedFilterNameAlreadyExists',
  'Aynı filtre kriterleriyle kayıtlı bir filtre zaten var.': 'errors.backendSavedFilterCriteriaAlreadyExists',
  'Bu filtreyi düzenleme yetkiniz yok.': 'errors.backendSavedFilterNotOwner',
  'Kayıtlı filtre verisi geçersiz.': 'errors.backendSavedFilterInvalidCriteriaJson',
// ============================================================================
  // NOTIFICATION MESSAGES
  // ============================================================================
  'Randevuyu Cevaplamadınız': 'notification.appointmentUnanswered',
  'Randevunuz Cevaplanamadı': 'notification.appointmentUnansweredOther',
  'Silinecek bildirim bulunamadı.': 'errors.notificationNotFoundForDelete',
  'Silinecek bildirim bulunamadı. Tüm bildirimler Pending veya Approved durumundaki randevulara ait.': 'errors.notificationsNotFoundForDelete',
  'Silinecek bildirim bulunamadı; kalan bildirimlerin tamamı beklemede veya onaylanmış randevuya ait.': 'errors.notificationsNotFoundForDelete',
  'Silinecek bildirim bulunamadı; kalan bildirimlerin tamamı aksiyon bekleyen randevulara ait.': 'errors.notificationsNotFoundForDelete',
  'Pending veya Approved durumundaki randevuların bildirimleri silinemez': 'errors.cannotDeleteNotificationForActiveAppointment',
  'Bekleyen veya onaylanmış bir randevuya ait bildirim silinemez.': 'errors.cannotDeleteNotificationForActiveAppointment',
  'Aksiyon bekleyen bir randevuya ait bildirim silinemez.': 'errors.cannotDeleteNotificationForActiveAppointment',
  'Randevu için alıcı bulunamadı.': 'errors.appointmentRecipientNotFound',

  // ============================================================================
  // STORE MESSAGES
  // ============================================================================
  'Dükkan bulunamadı': 'errors.storeNotFound',
  'Dükkan bulunamadı veya sahibi değilsiniz': 'errors.storeNotFound',
  'Store not found': 'errors.storeNotFound',
  'Store not found or not owner': 'errors.storeNotFound',
  'Dükkanın zaten aktif bir randevusu var.': 'errors.storeHasActiveAppointments',
  // Eski backend metni (geriye dönük); yeni metin Messages.StoreAlreadyHasActiveAppointmentWithThisFreeBarber
  'Bu dükkanınızın bu serbest berber ile aktif bir randevusu var. Önce onu sonuçlandırın.':
    'errors.storeAlreadyCalledThisFreeBarber',
  'Bu işletmenizde bu serbest berber için zaten bekleyen veya aktif bir çağrınız var. Önce onu sonuçlandırın.':
    'errors.storeAlreadyCalledThisFreeBarber',
  'Dükkan bu saat aralığında açık değil': 'errors.storeNotOpen',
  'Dükkan bu gün kapalı (tatil)': 'errors.storeClosed',
  'Dükkan bu gün için çalışma saati tanımlamamış (kapalı)': 'errors.storeNoWorkingHours',
  // Store Owner kendi dükkanına FreeBarber çağırma senaryosu — net mesajlar
  'Dükkanınız şu anda çalışma saatleri aralığında değil. Lütfen çalışma saatlerinizi güncelleyin veya açık olduğunuz bir saatte tekrar deneyin.': 'errors.ownStoreNotOpenNow',
  'Dükkanınız bugün kapalı (tatil) olarak işaretli. Bu yüzden serbest berber çağrısı yapılamaz.': 'errors.ownStoreClosedToday',
  'Dükkanınız bugün için çalışma saati tanımlamamış. Önce çalışma saatlerinizi ayarlayın.': 'errors.ownStoreNoWorkingHoursToday',
  'Dükkanın aktif bir serbest berber çağrısı var. Önce onu sonuçlandır.': 'errors.storeHasActiveCall',
  'Bu dükkana ait aktif veya bekleyen randevu var önce müsait olmalısınız ': 'errors.storeHasActiveAppointments',
  'Berber dükkanı başarıyla oluşturuldu.': 'form.storeCreateSuccess',
  'Berber dükkanı başarıyla güncellendi.': 'form.storeUpdateSuccess',
  'Dükkan silindi.': 'errors.storeDeleted',
  'Dükkan seçimi zorunludur.': 'booking.storeSelectionRequired',

  // ============================================================================
  // CHAIR MESSAGES
  // ============================================================================
  'Koltuk bulunamadı': 'errors.chairNotFound',
  'Koltuk dükkanda bulunamadı': 'errors.chairNotInStore',
  'Koltuk seçimi gereklidir.': 'errors.chairRequired',
  'Koltuk seçimi zorunludur.': 'errors.chairRequired',

  // ============================================================================
  // FREE BARBER MESSAGES
  // ============================================================================
  'Serbest berber bulunamadı': 'errors.freebarberNotFound',
  'Serbest berber şu an müsait değil': 'errors.freebarberNotAvailable',
  'Şu anda müsait değilsiniz; randevu alabilmek için müsait olmalısınız.': 'errors.freebarberSelfNotAvailable',
  'Serbest berber koordinatları geçersiz': 'errors.freebarberInvalidCoordinates',
  // Eski 10 km mesajları (geriye dönük uyumluluk) + yeni "izin verilen mesafe" varyantları
  'Serbest berber 10 km dışında. Yakın değilken randevu oluşturamazsın.': 'errors.freebarberDistanceExceeded',
  'Serbest berber ile dükkan arası 10 km dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.freebarberStoreDistanceExceeded',
  'Dükkan ile serbest berber arası 10 km dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.storeFreebarberDistanceExceeded',
  'Serbest berber, izin verilen mesafenin dışında. Bu konumdan randevu oluşturulamaz.': 'errors.freebarberDistanceExceeded',
  'Serbest berber ile dükkan arası, izin verilen mesafenin dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.freebarberStoreDistanceExceeded',
  'Dükkan ile serbest berber arası, izin verilen mesafenin dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.storeFreebarberDistanceExceeded',
  'Serbest berber seçimi gereklidir.': 'errors.freebarberUserIdRequired',
  'Serbest berber seçimi zorunludur.': 'errors.freebarberUserIdRequired',
  'Dükkan randevusunda serbest berber seçilemez.': 'errors.freebarberNotAllowedForStoreAppointment',
  'Serbest berber ID\'si request body\'de gönderilmemelidir.': 'errors.syncFreeBarberIdNotInBody',
  'Bu serbest berberi güncelleme yetkiniz yok': 'errors.freebarberUpdateUnauthorized',
  'Zaten bir serbest berber paneliniz bulunmaktadır. Her kullanıcının sadece bir paneli olabilir.': 'errors.freebarberPanelAlreadyExists',
  'Serbest berberin aktif (Bekleyen/Onaylanmış) randevusu var.': 'errors.freebarberHasActiveAppointment',
  'Serbest berberin zaten aktif bir randevusu var.': 'errors.freebarberHasActiveAppointment',
  'Randevu işleminiz bulunmaktadır. Lütfen işlemden sonra güncelleyiniz': 'errors.freebarberHasActiveAppointmentUpdate',
  'Serbest berber portalı başarıyla oluşturuldu.': 'form.freebarberCreateSuccess',
  'Serbest berber güncellendi.': 'form.freebarberUpdateSuccess',
  'Serbest berber silindi.': 'errors.freebarberDeleted',

  // ============================================================================
  // CUSTOMER MESSAGES
  // ============================================================================
  'Müşterinin aktif (Bekleyen/Onaylanmış) randevusu var.': 'errors.customerHasActiveAppointment',
  'Müşterinin aktif (Pending/Approved) randevusu var.': 'errors.customerHasActiveAppointment',
  'Zaten aktif bir randevunuz var. Önce onu tamamlayın.': 'errors.customerHasActiveAppointment',
  'Dükkan 10 km dışında. Yakın değilken randevu oluşturamazsın.': 'errors.customerDistanceExceeded',

  // ============================================================================
  // VALIDATION MESSAGES
  // ============================================================================
  'Geçersiz tarih': 'errors.invalidDate',
  'Geçersiz saat': 'errors.invalidTime',
  'Randevu tarihi geçmişte olamaz.': 'errors.appointmentDateCannotBePast',
  'Başlangıç saati bitişten büyük/eşit olamaz.': 'errors.startTimeGreaterThanEndTime',
  'Başlangıç ve bitiş saati gereklidir.': 'errors.timeRequired',
  'Konum bilgisi gerekli (RequestLatitude/RequestLongitude).': 'errors.locationRequired',
  'En az bir hizmet seçilmelidir': 'errors.serviceOfferingRequired',
  'En az bir hizmet seçilmelidir.': 'form.atLeastOneService',
  'Hizmet seçimi zorunludur.': 'form.atLeastOneService',
  'Seçilen hizmetler bu kullanıcıya ait değil.': 'errors.serviceOfferingOwnerMismatch',
  'Randevu bitiş zamanı hesaplanamadı.': 'errors.appointmentEndTimeCalculationFailed',
  'Dükkan seçim tipi bu senaryoda kullanılamaz.': 'errors.invalidStoreSelectionType',
  'Dükkan seç senaryosunda storeid gönderilemez.': 'errors.invalidStoreSelectionType',
  'Dükkan seç senaryosunda hizmet seçilemez.': 'errors.invalidStoreSelectionType',
  'Geçersiz dükkan seçim tipi.': 'errors.invalidStoreSelectionType',

  // ============================================================================
  // FORM VALIDATION MESSAGES (FluentValidation)
  // ============================================================================
  'İşletme adı zorunludur.': 'form.storeNameRequired',
  'Geçerli bir işletme türü seçilmelidir.': 'form.storeTypeRequired',
  'Geçerli bir koltuk fiyat hizmeti seçilmelidir.': 'form.pricingType',
  'Adres açıklaması zorunludur.': 'form.addressRequired',
  'Geçerli bir enlem değeri giriniz (-90..90).': 'form.locationRequired',
  'Geçerli bir boylam değeri giriniz (-180..180).': 'form.locationRequired',
  'Vergi levhası resmi zorunludur.': 'form.taxDocumentRequired',
  'Fiyat girilmelidir.': 'form.priceRequired',
  'Fiyat 0\'dan büyük olmalıdır.': 'form.priceRequired',
  'Yüzdelik girilmelidir.': 'form.percentRequired',
  'Yüzdelik 0\'dan büyük olmalıdır.': 'form.percentRequired',
  'Yüzdelik 100\'ü geçemez.': 'form.percentMax',
  'En az bir koltuk eklenmelidir.': 'form.minChairs',
  'Berber atanmadıysa koltuk adı zorunludur.': 'form.chairNameRequired',
  'Manuel berber adı zorunludur.': 'form.barberNameRequired',
  'Berber sayısı 30\'u geçemez.': 'form.maxBarbers',
  'Koltuk sayısı 30\'u geçemez.': 'form.maxChairs',
  'En az bir hizmet girilmelidir.': 'form.atLeastOneService',
  'Hizmet adı boş olamaz.': 'form.serviceNameRequired',
  'Hizmet fiyatı 0\'dan büyük olmalıdır.': 'form.priceRequired',
  'Hizmet adları benzersiz olmalıdır.': 'form.duplicateServiceName',
  'Çalışma saatleri zorunludur.': 'form.workingHoursRequired',
  'En az bir çalışma günü girilmelidir.': 'form.workingDaysRequired',
  'Her gün için tek bir çalışma kaydı olmalıdır.': 'form.duplicateWorkingDay',
  'Başlangıç saati zorunludur.': 'form.startTimeRequired',
  'Başlangıç saati HH:mm formatında olmalı.': 'form.startTimeFormat',
  'Bitiş saati zorunludur.': 'form.endTimeRequired',
  'Bitiş saati HH:mm formatında olmalı.': 'form.endTimeFormat',
  'Başlangıç saati bitiş saatinden küçük olmalı.': 'form.endTimeGreater',
  'Başlangıç saati bitiş saatinden küçük olmalıdır.': 'form.endTimeGreater',
  'Çalışma aralığı 1 saatlik aralıklarla seçilmeli.': 'form.workingHoursInterval',
  'Çalışma aralığı 1 saatlik slotlara tam bölünebilmeli.': 'form.workingHoursInterval',
  'Çalışma süresi en az 6 ve en fazla 18 saat olmalı.': 'form.workDurationMin',
  'İsim zorunludur': 'form.nameRequired',
  'İsim en az 2 karakter olmalıdır': 'form.minLength',
  'İsim en fazla 20 karakter olabilir': 'form.maxLength',
  'İsim boşluk içeremez': 'form.noSpaces',
  'Soyisim zorunludur': 'form.surnameRequired',
  'Soyisim en az 2 karakter olmalıdır': 'form.minLength',
  'Soyisim en fazla 20 karakter olabilir': 'form.maxLength',
  'Soyisim boşluk içeremez': 'form.noSpaces',
  'Telefon numarası zorunludur': 'auth.phoneNumber',
  'Telefon numarası boş olamaz': 'auth.phoneNumber',
  'Telefon numarası +90 ile başlamalı ve 13 haneli olmalıdır': 'auth.phoneNumber',
  'Enlem (latitude) zorunludur.': 'form.locationRequired',
  'Enlem değeri -90 ile 90 arasında olmalıdır.': 'form.locationRequired',
  'Boylam (longitude) zorunludur.': 'form.locationRequired',
  'Boylam değeri -180 ile 180 arasında olmalıdır.': 'form.locationRequired',

  // ============================================================================
  // USER MESSAGES
  // ============================================================================
  'Kullanıcı bulunamadı.': 'errors.userNotFound',
  'Sadece müşteriler randevu oluşturabilir.': 'errors.onlyCustomersCanCreateAppointment',
  'Engellenen bir kullanıcıdan randevu alamazsınız.': 'errors.userBlockedCannotCreateAppointment',

  // ============================================================================
  // CHAT MESSAGES
  // ============================================================================
  'Sohbet sadece Bekleyen/Onaylanmış randevular için aktiftir.': 'errors.chatOnlyForActiveAppointments',
  'Chat is only allowed for Pending/Approved appointments': 'errors.chatOnlyForActiveAppointments',
  'Boş mesaj gönderilemez': 'errors.emptyMessage',
  'Empty message': 'errors.emptyMessage',
  'Sohbet kaydı bulunamadı': 'errors.chatThreadNotFound',
  'Chat thread bulunamadı': 'errors.chatThreadNotFound',
  'Sohbet bulunamadı': 'errors.chatNotFound',
  'Katılımcı bulunamadı': 'errors.participantNotFound',
  'Mesaj göndermek için randevu aktif olmalı veya karşılıklı favori olmalısınız.': 'chatMessages.messageRequiresActiveAppointmentOrFavorite',
  'Favori aktif değil, mesaj gönderilemez': 'chatMessages.favoriteNotActive',
  'Favori aktif değil': 'chatMessages.favoriteNotActiveForMessages',

  // ============================================================================
  // AUTHORIZATION MESSAGES
  // ============================================================================
  'Yetki yok': 'errors.unauthorized',
  'İşleme yetkiniz bulunmamaktadır': 'errors.unauthorizedOperation',
  'Bu randevuya katılımcı değilsiniz': 'errors.notAParticipant',

  // ============================================================================
  // MANUEL BARBER MESSAGES
  // ============================================================================
  'Berber bulunamadı': 'errors.manuelBarberNotFound',
  'Bu berberinize ait beklemekte olan veya aktif olan randevu işlemi vardır.': 'errors.manuelBarberHasActiveAppointments',
  'Manuel berber eklendi.': 'form.barberAddSuccess',
  'Manuel berber güncellendi.': 'form.barberUpdateSuccess',
  'Manuel berber silindi.': 'form.barberDeleteSuccess',

  // ============================================================================
  // RATING MESSAGES
  // ============================================================================
  'Değerlendirme başarıyla kaydedildi.': 'rating.ratingCreatedSuccess',
  'Değerlendirme başarıyla güncellendi.': 'rating.ratingUpdatedSuccess',
  'Değerlendirme silindi.': 'rating.ratingDeletedSuccess',
  'Değerlendirme bulunamadı.': 'rating.ratingNotFound',
  'Sadece tamamlanmış veya iptal edilmiş randevular için değerlendirme yapılabilir.': 'rating.ratingOnlyForCompleted',
  'Kendi kendinize değerlendirme yapamazsınız.': 'rating.cannotRateYourself',
  'Bu randevu için bu hedefe zaten değerlendirme yaptınız. Değerlendirme güncellenemez.': 'errors.ratingAlreadyExists',

  // ============================================================================
  // FAVORITE MESSAGES
  // ============================================================================
  'Favorilere eklendi.': 'favorites.addedSuccess',
  'Favori güncellendi.': 'favorites.updatedSuccess',
  'Favorilerden çıkarıldı.': 'favorites.removedSuccess',
  'Favori bulunamadı.': 'favorites.notFound',
  'Favoriden çıkarıldı.': 'favorites.removedSuccess',
  'Kendi kendinizi favorilere ekleyemezsiniz.': 'favorites.cannotFavoriteYourself',
  'Hedef kullanıcı bulunamadı.': 'favorites.targetUserNotFound',
  'Target user not found': 'favorites.targetUserNotFound',
  'Randevu sayfasından favorileme için randevunuzun sonuçlanması gerekir.': 'errors.appointmentMustBeCompletedForFavorite',

  // ============================================================================
  // IMAGE MESSAGES
  // ============================================================================
  'Resim bulunamadı.': 'errors.imageNotFound',
  'Resim URL\'i bulunamadı.': 'errors.imageUrlNotFound',
  'Resim başarıyla yüklendi.': 'image.uploadSuccess',
  'Resim başarıyla güncellendi.': 'image.updateSuccess',

  // ============================================================================
  // AUTH MESSAGES
  // ============================================================================
  'Geçersiz kullanıcı tipi.': 'errors.invalidUserType',
  'Geçersiz refresh token.': 'errors.invalidRefreshToken',
  'Müşteri numarası oluşturulamadı. Lütfen tekrar deneyin.': 'errors.customerNumberCreationFailed',

  // ============================================================================
  // FCM TOKEN MESSAGES
  // ============================================================================
  'FCM token registered successfully': 'errors.fcmTokenRegistered',
  'Failed to register FCM token': 'errors.fcmTokenRegistrationFailed',
  'FCM token unregistered successfully': 'errors.fcmTokenUnregistered',
  'Failed to unregister FCM token': 'errors.fcmTokenUnregistrationFailed',

  // ============================================================================
  // GENERAL MESSAGES
  // ============================================================================
  'İşlem başarılı': 'common.operationSuccess',
  'İşlem başarısız': 'common.operationFailed',
  'Kayıt bulunamadı': 'errors.entityNotFound',

  // ============================================================================
  // LOCATION MESSAGES
  // ============================================================================
  'Konumu ayarlı değil': 'errors.locationNotSet',
  'Konumu geçersiz': 'errors.locationInvalid',
  'İstek konumu ayarlı değil': 'errors.requestLocationNotSet',
  'Hedef konumu ayarlı değil': 'errors.targetLocationNotSet',
  'Serbest berber konumu ayarlı değil': 'errors.freeBarberLocationNotSet',
  'Serbest berber konumu geçersiz': 'errors.freeBarberLocationInvalid',
  'Mesafe limiti aşıldı': 'errors.distanceExceeded',
  'Konum başarıyla güncellendi': 'common.locationUpdatedSuccess',

  // ============================================================================
  // BARBER / CHAIR MESSAGES
  // ============================================================================
  'Bir berber birden fazla koltuğa atanamaz.': 'general.barberAssignedToMultipleChairs',
  'Bu berberiniz bir koltuğa atanmış. Önce koltuk ayarını değiştiriniz.': 'general.barberAssignedToChair',

  // ============================================================================
  // PANEL MESSAGES
  // ============================================================================
  'Panel getirilemedi': 'general.panelGetFailed',
  'Panel detayı getirilemedi': 'general.panelDetailGetFailed',

  // ============================================================================
  // MISC MISSING MESSAGES
  // ============================================================================
  'Hedef bulunamadı.': 'additionalSuccess.targetNotFound',

  // ============================================================================
  // CONTENT MODERATION MESSAGES
  // ============================================================================
  'Mesajınız uygunsuz içerik barındırmaktadır. Lütfen küfür, hakaret veya uygunsuz ifadeler kullanmayınız.': 'moderation.inappropriateText',
  'Yüklediğiniz görsel uygunsuz içerik barındırmaktadır. Lütfen uygun bir görsel yükleyiniz.': 'moderation.inappropriateImage',

  // ============================================================================
  // SAVED FILTER MESSAGES
  // ============================================================================
  'Filtre kaydedildi.': 'filters.savedSuccess',
  'Filtre güncellendi.': 'filters.updatedSuccess',
  'Filtre silindi.': 'filters.deletedSuccess',
  'Kayıtlı filtre bulunamadı.': 'filters.notFound',
  'Bu filtre size ait değil.': 'filters.notOwner',
  'En fazla 10 filtre kaydedebilirsiniz.': 'filters.limitReached',
  'Bu isimde kayıtlı filtre zaten mevcut.': 'filters.nameAlreadyExists',
  'Aynı filtre kriterleri zaten kayıtlı.': 'filters.criteriaAlreadyExists',

  // ============================================================================
  // BAN MESSAGES
  // ============================================================================
  'Hesabınız yönetici tarafından askıya alınmıştır.': 'errors.userBanned',

  // ============================================================================
  // SUBSCRIPTION MESSAGES
  // Trial konsepti kullanıcı isteği üzerine kaldırıldı (Madde 8 / Phase B).
  // SubscriptionExpired sadece Subscription:GateEnabled=true iken backend tarafından
  // UserStatusFilter ile döndürülür; gate kapalıyken hiç tetiklenmez.
  // ============================================================================
  'Aboneliğiniz sona ermiştir. Devam etmek için lütfen yenileyiniz.': 'errors.subscriptionExpired',
  'Zaten bir berber dükkanı paneliniz bulunmaktadır.': 'errors.barberStorePanelAlreadyExists',

  // ============================================================================
  // AUTO: backend literal → i18n (bm* keys). Regenerate: audit + generate scripts.
  // ============================================================================
  'Abonelik dönem sonunda iptal edilecek': 'errors.bm58c23b58090e',
  'Abonelik yeniden etkinleştirildi': 'errors.bm04eb39ee20ec',
  'Abonelik ödemesi tamamlanmamış': 'errors.bm449c9bf78cfa',
  'Ad en az 2 karakter olmalıdır': 'errors.bm7897c1990f44',
  'Ad en fazla 50 karakter olabilir': 'errors.bmaf65be8d3abe',
  'Ad zorunludur': 'errors.bmc1f42063042d',
  'Aktif abonelik bulunamadı': 'errors.bm273012cde3c2',
  'Aktif abonelik yok, lütfen yeniden satın alın': 'errors.bm2cc89fa254aa',
  'Berber Id formatı hatalı.': 'errors.bm4b28f581e952',
  'Berber adı zorunludur.': 'errors.bm1bd7337757bc',
  'Berber seçili ise koltuk ismi boş olmalıdır.': 'errors.bm7e3567223034',
  'Bildirim bulunamadı': 'errors.bm36978297afa3',
  'Bilinmeyen aksiyon': 'errors.bm18c5c144ef6b',
  'Bu berber zaten başka bir koltuğa atanmış.': 'errors.bm57aec2d6b028',
  'Bu isteği silme yetkiniz yok.': 'errors.bm13d4794a4034',
  'Bu işlem için Admin yetkisi gereklidir.': 'errors.bm7897d20f51b9',
  'Bu koltuğa ait beklemekte olan veya aktif olan randevu işlemi vardır.': 'errors.bm51f966798f92',
  'Bu kullanıcı zaten engellenmiş.': 'errors.bme26385f423db',
  'Bu kullanıcıyı zaten şikayet ettiniz.': 'errors.bmf4a9a879c49b',
  'Bu numarayla kayıtlı kullanıcı bulunamadı.': 'errors.bmfef5601b25d9',
  'Bu plan hesap türünüzle uyumlu değil': 'errors.bm035dd3094ea5',
  'Bu randevunun katılımcısı değilsiniz.': 'errors.bm289e99adaeb2',
  'Bu telefon numarası başka bir kullanıcı tarafından kullanılıyor.': 'errors.bm93a0d33174bf',
  'Bu telefon numarası zaten kayıtlı.': 'errors.bma7858a94e556',
  'Bu yükleme tipinde desteklenmeyen bir dosya formatı.': 'errors.bme7831dba4443',
  'Bu şikayeti silme yetkiniz yok.': 'errors.bm4e3d5e5f3935',
  'Dosya adı boş olamaz.': 'errors.bm93da0f4517f5',
  'Dosya adı geçersiz karakterler içeriyor.': 'errors.bm616e9e875751',
  'Dosya okunamadı.': 'errors.bm27c734778cff',
  'Dosya uzantısı eksik.': 'errors.bm77d67200bce7',
  'Dosya çok kısa veya bozuk görünüyor.': 'errors.bmf3f4a77ab837',
  'Doğrulama kodunun süresi dolmuş. Lütfen yeni kod isteyin.': 'errors.bm3daaa488961f',
  'Dükkan Id formatı hatalı.': 'errors.bm3718e23aff83',
  'Dükkan bulunamadı.': 'errors.storeNotFound',
  'Dükkan kimliği zorunludur.': 'errors.bm66a8841197a2',
  'Dükkan seç seçilmelidir.': 'errors.bmc2f761939786',
  'En az bir hizmet girilmelidir': 'form.atLeastOneService',
  'Engelleme bulunamadı veya kaldırılamadı.': 'errors.bmce5ea7b9f391',
  'Engelleme nedeni 500 karakterden uzun olamaz.': 'errors.bm530a27f8f37f',
  'Engellenecek kullanıcı seçilmelidir.': 'errors.bmaf75b99a65d7',
  'FCM token is required': 'errors.bm1f4d693258f6',
  'Fiyat 0\'dan büyük veya eşit olmalıdır.': 'errors.bm9b7232e88059',
  'Fiyat 0\'dan veya eşit   olmalıdır.': 'errors.bm7036867a4c5b',
  'Geçerli bir Türkiye cep numarası girin (+90 ile başlayan 10 hane, örn. +905551234567).': 'errors.bm41806cf4654f',
  'Geçerli bir işletme türü seçilmelidir': 'errors.bm432e762f3476',
  'Geçerli mağaza kimliği bulunamadı.': 'errors.bm907769363e16',
  'Geçersiz ay sayısı': 'errors.bm408a5c64cc9a',
  'Geçersiz dil kodu.': 'errors.bm2566a6ac8020',
  'Geçersiz mesaj metni.': 'errors.bm52d8efc01e1d',
  'Geçersiz mesaj türü.': 'errors.bmfd7d1ced244d',
  'Geçersiz plan': 'errors.bm3398c25ad530',
  'Geçersiz telefon numarası.': 'errors.bm6070e316a760',
  'Geçersiz veya bulunamayan işlem': 'errors.bma99b6bbeba1b',
  'Girilen numara mevcut numaranızla aynı.': 'errors.bmcab5ed77c2d7',
  'Google Play doğrulaması başarısız': 'errors.bmdb2ac5d857e6',
  'Güvenlik nedeniyle oturum kapatıldı.': 'errors.bmd261fcca3ee0',
  'Hesap  bulunamadı.': 'errors.bmaed4ffb8fbb5',
  'Hizmet adı boş olamaz': 'errors.bmfc9280d34700',
  'Hizmet fiyatı 0 veya daha büyük olmalıdır': 'errors.bmffaca1372677',
  'Hizmet fiyatı girilmelidir': 'errors.bmc7d47cacaa8e',
  'Hizmet listesi zorunludur': 'errors.bm481d92e7b288',
  'Hizmet sahibi belirtilmelidir.': 'errors.bmd15d43a1d627',
  'Hizmet sahibi bulunamadı.': 'errors.bm4ac94c4f690c',
  'Kendinizi engelleyemezsiniz.': 'errors.bmd3f589f63a2d',
  'Kendinizi şikayet edemezsiniz.': 'errors.bm6eae6c67c6a9',
  'Kod girilmelidir': 'errors.bm4dd4847289fc',
  'Koltuk bulunamadı.': 'errors.chairNotFound',
  'Koltuk için ya isim ya berber seçmelisiniz; ikisi birden veya ikisi de boş olamaz.': 'errors.bm6a101522f60b',
  'Konum bilgisi (latitude) zorunludur.': 'errors.bm761489b850cc',
  'Konum bilgisi (longitude) zorunludur.': 'errors.bmcb0261dc2882',
  'Kullanıcı bulunamadı': 'errors.userNotFound',
  'Mesaj boş olamaz.': 'errors.bm06aacb5391d2',
  'Mesaj bulunamadı.': 'errors.bme5e284074345',
  'Mesaj içeriği boş olamaz.': 'errors.bm4138b1829d91',
  'Metin mesajları bu uç nokta ile gönderilemez.': 'errors.bm9947cee61601',
  'PAYTR notification failed: bad hash': 'errors.bma89d46daf591',
  'PAYTR notification failed: config missing': 'errors.bm8604454d1263',
  'Paket adı en fazla 100 karakter olabilir.': 'errors.bmd466f5901780',
  'Paket adı zorunludur.': 'errors.bm53e62cf61d31',
  'Paket fiyatı 0\'dan büyük olmalıdır.': 'errors.bm694a0f87c01a',
  'Paket kimliği belirtilmelidir.': 'errors.bm2d705a338fcd',
  'Paket kimliği uyuşmuyor': 'errors.bm8cff2f4989e6',
  'Paket oluşturmak için en az 1 hizmet seçilmelidir.': 'errors.bm37b6ae0d8ebc',
  'Paket sahibi belirtilmelidir.': 'errors.bm1d843d731b3e',
  'Pakette en az 1 hizmet bulunmalıdır.': 'errors.bm0c7a2b43d1d3',
  'Panel ID zorunludur.': 'errors.bm89c3249ef1bc',
  'SMS gönderilemedi. Lütfen tekrar deneyin.': 'errors.bm2a899abfa1d2',
  'SMS servisi yapılandırılmamış.': 'errors.bm67699c771bf0',
  'SMS servisi şu anda kullanılamıyor.': 'errors.bm0e406726e41b',
  'Ses dosyası boş.': 'errors.bmf9e01a352a7d',
  'Ses çevirme servisi şu anda kullanılamıyor.': 'errors.bmc00527b386cd',
  'Soyad en az 2 karakter olmalıdır': 'errors.bm508c103f5ede',
  'Soyad en fazla 50 karakter olabilir': 'errors.bm7912e11b08eb',
  'Soyad zorunludur': 'errors.bm718e767e461a',
  'Soyisim gerekli': 'errors.bmd39eef3782b2',
  'Sunucu yapılandırması eksik': 'errors.bmb80551d10010',
  'Süresi dolmuş veya iptal edilmiş token.': 'errors.bm8819bbbc80e0',
  'Telefon numarası boş olamaz.': 'errors.bm83035d83c302',
  'Telefon numarası bulunamadı': 'errors.userNotFound',
  'Telefon numarası bulunamadı.': 'errors.userNotFound',
  'Telefon numarası zorunludur.': 'errors.bm46539b83c338',
  'Token bulunamadı.': 'errors.bmbfb059bea2d5',
  'Yalnızca kendi mesajlarınızı düzenleyebilirsiniz.': 'errors.bm867b76055e4e',
  'Yalnızca metin mesajları düzenlenebilir.': 'errors.bma0342cb05ea7',
  'ai_error': 'errors.bm60322004ad54',
  'ai_invalid_response': 'errors.bm2aed0929213f',
  'ai_rate_limit': 'errors.bm8dd920dc90e6',
  'ai_unavailable': 'errors.bmcc94d299ab57',
  'bundleId yok': 'errors.bm1f4a0e7d65c6',
  'empty_message': 'errors.bm579860db58cf',
  'productId ve purchaseToken gerekli': 'errors.bmc165f666f2f6',
  'productId yok': 'errors.bmf765279baf2c',
  'transactionId gerekli': 'errors.bmaefa016c82e8',
  'transcription_empty': 'errors.bm6513f24503fe',
  'whisper_failed': 'errors.bm44d62734b748',
  'whisper_rate_limit': 'errors.bm816516f41427',
  'whisper_timeout': 'errors.bm591f20008e37',
  'whisper_unavailable': 'errors.bm0c8dc5aa61a2',
  'Çok fazla hatalı deneme yapıldı. Lütfen yeni kod isteyin.': 'errors.bm359cffcdfb8d',
  'Ödeme linki SMS olarak gönderildi.': 'errors.bm4694a0504730',
  'İsim boş ise mutlaka bir berber seçmelisiniz.': 'errors.bmc5c908a880b1',
  'İsim gerekli': 'errors.bm77fc39c77080',
  'İstek başlığı 200 karakterden uzun olamaz.': 'errors.bm8a7b127fe431',
  'İstek başlığı boş olamaz.': 'errors.bmf413ccf91ea9',
  'İstek bulunamadı.': 'errors.bm6059416e5023',
  'İstek mesajı 2000 karakterden uzun olamaz.': 'errors.bm67accdc136bb',
  'İstek mesajı boş olamaz.': 'errors.bmb06ce9ba3f01',
  'İsteğime göre seçeneğinde dükkan seçilemez.': 'errors.bmf991c91d3e9e',
  'İşlem bilgisi okunamadı': 'errors.bm82a464f59111',
  'İşletme adı en az 2 karakter olmalıdır.': 'errors.bm1ee8ca99061a',
  'İşletme adı en fazla 100 karakter olabilir.': 'errors.bmb61d4af7efc7',
  'İşletme türü zorunludur': 'errors.bm12689b0a3d7e',
  'Şikayet bulunamadı.': 'errors.bm7adab5936332',
  'Şikayet edilecek kullanıcı seçilmelidir.': 'errors.bm979d8f0557d5',
  'Şikayet edilen kişi bu randevunun katılımcısı değil.': 'errors.bm4513346d6b90',
  'Şikayet nedeni 1000 karakterden uzun olamaz.': 'errors.bm239f50ff753f',
  'Şikayet oluşturmak için randevu tamamlanmış, iptal edilmiş veya cevapsız olmalıdır.': 'errors.bm28bb72fc9a7f',

  // ============================================================================
  // Backend Messages.cs — sync (success, PayTR, NetGsm aspect, rate limit, push copy)
  // ============================================================================
  'Koltuk başarıyla oluşturuldu.': 'errors.syncChairCreatedSuccess',
  'Koltuk güncellendi.': 'errors.syncChairUpdatedSuccess',
  'Koltuk silindi.': 'errors.syncChairDeletedSuccess',
  'Mesaj silindi.': 'errors.syncChatMessageDeletedSuccess',
  'Mesaj düzenlendi.': 'errors.syncChatMessageEditedSuccess',
  'Sohbet silindi.': 'errors.syncChatThreadDeletedSuccess',
  'Çalışma saatleri başarıyla oluşturuldu.': 'errors.syncWorkingHoursCreatedSuccess',
  'Saatler Güncellendi.': 'errors.syncWorkingHoursUpdatedSuccess',
  'Kullanıcı Eklendi': 'errors.syncUserAddedSuccess',
  'Kullanıcı güncellendi': 'errors.syncUserUpdatedSuccess',
  'Hesabınız başarıyla silindi.': 'errors.syncUserAccountDeletedSuccess',
  'Kullanıcı bilgileri getirildi': 'errors.syncUserProfileFetchedSuccess',
  'Profil başarıyla güncellendi': 'errors.syncUserProfileUpdatedSuccess',
  'Telefon numarası başarıyla güncellendi.': 'errors.syncUserPhoneUpdatedSuccess',
  'Varsayılan ayarlar oluşturuldu.': 'errors.syncSettingsDefaultsCreatedSuccess',
  'Müsaitlik durumu güncellendi.': 'errors.syncFreeBarberAvailabilityUpdatedSuccess',
  'İsteğiniz başarıyla gönderildi.': 'errors.syncRequestSubmittedSuccess',
  'İstek başarıyla silindi.': 'errors.syncRequestDeletedSuccess',
  'OTP gönderilemedi. Lütfen daha sonra tekrar deneyin.': 'errors.syncNetGsmOtpSendFailed',
  'Doğrulama başarısız. Lütfen tekrar deneyin.': 'errors.syncNetGsmOtpVerifyFailed',
  'SMS gönderilemedi.': 'errors.syncNetGsmSmsSendFailed',
  'PayTR ayarları eksik (MerchantId/MerchantKey/MerchantSalt/OkUrl/FailUrl)': 'errors.syncPaytrMerchantConfigIncomplete',
  'PayTR token boş döndü': 'errors.syncPaytrTokenEmptyReturned',
  'Aboneliğiniz 7 Gün Sonra Sona Eriyor': 'errors.syncSubscriptionPushTitle7Days',
  'Aboneliğinizin bitmesine 7 gün kaldı. Devam etmek için yenileyin.': 'errors.syncSubscriptionPushBody7Days',
  'Aboneliğiniz Yarın Sona Eriyor': 'errors.syncSubscriptionPushTitle1Day',
  'Aboneliğinizin bitmesine 1 gün kaldı. Hizmet kesintisini önlemek için bugün yenileyin.': 'errors.syncSubscriptionPushBody1Day',
  'Aboneliğiniz Sona Erdi': 'errors.syncSubscriptionPushTitleExpired',
  'Aboneliğiniz sona erdi. Panel erişiminiz kısıtlandı; yenilemek için ödeme linki isteyin.': 'errors.syncSubscriptionPushBodyExpired',
};

// ============================================================================
// TYPES
// ============================================================================

interface ApiError {
  data?: {
    message?: string;
    error?: string;
    errors?: Array<{ field?: string; message?: string }> | Record<string, string[] | string>;
  };
  error?: {
    message?: string;
    data?: {
      message?: string;
      errors?: Array<{ field?: string; message?: string }> | Record<string, string[] | string>;
    };
  };
  message?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/** Backend şablonlu mesajlar (Messages.cs format / interpolated) */
function translateByPatterns(raw: string): string | null {
  const msg = raw.trim();

  const rateLimit = msg.match(
    /^Çok fazla istek gönderildi\. Lütfen (\d+) saniye sonra tekrar deneyin\.?$/
  );
  if (rateLimit) {
    return String(
      i18n.t('errors.syncApiRateLimitTooManyRequests', { seconds: rateLimit[1] })
    );
  }

  const multiImg = msg.match(/^(\d+) resim başarıyla yüklendi\.?$/);
  if (multiImg) {
    return String(i18n.t('errors.syncImageMultiUploadedSuccess', { count: Number(multiImg[1]) }));
  }

  const paytrGet = msg.match(/^PayTR get-token başarısız: (.+)$/);
  if (paytrGet) {
    return String(i18n.t('errors.syncPaytrGetTokenFailed', { detail: paytrGet[1] }));
  }

  const paytrToken = msg.match(/^PayTR token alınamadı: (.+)$/);
  if (paytrToken) {
    return String(i18n.t('errors.syncPaytrTokenObtainFailed', { detail: paytrToken[1] }));
  }

  const paytrParse = msg.match(/^PayTR yanıtı parse edilemedi: (.+)$/);
  if (paytrParse) {
    return String(i18n.t('errors.syncPaytrResponseParseFailed', { detail: paytrParse[1] }));
  }

  return null;
}

/**
 * Backend mesajını i18n key'ine çevirir
 */
const translateMessage = (message: string): string => {
  if (!message) return '';

  const trimmed = message.trim();

  const fromPattern = translateByPatterns(trimmed);
  if (fromPattern) return fromPattern;

  const key = messageToKeyMap[trimmed];

  if (key) {
    try {
      const translated = i18n.t(key);
      return typeof translated === 'string' ? translated : String(translated);
    } catch {
      return message;
    }
  }

  return message;
};

/**
 * Validation errors array'inden ilk mesajı çıkarır
 */
const extractFirstValidationError = (errors: unknown): string | null => {
  if (!errors) return null;

  if (typeof errors === 'string') return errors;

  if (Array.isArray(errors)) {
    // FluentValidation format: [{ field: "...", message: "..." }]
    const firstWithMessage = errors.find(
      (item) => typeof item === 'object' && item !== null && (item as any).message
    );
    if (firstWithMessage) return (firstWithMessage as any).message;

    // String array format
    const firstString = errors.find((item) => typeof item === 'string');
    return firstString ?? null;
  }

  if (typeof errors === 'object') {
    const values = Object.values(errors as Record<string, unknown>);
    for (const value of values) {
      const nested = extractFirstValidationError(value);
      if (nested) return nested;
    }
  }

  return null;
};

/**
 * Duplicate slot hatası mı kontrol eder
 */
const isDuplicateSlotError = (errorMessage: string, fullErrorString: string): boolean => {
  const lower = errorMessage.toLowerCase();
  const full = fullErrorString.toLowerCase();

  return (
    lower.includes('duplicate key') ||
    lower.includes('ix_appointments') ||
    lower.includes('cannot insert duplicate') ||
    lower.includes('unique index') ||
    lower.includes('sqlexception') ||
    lower.includes('sql exception') ||
    lower.includes('alındı') ||
    lower.includes('alindi') ||
    lower.includes('slot taken') ||
    lower.includes('slottaken') ||
    lower.includes('already booked') ||
    lower.includes('already reserved') ||
    full.includes('duplicate key') ||
    full.includes('ix_appointments') ||
    full.includes('cannot insert duplicate') ||
    full.includes('unique index') ||
    full.includes('sqlexception')
  );
};

// ============================================================================
// MAIN EXPORT - TEK FONKSİYON
// ============================================================================

/**
 * Backend'den gelen herhangi bir error'u kullanıcı dostu mesaja çevirir
 * 
 * Bu fonksiyon tüm error formatlarını handle eder:
 * - RTK Query errors
 * - FluentValidation errors
 * - Backend IResult/IDataResult errors
 * - Network errors
 * - String errors
 * 
 * @param error - Herhangi bir error objesi veya string
 * @returns Kullanıcı dostu hata mesajı
 * 
 * @example
 * // RTK Query mutation error
 * const [createAppointment] = useCreateAppointmentMutation();
 * try {
 *   await createAppointment(data).unwrap();
 * } catch (error) {
 *   Alert.alert('Hata', getErrorMessage(error));
 * }
 */
export const getErrorMessage = (error: unknown): string => {
  const t = (key: string) => i18n.t(key);

  // Handle null/undefined
  if (error == null) {
    return t('common.operationFailed');
  }

  // Handle string errors
  if (typeof error === 'string') {
    return translateMessage(error);
  }

  const e = error as any;

  // Abort hatalarını sessizce ignore et (component unmount, request cancel vs.)
  const isAbortError =
    e?.name === 'AbortError' ||
    e?.message?.includes?.('abort') ||
    e?.message?.includes?.('Abort') ||
    e?.message?.includes?.('cancelled') ||
    e?.message?.includes?.('canceled') ||
    e?.status === 'ABORT_ERROR' ||
    e?.error?.name === 'AbortError';

  if (isAbortError) {
    return ''; // Boş döndür, alert gösterilmez
  }

  // ÖNCELİKLİ: Network/Server hatalarını kontrol et
  // RTK Query string status'ları - bunlar servise ulaşılamadı anlamına gelir
  const status = e?.status;
  if (
    status === 'FETCH_ERROR' ||
    status === 'TIMEOUT_ERROR' ||
    status === 'PARSING_ERROR' ||
    status === 0 ||
    (typeof status === 'number' && status >= 500)
  ) {
    return t('error.serviceUnavailable');
  }

  // FluentValidation errors kontrolü
  const validationError = extractFirstValidationError(e?.data?.errors ?? e?.error?.data?.errors);
  if (validationError) {
    return translateMessage(validationError);
  }

  // Backend message kontrolü
  const backendMessage = e?.data?.message ?? e?.error?.data?.message ?? e?.error?.message ?? e?.message;
  if (backendMessage) {
    // Boş mesaj kontrolü - CUSTOM_ERROR için boş mesaj dönebilir
    if (backendMessage === '' || backendMessage.trim() === '') {
      return ''; // Boş mesaj - hata gösterilmez (abort durumları için)
    }

    // Duplicate slot kontrolü
    let fullErrorString = '';
    try {
      fullErrorString = JSON.stringify(error) || '';
    } catch {
      fullErrorString = '';
    }

    if (isDuplicateSlotError(backendMessage, fullErrorString)) {
      return t('errors.duplicateSlot');
    }

    return translateMessage(backendMessage);
  }

  // Diğer error formatları
  const otherError = e?.data?.error;
  if (otherError) {
    return translateMessage(otherError);
  }

  return t('error.serviceUnavailable');
};

// ============================================================================
// SUCCESS MESSAGE HANDLER
// ============================================================================

/**
 * Backend'den gelen herhangi bir mesajı (success veya error) translate eder
 * 
 * @param message - Backend'den gelen mesaj string'i
 * @returns Translate edilmiş mesaj
 * 
 * @example
 * // Success result mesajı
 * if (result.success) {
 *   Alert.alert('Başarılı', getMessage(result.message));
 * }
 */
export const getMessage = (message: string | null | undefined): string => {
  if (!message) return '';
  return translateMessage(message);
};

