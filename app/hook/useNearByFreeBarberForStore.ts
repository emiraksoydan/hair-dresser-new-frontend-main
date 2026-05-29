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
            if (!f) return null;
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
        async (
            showLoading: boolean = false,
            isRetry: boolean = false,
            forceReset: boolean = false,
        ) => {
            if (!enabled) return;

            const localStores = storesRef.current;
            // Dükkan listesi RTK'den henüz gelmeden [] iken buraya düşerüz; `setIsLoading(true)`
            // hiç çalışmadan return edilirse skeleton sonsuza dek kalır.
            if (!localStores.length) {
                const isInitial = isInitialLoadRef.current;
                if (showLoading || isInitial) setIsLoading(false);
                if (isRetry || (showLoading && !isInitial)) setRetryInProgress(false);
                return;
            }

            const isInitialLoad = isInitialLoadRef.current;
            const showRetryUi = isRetry || (showLoading && !isInitialLoad);
            // BACKGROUND REFRESH: showLoading=false ve isRetry=false → user-initiated değil.
            // Bu durumda mevcut listeyi/error'ı KORU; çünkü 15sn'de bir geçici ağ flap
            // olunca "Servise ulaşılamadı" göstermek istemiyoruz.
            const isBackgroundRefresh = !forceReset && !showLoading && !isRetry && !isInitialLoad;

            if (showRetryUi) setRetryInProgress(true);
            if (isRetry) setError(null);

            if (showLoading || isInitialLoad) setIsLoading(true);

            // Yeni fetch için token bump (geç gelen yanıtları yok say)
            const token = ++fetchTokenRef.current;

            // Sadece NON-background fetch'lerde cursors/accumulator sıfırlanır.
            // Background'da mevcut state korunur; başarılı sonuç gelirse üstüne yazılır.
            const previousAccumulator = accumulatedMapRef.current;
            const previousCursors = cursorsRef.current;
            if (!isBackgroundRefresh) {
                cursorsRef.current = {};
                accumulatedMapRef.current = new Map();
            } else {
                // Background: mevcut sayfalanmış marker listesini koru, gelen ilk sayfa
                // kayıtlarını üstüne yaz. Aksi halde 15sn refresh sadece ilk sayfayı
                // döndürdüğünde loadMore ile gelen freebarber'lar haritadan kaybolur.
                cursorsRef.current = {};
                accumulatedMapRef.current = new Map(previousAccumulator);
            }

            try {
                let hasAnyError = false;
                let successCount = 0;
                let lastError: any = null;

                const results = await Promise.all(
                    localStores.map(async (store) => {
                        const c = safeCoord(store.latitude, store.longitude);
                        if (!c) return null;
                        if (!locationRef.current && c) {
                            locationRef.current = { latitude: c.lat, longitude: c.lon };
                        }
                        const page = await fetchPageForStore(store, 0);
                        return { store, page };
                    }),
                );

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
                    successCount += 1;
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

                // BACKGROUND REFRESH ÖZEL DURUM:
                // Tüm dükkanlar başarısız olduysa MEVCUT veriyi koru, error gösterme.
                // Kullanıcı zaten gördüğü listede çalışıyor; geçici ağ kesintisi onu kilitlemesin.
                if (isBackgroundRefresh && successCount === 0) {
                    accumulatedMapRef.current = previousAccumulator;
                    cursorsRef.current = previousCursors;
                    return;
                }

                setFreeBarbers(Array.from(accumulatedMapRef.current.values()));
                setHasMore(anyHasMore);
                suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;

                // KRİTİK FIX (Multi-store partial success):
                // Eski davranış: hasAnyError && accumulator=0 → error göster.
                //   Bu, 1 dükkan başarısız + diğerleri 0 sonuçlu olduğunda da tetikleniyordu.
                // Yeni davranış: SADECE TÜM dükkanlar HATA verdiyse error göster.
                //   Bir dükkan bile başarılı sonuçla döndüyse (sıfır sonuç dahil), error gösterme.
                //   "Sıfır sonuç" zaten "Çevrede serbest berber yok" empty state ile handle edilir.
                if (hasAnyError && successCount === 0) {
                    setError(lastError);
                } else {
                    setError(null);
                }
                isInitialLoadRef.current = false;
            } catch (err) {
                if (token === fetchTokenRef.current) {
                    // Background refresh'te exception → mevcut listeyi koru, sessiz ol
                    if (isBackgroundRefresh) {
                        accumulatedMapRef.current = previousAccumulator;
                        cursorsRef.current = previousCursors;
                    } else {
                        setError(err);
                    }
                }
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
        fetchNearby(false, false, true);
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
