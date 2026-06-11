/**
 * Subscription guard hook.
 *
 * Backend `Subscription:GateEnabled = false` (default) iken backend status'u her zaman
 * 'Active' döner → bu hook hiçbir aksiyonu engellemez (tüm özellikler herkese açık).
 *
 * Gate sonradan true olursa: FreeBarber ve BarberStore kullanıcılar için
 * 'Expired' / 'Banned' döndüğünde /(screens)/subscription sayfasına yönlendirilir.
 *
 * Müşteri (Customer) hesapları hiçbir zaman abonelik gerektirmez.
 * Backend bu kullanıcılar için her zaman 'Active' döner; frontend da bunu teyit eder.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetSubscriptionStatusQuery } from '../store/api';
import { useAppDispatch } from '../store/hook';
import { showSnack } from '../store/snackbarSlice';
import { useSafeNavigation } from './useSafeNavigation';
import { useAuth } from './useAuth';
import { UserType } from '../types';

// Reader pattern (RP3): Aynı anda birden fazla guarded action tetiklenirse
// snackbar 1 kere gösterilsin. Module-level throttle.
let guardSnackThrottle = 0;

export const useSubscriptionGuard = () => {
    const { data: subscriptionData, isLoading } = useGetSubscriptionStatusQuery();
    const { userType } = useAuth();
    const router = useSafeNavigation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const withSubscription = useCallback(
        (action: () => void) => {
            // Müşteri hesapları abonelik gerektirmez → her zaman serbest bırak
            if (userType === UserType.Customer) {
                action();
                return;
            }

            if (isLoading) return;
            const status = subscriptionData?.data?.status;
            const gateEnabled = subscriptionData?.data?.gateEnabled;
            // Gate kapalıysa veya status verisi henüz yoksa aksiyonu serbest bırak.
            if (!gateEnabled || !status) {
                action();
                return;
            }
            if (status === 'Expired' || status === 'Banned') {
                // Snackbar — kullanıcı niye yönlendirildiğini görsün (sessiz redirect kötü UX).
                const now = Date.now();
                if (!guardSnackThrottle || (now - guardSnackThrottle) > 4000) {
                    guardSnackThrottle = now;
                    const msg = status === 'Banned'
                        ? (t('errors.userBanned') as string)
                        : (t('errors.subscriptionExpired') as string);
                    dispatch(showSnack({ message: msg, isError: true }));
                }
                router.push('/(screens)/subscription');
                return;
            }
            action();
        },
        [subscriptionData, isLoading, userType, router, dispatch, t],
    );

    const isActive = !isLoading &&
        (userType === UserType.Customer ||
         !subscriptionData?.data?.gateEnabled ||
         subscriptionData?.data?.status === 'Active');

    return { withSubscription, isActive, isLoading };
};
