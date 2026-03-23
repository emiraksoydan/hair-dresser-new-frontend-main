/**
 * Generic hook for nearby data fetching with filter support
 * Uses pre-called RTK Query hooks to avoid conditional hook calls
 */

import { useCallback, useEffect, useRef, useMemo } from "react";
import { useNearbyControl } from "./useNearByControl";
import { LocationStatus } from "../types";
import { FilterRequestDto } from "../types/filter";

const DEFAULT_RADIUS_KM = 10;
const DEFAULT_MOVE_THRESHOLD_M = 150;
const DEFAULT_STALE_MS = 15_000;
const DEFAULT_HARD_REFRESH_MS = 15_000;

interface UseNearbyWithFilterOptions<T> {
    enabled: boolean;
    moveThresholdM?: number;
    staleMs?: number;
    hardRefreshMs?: number;
    radiusKm?: number;
    // Filter support
    filter?: FilterRequestDto;
    useFilteredEndpoint?: boolean;
    // Pre-called hooks (to avoid conditional hook calls)
    nearbyTrigger: (args: { lat: number; lon: number; radiusKm: number }, preferCacheValue?: boolean) => Promise<any>;
    nearbyResult: { data?: T[]; isLoading: boolean; isFetching: boolean; error?: any };
    filteredTrigger: (filter: FilterRequestDto, preferCacheValue?: boolean) => Promise<any>;
    filteredResult: { data?: T[]; isLoading: boolean; isFetching: boolean; error?: any };
}

interface UseNearbyWithFilterResult<T> {
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
 * Generic hook for fetching nearby data with filter support
 * Receives pre-called RTK Query hooks to comply with React rules of hooks
 */
export function useNearbyWithFilter<T>(
    options: UseNearbyWithFilterOptions<T>
): UseNearbyWithFilterResult<T> {
    const {
        enabled,
        moveThresholdM = DEFAULT_MOVE_THRESHOLD_M,
        staleMs = DEFAULT_STALE_MS,
        hardRefreshMs = DEFAULT_HARD_REFRESH_MS,
        radiusKm = DEFAULT_RADIUS_KM,
        filter,
        useFilteredEndpoint = false,
        nearbyTrigger,
        nearbyResult,
        filteredTrigger,
        filteredResult,
    } = options;

    // Determine which result to use based on filter mode
    const shouldUseFiltered = useFilteredEndpoint && filter;
    const activeResult = shouldUseFiltered ? filteredResult : nearbyResult;

    // Filter fingerprint for detecting changes (excluding location which is handled separately)
    const filterFingerprint = useMemo(() => {
        if (!filter) return '';
        return JSON.stringify({
            mainCategory: filter.mainCategory,
            serviceIds: filter.serviceIds,
            priceSort: filter.priceSort,
            minPrice: filter.minPrice,
            maxPrice: filter.maxPrice,
            pricingType: filter.pricingType,
            isAvailable: filter.isAvailable,
            isOpenNow: filter.isOpenNow,
            minRating: filter.minRating,
            favoritesOnly: filter.favoritesOnly,
            userType: filter.userType,
            searchQuery: filter.searchQuery,
            currentUserId: filter.currentUserId,
        });
    }, [filter]);

    // Track previous filter fingerprint
    const prevFilterFingerprint = useRef(filterFingerprint);
    const locationRef = useRef<{ lat: number; lon: number } | null>(null);
    const isFilterRefetching = useRef(false);

    const onFetch = useCallback(async (lat: number, lon: number) => {
        // Save location for filter change refetch
        locationRef.current = { lat, lon };
        
        if (shouldUseFiltered) {
            // Use filtered endpoint with full filter object
            const filterWithLocation: FilterRequestDto = {
                ...filter,
                latitude: lat,
                longitude: lon,
                distanceKm: radiusKm,
            };
            await filteredTrigger(filterWithLocation, false);
        } else {
            // Use simple nearby endpoint
            await nearbyTrigger({ lat, lon, radiusKm }, false);
        }
    }, [nearbyTrigger, filteredTrigger, radiusKm, filter, shouldUseFiltered]);

    const nearby = useNearbyControl({
        enabled,
        moveThresholdM,
        staleMs,
        hardRefreshMs,
        onFetch,
        error: activeResult.error,
    });

    // Update location ref from nearby control
    useEffect(() => {
        if (nearby.location) {
            locationRef.current = { 
                lat: nearby.location.latitude, 
                lon: nearby.location.longitude 
            };
        }
    }, [nearby.location]);

    // Refetch when filter changes (and we have location)
    useEffect(() => {
        // Skip if filter hasn't changed
        if (prevFilterFingerprint.current === filterFingerprint) {
            return;
        }
        
        // Update previous fingerprint
        prevFilterFingerprint.current = filterFingerprint;
        
        // Skip if we don't have location yet or already refetching
        if (!locationRef.current || isFilterRefetching.current) {
            return;
        }
        
        // Skip if not using filtered endpoint
        if (!shouldUseFiltered) {
            return;
        }
        
        // Refetch with new filter
        const refetchWithNewFilter = async () => {
            isFilterRefetching.current = true;
            try {
                const filterWithLocation: FilterRequestDto = {
                    ...filter,
                    latitude: locationRef.current!.lat,
                    longitude: locationRef.current!.lon,
                    distanceKm: radiusKm,
                };
                await filteredTrigger(filterWithLocation, false);
            } finally {
                isFilterRefetching.current = false;
            }
        };
        
        refetchWithNewFilter();
    }, [filterFingerprint, filter, radiusKm, filteredTrigger, shouldUseFiltered]);

    return {
        data: (activeResult.data ?? []) as T[],
        loading: nearby.initialLoading || activeResult.isLoading,
        fetching: activeResult.isFetching,
        fetchedOnce: nearby.fetchedOnce,
        error: activeResult.error,
        locationStatus: nearby.locationStatus,
        locationMessage: nearby.locationMessage,
        hasLocation: nearby.hasLocation,
        location: nearby.location,
        manualFetch: nearby.manualFetch ?? (async () => { }),
        retryPermission: nearby.retryPermission,
    };
}
