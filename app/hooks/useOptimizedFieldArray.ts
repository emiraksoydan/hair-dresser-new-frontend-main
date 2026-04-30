import { useMemo, useCallback } from 'react';
import { Control, useWatch } from 'react-hook-form';

/**
 * Optimized field array utilities to prevent unnecessary re-renders
 *
 * This hook provides memoized helpers for working with react-hook-form field arrays
 * without triggering full form re-renders on every change.
 */

type BarberOption = {
    label: string;
    value: string;
    ratingAvg?: number | null;
    ratingCount?: number | null;
};

export function useOptimizedChairOptions(
    control: Control<any>,
    barbersFieldName: string = 'barbers',
    chairsFieldName: string = 'chairs'
) {
    // Watch only the specific fields we need
    const barbers = useWatch({ control, name: barbersFieldName }) ?? [];
    const chairs = useWatch({ control, name: chairsFieldName }) ?? [];

    // Memoize valid barbers (those with names)
    const validBarbers = useMemo(
        () => (barbers ?? []).filter((b: any) => !!b.name?.trim()),
        [barbers]
    );

    // Memoize barber options map for each chair
    const barberOptionsMap = useMemo(() => {
        // Count how many chairs are using each barber
        const usageCount = new Map<string, number>();
        chairs.forEach((c: any) => {
            if (c.mode === 'barber' && c.barberId) {
                usageCount.set(c.barberId, (usageCount.get(c.barberId) ?? 0) + 1);
            }
        });

        // Build options for each chair
        const optionsMap = new Map<string, BarberOption[]>();

        chairs.forEach((chair: any) => {
            // Calculate available barbers for this specific chair
            const availableForThisChair = validBarbers
                .filter((barber: any) => {
                    // If this chair is using this barber, it's available
                    if (chair.mode === 'barber' && chair.barberId === barber.id) {
                        return true;
                    }
                    // Otherwise, check if barber is not used by another chair
                    return !usageCount.has(barber.id);
                })
                .map((barber: any) => ({
                    label: barber.name!.trim(),
                    value: barber.id,
                    ratingAvg: barber.averageRating ?? barber.rating ?? null,
                    ratingCount: barber.ratingCount ?? barber.totalRatingCount ?? null,
                }));

            optionsMap.set(chair.id, availableForThisChair);
        });

        return optionsMap;
    }, [chairs, validBarbers]);

    // Memoize getter function
    const getBarberOptions = useCallback(
        (chairId: string): BarberOption[] => {
            return barberOptionsMap.get(chairId) ?? [];
        },
        [barberOptionsMap]
    );

    return {
        validBarbers,
        getBarberOptions,
        barberOptionsMap
    };
}
