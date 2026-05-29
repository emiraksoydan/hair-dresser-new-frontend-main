/**
 * Centralized color constants
 * Avoids hardcoded color values throughout the frontend
 */

import { Platform } from "react-native";

export const COLORS = {
    // Status Colors
    STATUS: {
        PENDING: '#fbbf24',      // yellow
        APPROVED: '#22c55e',      // green
        COMPLETED: '#22c55e',     // green
        CANCELLED: '#ef4444',     // red
        REJECTED: '#ef4444',      // red
        UNANSWERED: '#f59e0b',    // amber (timeout durumu)
        DEFAULT: '#6b7280',       // gray
    },

    // UI Colors
    UI: {
        BACKGROUND: '#151618',
        CARD: '#1f2937',          // gray-800
        CARD_LIGHT: '#374151',    // gray-700
        TEXT_PRIMARY: '#ffffff',
        TEXT_SECONDARY: '#9ca3af', // gray-400
        TEXT_TERTIARY: '#6b7280', // gray-500
        ACCENT: '#22c55e',         // green-500
        ACCENT_DARK: '#16a34a',   // green-600
        /** Klasik sarı vurgu (FAB, bottom tab, randevu sekmeleri, CTA) — altın değil */
        ACCENT_GOLD: '#FACC15',
        /** Sarı/turuncu zemin üzerinde metin/ikon — açık tema */
        TEXT_ON_GOLD: '#000000',
        /** Sarı/turuncu zemin üzerinde metin/ikon — koyu tema */
        TEXT_ON_GOLD_DARK: '#FFFFFF',
        /** Daha koyu sarı — isteğe chip kenarı vb.; tab/FAB’da yok */
        ACCENT_GOLD_BORDER: '#CA8A04',
        /** FAB speed-dial satır kutusu — opak grimsi (saydam değil) */
        /** Sahibinden tarzı biraz daha koyu gri menü şeridi */
        FAB_MENU_ROW_BG_LIGHT: '#a8b0ba',
        FAB_MENU_ROW_BG_DARK: '#3d4654',
    },

    // Barber Type Colors
    BARBER_TYPE: {
        MALE: '#60a5fa',          // blue-400
        FEMALE: '#f472b6',        // pink-400
    },

    // Opacity Helpers
    OPACITY: {
        LIGHT: '20',              // 20% opacity
        MEDIUM: '40',             // 40% opacity
        HEAVY: '60',              // 60% opacity
    },

    /** Profil ekranı (referans tasarım): lacivert + sarı vurgu */
    PROFILE: {
        /** Metin / ikon vurgusu */
        NAVY: '#173d62',
        /** Telefon Değiştir butonu */
        NAVY_BUTTON: '#173d62',
        /** Avatar zemin — butondan hafif açık lacivert */
        NAVY_AVATAR: '#1a446e',
        ACCENT: '#FACC15',
        AVATAR_RING: '#FACC15',
        PHONE_ROW_HEIGHT: 48,
        PHONE_FIELD_FONT_SIZE: 13,
        PHONE_FIELD_BG_LIGHT: '#f3f4f6',
    },

    /** Profil ve ilgili ekranlardaki Switch bileşenleri — klasik sarı */
    PROFILE_SWITCH: {
        ACTIVE: '#FACC15',
        TRACK_OFF_LIGHT: 'rgba(15, 23, 42, 0.14)',
        TRACK_OFF_DARK: 'rgba(255, 255, 255, 0.16)',
        TRACK_ON: 'rgba(250, 204, 21, 0.45)',
    },
} as const;

const GOLD_BG_VALUES = new Set([
    COLORS.UI.ACCENT_GOLD.toLowerCase(),
    '#fea60e',
    '#f0d96e',
    '#e8cb5a',
    '#e2c047',
    '#d0b23f',
    '#ffb900',
]);

export function isGoldBackground(color?: string | null): boolean {
    if (!color) return false;
    return GOLD_BG_VALUES.has(color.trim().toLowerCase());
}

/** FAB / bottom tab / CTA: sarı zemin üzerindeki ikon ve metin rengi */
export function getTextOnGold(isDark: boolean): string {
    return isDark ? COLORS.UI.TEXT_ON_GOLD_DARK : COLORS.UI.TEXT_ON_GOLD;
}

/** Randevu kartı — ikon kuyusu (açık modda dolu sarı) */
export function getAppointmentIconWellBg(isDark: boolean): string {
    return isDark ? 'rgba(240, 94, 35, 0.12)' : COLORS.UI.ACCENT_GOLD;
}

export function getAppointmentIconWellFg(isDark: boolean): string {
    return isDark ? '#fb923c' : COLORS.UI.TEXT_ON_GOLD;
}

/** Randevu kartı — turuncu/sarı başlık ve vurgu metni */
export function getAppointmentAccentLabelFg(isDark: boolean): string {
    return isDark ? '#fb923c' : COLORS.UI.TEXT_ON_GOLD;
}

/** Yıldız widget — dolu turuncu/sarı, boş çerçeve açık modda siyah */
export function getStarRatingWidgetProps(isDark: boolean) {
    return {
        color: isDark ? COLORS.UI.ACCENT_GOLD : '#fea60e',
        emptyColor: isDark ? '#475569' : COLORS.UI.TEXT_ON_GOLD,
    };
}

/** Yıldız yanındaki sayısal puan metni */
export function getStarRatingScoreColor(isDark: boolean): string {
    return isDark ? '#fbbf24' : COLORS.UI.TEXT_ON_GOLD;
}

/** Çok adımlı form — aktif adım alt etiketi */
export function getFormStepLabelColor(
    isDark: boolean,
    isActive: boolean,
    inactiveColor: string,
): string {
    if (!isActive) return inactiveColor;
    return isDark ? COLORS.UI.ACCENT_GOLD : COLORS.UI.TEXT_ON_GOLD;
}

/** Form geri / ileri düğmeleri */
export function getFormNavButtonColors(isDark: boolean) {
    const onGold = getTextOnGold(isDark);
    const accent = COLORS.UI.ACCENT_GOLD;
    return {
        prevText: onGold,
        prevBorder: isDark ? accent : COLORS.UI.TEXT_ON_GOLD,
        nextText: onGold,
        nextBg: accent,
    };
}

/** Form — turuncu/sarı vurgulu kutu kenarı */
export function getFormAccentBoxBorderColor(isDark: boolean): string {
    return isDark ? 'rgba(194,165,35,0.28)' : COLORS.UI.TEXT_ON_GOLD;
}

/** Panel görüntüle — liste/ızgara vb. üst sağ ikon */
export function getPanelHeaderAccentIconColor(isDark: boolean): string {
    return isDark ? COLORS.UI.ACCENT_GOLD : COLORS.UI.TEXT_ON_GOLD;
}

/** Profil — isim/soyisim input çerçevesi (açık modda siyah) */
export function getProfileNameFieldOutlineColor(isDark: boolean, hasError: boolean): string {
    if (hasError) return '#b00020';
    return isDark ? COLORS.PROFILE.ACCENT : COLORS.UI.TEXT_ON_GOLD;
}

/** Form önizleme — fiyat ve açık saat vurgusu */
export function getFormPreviewPriceColor(): string {
    return COLORS.STATUS.APPROVED;
}

/** Filtre drawer — min/max focus çerçevesi */
export function getFilterInputOutlineColor(isDark: boolean, hasError = false): string {
    return getProfileNameFieldOutlineColor(isDark, hasError);
}

/** Filtre drawer — Temizle düğmesi metin ve kenar */
export function getFilterClearButtonColors(isDark: boolean) {
    const accent = isDark ? COLORS.UI.ACCENT_GOLD : COLORS.UI.TEXT_ON_GOLD;
    return { text: accent, border: accent };
}

/** Giriş / kayıt — OTP, focus, seçili kutu (açık modda siyah) */
export function getAuthAccentColor(isDark: boolean): string {
    return isDark ? COLORS.UI.ACCENT_GOLD : COLORS.UI.TEXT_ON_GOLD;
}

export function getAuthAccentSecondary(isDark: boolean): string {
    return isDark ? '#c2a523' : '#333333';
}

export function getAuthAccentMutedBg(isDark: boolean): string {
    return isDark ? 'rgba(250, 204, 21, 0.12)' : 'rgba(0, 0, 0, 0.06)';
}

export function getAuthOtpFocusBg(isDark: boolean): string {
    return isDark ? 'rgba(250, 204, 21, 0.08)' : 'rgba(0, 0, 0, 0.04)';
}

export function getAuthResendButtonBg(isDark: boolean, enabled: boolean): string {
    if (!enabled) return 'transparent';
    return isDark ? 'rgba(250, 204, 21, 0.1)' : 'rgba(0, 0, 0, 0.06)';
}

/** Giriş / kayıt — birincil CTA ve seçili kullanıcı türü zemin */
export function getAuthPrimaryButtonColors(isDark: boolean) {
    if (isDark) {
        return {
            background: COLORS.UI.ACCENT_GOLD,
            text: COLORS.UI.TEXT_ON_GOLD_DARK,
            shadow: '#FACC15',
        };
    }
    return {
        background: COLORS.UI.TEXT_ON_GOLD,
        text: '#ffffff',
        shadow: '#000000',
    };
}

/** FAB speed-dial satırı — ikon + etiket opak grimsi kutu.
 *  Paper'ın doğal layout'una (flexDirection:row, alignItems:center,
 *  justifyContent:flex-end) dokunmadan sadece arka plan + köşe + iç boşluk eklenir.
 *  Tüm kartlar aynı genişlikte görünmesi için `minWidth` kullanılır. */
export function getFabMenuRowWrapperStyle(isDark: boolean) {
    return {
        // Layout — Paper'dan miras almak yerine açıkça tanımla
        flexDirection: 'row' as const,
        alignItems: 'center' as const,
        justifyContent: 'flex-end' as const,
        // Görsel
        backgroundColor: isDark
            ? COLORS.UI.FAB_MENU_ROW_BG_DARK
            : COLORS.UI.FAB_MENU_ROW_BG_LIGHT,
        borderRadius: 10,
        paddingTop: 13,
        paddingBottom: 0,
        paddingLeft: 0,
        paddingRight: 12,
        marginBottom: 6,
        minWidth: 150,
        gap: 8,
        overflow: 'hidden' as const,
    };
}

/** react-native-paper Switch — sarı vurgu, kapalı/açık track aynı palet */
export function getProfilePaperSwitchProps(isDark: boolean) {
    const s = COLORS.PROFILE_SWITCH;
    const trackOff = isDark ? s.TRACK_OFF_DARK : s.TRACK_OFF_LIGHT;
    return {
        color: s.ACTIVE,
        trackColor: { false: trackOff, true: s.TRACK_ON } as const,
        ...(Platform.OS === "ios" ? { ios_backgroundColor: trackOff } : {}),
    };
}

/** react-native Switch (Paper dışı) — aynı görsel dil */
export function getProfileNativeSwitchProps(isDark: boolean, value: boolean) {
    const s = COLORS.PROFILE_SWITCH;
    const trackOff = isDark ? s.TRACK_OFF_DARK : s.TRACK_OFF_LIGHT;
    return {
        trackColor: { false: trackOff, true: s.TRACK_ON } as const,
        thumbColor:
            Platform.OS === "ios"
                ? value
                    ? s.ACTIVE
                    : "#f4f4f5"
                : value
                    ? s.ACTIVE
                    : isDark
                        ? "#64748b"
                        : "#e2e8f0",
        ios_backgroundColor: trackOff,
    };
}

/**
 * Kazanç grafiği / tablo switch — track beyaz, thumb duruma göre renkli (açık: sarı, kapalı: nötr gri).
 */
export function getEarningsChartSwitchProps(value: boolean) {
    const s = COLORS.PROFILE_SWITCH;
    const track = "#ffffff";
    const thumbOn = s.ACTIVE;
    const thumbOff = "#94a3b8";
    return {
        trackColor: { false: track, true: track } as const,
        thumbColor: Platform.OS === "ios" ? (value ? thumbOn : thumbOff) : value ? thumbOn : thumbOff,
        ios_backgroundColor: track,
    };
}

