/**
 * Centralized color constants
 * Avoids hardcoded color values throughout the frontend
 */

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
        /** Sarı CTA (Tekrar dene, compare şeridi vb.) */
        ACCENT_GOLD: '#ffb900',
        TEXT_ON_GOLD: '#1f2937',
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
} as const;

