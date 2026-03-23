/**
 * Generic hook for nearby data fetching
 * Consolidates useNearbyStores and useNearbyFreeBarber logic
 * 
 * NOTE: This is the simple version without filter support.
 * For filter support, use useNearbyWithFilter instead.
 */

import { useCallback } from "react";
import { useNearbyControl } from "./useNearByControl";
import { LocationStatus } from "../types";

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_MOVE_THRESHOLD_M = 150;
const DEFAULT_STALE_MS = 15_000;
const DEFAULT_HARD_REFRESH_MS = 15_000;

interface UseNearbyOptions {
    enabled: boolean;
    moveThresholdM?: number;
    staleMs?: number;
    hardRefreshMs?: number;
    radiusKm?: number;
}

interface UseNearbyResult<T> {
    data: T[];
    loading: boolean;
    fetching: boolean;
    fetchedOnce: boolean;
    error: any;
    locationStatus: LocationStatus;
    locationMessage: string;
    hasLocation: boolean;
    location?: { latitude: number; longitude: number };
    manualFetch: () => Promise<void>;
    retryPermission: () => Promise<void>;
}

/**
 * Generic hook for fetching nearby data (simple version without filters)
 * @param queryHook - RTK Query lazy query hook (e.g., useLazyGetNearbyStoresQuery)
 * @param options - Configuration options
 */
export function useNearby<T>(
    queryHook: () => [any, { data?: T[]; isLoading: boolean; isFetching: boolean; error?: any }, any],
    options: UseNearbyOptions
): UseNearbyResult<T> {
    const {
        enabled,
        moveThresholdM = DEFAULT_MOVE_THRESHOLD_M,
        staleMs = DEFAULT_STALE_MS,
        hardRefreshMs = DEFAULT_HARD_REFRESH_MS,
        radiusKm = DEFAULT_RADIUS_KM,
    } = options;

    const [trigger, result] = queryHook();

    const onFetch = useCallback(async (lat: number, lon: number) => {
        // Hard refresh için preferCacheValue: false kullan (cache'i bypass et, yeni veri fetch et)
        await trigger({ lat, lon, radiusKm }, false);
    }, [trigger, radiusKm]);

    const nearby = useNearbyControl({
        enabled,
        moveThresholdM,
        staleMs,
        hardRefreshMs,
        onFetch,
        error: result.error, // Error durumunda hard refresh'i durdurmak için
    });

    return {
        data: (result.data ?? []) as T[],
        loading: nearby.initialLoading || result.isLoading,
        fetching: result.isFetching,
        fetchedOnce: nearby.fetchedOnce,
        error: result.error,
        locationStatus: nearby.locationStatus,
        locationMessage: nearby.locationMessage,
        hasLocation: nearby.hasLocation,
        location: nearby.location,
        manualFetch: nearby.manualFetch ?? (async () => { }),
        retryPermission: nearby.retryPermission,
    };
}
