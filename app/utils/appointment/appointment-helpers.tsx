/**
 * Shared appointment helper functions
 * Used across different user type appointment pages
 */

import { AppointmentStatus } from '../../types';
import { COLORS } from '../../constants/colors';
import { MESSAGES } from '../../constants/messages';

/**
 * Get color for appointment status
 */
export const getAppointmentStatusColor = (status: AppointmentStatus): string => {
    switch (status) {
        case AppointmentStatus.Pending:
            return COLORS.STATUS.PENDING;
        case AppointmentStatus.Approved:
            return COLORS.STATUS.APPROVED;
        case AppointmentStatus.Completed:
            return COLORS.STATUS.COMPLETED;
        case AppointmentStatus.Cancelled:
            return COLORS.STATUS.CANCELLED;
        case AppointmentStatus.Rejected:
            return COLORS.STATUS.REJECTED;
        case AppointmentStatus.Unanswered:
            return COLORS.STATUS.UNANSWERED;
        default:
            return COLORS.STATUS.DEFAULT;
    }
};

/**
 * Get text for appointment status
 */
export const getAppointmentStatusText = (status: AppointmentStatus): string => {
    switch (status) {
        case AppointmentStatus.Pending:
            return MESSAGES.APPOINTMENT_STATUS.PENDING;
        case AppointmentStatus.Approved:
            return MESSAGES.APPOINTMENT_STATUS.APPROVED;
        case AppointmentStatus.Completed:
            return MESSAGES.APPOINTMENT_STATUS.COMPLETED;
        case AppointmentStatus.Cancelled:
            return MESSAGES.APPOINTMENT_STATUS.CANCELLED;
        case AppointmentStatus.Rejected:
            return MESSAGES.APPOINTMENT_STATUS.REJECTED;
        case AppointmentStatus.Unanswered:
            return MESSAGES.APPOINTMENT_STATUS.UNANSWERED;
        default:
            return '';
    }
};

/**
 * Check if appointment can be cancelled
 */
export const canCancelAppointment = (status: AppointmentStatus): boolean => {
    return status === AppointmentStatus.Pending || status === AppointmentStatus.Approved;
};

/**
 * Check if appointment can be completed (only for approved appointments)
 */
export const canCompleteAppointment = (status: AppointmentStatus): boolean => {
    return status === AppointmentStatus.Approved;
};

