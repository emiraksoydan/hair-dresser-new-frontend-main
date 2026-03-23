import { LocationStatus } from '../types';
import { useLanguage } from './useLanguage';
import { useAlert } from './useAlert';

/**
 * Hook to check if user can perform actions (appointment booking, panel add/update)
 * Returns false if:
 * - Server is down (error exists)
 * - Location permission is denied
 */
export function useCanPerformAction(
    error: any,
    locationStatus: LocationStatus | undefined,
    locationMessage?: string
): { canPerform: boolean; checkAndAlert: () => boolean } {
    const { t } = useLanguage();
    const { alertError } = useAlert();
    const canPerform = !error && locationStatus !== 'denied';

    const checkAndAlert = (): boolean => {
        if (error) {
            const errorMessage = error?.data?.message || error?.message || t('errors.serverUnreachable');
            alertError(t('common.error'), errorMessage);
            return false;
        }

        if (locationStatus === 'denied') {
            alertError(
                t('location.locationRequired'),
                locationMessage || t('location.permissionDeniedSettings')
            );
            return false;
        }

        return true;
    };

    return { canPerform, checkAndAlert };
}
