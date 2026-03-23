/**
 * Centralized time formatting utilities
 * Memoized to avoid recreation on every render
 */

import { useMemo, useCallback } from 'react';
import { TIME_CONSTANTS } from '../../constants/time';
import { MESSAGES } from '../../constants/messages';
import { formatDate } from './time-helper';

/**
 * Format relative time (e.g., "5 dk", "2 sa", or full date)
 * Memoized version for use in components
 */
export const useFormatTime = () => {
    return useCallback((dateStr?: string | null): string => {
        if (!dateStr) return '';

        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = now.getTime() - date.getTime();
            const diffMins = Math.floor(diffMs / TIME_CONSTANTS.MINUTE_MS);

            if (diffMins < TIME_CONSTANTS.DISPLAY_NOW_THRESHOLD_MINUTES) {
                return MESSAGES.TIME.NOW;
            }

            if (diffMins < TIME_CONSTANTS.DISPLAY_MINUTES_THRESHOLD) {
                return MESSAGES.TIME.MINUTES_AGO(diffMins);
            }

            if (diffMins < TIME_CONSTANTS.DISPLAY_HOURS_THRESHOLD) {
                return MESSAGES.TIME.HOURS_AGO(Math.floor(diffMins / TIME_CONSTANTS.MINUTES_PER_HOUR));
            }

            return formatDate(dateStr);
        } catch {
            return '';
        }
    }, []);
};

