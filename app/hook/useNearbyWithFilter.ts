/**
 * Generic hook for nearby data fetching with filter support
 * Uses pre-called RTK Query hooks to avoid conditional hook calls
 *
 * Pagination:
 *   Filtered endpoint (`useFilteredEndpoint=true`) için keyset/offset
 *   pagination desteklenir. `pageSize` default 20; ilk sayfa `onFetch` ile
 *   çekilir, `loadMore()` sonraki offset'i ister, gelen satırlar mevcut
 *   `data`'ya append edilir. Filter veya konum değişirse sayfalar sıfırlanır.
 *
 *   Nearby endpoint (filter yok) için backend offset desteklemediği için
 *   `hasMore` daima `false`, `loadMore` no-op.
 */

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { useStore, useSelector } from "react-redux";
import { useNearbyControl } from "./useNearByControl";
import { LocationStatus, BarberStoreGetDto, FreeBarGetDto } from "../types";
import { FilterRequestDto } from "../types/filter";
import { DEFAULT_FILTER_RADIUS_KM } from "../constants/filterDefaults";
import { RootState } from "../store/redux-store";
import {
  mergeStoreRowWithRtkFavorites,
  mergeFreeBarberRowWithRtkFavorites,
  selectDiscoveryFavoritesOverlayVersion,
} from "./mergeDiscoveryFavoritesFromRtk";

const DEFAULT_MOVE_THRESHOLD_M = 150;
const DEFAULT_STALE_MS = 15_000;
const DEFAULT_HARD_REFRESH_MS = 15_000;
const DEFAULT_PAGE_SIZE = 20;
const LOAD_MORE_GRACE_MS = 450;

type FilteredTriggerArgs = FilterRequestDto & { limit?: number; offset?: number };

interface UseNearbyWithFilterOptions<T> {
    enabled: boolean;
    moveThresholdM?: number;
    staleMs?: number;
    hardRefreshMs?: number;
    radiusKm?: number;
    /** Filter endpoint için sayfa boyutu. Default {@link DEFAULT_PAGE_SIZE}. */
    pageSize?: number;
    // Filter support
    filter?: FilterRequestDto;
    useFilteredEndpoint?: boolean;
    // Pre-called hooks (to avoid conditional hook calls)
    nearbyTrigger: (args: { lat: number; lon: number; radiusKm: number }, preferCacheValue?: boolean) => Promise<any>;
    nearbyResult: { data?: T[]; isLoading: boolean; isFetching: boolean; error?: any };
    filteredTrigger: (filter: FilteredTriggerArgs, preferCacheValue?: boolean) => Promise<any>;
    filteredResult: { data?: T[]; isLoading: boolean; isFetching: boolean; error?: any };
    /**
     * Filtreli modda yerel biriken listeyi RTK’deki favori güncellemeleriyle hizalar
     * (müşteri useNearbyDiscovery ile aynı mantık).
     */
    liveFavoriteEntity?: "store" | "freeBarber";
    persistKey?: string;
}

interface UseNearbyWithFilterResult<T> {
    data: T[];
    loading: boolean;
    /** RTK: arka plan/polling dahil her istek — hata kartı UI için kullanma */
    fetching: boolean;
    /** Sadece "Tekrar dene" / manualFetch süresince — flicker yapmaz */
    retryInProgress: boolean;
    fetchedOnce: boolean;
    error: any;
    locationStatus: LocationStatus;
    locationMessage: string;
    hasLocation: boolean;
    location?: { latitude: number; longitude: number };
    manualFetch: () => Promise<void>;
    retryPermission: () => Promise<void>;
    /** Bir sonraki sayfayı yükler. Filtered mode'da aktif; nearby mode'da no-op. */
    loadMore: () => Promise<void>;
    /** Sonraki sayfa istenebilir mi? Son sayfa `pageSize`'tan azsa false olur. */
    hasMore: boolean;
    /** `loadMore` sırasında true — inline "Daha fazla yükleniyor..." indikatörü için. */
    loadingMore: boolean;
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
        radiusKm = DEFAULT_FILTER_RADIUS_KM,
        pageSize = DEFAULT_PAGE_SIZE,
        filter,
        useFilteredEndpoint = false,
        nearbyTrigger,
        nearbyResult,
        filteredTrigger,
        filteredResult,
        liveFavoriteEntity,
        persistKey,
    } = options;

    // Determine which result to use based on filter mode
    const shouldUseFiltered = useFilteredEndpoint && !!filter;
    const activeResult = shouldUseFiltered ? filteredResult : nearbyResult;

    // Filter fingerprint for detecting changes (excluding location which is handled separately)
    const filterFingerprint = useMemo(() => {
        if (!filter) return '';
        return JSON.stringify({
            distanceKm: filter.distanceKm,
            mainCategory: filter.mainCategory,
            serviceIds: filter.serviceIds,
            priceSort: filter.priceSort,
            minPrice: filter.minPrice,
            maxPrice: filter.maxPrice,
            pricingType: filter.pricingType,
            availability: filter.availability,
            minRating: filter.minRating,
            favoritesOnly: filter.favoritesOnly,
            searchQuery: filter.searchQuery,
            currentUserId: filter.currentUserId,
        });
    }, [filter]);

    // Track previous filter fingerprint
    const prevFilterFingerprint = useRef(filterFingerprint);
    const locationRef = useRef<{ lat: number; lon: number } | null>(null);
    const isFilterRefetching = useRef(false);
    const filterRef = useRef(filter);
    filterRef.current = filter;

    // --- Pagination state (filtered mode only) ---
    // accumulatedItems: ilk sayfa + loadMore ile eklenen tüm sayfalar.
    // Filter/location değişirse sıfırlanır; nearby mode'da hiç dolmaz.
    const [accumulatedItems, setAccumulatedItems] = useState<T[]>([]);
    const [hasMore, setHasMore] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    // Race-condition koruması: geç gelen eski yanıtları yok saymak için token.
    const pageRequestToken = useRef(0);
    const suppressLoadMoreUntilMsRef = useRef(0);

    const resetPagination = useCallback(() => {
        pageRequestToken.current += 1;
        suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;
        setAccumulatedItems([]);
        setHasMore(false);
        setLoadingMore(false);
    }, []);

    const fetchPage = useCallback(
        async (lat: number, lon: number, offset: number): Promise<T[] | null> => {
            const f = filterRef.current;
            if (!f) return null;
            const token = ++pageRequestToken.current;
            const filterWithLocation: FilteredTriggerArgs = {
                ...f,
                latitude: lat,
                longitude: lon,
                distanceKm: f.distanceKm ?? radiusKm,
                limit: pageSize,
                offset,
            };
            try {
                const res: any = await filteredTrigger(filterWithLocation, false);
                // Token eskiyse yarı-atomik: yanıtı yok say (filter/location değişmiş olabilir)
                if (token !== pageRequestToken.current) return null;
                const items: T[] = Array.isArray(res?.data) ? res.data : [];
                return items;
            } catch {
                return null;
            }
        },
        [filteredTrigger, pageSize, radiusKm],
    );

    const onFetch = useCallback(async (lat: number, lon: number) => {
        // Save location for filter change refetch
        locationRef.current = { lat, lon };
        const f = filterRef.current;
        const useFiltered = useFilteredEndpoint && f;

        if (useFiltered) {
            // İlk sayfa: accumulatedItems'ı temizleyip yenile.
            const items = await fetchPage(lat, lon, 0);
            if (items === null) return; // token eskimiş ya da hata — mevcut listeyi koru
            setAccumulatedItems(items);
            setHasMore(items.length >= pageSize);
            suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;
        } else {
            await nearbyTrigger({ lat, lon, radiusKm }, false);
        }
    }, [nearbyTrigger, fetchPage, radiusKm, useFilteredEndpoint, pageSize]);

    const nearby = useNearbyControl({
        enabled,
        moveThresholdM,
        staleMs,
        hardRefreshMs,
        onFetch,
        error: activeResult.error,
        persistKey,
    });

    // Konum: referans yerine lat/lon ile senkron (gereksiz effect tetiklemesini önler)
    const locLat = nearby.location?.latitude;
    const locLon = nearby.location?.longitude;
    useEffect(() => {
        if (locLat == null || locLon == null) return;
        locationRef.current = { lat: locLat, lon: locLon };
    }, [locLat, locLon]);

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
        
        // Refetch with new filter — sayfaları sıfırla.
        const refetchWithNewFilter = async () => {
            isFilterRefetching.current = true;
            try {
                resetPagination();
                const loc = locationRef.current!;
                const items = await fetchPage(loc.lat, loc.lon, 0);
                if (items === null) return;
                setAccumulatedItems(items);
                setHasMore(items.length >= pageSize);
                suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;
            } finally {
                isFilterRefetching.current = false;
            }
        };
        
        refetchWithNewFilter();
    }, [filterFingerprint, shouldUseFiltered, fetchPage, resetPagination, pageSize]);

    // Mode değişirse (filtered ↔ nearby) pagination state'ini temizle:
    // nearby mode'dan filtered'a dönüldüğünde eski birikmiş listenin karışmasını önler.
    useEffect(() => {
        if (!shouldUseFiltered) resetPagination();
    }, [shouldUseFiltered, resetPagination]);

    const loadMore = useCallback(async () => {
        if (!shouldUseFiltered) return;
        if (Date.now() < suppressLoadMoreUntilMsRef.current) return;
        if (loadingMore || !hasMore) return;
        const loc = locationRef.current;
        if (!loc) return;
        setLoadingMore(true);
        try {
            const currentOffset = accumulatedItems.length;
            const items = await fetchPage(loc.lat, loc.lon, currentOffset);
            if (items === null) return; // stale yanıt veya hata
            // Aynı anda birden fazla loadMore çağrısı olmasın diye bir önceki
            // accumulated'e ref üzerinden eklemek yerine state updater kullanıyoruz.
            setAccumulatedItems((prev) => {
                // Duplicate ID koruması: bazı entity'lerde backend keyset değil
                // offset pagination kullanıyor; boundary'de tekrar gelebilir.
                const seen = new Set<string>();
                for (const p of prev) {
                    const id = (p as any)?.id;
                    if (id) seen.add(String(id));
                }
                const deduped = items.filter((it) => {
                    const id = (it as any)?.id;
                    if (!id) return true;
                    if (seen.has(String(id))) return false;
                    seen.add(String(id));
                    return true;
                });
                return [...prev, ...deduped];
            });
            setHasMore(items.length >= pageSize);
        } finally {
            setLoadingMore(false);
        }
    }, [shouldUseFiltered, loadingMore, hasMore, accumulatedItems.length, fetchPage, pageSize]);

    const [retryInProgress, setRetryInProgress] = useState(false);
    const manualFetchWrapped = useCallback(async () => {
        const fn = nearby.manualFetch;
        if (!fn) return;
        setRetryInProgress(true);
        try {
            await fn();
        } finally {
            setRetryInProgress(false);
        }
    }, [nearby.manualFetch]);

    // `data` çıktısı: filtered mode'da biriken sayfalar, nearby mode'da RTK'nın son yanıtı.
    const data = shouldUseFiltered ? accumulatedItems : ((nearbyResult.data ?? []) as T[]);

    const itemIds = useMemo(
        () => (data as { id: string }[]).map((x) => (x as { id: string }).id),
        [data],
    );
    const favOverlayVersion = useSelector((s: RootState) => {
        if (!liveFavoriteEntity || !shouldUseFiltered) return "";
        if (liveFavoriteEntity === "store") {
            return selectDiscoveryFavoritesOverlayVersion(s, itemIds, []);
        }
        return selectDiscoveryFavoritesOverlayVersion(s, [], itemIds);
    });
    const reduxStore = useStore<RootState>();
    const dataOut = useMemo(() => {
        if (!liveFavoriteEntity || !shouldUseFiltered) return data;
        const st = reduxStore.getState();
        if (liveFavoriteEntity === "store") {
            return (data as BarberStoreGetDto[]).map((row) =>
                mergeStoreRowWithRtkFavorites(st, row),
            ) as T[];
        }
        return (data as FreeBarGetDto[]).map((row) =>
            mergeFreeBarberRowWithRtkFavorites(st, row),
        ) as T[];
    }, [data, liveFavoriteEntity, shouldUseFiltered, favOverlayVersion, reduxStore]);

    return {
        data: dataOut,
        loading: nearby.initialLoading || (activeResult.isFetching && !nearby.fetchedOnce),
        fetching: activeResult.isFetching,
        retryInProgress,
        fetchedOnce: nearby.fetchedOnce,
        error: activeResult.error,
        locationStatus: nearby.locationStatus,
        locationMessage: nearby.locationMessage,
        hasLocation: nearby.hasLocation,
        location: nearby.location,
        manualFetch: manualFetchWrapped,
        retryPermission: nearby.retryPermission,
        loadMore,
        hasMore: shouldUseFiltered ? hasMore : false,
        loadingMore,
    };
}
