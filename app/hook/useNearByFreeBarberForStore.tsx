import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, useSelector } from "react-redux";
import { ensureLocationGateWithUI } from "../components/location/location-gate";
import { BarberStoreMineDto, FreeBarGetDto, LocationStatus } from "../types";
import { useLazyGetFilteredFreeBarbersQueryQuery } from "../store/api";
import { safeCoord } from "../utils/location/geo";
import { FilterRequestDto } from "../types/filter";
import { DEFAULT_FILTER_RADIUS_KM } from "../constants/filterDefaults";
import { RootState } from "../store/redux-store";
import {
  mergeFreeBarberRowWithRtkFavorites,
  selectDiscoveryFavoritesOverlayVersion,
} from "./mergeDiscoveryFavoritesFromRtk";


// Tab remount'larında isLoading/hasData state'i sıfırlanmasın.
const _hasFetchedByKey = new Map<string, boolean>();

export type UseNearbyStoresParams = {
    stores: BarberStoreMineDto[];
    enabled: boolean;
    hardRefreshMs?: number;
    radiusKm?: number;
    filter?: FilterRequestDto;
    currentUserId?: string;
    /** Her store için ayrı sayfa boyutu. Default 20. Backend server-side hard-cap uygular. */
    pageSize?: number;
    persistKey?: string;
};

const DEFAULT_PAGE_SIZE = 20;
const LOAD_MORE_GRACE_MS = 450;

type StoreCursor = {
    /** Sonraki sayfa için offset (ilk fetch sonrası = ilk sayfada gelen item sayısı). */
    offset: number;
    /** Son sayfada pageSize kadar sonuç geldiyse true — loadMore'un hâlâ anlamlı olduğunu belirtir. */
    hasMore: boolean;
};

export function useNearbyStoresControl({
    stores,
    enabled,
    hardRefreshMs = 15_000,
    radiusKm = DEFAULT_FILTER_RADIUS_KM,
    filter,
    currentUserId,
    pageSize = DEFAULT_PAGE_SIZE,
    persistKey,
}: UseNearbyStoresParams) {
    const [trigger] = useLazyGetFilteredFreeBarbersQueryQuery();

    const [locationStatus, setLocationStatus] = useState<LocationStatus>("unknown");
    const [freeBarbers, setFreeBarbers] = useState<FreeBarGetDto[]>([]);
    // Daha önce başarılı fetch varsa (modül cache), remount'ta isLoading başlatma.
    const [isLoading, setIsLoading] = useState(
        () => (persistKey ? !_hasFetchedByKey.get(persistKey) : false)
    );
    /** Yalnızca kullanıcı retry / açık yenileme — interval arka planında yanmaz */
    const [retryInProgress, setRetryInProgress] = useState(false);
    const [error, setError] = useState<any>(null);
    /** loadMore için ayrı bayrak: initial loading ve retry'dan bağımsız kalsın. */
    const [loadingMore, setLoadingMore] = useState(false);
    /** Herhangi bir store hâlâ sayfa verebiliyor mu? Her fetch sonrası güncellenir. */
    const [hasMore, setHasMore] = useState(false);

    // location ve isInitialLoad ref olarak tutulur — fetchNearby döngüsünü önlemek için
    const locationRef = useRef<{ latitude: number; longitude: number } | undefined>(undefined);
    const isInitialLoadRef = useRef(true);
    const persistKeyRef = useRef(persistKey);
    /** filter / stores her render'da yeni referans alabilir; callback deps'ine koymamak için ref */
    const filterRef = useRef(filter);
    filterRef.current = filter;
    const storesRef = useRef(stores);
    storesRef.current = stores;
    const errorRef = useRef(error);
    errorRef.current = error;

    /**
     * Her store için ayrı keyset: offset + hasMore takibi. Multi-store
     * arama yaptığımız için (işletme sahibinin birden çok dükkanı) her biri
     * bağımsız sayfalara girebilir; loadMore çağrıldığında yalnızca hâlâ
     * hasMore=true olan store'lar için paralel fetch edilir.
     */
    const cursorsRef = useRef<Record<string, StoreCursor>>({});
    /** Race-condition koruması: filter/stores değişirse geç gelen yanıtları yok say. */
    const fetchTokenRef = useRef(0);
    /** Map yerine ref ile tutulan accumulator — setFreeBarbers update'lerinde idempotent append */
    const accumulatedMapRef = useRef<Map<string, FreeBarGetDto>>(new Map());
    const suppressLoadMoreUntilMsRef = useRef(0);

    /** Bağımsız "sadece benim işletmelerim" ekranında keşif kapalıyken yükleme bayrağını sıfırla */
    useEffect(() => {
        if (!enabled) {
            isInitialLoadRef.current = false;
            setIsLoading(false);
            setRetryInProgress(false);
            setLoadingMore(false);
            setHasMore(false);
            setFreeBarbers([]);
            cursorsRef.current = {};
            accumulatedMapRef.current = new Map();
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
        });
    }, [filter]);

    // Track previous filter fingerprint
    const prevFilterFingerprint = useRef(filterFingerprint);

    /** Tek bir store için bir sayfa çek; state'i güncellemez, raw sonucu döner. */
    const fetchPageForStore = useCallback(
        async (
            store: BarberStoreMineDto,
            offset: number,
        ): Promise<{ items: FreeBarGetDto[]; error: any } | null> => {
            const c = safeCoord(store.latitude, store.longitude);
            if (!c) return null;
            const f = filterRef.current;
            const filterWithLocation: FilterRequestDto = {
                ...f,
                latitude: c.lat,
                longitude: c.lon,
                distanceKm: f.distanceKm ?? radiusKm,
                currentUserId,
            };
            const result: any = await trigger(
                { ...filterWithLocation, limit: pageSize, offset },
                false,
            );
            if (result && 'error' in result && result.error) {
                return { items: [], error: result.error };
            }
            return { items: (result?.data ?? []) as FreeBarGetDto[], error: null };
        },
        [trigger, radiusKm, currentUserId, pageSize],
    );

    const fetchNearby = useCallback(
        async (showLoading: boolean = false, isRetry: boolean = false) => {
            const localStores = storesRef.current;
            if (!enabled || !localStores.length) return;

            const isInitialLoad = isInitialLoadRef.current;
            const showRetryUi = isRetry || (showLoading && !isInitialLoad);
            if (showRetryUi) setRetryInProgress(true);
            if (isRetry) setError(null);

            if (showLoading || isInitialLoad) setIsLoading(true);

            // Yeni fetch: cursors ve accumulator sıfırla, token bump et.
            const token = ++fetchTokenRef.current;
            cursorsRef.current = {};
            accumulatedMapRef.current = new Map();

            try {
                let hasAnyError = false;
                let lastError: any = null;

                const results = await Promise.all(
                    localStores.map(async (store) => {
                        const c = safeCoord(store.latitude, store.longitude);
                        if (!c) return null;
                        // İlk store konumunu ref'e kaydet — state güncellemesi yerine
                        if (!locationRef.current && c) {
                            locationRef.current = { latitude: c.lat, longitude: c.lon };
                        }
                        const page = await fetchPageForStore(store, 0);
                        return { store, page };
                    }),
                );

                // Token eskimiş — bu yanıtı kullanma.
                if (token !== fetchTokenRef.current) return;

                let anyHasMore = false;
                for (const entry of results) {
                    if (!entry || !entry.page) continue;
                    const { store, page } = entry;
                    if (page.error) {
                        hasAnyError = true;
                        lastError = page.error;
                        continue;
                    }
                    cursorsRef.current[store.id] = {
                        offset: page.items.length,
                        hasMore: page.items.length >= pageSize,
                    };
                    if (page.items.length >= pageSize) anyHasMore = true;
                    for (const barber of page.items) {
                        if ((barber as any)?.id) {
                            accumulatedMapRef.current.set((barber as any).id, barber);
                        }
                    }
                }

                setFreeBarbers(Array.from(accumulatedMapRef.current.values()));
                setHasMore(anyHasMore);
                suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;

                if (hasAnyError && accumulatedMapRef.current.size === 0) {
                    setError(lastError);
                } else {
                    setError(null);
                }
                isInitialLoadRef.current = false;
            } catch (err) {
                if (token === fetchTokenRef.current) setError(err);
            } finally {
                if (token === fetchTokenRef.current) {
                    if (showRetryUi) setRetryInProgress(false);
                    if (showLoading || isInitialLoad) setIsLoading(false);
                    if (persistKeyRef.current) _hasFetchedByKey.set(persistKeyRef.current, true);
                }
            }
        },
        [enabled, pageSize, fetchPageForStore],
    );

    const loadMore = useCallback(async () => {
        if (!enabled) return;
        if (Date.now() < suppressLoadMoreUntilMsRef.current) return;
        if (loadingMore) return;
        if (!hasMore) return;
        const localStores = storesRef.current;
        if (!localStores.length) return;

        // Yalnızca hâlâ hasMore=true olan store'lara git — inefficient tam fetch'i önler.
        const targets = localStores.filter((s) => cursorsRef.current[s.id]?.hasMore);
        if (targets.length === 0) {
            setHasMore(false);
            return;
        }

        setLoadingMore(true);
        const token = fetchTokenRef.current; // yeni token üretmiyoruz — aynı epoch'ta devam.
        try {
            const results = await Promise.all(
                targets.map(async (store) => {
                    const cur = cursorsRef.current[store.id];
                    if (!cur) return null;
                    const page = await fetchPageForStore(store, cur.offset);
                    return { store, page };
                }),
            );

            // Ortada filter/stores değişip reset olduysa sonuçları yok say.
            if (token !== fetchTokenRef.current) return;

            let anyHasMore = false;
            for (const entry of results) {
                if (!entry || !entry.page) continue;
                const { store, page } = entry;
                if (page.error) continue; // tek store hatası → loadMore'u global hataya çevirme
                const cur = cursorsRef.current[store.id] ?? { offset: 0, hasMore: false };
                cursorsRef.current[store.id] = {
                    offset: cur.offset + page.items.length,
                    hasMore: page.items.length >= pageSize,
                };
                for (const barber of page.items) {
                    if ((barber as any)?.id) {
                        accumulatedMapRef.current.set((barber as any).id, barber);
                    }
                }
            }
            // Overall hasMore: herhangi bir store hâlâ dolu sayfa dönerse true.
            for (const s of localStores) {
                if (cursorsRef.current[s.id]?.hasMore) {
                    anyHasMore = true;
                    break;
                }
            }

            setFreeBarbers(Array.from(accumulatedMapRef.current.values()));
            setHasMore(anyHasMore);
        } finally {
            setLoadingMore(false);
        }
    }, [enabled, loadingMore, hasMore, fetchPageForStore, pageSize]);

    const manualFetch = useCallback((options?: { showLoading?: boolean }) => {
        if (!enabled || !storesRef.current.length) return;
        const showLoading = options?.showLoading ?? false;
        fetchNearby(showLoading, !!errorRef.current);
    }, [enabled, fetchNearby]);

    // 1. Durum: Store listesi veya koordinatı değişirse ANINDA çek (sayfaları sıfırlar)
    useEffect(() => {
        fetchNearby(isInitialLoadRef.current);
    }, [storesFingerprint, fetchNearby]);

    // 2. Durum: Filtre değişirse yeniden çek (sayfaları sıfırlar)
    useEffect(() => {
        if (prevFilterFingerprint.current === filterFingerprint) return;
        prevFilterFingerprint.current = filterFingerprint;
        if (isInitialLoadRef.current) return;
        fetchNearby(false);
    }, [filterFingerprint, fetchNearby]);

    // 3. Durum: Periyodik olarak arka planda yenile (Timer)
    // Background refresh'lerde loading gösterme — birikmiş sayfalar da sıfırlanır;
    // kullanıcı scroll ettiği yeri kaybetmemeli mi? Bu ekran için mevcut davranış
    // kabul: 15 sn'de bir ilk sayfa tazelenir, scroll offset korunur çünkü FlatList
    // data değişikliğinde scroll pozisyonunu sürdürür (inverted değil).
    useEffect(() => {
        if (!enabled) return;
        if (locationStatus !== "granted") return;

        const interval = setInterval(() => fetchNearby(false), hardRefreshMs);
        return () => clearInterval(interval);
    }, [enabled, hardRefreshMs, fetchNearby, locationStatus]);

    const fbIds = useMemo(() => freeBarbers.map((f) => f.id), [freeBarbers]);
    const favOverlayVersion = useSelector((s: RootState) =>
        selectDiscoveryFavoritesOverlayVersion(s, [], fbIds),
    );
    const reduxStore = useStore<RootState>();
    const freeBarbersOut = useMemo(() => {
        if (freeBarbers.length === 0) return freeBarbers;
        const st = reduxStore.getState();
        return freeBarbers.map((row) => mergeFreeBarberRowWithRtkFavorites(st, row));
    }, [freeBarbers, favOverlayVersion, reduxStore]);

    return {
        freeBarbers: freeBarbersOut,
        isLoading,
        retryInProgress,
        locationStatus,
        hasLocation: locationStatus === "granted",
        location: locationRef.current,
        error,
        manualFetch,
        loadMore,
        hasMore,
        loadingMore,
    };
}
