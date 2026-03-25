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
  'Randevu süresi dolmadan tamamlanamaz': 'errors.appointmentTimeNotPassed',
  'Kabul edilmemiş randevu': 'errors.appointmentNotApproved',
  'Beklemede değil': 'errors.appointmentNotPending',
  'Bekleme yok': 'errors.appointmentNotPendingStatus',
  'Karar zaten verilmiş': 'errors.appointmentDecisionAlreadyGiven',
  'Bu randevu zamanı başka bir kullanıcı tarafından alındı. Lütfen başka bir saat seçin.': 'errors.duplicateSlot',
  'Bu koltuk için seçilen saat aralığında başka bir randevu var.': 'errors.appointmentSlotOverlap',
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
  'Silinecek randevu bulunamadı.': 'errors.appointmentNotFoundForDelete',
  'Hiçbir randevu silinemedi. {0} adet randevu Pending veya Approved durumunda.': 'errors.noAppointmentsDeleted',
  'Randevu tarihi zorunludur.': 'booking.appointmentDateRequired',
  'Randevu notu zorunludur.': 'booking.appointmentNoteRequired',

  // ============================================================================
  // NOTIFICATION MESSAGES
  // ============================================================================
  'Randevuyu Cevaplamadınız': 'notification.appointmentUnanswered',
  'Randevunuz Cevaplanamadı': 'notification.appointmentUnansweredOther',
  'Silinecek bildirim bulunamadı.': 'errors.notificationNotFoundForDelete',
  'Silinecek bildirim bulunamadı. Tüm bildirimler Pending veya Approved durumundaki randevulara ait.': 'errors.notificationsNotFoundForDelete',
  'Randevu için alıcı bulunamadı.': 'errors.appointmentRecipientNotFound',

  // ============================================================================
  // STORE MESSAGES
  // ============================================================================
  'Dükkan bulunamadı': 'errors.storeNotFound',
  'Dükkan bulunamadı veya sahibi değilsiniz': 'errors.storeNotFound',
  'Store not found': 'errors.storeNotFound',
  'Store not found or not owner': 'errors.storeNotFound',
  'Dükkanın zaten aktif bir randevusu var.': 'errors.storeHasActiveAppointments',
  'Bu dükkanınızın bu serbest berber ile aktif bir randevusu var. Önce onu sonuçlandırın.': 'errors.storeHasActiveAppointments',
  'Dükkan bu saat aralığında açık değil': 'errors.storeNotOpen',
  'Dükkan bu gün kapalı (tatil)': 'errors.storeClosed',
  'Dükkan bu gün için çalışma saati tanımlamamış (kapalı)': 'errors.storeNoWorkingHours',
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
  'Serbest berber koordinatları geçersiz': 'errors.freebarberInvalidCoordinates',
  'Serbest berber 1 km dışında. Yakın değilken randevu oluşturamazsın.': 'errors.freebarberDistanceExceeded',
  'Serbest berber ile dükkan arası 1 km dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.freebarberStoreDistanceExceeded',
  'Dükkan ile serbest berber arası 1 km dışında. Bu eşleşmeyle randevu açılamaz.': 'errors.storeFreebarberDistanceExceeded',
  'Serbest berber seçimi gereklidir.': 'errors.freebarberUserIdRequired',
  'Serbest berber seçimi zorunludur.': 'errors.freebarberUserIdRequired',
  'Dükkan randevusunda serbest berber seçilemez.': 'errors.freebarberNotAllowedForStoreAppointment',
  'Serbest berber ID\'si request body\'de gönderilmemelidir.': 'errors.freebarberNotAllowedForStoreAppointment',
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
  'Dükkan 1 km dışında. Yakın değilken randevu oluşturamazsın.': 'errors.customerDistanceExceeded',

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
  'Bu metod sadece favori thread\'ler için kullanılabilir': 'chatMessages.methodOnlyForFavoriteThreads',
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
  'Geçersiz hedef. Sadece Store ID, FreeBarber ID veya Customer UserId ile değerlendirme yapılabilir. ManuelBarber\'a değerlendirme yapılamaz.': 'rating.invalidTargetForRating',
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
  'Resim sahibi ID\'si boş olamaz': 'errors.imageOwnerIdRequired',
  'Resim ID\'si boş olamaz': 'errors.imageIdRequired',

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
  // SUBSCRIPTION / TRIAL MESSAGES
  // ============================================================================
  'Deneme süreniz sona ermiştir. Devam etmek için lütfen abone olunuz.': 'errors.trialExpired',
  'Deneme süresinde yalnızca 1 panel ekleyebilirsiniz. Birden fazla panel için lütfen abone olunuz.': 'errors.trialPanelLimitReached',
  'Zaten bir berber dükkanı paneliniz bulunmaktadır.': 'errors.barberStorePanelAlreadyExists',
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

/**
 * Backend mesajını i18n key'ine çevirir
 */
const translateMessage = (message: string): string => {
  if (!message) return '';

  const trimmed = message.trim();
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

/**
 * Backend'den gelen success mesajını translate eder
 * getMessage ile aynı, sadece daha açıklayıcı isim
 * 
 * @param message - Backend'den gelen success mesaj string'i
 * @returns Translate edilmiş mesaj
 */
export const getSuccessMessage = getMessage;

