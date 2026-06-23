import { COLORS } from './colors';

/** Sosyal mod vurgu — ana uygulama sarısı (ACCENT_GOLD) */
export const SOCIAL_ACCENT = COLORS.UI.ACCENT_GOLD;
/** Sarı zemin üzerinde metin / ikon */
export const SOCIAL_ACCENT_TEXT = COLORS.UI.TEXT_ON_GOLD;
export const SOCIAL_ACCENT_BORDER = COLORS.UI.ACCENT_GOLD_BORDER;
/** Açık vurgu arka planları (ikon dairesi vb.) */
export const SOCIAL_ACCENT_SOFT = 'rgba(250, 204, 21, 0.15)';
export const SOCIAL_ACCENT_SOFT_DARK = 'rgba(250, 204, 21, 0.22)';

/** Hikaye / video tarafı — mavi ile çift kullanılan turuncu */
export const SOCIAL_PAIR_ORANGE = '#f05e23';
/** Gönderi / foto tarafı — turuncu ile çift kullanılan mavi */
export const SOCIAL_PAIR_BLUE = '#2563eb';

/** Gönderi kartı etkileşim renkleri */
export const SOCIAL_POST_ACTION = {
  like: SOCIAL_ACCENT,
  likeActiveBg: 'rgba(250, 204, 21, 0.18)',
  comment: '#3B82F6',
  commentBg: 'rgba(59, 130, 246, 0.12)',
  share: '#10B981',
  shareBg: 'rgba(16, 185, 129, 0.12)',
  save: '#8B5CF6',
  saveBg: 'rgba(139, 92, 246, 0.12)',
  view: '#64748B',
  viewBg: 'rgba(100, 116, 139, 0.1)',
} as const;
