/**
 * useNearbyDiscovery yerel listeyi RTK önbelleğiyle birleştirir.
 * Favori mesaj listesi / detay / kalp — toggle sonrası keşif cache güncellenir
 * ama useState’teki birikim eski kalırdı; bu katman anlık yansıtır.
 */
import { RootState } from "../store/redux-store";
import { BarberStoreGetDto, FreeBarGetDto } from "../types";

type FavItem = { id: string; isFavorited?: boolean; favoriteCount?: number };

function pickFromDiscovery(
  state: RootState,
  id: string,
  list: "stores" | "freeBarbers",
): FavItem | null {
  const apiState = (state as unknown as { api?: { queries?: Record<string, unknown> } })?.api;
  if (!apiState?.queries) return null;
  const key = list === "stores" ? "stores" : "freeBarbers";
  for (const qk of Object.keys(apiState.queries)) {
    const qs = apiState.queries[qk] as { endpointName?: string; data?: unknown } | undefined;
    if (qs?.endpointName !== "getDiscoveryFiltered" || !qs.data) continue;
    const d = qs.data as { stores?: FavItem[]; freeBarbers?: FavItem[] };
    const found = d[key]?.find((x) => x.id === id);
    if (found && typeof found.isFavorited === "boolean") {
      return found;
    }
  }
  return null;
}

function pickFromFilteredQuery(
  state: RootState,
  id: string,
  endpoint: "getFilteredStoresQuery" | "getFilteredFreeBarbersQuery",
): FavItem | null {
  const apiState = (state as unknown as { api?: { queries?: Record<string, unknown> } })?.api;
  if (!apiState?.queries) return null;
  for (const qk of Object.keys(apiState.queries)) {
    const qs = apiState.queries[qk] as { endpointName?: string; data?: FavItem[] } | undefined;
    if (qs?.endpointName !== endpoint || !Array.isArray(qs.data)) continue;
    const found = qs.data.find((x) => x.id === id);
    if (found && typeof found.isFavorited === "boolean") return found;
  }
  return null;
}

function pickFromIsFavoriteQuery(state: RootState, id: string): boolean | undefined {
  const apiState = (state as unknown as { api?: { queries?: Record<string, unknown> } })?.api;
  if (!apiState?.queries) return undefined;
  for (const qk of Object.keys(apiState.queries)) {
    const qs = apiState.queries[qk] as { endpointName?: string; originalArgs?: unknown; data?: unknown } | undefined;
    if (qs?.endpointName !== "isFavorite" || qs.originalArgs !== id) continue;
    if (typeof qs.data === "boolean") return qs.data;
  }
  return undefined;
}

function pickFromNearbyList(state: RootState, id: string, endpoint: "getNearbyStores" | "getNearbyFreeBarber"): FavItem | null {
  const apiState = (state as unknown as { api?: { queries?: Record<string, unknown> } })?.api;
  if (!apiState?.queries) return null;
  for (const qk of Object.keys(apiState.queries)) {
    const qs = apiState.queries[qk] as { endpointName?: string; data?: FavItem[] } | undefined;
    if (qs?.endpointName !== endpoint || !Array.isArray(qs.data)) continue;
    const found = qs.data.find((x) => x.id === id);
    if (found && typeof found.isFavorited === "boolean") return found;
  }
  return null;
}

function pickFromDetail(
  state: RootState,
  id: string,
  endpoint: "getStoreForUsers" | "getFreeBarberForUsers",
): FavItem | null {
  const apiState = (state as unknown as { api?: { queries?: Record<string, unknown> } })?.api;
  if (!apiState?.queries) return null;
  for (const qk of Object.keys(apiState.queries)) {
    const qs = apiState.queries[qk] as {
      endpointName?: string;
      originalArgs?: unknown;
      data?: FavItem | null;
    } | undefined;
    if (qs?.endpointName !== endpoint) continue;
    if (qs.originalArgs !== id && (qs.data as FavItem | null)?.id !== id) continue;
    const d = qs.data;
    if (d && d.id === id && typeof d.isFavorited === "boolean") return d;
  }
  return null;
}

/**
 * Mevcut RTK önbelleğinden (öncelik: discovery > detay > yakınlık > isFavorite) canlı alanlar.
 */
export function mergeStoreRowWithRtkFavorites(
  state: RootState,
  s: BarberStoreGetDto,
): BarberStoreGetDto {
  const fromD = pickFromDiscovery(state, s.id, "stores");
  if (fromD) {
    return { ...s, isFavorited: fromD.isFavorited, favoriteCount: fromD.favoriteCount ?? s.favoriteCount };
  }
  const fromFiltered = pickFromFilteredQuery(state, s.id, "getFilteredStoresQuery");
  if (fromFiltered) {
    return {
      ...s,
      isFavorited: fromFiltered.isFavorited,
      favoriteCount: fromFiltered.favoriteCount ?? s.favoriteCount,
    };
  }
  const fromDetail = pickFromDetail(state, s.id, "getStoreForUsers");
  if (fromDetail) {
    return { ...s, isFavorited: fromDetail.isFavorited, favoriteCount: fromDetail.favoriteCount ?? s.favoriteCount };
  }
  const fromNear = pickFromNearbyList(state, s.id, "getNearbyStores");
  if (fromNear) {
    return { ...s, isFavorited: fromNear.isFavorited, favoriteCount: fromNear.favoriteCount ?? s.favoriteCount };
  }
  const b = pickFromIsFavoriteQuery(state, s.id);
  if (typeof b === "boolean") {
    return { ...s, isFavorited: b };
  }
  return s;
}

export function mergeFreeBarberRowWithRtkFavorites(
  state: RootState,
  f: FreeBarGetDto,
): FreeBarGetDto {
  const fromD = pickFromDiscovery(state, f.id, "freeBarbers");
  if (fromD) {
    return { ...f, isFavorited: fromD.isFavorited, favoriteCount: fromD.favoriteCount ?? f.favoriteCount };
  }
  const fromFiltered = pickFromFilteredQuery(state, f.id, "getFilteredFreeBarbersQuery");
  if (fromFiltered) {
    return {
      ...f,
      isFavorited: fromFiltered.isFavorited,
      favoriteCount: fromFiltered.favoriteCount ?? f.favoriteCount,
    };
  }
  const fromDetail = pickFromDetail(state, f.id, "getFreeBarberForUsers");
  if (fromDetail) {
    return { ...f, isFavorited: fromDetail.isFavorited, favoriteCount: fromDetail.favoriteCount ?? f.favoriteCount };
  }
  const fromNear = pickFromNearbyList(state, f.id, "getNearbyFreeBarber");
  if (fromNear) {
    return { ...f, isFavorited: fromNear.isFavorited, favoriteCount: fromNear.favoriteCount ?? f.favoriteCount };
  }
  const b = pickFromIsFavoriteQuery(state, f.id);
  if (typeof b === "boolean") {
    return { ...f, isFavorited: b };
  }
  return f;
}

/**
 * useSelector bağımlılığı: aşağıdakilerden biri değişince string değişir.
 */
export function selectDiscoveryFavoritesOverlayVersion(
  state: RootState,
  storeIds: string[],
  fbIds: string[],
): string {
  if (storeIds.length === 0 && fbIds.length === 0) return "";
  const segs: string[] = [];
  for (const id of storeIds) {
    const a = mergeStoreRowWithRtkFavorites(
      state,
      { id, isFavorited: false, favoriteCount: 0 } as BarberStoreGetDto,
    );
    segs.push(`s:${id}:${String(a.isFavorited)}:${a.favoriteCount ?? ""}`);
  }
  for (const id of fbIds) {
    const a = mergeFreeBarberRowWithRtkFavorites(
      state,
      { id, isFavorited: false, favoriteCount: 0 } as FreeBarGetDto,
    );
    segs.push(`f:${id}:${String(a.isFavorited)}:${a.favoriteCount ?? ""}`);
  }
  return segs.join("|");
}
