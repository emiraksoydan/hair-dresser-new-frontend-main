/**
 * Safe navigation hook — prevents duplicate page pushes when user taps rapidly.
 * Throttles push/replace calls to THROTTLE_MS milliseconds.
 */
import { useRef, useCallback } from 'react';
import { useRouter } from 'expo-router';

const THROTTLE_MS = 600;

export const useSafeNavigation = () => {
    const router = useRouter();
    const lastCallRef = useRef<number>(0);
    const isNavigatingRef = useRef(false);

    const safePush = useCallback(
        (...args: Parameters<typeof router.push>) => {
            const now = Date.now();
            if (isNavigatingRef.current || now - lastCallRef.current < THROTTLE_MS) return;
            lastCallRef.current = now;
            isNavigatingRef.current = true;
            router.push(...args);
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, THROTTLE_MS);
        },
        [router],
    );

    const safeReplace = useCallback(
        (...args: Parameters<typeof router.replace>) => {
            const now = Date.now();
            if (isNavigatingRef.current || now - lastCallRef.current < THROTTLE_MS) return;
            lastCallRef.current = now;
            isNavigatingRef.current = true;
            router.replace(...args);
            setTimeout(() => {
                isNavigatingRef.current = false;
            }, THROTTLE_MS);
        },
        [router],
    );

    /** Oturum açma gibi kritik yönlendirmelerde throttle yüzünden replace'in sessizce atlanmaması için */
    const replaceImmediate = useCallback(
        (...args: Parameters<typeof router.replace>) => {
            lastCallRef.current = 0;
            isNavigatingRef.current = false;
            router.replace(...args);
        },
        [router],
    );

    const goBack = useCallback(() => {
        router.back();
    }, [router]);

    return {
        ...router,
        push: safePush,
        replace: safeReplace,
        replaceImmediate,
        goBack,
    } as ReturnType<typeof useRouter> & {
        replaceImmediate: typeof replaceImmediate;
        goBack: typeof goBack;
    };
};
