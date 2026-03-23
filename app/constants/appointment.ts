/**
 * Appointment-related constants
 * Centralized to avoid magic numbers/strings throughout the codebase
 */

export const APPOINTMENT_CONSTANTS = {
    // Time constants
    SLOT_DURATION_MINUTES: 60,
    DEFAULT_DATE_FORMAT: 'YYYY-MM-DD',
    DEFAULT_TIME_FORMAT: 'HH:mm',
    
    // Distance constants
    MAX_DISTANCE_KM: 1,
    
    // Timeout constants
    PENDING_TIMEOUT_MINUTES: 5,
    
    // Status
    ACTIVE_STATUSES: [0, 1], // Pending, Approved
    
    // Message limits
    MAX_MESSAGE_LENGTH: 500,
    
    // Date formats
    DATE_ONLY_FORMAT: 'YYYY-MM-DD',
    TIME_FORMAT: 'HH:mm:ss',
    TIME_FORMAT_SHORT: 'HH:mm',
    
    // Pricing
    PERCENTAGE_DIVISOR: 100,
    DECIMAL_PLACES: 2,
} as const;

export const APPOINTMENT_STATUS = {
    PENDING: 0,
    APPROVED: 1,
    COMPLETED: 2,
    CANCELLED: 3,
    REJECTED: 4,
    UNANSWERED: 5,
} as const;

export const DECISION_STATUS = {
    PENDING: 0,
    APPROVED: 1,
    REJECTED: 2,
    NO_ANSWER: 3,
} as const;
