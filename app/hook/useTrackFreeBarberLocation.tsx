import { useNearbyControl } from "./useNearByControl";
import { useUpdateFreeBarberLocationMutation } from "../store/api";

export function useTrackFreeBarberLocation(enabled: boolean, barberId: string | null) {
    const [updateLocation, { isLoading }] = useUpdateFreeBarberLocationMutation();

    const tracker = useNearbyControl({
        enabled: enabled && !!barberId,
        moveThresholdM: 100,
        staleMs: 15 * 1000,
        hardRefreshMs: 30 * 1000,
        enableBackgroundTracking: true, // Sadece free barber konum takibi arka planda çalışır
        onFetch: async (lat, lon) => {
            if (!barberId) return;
            try {
                await updateLocation({
                    id: barberId,
                    latitude: lat,
                    longitude: lon
                });
                // Location update hatası sessizce atlanır
            } catch (error) {
                // Sessizce devam et
            }
        },
    });

    return {
        isTracking: tracker.locationStatus === 'granted',
        status: tracker.locationStatus,
        message: tracker.locationMessage,
        retry: tracker.retryPermission,
        isUpdating: isLoading,
    };
}