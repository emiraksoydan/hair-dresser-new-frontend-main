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
    const [isInitialLoad, setIsInitialLoad] = useState(true); // İlk yüklemeyi takip et
    const [error, setError] = useState<any>(null);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | undefined>(undefined);

    /** Bağımsız “sadece benim işletmelerim” ekranında keşif kapalıyken yükleme bayrağını sıfırla */
    useEffect(() => {
        if (!enabled) {
            setIsInitialLoad(false);
            setIsLoading(false);
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
        if (!enabled || !stores.length) return;
        // Error varsa ve retry değilse ve manuel fetch değilse fetch yapma (hard refresh'te)
        // isRetry true ise (retry butonuna basıldı), error'u temizleyip tekrar dene
        if (error && !showLoading && !isRetry) return;
        
        // Retry durumunda önce error'u temizle
        if (isRetry) {
            setError(null);
        }

        // Sadece ilk yüklemede veya manuel fetch'te loading göster
        if (showLoading || isInitialLoad) {
            setIsLoading(true);
        }
        try {
            // Her mağaza için ayrı istek atıp sonuçları topluyoruz
            let hasAnyError = false;
            let lastError: any = null;
            
            const promises = stores.map(async store => {
                const c = safeCoord(store.latitude, store.longitude);
                if (!c) return null;
                // İlk store'un konumunu kaydet (filtreleme için)
                if (!location && c) {
                    setLocation({ latitude: c.lat, longitude: c.lon });
                }
                // Filtered endpoint kullan - tüm filtreleri gönder
                const filterWithLocation: FilterRequestDto = {
                    ...filter,
                    latitude: c.lat,
                    longitude: c.lon,
                    distanceKm: radiusKm,
                    currentUserId: currentUserId,
                };
                const result = await trigger(filterWithLocation, false);
                if ('error' in result) {
                    // Hata varsa kaydet - servis hatası olabilir
                    hasAnyError = true;
                    lastError = result.error;
                    return [];
                }
                return result.data || [];
            }).filter(Boolean);

            const results = await Promise.all(promises);

            // Tüm sonuçları tek bir listede birleştir ve ID'ye göre tekrar edenleri temizle
            const allBarbers = new Map<string, FreeBarGetDto>();
            results.forEach((list) => {
                if (Array.isArray(list)) {
                    list.forEach(barber => allBarbers.set((barber as any).id, barber));
                }
            });

            setFreeBarbers(Array.from(allBarbers.values()));
            
            // Eğer tüm istekler hata verdiyse ve sonuç boşsa, hatayı göster
            if (hasAnyError && allBarbers.size === 0) {
                setError(lastError);
            } else {
                setError(null);
            }
            setIsInitialLoad(false); // İlk yükleme tamamlandı
        } catch (err) {
            setError(err);
        } finally {
            if (showLoading || isInitialLoad) {
                setIsLoading(false);
            }
        }
    }, [enabled, stores, radiusKm, trigger, location, isInitialLoad, error, filter, currentUserId]);

    // 1. Durum: Store listesi veya koordinatı değişirse ANINDA çek (Optimistic update burayı tetikler)
    // İlk yüklemede loading göster, sonraki güncellemelerde gösterme
    useEffect(() => {
        fetchNearby(isInitialLoad);
    }, [storesFingerprint, fetchNearby, isInitialLoad]);

    // 2. Durum: Filtre değişirse yeniden çek
    useEffect(() => {
        // Skip if filter hasn't changed
        if (prevFilterFingerprint.current === filterFingerprint) {
            return;
        }
        
        // Update previous fingerprint
        prevFilterFingerprint.current = filterFingerprint;
        
        // Skip if initial load not completed yet
        if (isInitialLoad) {
            return;
        }
        
        // Refetch with new filter
        fetchNearby(false);
    }, [filterFingerprint, fetchNearby, isInitialLoad]);

    // 3. Durum: Periyodik olarak arka planda yenile (Timer)
    // Background refresh'lerde loading gösterme
    // ÖNEMLİ: Error veya location denied durumunda hard refresh'i durdur
    useEffect(() => {
        if (!enabled) return;
        if (locationStatus !== "granted") return;
        // Error varsa hard refresh'i durdur (sunucu çalışmıyor olabilir)
        if (error) return;

        const interval = setInterval(() => fetchNearby(false), hardRefreshMs);
        return () => clearInterval(interval);
    }, [enabled, hardRefreshMs, fetchNearby, locationStatus, error]);

    return {
        freeBarbers,
        isLoading,
        locationStatus,
        hasLocation: locationStatus === "granted",
        location,
        error,
        manualFetch: () => {
            // Location denied ise hiçbir şey yapma
            if (locationStatus !== "granted") return;
            // Error varsa retry olarak çağır (error'u temizleyip tekrar dener)
            // Error yoksa normal fetch
            fetchNearby(true, !!error);
        }, // Manuel fetch'te loading göster
    };
}