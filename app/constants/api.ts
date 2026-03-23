/**
 * API-related constants
 * Centralized API configuration
 */

export const API_CONSTANTS = {
    //BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.105:5149/api/',
    BASE_URL: process.env.EXPO_PUBLIC_API_URL || 'https://api.gumusmakas.com.tr/api/',
    SIGNALR_HUB_URL: process.env.EXPO_PUBLIC_SIGNALR_URL || 'https://api.gumusmakas.com.tr/hubs/app',
    REQUEST_TIMEOUT_MS: 30000,
    REFRESH_TOKEN_SKEW_MS: 30000,
    MAX_RETRIES: 3,
    RETRY_DELAY_MS: 1000,
} as const;

// Backward compatibility
export const API_CONFIG = API_CONSTANTS;

