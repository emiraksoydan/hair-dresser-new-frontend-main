import { getSocialLimits } from './socialLimitsRuntime';

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

/** Eski Türkçe API mesajları → i18n anahtarı (geçiş dönemi). */
const LEGACY_MESSAGE_KEYS: Record<string, string> = {
  'Sosyal profil bulunamadı.': 'social.errors.profileNotFound',
  'Bu profile erişim yok.': 'social.errors.profileNoAccess',
  'Bu profilden gönderi paylaşma yetkiniz yok.': 'social.errors.profileNoPermission',
  'Bu profilden hikaye paylaşma yetkiniz yok.': 'social.errors.profileNoPermission',
  'Bu profil için öne çıkan oluşturma yetkiniz yok.': 'social.errors.profileNoPermission',
  'Bu profili düzenleme yetkiniz yok.': 'social.errors.profileNoPermission',
  'Bu işlem için yetkiniz yok.': 'social.errors.profileNoPermission',
  'Geçersiz profil.': 'social.errors.profileInvalid',
  'Gönderi bulunamadı.': 'social.errors.postNotFound',
  'Bu gönderiye erişim yok.': 'social.errors.postNoAccess',
  'Bu gönderiyi silme yetkiniz yok.': 'social.errors.postNoPermission',
  'En az bir medya dosyası gerekli.': 'social.errors.postMediaRequired',
  'Medya dosyası gerekli.': 'social.errors.postMediaRequired',
  'Hikaye bulunamadı.': 'social.errors.storyNotFound',
  'Bu hikayeyi silme yetkiniz yok.': 'social.errors.storyNoPermission',
  'Öne çıkan bulunamadı.': 'social.errors.highlightNotFound',
  'Öne çıkan hikaye bulunamadı.': 'social.errors.highlightNotFound',
  'Yorum boş olamaz.': 'social.errors.commentEmpty',
  'Bu gönderiye yorum yapılamaz.': 'social.errors.commentPostBlocked',
  'Kendinizi takip edemezsiniz.': 'social.errors.cannotFollowSelf',
  'Bu kullanıcıyı takip edemezsiniz.': 'social.errors.cannotFollowUser',
  'Arama için kullanıcı adı veya konum gerekli.': 'social.errors.searchNeedInput',
  'Görsel dosyası gerekli.': 'social.errors.avatarRequired',
  'Profil fotoğrafı yüklenemedi. Lütfen tekrar deneyin.': 'social.errors.avatarUploadFailed',
  'Medya yüklenemedi. Lütfen tekrar deneyin.': 'social.errors.mediaUploadFailed',
  'Geçersiz içerik türü.': 'social.errors.invalidArchivedKind',
  'Öğe bulunamadı.': 'social.errors.archivedItemNotFound',
};

function limitParamsForKey(key: string): Record<string, number> | undefined {
  const limits = getSocialLimits();
  switch (key) {
    case 'social.errors.postCarouselRange':
      return { min: 2, max: limits.postCarouselMaxImages };
    case 'social.errors.postVideoMaxDuration':
      return { max: limits.postVideoMaxDurationSec };
    case 'social.errors.storyVideoMaxDuration':
      return { max: limits.storyVideoMaxDurationSec };
    case 'social.errors.captionMaxLength':
    case 'social.errors.commentMaxLength':
      return { max: limits.commentMaxLength };
    case 'social.errors.highlightMaxItems':
      return { max: limits.highlightMaxItemsPerHighlight };
    case 'social.errors.highlightTitleLength':
      return { max: 64 };
    default:
      return undefined;
  }
}

/** API `message` alanını kullanıcı diline çevirir (social.errors.* veya legacy TR). */
export function translateSocialApiMessage(
  message: string | null | undefined,
  t: TranslateFn,
  fallback?: string,
): string {
  const raw = message?.trim();
  if (!raw) return fallback ?? t('common.error');

  if (/^https?:\/\//i.test(raw) && raw.includes('/uploads/')) {
    return t('social.errors.mediaUploadFailed');
  }

  let key = raw.startsWith('social.errors.') ? raw : LEGACY_MESSAGE_KEYS[raw];
  if (!key) return raw;

  const params = limitParamsForKey(key);
  const translated = params ? t(key, params) : t(key);
  return translated !== key ? translated : raw;
}
