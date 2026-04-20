import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ensureLocationGateWithUI } from "../components/location/location-gate";
import { BarberStoreMineDto, FreeBarGetDto, LocationStatus } from "../types";
import { useLazyGetFilteredFreeBarbersQueryQuery } from "../store/api";
import { safeCoord } from "../utils/location/geo";
import { FilterRequestDto } from "../types/filter";


export type UseNearbyStoresParams = {
    stores: BarberStoreMineDto[];
    enabled: boolean;
    hardRefreshMs?: number;
    radiusKm?: number;
    filter?: FilterRequestDto;
    currentUserId?: string;
};

export function useNearbyStoresControl({
    stores,
    enabled,
    hardRefreshMs = 15_000,
    radiusKm = 10,
    filter,
    currentUserId,
}: UseNearbyStoresParams) {
    const [trigger] = useLazyGetFilteredFreeBarbersQueryQuery();

    const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
    const [freeBarbers, setFreeBarbers] = useState<FreeBarGetDto[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    /** Yalnızca kullanıcı retry / açık yenileme — interval arka planında yanmaz */
    const [retryInProgress, setRetryInProgress] = useState(false);
    const [error, setError] = useState<any>(null);
    // location ve isInitialLoad ref olarak tutulur — fetchNearby döngüsünü önlemek için
    const locationRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
    const isInitialLoadRef = useRef(true);
    /** filter / stores her render'da yeni referans alabilir; callback deps'ine koymamak için ref */
    const filterRef = useRef(filter);
    filterRef.current = filter;
    const storesRef = useRef(stores);
    storesRef.current = stores;
    const errorRef = useRef(error);
    errorRef.current = error;

    /** Bağımsız “sadece benim işletmelerim” ekranında keşif kapalıyken yükleme bayrağını sıfırla */
    useEffect(() => {
        if (!enabled) {
            isInitialLoadRef.current = false;
            setIsLoading(false);
            setRetryInProgress(false);
            setFreeBarbers([]);
            setError(null);
        }
    }, [enabled]);

    // Konum izni kontrolü
    useEffect(() => {
        if (!enabled) return;
        ensureLocationGateWithUI().then((gate) => {
            setLocationStatus(gate.ok ? "granted" : "denied");
        });
    }, [enabled]);

    // Store'ların koordinat imzası (Store değişirse bu değişir)
    const storesFingerprint = useMemo(() => {
        if (!stores?.length) return "[]";
        return JSON.stringify(stores.map(s => `${s.id}:${s.latitude},${s.longitude}`));
    }, [stores]);

    // Filter fingerprint for detecting changes
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
        });
    }, [filter]);

    // Track previous filter fingerprint
    const prevFilterFingerprint = useRef(filterFingerprint);

    const fetchNearby = useCallback(async (showLoading: boolean = false, isRetry: boolean = false) => {
        const stores = storesRef.current;
        const filter = filterRef.current;
        if (!enabled || !stores.length) return;

        const isInitialLoad = isInitialLoadRef.current;
        const showRetryUi = isRetry || (showLoading && !isInitialLoad);
        if (showRetryUi) {
            setRetryInProgress(true);
        }
        if (isRetry) {
            setError(null);
        }

        if (showLoading || isInitialLoad) {
            setIsLoading(true);
        }
        try {
            let hasAnyError = false;
            let lastError: any = null;

            const promises = stores.map(async store => {
                const c = safeCoord(store.latitude, store.longitude);
                if (!c) return null;
                // İlk store konumunu ref'e kaydet — state güncellemesi yerine
                if (!locationRef.current && c) {
                    locationRef.current = { latitude: c.lat, longitude: c.lon };
                }
                const filterWithLocation: FilterRequestDto = {
                    ...filter,
                    latitude: c.lat,
                    longitude: c.lon,
                    distanceKm: radiusKm,
                    currentUserId: currentUserId,
                };
                const result = await trigger(filterWithLocation, false);
                if ('error' in result) {
                    hasAnyError = true;
                    lastError = result.error;
                    return [];
                }
                return result.data || [];
            }).filter(Boolean);

            const results = await Promise.all(promises);

            const allBarbers = new Map<string, FreeBarGetDto>();
            results.forEach((list) => {
                if (Array.isArray(list)) {
                    list.forEach(barber => allBarbers.set((barber as any).id, barber));
                }
            });

            setFreeBarbers(Array.from(allBarbers.values()));

            if (hasAnyError && allBarbers.size === 0) {
                setError(lastError);
            } else {
                setError(null);
            }
            isInitialLoadRef.current = false;
        } catch (err) {
            setError(err);
        } finally {
            if (showRetryUi) {
                setRetryInProgress(false);
            }
            if (showLoading || isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, [enabled, radiusKm, trigger, currentUserId]);

    const manualFetch = useCallback(() => {
        if (!enabled || !storesRef.current.length) return;
        fetchNearby(true, !!errorRef.current);
    }, [enabled, fetchNearby]);

    // 1. Durum: Store listesi veya koordinatı değişirse ANINDA çek
    useEffect(() => {
        fetchNearby(isInitialLoadRef.current);
    }, [storesFingerprint, fetchNearby]);

    // 2. Durum: Filtre değişirse yeniden çek
    useEffect(() => {
        if (prevFilterFingerprint.current === filterFingerprint) return;
        prevFilterFingerprint.current = filterFingerprint;
        if (isInitialLoadRef.current) return;
        fetchNearby(false);
    }, [filterFingerprint, fetchNearby]);

    // 3. Durum: Periyodik olarak arka planda yenile (Timer)
    // Background refresh'lerde loading gösterme
    useEffect(() => {
        if (!enabled) return;
        if (locationStatus !== "granted") return;

        const interval = setInterval(() => fetchNearby(false), hardRefreshMs);
        return () => clearInterval(interval);
    }, [enabled, hardRefreshMs, fetchNearby, locationStatus]);

    return {
        freeBarbers,
        isLoading,
        retryInProgress,
        locationStatus,
        hasLocation: locationStatus === "granted",
        location: locationRef.current,
        error,
        manualFetch,
    };
}