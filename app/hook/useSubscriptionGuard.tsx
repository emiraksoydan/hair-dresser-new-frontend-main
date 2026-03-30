/**
 * Subscription guard hook — checks if user has an active trial or subscription.
 * If not (Expired or Banned), redirects to the subscription page.
 */
import { useCallback } from 'react';
import { useGetSubscriptionStatusQuery } from '../store/api';
import { useSafeNavigation } from './useSafeNavigation';

export const useSubscriptionGuard = () => {
    const { data: subscriptionData, isLoading } = useGetSubscriptionStatusQuery();
    const router = useSafeNavigation();

    /**
     * Checks subscription status. If active (Trial or Active), calls the given action.
     * If expired or banned, redirects to subscription page instead.
     */
    const withSubscription = useCallback(
        (action: () => void) => {
            if (isLoading) return;
            const status = subscriptionData?.data?.status;
            if (!status || status === 'Expired' || status === 'Banned') {
                router.push('/(screens)/subscription');
                return;
            }
            action();
        },
        [subscriptionData, isLoading, router],
    );

    const isActive = !isLoading &&
        (subscriptionData?.data?.status === 'Trial' ||
         subscriptionData?.data?.status === 'Active');

    return { withSubscription, isActive, isLoading };
};
