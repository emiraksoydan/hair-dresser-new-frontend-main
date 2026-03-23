/**
 * Centralized user-facing messages
 * Now uses i18n for translations
 * Use getMessages() function to get translated messages
 */

import i18n from '../i18n/config';

// Helper function to get translated messages
export const getMessages = () => {
    const t = i18n.t;
    return {
        // Appointment Status
        APPOINTMENT_STATUS: {
            PENDING: t('appointment.status.pending'),
            APPROVED: t('appointment.status.approved'),
            COMPLETED: t('appointment.status.completed'),
            CANCELLED: t('appointment.status.cancelled'),
            REJECTED: t('appointment.status.rejected'),
            UNANSWERED: t('appointment.status.unanswered'),
        },

        // Time Format
        TIME: {
            NOW: t('time.now'),
            MINUTES_AGO: (mins: number) => t('time.minutesAgo', { mins }),
            HOURS_AGO: (hours: number) => t('time.hoursAgo', { hours }),
        },

        // Empty States
        EMPTY_STATE: {
            NO_MESSAGES: t('empty.noMessages'),
            NO_APPOINTMENTS: t('empty.noAppointments'),
            NO_NOTIFICATIONS: t('empty.noNotifications'),
            NO_FAVORITES: t('empty.noFavorites'),
        },

        // Actions
        ACTIONS: {
            APPROVE: t('appointment.actions.approve'),
            REJECT: t('appointment.actions.reject'),
            CANCEL: t('appointment.actions.cancel'),
            COMPLETE: t('appointment.actions.complete'),
            RETRY: t('appointment.actions.retry'),
            CANCEL_BUTTON: t('appointment.actions.cancelButton'),
            YES_CANCEL: t('appointment.actions.yesCancel'),
            YES_COMPLETE: t('appointment.actions.yesComplete'),
        },

        // Alert Titles
        ALERTS: {
            APPOINTMENT_CANCELLATION: t('appointment.alerts.cancellationTitle'),
            APPOINTMENT_COMPLETION: t('appointment.alerts.completionTitle'),
            SUCCESS: t('common.success'),
            ERROR: t('common.error'),
        },

        // Alert Messages
        ALERT_MESSAGES: {
            CONFIRM_CANCELLATION: t('appointment.alerts.confirmCancellation'),
            CONFIRM_COMPLETION: t('appointment.alerts.confirmCompletion'),
            APPOINTMENT_APPROVED: t('appointment.alerts.approved'),
            APPOINTMENT_REJECTED: t('appointment.alerts.rejected'),
            APPOINTMENT_CANCELLED: t('appointment.alerts.cancelled'),
            APPOINTMENT_COMPLETED: t('appointment.alerts.completed'),
            OPERATION_FAILED: t('common.operationFailed'),
        },

        // Errors
        ERRORS: {
            UNEXPECTED: t('common.unexpectedError'),
            NETWORK_ERROR: t('common.networkError'),
            LOADING_ERROR: t('common.loadingError'),
        },

        // Unread Badge
        UNREAD_BADGE: {
            MAX_DISPLAY: 99,
            MAX_DISPLAY_TEXT: '99+',
        },

        // Labels
        LABELS: {
            FREE_BARBER: t('labels.freeBarber'),
            CUSTOMER: t('labels.customer'),
            STORE: t('labels.store'),
        },

        // Appointment Details
        APPOINTMENT_DETAILS: {
            CUSTOMER_DEFAULT_NAME: t('labels.customerDefaultName'),
            STORE_DEFAULT_NAME: t('labels.storeDefaultName'),
            FREE_BARBER_DEFAULT_NAME: t('labels.freeBarberDefaultName'),
        },

        // Profile Messages
        PROFILE: {
            UPDATE_SUCCESS: t('profile.updateSuccess'),
            UPDATE_ERROR: t('profile.updateError'),
            UPDATE_FAILED: t('profile.updateFailed'),
            IMAGE_UPDATE_SUCCESS: t('profile.updateSuccess'),
            IMAGE_UPDATE_ERROR: t('profile.updateError'),
            IMAGE_UPDATE_FAILED: t('profile.updateError'),
            REFRESH_FAILED: t('profile.refreshFailed'),
            SETTING_UPDATE_SUCCESS: t('profile.updateSuccess'),
            SETTING_UPDATE_ERROR: t('profile.updateError'),
            USER_NOT_FOUND: t('common.error'),
        },

        // Form Messages
        FORM: {
            STORE_CREATE_SUCCESS: t('form.storeCreateSuccess'),
            STORE_CREATE_ERROR: t('form.storeCreateError'),
            STORE_UPDATE_SUCCESS: t('form.storeUpdateSuccess'),
            STORE_UPDATE_ERROR: t('form.storeUpdateError'),
            STORE_IMAGES_UPLOAD_ERROR: t('form.storeImagesUploadError'),
            STORE_IMAGES_UPDATE_ERROR: t('form.storeImagesUpdateError'),
            FREEBARBER_CREATE_SUCCESS: t('form.freebarberCreateSuccess'),
            FREEBARBER_CREATE_ERROR: t('form.freebarberCreateError'),
            FREEBARBER_UPDATE_SUCCESS: t('form.freebarberUpdateSuccess'),
            FREEBARBER_UPDATE_ERROR: t('form.freebarberUpdateError'),
            FREEBARBER_IMAGES_UPLOAD_ERROR: t('form.freebarberImagesUploadError'),
            FREEBARBER_IMAGES_UPDATE_ERROR: t('form.freebarberImagesUpdateError'),
            CERTIFICATE_UPLOAD_ERROR: t('form.certificateUploadError'),
            CERTIFICATE_UPLOAD_FAILED: t('form.certificateUploadFailed'),
            TAX_DOCUMENT_UPLOAD_ERROR: t('form.taxDocumentUploadError'),
            TAX_DOCUMENT_UPLOAD_FAILED: t('form.taxDocumentUploadFailed'),
            IMAGE_DELETE_ERROR: t('form.imageDeleteError'),
            IMAGE_UPDATE_BLOB_ERROR: t('form.imageUpdateBlobError'),
            IMAGE_UPLOAD_ERROR: t('form.imageUploadError'),
            PANEL_ID_NOT_FOUND: t('form.panelIdNotFound'),
            STORE_ID_NOT_FOUND: t('form.storeIdNotFound'),
            BARBER_IMAGE_UPLOAD_ERROR: t('form.barberImageUploadError'),
            BARBER_ADD_SUCCESS: t('form.barberAddSuccess'),
            BARBER_UPDATE_SUCCESS: t('form.barberUpdateSuccess'),
            BARBER_ADD_IMAGE_ERROR: t('form.barberAddImageError'),
            BARBER_UPDATE_IMAGE_ERROR: t('form.barberUpdateImageError'),
            OPERATION_SUCCESS: t('common.operationSuccess'),
            OPERATION_FAILED: t('common.operationFailed'),
            LOCATION_NOT_AVAILABLE: t('form.locationNotAvailable'),
        },
    };
};

// Backward compatibility: Export MESSAGES as a getter function
// This allows existing code to continue working
export const MESSAGES = getMessages();
