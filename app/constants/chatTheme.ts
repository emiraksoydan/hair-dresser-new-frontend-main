import { SOCIAL_ACCENT } from './socialTheme';

export const CHAT_BRAND_ORANGE = '#f05e23';

export const CHAT_SOFT_RADIUS = {
  card: 22,
  bubble: 20,
  input: 24,
  pill: 999,
  headerButton: 20,
} as const;

export function getChatAccent(isSocial?: boolean) {
  return isSocial ? SOCIAL_ACCENT : CHAT_BRAND_ORANGE;
}

export function getChatSoftCardShadow(isDark: boolean) {
  return isDark
    ? {
        shadowColor: '#000000',
        shadowOpacity: 0.22,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
        elevation: 4,
      }
    : {
        shadowColor: '#6366f1',
        shadowOpacity: 0.06,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 3,
      };
}

export function getChatListRowStyle(isDark: boolean, hasUnread: boolean, accent: string, cardBg: string) {
  return {
    backgroundColor: hasUnread ? (isDark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.92)') : cardBg,
    borderWidth: 1,
    borderColor: hasUnread
      ? `${accent}55`
      : isDark
        ? 'rgba(148,163,184,0.14)'
        : 'rgba(148,163,184,0.18)',
    borderRadius: CHAT_SOFT_RADIUS.card,
    ...getChatSoftCardShadow(isDark),
  };
}

export function getChatBubblePalette(isDark: boolean, accent: string) {
  const accentRgb = accent === SOCIAL_ACCENT ? '212,175,55' : '240,94,35';
  return {
    meBg: isDark ? `rgba(${accentRgb},0.52)` : `rgba(${accentRgb},0.78)`,
    otherBg: isDark ? 'rgba(71,85,105,0.42)' : 'rgba(255,255,255,0.94)',
    otherBorder: isDark ? 'rgba(148,163,184,0.18)' : 'rgba(148,163,184,0.22)',
    softAccentBg: isDark ? `rgba(${accentRgb},0.16)` : `rgba(${accentRgb},0.10)`,
    inputBg: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.96)',
  };
}

export function getChatHeaderSurface(isDark: boolean) {
  return {
    backgroundColor: isDark ? 'rgba(15,23,42,0.92)' : 'rgba(255,255,255,0.88)',
    borderBottomColor: isDark ? 'rgba(148,163,184,0.12)' : 'rgba(148,163,184,0.16)',
  };
}
