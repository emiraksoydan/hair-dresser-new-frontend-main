/**
 * Time-related constants
 * Centralized time calculations and formats
 */

export const TIME_CONSTANTS = {
    // Time Units (in milliseconds)
    SECOND_MS: 1000,
    MINUTE_MS: 60 * 1000,
    HOUR_MS: 60 * 60 * 1000,
    DAY_MS: 24 * 60 * 60 * 1000,

    // Time Units (in minutes)
    MINUTES_PER_HOUR: 60,
    MINUTES_PER_DAY: 1440,

    // Display Thresholds
    DISPLAY_NOW_THRESHOLD_MINUTES: 1,
    DISPLAY_MINUTES_THRESHOLD: 60,
    DISPLAY_HOURS_THRESHOLD: 1440, // 24 hours

    // Formatting
    DATE_FORMAT: 'YYYY-MM-DD',
    TIME_FORMAT: 'HH:mm',
    TIME_FORMAT_FULL: 'HH:mm:ss',
    DATETIME_FORMAT: 'YYYY-MM-DD HH:mm',
} as const;

