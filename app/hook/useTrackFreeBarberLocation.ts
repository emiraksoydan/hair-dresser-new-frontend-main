import { useCallback } from "react";
import { useNearbyControl } from "./useNearByControl";
import { useUpdateFreeBarberLocationMutation } from "../store/api";

export function useTrackFreeBarberLocation(enabled: boolean, barberId: string | null) {
    const [updateLocation, { isLoading }] = useUpdateFreeBarberLocationMutation();

    const onFetch = useCallback(async (lat: number, lon: number) => {
        if (!barberId) return;
        try {
            await updateLocation({ id: barberId, latitude: lat, longitude: lon });
        } catch {
            // Sessizce devam et
        }
    }, [barberId, updateLocation]);

    const tracker = useNearbyControl({
        enabled: enabled && !!barberId,
        moveThresholdM: 100,
        staleMs: 15 * 1000,
        hardRefreshMs: 30 * 1000,
        enableBackgroundTracking: true,
        onFetch,
    });

    return {
        isTracking: tracker.locationStatus === 'granted',
        status: tracker.locationStatus,
        message: tracker.locationMessage,
        retry: tracker.retryPermission,
        isUpdating: isLoading,
    };
}