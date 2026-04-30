/**
 * Müşteri keşif paneli: tek POST `Discovery/filtered` ile dükkan + serbest berber sayfaları.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useStore, useSelector } from "react-redux";
import { useNearbyControl } from "./useNearByControl";
import { LocationStatus } from "../types";
import { FilterRequestDto } from "../types/filter";
import { useLazyGetDiscoveryFilteredQuery } from "../store/api";
import type { BarberStoreGetDto, FreeBarGetDto } from "../types";
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
/** İlk layout'ta `onEndReached` → loadMore yanlış tetiklenmesin diye kısa süre. */
const LOAD_MORE_GRACE_MS = 450;

type DiscoveryRequest = FilterRequestDto & {
  limit?: number;
  storeOffset?: number;
  freeBarberOffset?: number;
};

function dedupeAppend<T>(
  prev: T[],
  batch: T[],
  idFn: (t: T) => string,
): T[] {
  const seen = new Set(prev.map(idFn));
  const out = [...prev];
  for (const item of batch) {
    const id = idFn(item);
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(item);
  }
  return out;
}

interface UseNearbyDiscoveryOptions {
  enabled: boolean;
  moveThresholdM?: number;
  staleMs?: number;
  hardRefreshMs?: number;
  radiusKm?: number;
  pageSize?: number;
  filter?: FilterRequestDto;
  useFilteredEndpoint?: boolean;
  /** Tab remount'larında fetchedOnce'ın sıfırlanmaması için benzersiz anahtar. */
  persistKey?: string;
}

interface UseNearbyDiscoveryResult {
  stores: BarberStoreGetDto[];
  freeBarbers: FreeBarGetDto[];
  loading: boolean;
  fetching: boolean;
  retryInProgress: boolean;
  fetchedOnce: boolean;
  error: any;
  locationStatus: LocationStatus;
  locationMessage: string;
  hasLocation: boolean;
  location?: { latitude: number; longitude: number };
  manualFetch: () => Promise<void>;
  retryPermission: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMoreStores: boolean;
  hasMoreFreeBarbers: boolean;
  loadingMore: boolean;
}

export function useNearbyDiscovery(
  options: UseNearbyDiscoveryOptions,
): UseNearbyDiscoveryResult {
  const {
    enabled,
    moveThresholdM = DEFAULT_MOVE_THRESHOLD_M,
    staleMs = DEFAULT_STALE_MS,
    hardRefreshMs = DEFAULT_HARD_REFRESH_MS,
    radiusKm = DEFAULT_FILTER_RADIUS_KM,
    pageSize = DEFAULT_PAGE_SIZE,
    filter,
    useFilteredEndpoint = false,
    persistKey,
  } = options;

  const shouldUseFiltered = useFilteredEndpoint && !!filter;
  const [trigger, filteredResult] = useLazyGetDiscoveryFilteredQuery();

  const filterFingerprint = useMemo(() => {
    if (!filter) return "";
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

  const prevFilterFingerprint = useRef(filterFingerprint);
  const locationRef = useRef<{ lat: number; lon: number } | null>(null);
  const isFilterRefetching = useRef(false);
  const filterRef = useRef(filter);
  filterRef.current = filter;

  const [accumulatedStores, setAccumulatedStores] = useState<BarberStoreGetDto[]>([]);
  const [accumulatedFreeBarbers, setAccumulatedFreeBarbers] = useState<
    FreeBarGetDto[]
  >([]);
  const [hasMoreStores, setHasMoreStores] = useState(false);
  const [hasMoreFreeBarbers, setHasMoreFreeBarbers] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const pageRequestToken = useRef(0);
  const suppressLoadMoreUntilMsRef = useRef(0);

  const resetPagination = useCallback(() => {
    pageRequestToken.current += 1;
    suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;
    setAccumulatedStores([]);
    setAccumulatedFreeBarbers([]);
    setHasMoreStores(false);
    setHasMoreFreeBarbers(false);
    setLoadingMore(false);
  }, []);

  const fetchPage = useCallback(
    async (
      lat: number,
      lon: number,
      storeOffset: number,
      freeBarberOffset: number,
    ) => {
      const f = filterRef.current;
      if (!f) return null;
      const token = ++pageRequestToken.current;
      const body: DiscoveryRequest = {
        ...f,
        latitude: lat,
        longitude: lon,
        distanceKm: f.distanceKm ?? radiusKm,
        limit: pageSize,
        storeOffset,
        freeBarberOffset,
      };
      try {
        const res = await trigger(body).unwrap();
        if (token !== pageRequestToken.current) return null;
        return res;
      } catch {
        return null;
      }
    },
    [trigger, pageSize, radiusKm],
  );

  const onFetch = useCallback(
    async (lat: number, lon: number) => {
      locationRef.current = { lat, lon };
      const f = filterRef.current;
      const useFiltered = useFilteredEndpoint && f;

      if (useFiltered) {
        const res = await fetchPage(lat, lon, 0, 0);
        if (res === null) return;
        setAccumulatedStores(res.stores ?? []);
        setAccumulatedFreeBarbers(res.freeBarbers ?? []);
        setHasMoreStores((res.stores?.length ?? 0) >= pageSize);
        setHasMoreFreeBarbers((res.freeBarbers?.length ?? 0) >= pageSize);
        suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;
      } else {
        setAccumulatedStores([]);
        setAccumulatedFreeBarbers([]);
      }
    },
    [fetchPage, pageSize, useFilteredEndpoint],
  );

  const nearby = useNearbyControl({
    enabled,
    moveThresholdM,
    staleMs,
    hardRefreshMs,
    onFetch,
    error: filteredResult.error,
    persistKey,
  });

  const locLat = nearby.location?.latitude;
  const locLon = nearby.location?.longitude;
  useEffect(() => {
    if (locLat == null || locLon == null) return;
    locationRef.current = { lat: locLat, lon: locLon };
  }, [locLat, locLon]);

  useEffect(() => {
    if (prevFilterFingerprint.current === filterFingerprint) return;
    prevFilterFingerprint.current = filterFingerprint;
    if (!locationRef.current || isFilterRefetching.current) return;
    if (!shouldUseFiltered) return;

    const run = async () => {
      isFilterRefetching.current = true;
      try {
        resetPagination();
        const loc = locationRef.current!;
        const res = await fetchPage(loc.lat, loc.lon, 0, 0);
        if (res === null) return;
        setAccumulatedStores(res.stores ?? []);
        setAccumulatedFreeBarbers(res.freeBarbers ?? []);
        setHasMoreStores((res.stores?.length ?? 0) >= pageSize);
        setHasMoreFreeBarbers((res.freeBarbers?.length ?? 0) >= pageSize);
        suppressLoadMoreUntilMsRef.current = Date.now() + LOAD_MORE_GRACE_MS;
      } finally {
        isFilterRefetching.current = false;
      }
    };
    run();
  }, [filterFingerprint, shouldUseFiltered, fetchPage, resetPagination, pageSize]);

  useEffect(() => {
    if (!shouldUseFiltered) resetPagination();
  }, [shouldUseFiltered, resetPagination]);

  const loadMore = useCallback(async () => {
    if (!shouldUseFiltered) return;
    if (Date.now() < suppressLoadMoreUntilMsRef.current) return;
    if (loadingMore || (!hasMoreStores && !hasMoreFreeBarbers)) return;
    const loc = locationRef.current;
    if (!loc) return;
    setLoadingMore(true);
    try {
      const res = await fetchPage(
        loc.lat,
        loc.lon,
        accumulatedStores.length,
        accumulatedFreeBarbers.length,
      );
      if (res === null) return;
      setAccumulatedStores((prev) =>
        dedupeAppend(prev, res.stores ?? [], (s) => String(s.id)),
      );
      setAccumulatedFreeBarbers((prev) =>
        dedupeAppend(prev, res.freeBarbers ?? [], (b) => String(b.id)),
      );
      setHasMoreStores((res.stores?.length ?? 0) >= pageSize);
      setHasMoreFreeBarbers((res.freeBarbers?.length ?? 0) >= pageSize);
    } finally {
      setLoadingMore(false);
    }
  }, [
    shouldUseFiltered,
    loadingMore,
    hasMoreStores,
    hasMoreFreeBarbers,
    fetchPage,
    accumulatedStores.length,
    accumulatedFreeBarbers.length,
    pageSize,
  ]);

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

  /** Yerel birikim + RTK (favori toggle) — panel kalpleri anında güncellensin */
  const storeIds = useMemo(
    () => accumulatedStores.map((s) => s.id),
    [accumulatedStores],
  );
  const fbIds = useMemo(
    () => accumulatedFreeBarbers.map((f) => f.id),
    [accumulatedFreeBarbers],
  );
  const favOverlayVersion = useSelector((s: RootState) =>
    selectDiscoveryFavoritesOverlayVersion(s, storeIds, fbIds),
  );
  const reduxStore = useStore<RootState>();
  const storesOut = useMemo(() => {
    if (!shouldUseFiltered) return [];
    const st = reduxStore.getState();
    return accumulatedStores.map((row) => mergeStoreRowWithRtkFavorites(st, row));
  }, [shouldUseFiltered, accumulatedStores, favOverlayVersion, reduxStore]);
  const freeBarbersOut = useMemo(() => {
    if (!shouldUseFiltered) return [];
    const st = reduxStore.getState();
    return accumulatedFreeBarbers.map((row) => mergeFreeBarberRowWithRtkFavorites(st, row));
  }, [shouldUseFiltered, accumulatedFreeBarbers, favOverlayVersion, reduxStore]);

  return {
    stores: shouldUseFiltered ? storesOut : [],
    freeBarbers: shouldUseFiltered ? freeBarbersOut : [],
    // İlk yükleme: gate + ilk istek. Sekme dönüşü / arka plan yenilemede skeleton yok.
    loading: nearby.initialLoading || (filteredResult.isFetching && !nearby.fetchedOnce),
    fetching: filteredResult.isFetching,
    retryInProgress,
    fetchedOnce: nearby.fetchedOnce,
    error: filteredResult.error,
    locationStatus: nearby.locationStatus,
    locationMessage: nearby.locationMessage,
    hasLocation: nearby.hasLocation,
    location: nearby.location,
    manualFetch: manualFetchWrapped,
    retryPermission: nearby.retryPermission,
    loadMore,
    hasMoreStores: shouldUseFiltered ? hasMoreStores : false,
    hasMoreFreeBarbers: shouldUseFiltered ? hasMoreFreeBarbers : false,
    loadingMore,
  };
}
