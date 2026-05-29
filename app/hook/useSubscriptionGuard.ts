/**
 * Subscription guard hook.
 *
 * Backend `Subscription:GateEnabled = false` (default) iken backend status'u her zaman
 * 'Active' döner → bu hook hiçbir aksiyonu engellemez (tüm özellikler herkese açık).
 *
 * Gate sonradan true olursa: status 'Expired' / 'Banned' dönen kullanıcılar
 * /(screens)/subscription sayfasına yönlendirilir.
 *
 * NOT: Trial konsepti kullanıcı isteği ile tamamen kaldırıldı (Madde 8 / Phase B).
 * Backend artık 'Trial' status'u DÖNDÜRMEZ; sadece 'Active' / 'Expired' / 'Banned'.
 */
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useGetSubscriptionStatusQuery } from '../store/api';
import { useAppDispatch } from '../store/hook';
import { showSnack } from '../store/snackbarSlice';
import { useSafeNavigation } from './useSafeNavigation';

// Reader pattern (RP3): Aynı anda birden fazla guarded action tetiklenirse
// snackbar 1 kere gösterilsin. Module-level throttle.
let guardSnackThrottle = 0;

export const useSubscriptionGuard = () => {
    const { data: subscriptionData, isLoading } = useGetSubscriptionStatusQuery();
    const router = useSafeNavigation();
    const dispatch = useAppDispatch();
    const { t } = useTranslation();

    const withSubscription = useCallback(
        (action: () => void) => {
            if (isLoading) return;
            const status = subscriptionData?.data?.status;
            const gateEnabled = (subscriptionData?.data as any)?.gateEnabled;
            // Gate kapalıysa veya status verisi henüz yoksa aksiyonu serbest bırak.
            if (gateEnabled === false || !status) {
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
        [subscriptionData, isLoading, router, dispatch, t],
    );

    const isActive = !isLoading &&
        ((subscriptionData?.data as any)?.gateEnabled === false ||
         subscriptionData?.data?.status === 'Active');

    return { withSubscription, isActive, isLoading };
};
