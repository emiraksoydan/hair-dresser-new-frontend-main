// useNearByStore.ts (useNearbyStores)
// Wrapper hook for stores - uses the generic useNearby hook
import { useLazyGetNearbyStoresQuery, useLazyGetFilteredStoresQueryQuery } from "../store/api";
import { useNearbyWithFilter } from "./useNearbyWithFilter";
import type { BarberStoreGetDto } from "../types";
import type { FilterRequestDto } from "../types/filter";

interface UseNearbyStoresOptions {
    enabled: boolean;
    filter?: FilterRequestDto;
    useFilteredEndpoint?: boolean;
    /** Filter mode'da infinite-scroll sayfa boyutu (backend limit hard-cap ile korunur). */
    pageSize?: number;
    persistKey?: string;
}

export function useNearbyStores(enabledOrOptions: boolean | UseNearbyStoresOptions) {
    // Support both old (boolean) and new (options object) API
    const options: UseNearbyStoresOptions = typeof enabledOrOptions === 'boolean' 
        ? { enabled: enabledOrOptions }
        : enabledOrOptions;

    // Always call both hooks (React rules of hooks)
    const [nearbyTrigger, nearbyResult] = useLazyGetNearbyStoresQuery();
    const [filteredTrigger, filteredResult] = useLazyGetFilteredStoresQueryQuery();

    const result = useNearbyWithFilter<BarberStoreGetDto>({
        enabled: options.enabled,
        filter: options.filter,
        useFilteredEndpoint: options.useFilteredEndpoint,
        pageSize: options.pageSize,
        nearbyTrigger,
        nearbyResult,
        filteredTrigger,
        filteredResult,
        liveFavoriteEntity: "store",
        persistKey: options.persistKey,
    });

    return {
        stores: result.data,
        loading: result.loading,
        fetching: result.fetching,
        retryInProgress: result.retryInProgress,
        fetchedOnce: result.fetchedOnce,
        error: result.error,
        locationStatus: result.locationStatus,
        locationMessage: result.locationMessage,
        hasLocation: result.hasLocation,
        location: result.location,
        manualFetch: result.manualFetch,
        retryPermission: result.retryPermission,
        loadMore: result.loadMore,
        hasMore: result.hasMore,
        loadingMore: result.loadingMore,
    };
}
