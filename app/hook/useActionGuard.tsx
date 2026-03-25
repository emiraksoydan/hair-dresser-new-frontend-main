/**
 * Action guard hook — prevents duplicate POST/mutation calls when user taps rapidly.
 *
 * Usage:
 *   const guard = useActionGuard();
 *   const handleSubmit = () => guard(async () => {
 *       await someApiCall().unwrap();
 *   });
 */
import { useRef, useCallback } from 'react';

export const useActionGuard = () => {
    const isRunningRef = useRef(false);

    const guard = useCallback(
        async <T,>(action: () => Promise<T> | T): Promise<T | undefined> => {
            if (isRunningRef.current) return undefined;
            isRunningRef.current = true;
            try {
                return await Promise.resolve(action());
            } finally {
                isRunningRef.current = false;
            }
        },
        [],
    );

    return guard;
};
