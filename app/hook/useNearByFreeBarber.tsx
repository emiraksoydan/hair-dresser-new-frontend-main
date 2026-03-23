// useNearByFreeBarber.ts (useNearbyFreeBarber)
// Wrapper hook for free barbers - uses the generic useNearby hook
import { useLazyGetNearbyFreeBarberQuery, useLazyGetFilteredFreeBarbersQueryQuery } from "../store/api";
import { useNearbyWithFilter } from "./useNearbyWithFilter";
import type { FreeBarGetDto } from "../types";
import type { FilterRequestDto } from "../types/filter";

interface UseNearbyFreeBarberOptions {
    enabled: boolean;
    filter?: FilterRequestDto;
    useFilteredEndpoint?: boolean;
}

export function useNearbyFreeBarber(enabledOrOptions: boolean | UseNearbyFreeBarberOptions) {
    // Support both old (boolean) and new (options object) API
    const options: UseNearbyFreeBarberOptions = typeof enabledOrOptions === 'boolean' 
        ? { enabled: enabledOrOptions }
        : enabledOrOptions;

    // Always call both hooks (React rules of hooks)
    const [nearbyTrigger, nearbyResult] = useLazyGetNearbyFreeBarberQuery();
    const [filteredTrigger, filteredResult] = useLazyGetFilteredFreeBarbersQueryQuery();

    const result = useNearbyWithFilter<FreeBarGetDto>({
        enabled: options.enabled,
        filter: options.filter,
        useFilteredEndpoint: options.useFilteredEndpoint,
        nearbyTrigger,
        nearbyResult,
        filteredTrigger,
        filteredResult,
    });

    return {
        freeBarbers: result.data,
        loading: result.loading,
        fetching: result.fetching,
        fetchedOnce: result.fetchedOnce,
        error: result.error,
        locationStatus: result.locationStatus,
        locationMessage: result.locationMessage,
        hasLocation: result.hasLocation,
        location: result.location,
        manualFetch: result.manualFetch,
        retryPermission: result.retryPermission,
    };
}
