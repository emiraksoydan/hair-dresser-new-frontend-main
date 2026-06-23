import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';
import {
    AccessTokenDto, ApiResponse, BarberChairCreateDto, BarberChairUpdateDto,
    BarberStoreCreateDto, BarberStoreDetail, BarberStoreGetDto, BarberStoreMineDto,
    BarberStoreUpdateDto, ChairSlotDto, StoreDayAvailabilityDto, CreateAppointmentRequestDto, FreeBarberCreateDto,
    FreeBarberMinePanelDetailDto, FreeBarberPanelDto, FreeBarberUpdateDto, FreeBarGetDto,
    ManuelBarberCreateDto, ManuelBarberUpdateDto, NearbyRequest, NotificationDto,
    OtpPurpose, UpdateLocationDto, UserType, VerifyOtpRequest, WorkingHourGetDto,
    ChatThreadListItemDto, ChatMessageItemDto, ChatMessageDto,
    AppointmentGetDto, AppointmentFilter,
    CreateRatingDto, RatingGetDto,
    ToggleFavoriteDto, ToggleFavoriteResponseDto, FavoriteGetDto, FavoriteTargetType,
    ImageGetDto, ImageOwnerType,
    AddStoreToAppointmentRequestDto, CreateStoreToFreeBarberRequestDto,
    UpdateUserDto, UserProfileDto, SettingGetDto, SettingUpdateDto, HelpGuideGetDto,
    ComplaintGetDto, CreateComplaintDto,
    RequestGetDto, CreateRequestDto,
    BlockedGetDto, CreateBlockedDto, UnblockDto, BlockStatusDto,
    CategoryHierarchyDto, EarningsDto, AIAssistantResponseDto,
    ServicePackageCreateDto, ServicePackageUpdateDto,     ServicePackageGetDto, AppointmentServicePackageDto,
    SocialProfileDto, SocialProfileSearchResultDto, SocialPostDto, SocialCommentDto, SocialFollowListItemDto, SocialPostType, SocialStoryGroupDto, SocialLimitsDto, SocialFreeTierUsageDto, SocialArchivedKind, SocialArchivedContentDto, SocialRestoreArchivedRequest,
    SocialStoryDto, SocialStoryHighlightDto, SocialStoryHighlightDetailDto, SocialStoryViewerDto,
} from '../types';
import { FilterRequestDto, SavedFilterGetDto, SavedFilterCreateDto, SavedFilterUpdateDto, DiscoveryFilteredResponseDto } from '../types/filter';
import { transformArrayResponse, transformObjectResponse, transformBooleanResponse, transformApiResponse } from '../utils/api/transform-response';
import { normalizeSocialPostList, normalizeSocialPostDto } from '../utils/social/normalizeSocialPost';
import { normalizeSocialProfileList, normalizeSocialProfileDto } from '../utils/social/normalizeSocialProfile';
import { type SocialChatThreadsQueryArgs } from '../utils/chat/chatThreadCacheSync';
import {
    mergeNotificationsCachePages,
    requestNotificationsFullCacheReplace,
} from '../utils/notifications/notification-list-cache';
import {
    mergeAppointmentFilterCachePages,
    requestAllAppointmentsFiltersFullCacheReplace,
} from '../utils/appointments/appointment-list-cache';
import {
    mergeSocialFeedCachePages,
    mergeSocialReelsCachePages,
    requestSocialFeedFullCacheReplace,
    requestSocialReelsFullCacheReplace,
    socialPostListCursorForceRefetch,
} from '../utils/social/social-feed-list-cache';
import {
    mergeSocialFollowListCachePages,
    mergeSocialMutualListCachePages,
    requestSocialFollowListFullCacheReplace,
    serializeSocialFollowListArgs,
    serializeSocialMutualListArgs,
} from '../utils/social/social-follow-list-cache';
import {
    applyOptimisticSocialCommentAdded,
    applyOptimisticSocialCommentLike,
    applyOptimisticSocialFollow,
    applyOptimisticSocialPostLike,
    applyOptimisticSocialPostSave,
    replaceOptimisticSocialComment,
    undoAll,
} from '../utils/social/social-optimistic-cache';

export { requestSocialFeedFullCacheReplace, requestSocialReelsFullCacheReplace } from '../utils/social/social-feed-list-cache';
export { requestSocialFollowListFullCacheReplace } from '../utils/social/social-follow-list-cache';

export { requestNotificationsFullCacheReplace } from '../utils/notifications/notification-list-cache';
export {
  requestAppointmentsFullCacheReplace,
  requestAllAppointmentsFiltersFullCacheReplace,
} from '../utils/appointments/appointment-list-cache';
import { lastMessagePreviewFromChatMessage, plainMessageSnapshot } from '../utils/chat/lastMessagePreview';
import { DEFAULT_FILTER_RADIUS_KM } from '../constants/filterDefaults';
// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
    STATIC: 300,      // 5 minutes - Categories, Settings
    USER_DATA: 60,    // 1 minute - User profile
    DYNAMIC: 30,      // 30 seconds - Store/FreeBarber details, Ratings
    LIST: 10,         // 10 seconds - Lists (Appointments, Chat threads)

    REAL_TIME: 5,     // 5 seconds - Nearby lists
} as const;

function sameFavoriteId(a?: string | null, b?: string | null): boolean {
    if (a == null || b == null) return false;
    return String(a).toLowerCase() === String(b).toLowerCase();
}

/**
 * Randevu listesi önbelleğindeki favori bayrağı — tüm `getAllAppointmentByFilter` slot'ları taranır;
 * biri bile true derse true (çoklu filtre / sayfa slot'larında tutarlılık).
 * Kart ekranında `isFavorite` refetch yarışından ÖNCE bu kullanılmalı.
 */
function readFavoriteFromAppointmentCaches(state: unknown, targetId: string): boolean | undefined {
    const apiState = (state as { api?: { queries?: Record<string, any> } })?.api;
    if (!apiState?.queries) return undefined;

    let referenced = false;
    let anyTrue = false;

    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (qs?.endpointName !== 'getAllAppointmentByFilter' || !Array.isArray(qs.data)) continue;
        for (const apt of qs.data as Array<{
            barberStoreId?: string;
            freeBarberId?: string;
            customerUserId?: string;
            isStoreFavorite?: boolean;
            isFreeBarberFavorite?: boolean;
            isCustomerFavorite?: boolean;
        }>) {
            if (!apt) continue;
            if (sameFavoriteId(apt.barberStoreId, targetId)) {
                referenced = true;
                if (apt.isStoreFavorite === true) anyTrue = true;
            } else if (sameFavoriteId(apt.freeBarberId, targetId)) {
                referenced = true;
                if (apt.isFreeBarberFavorite === true) anyTrue = true;
            } else if (sameFavoriteId(apt.customerUserId, targetId)) {
                referenced = true;
                if (apt.isCustomerFavorite === true) anyTrue = true;
            }
        }
    }

    return referenced ? anyTrue : undefined;
}

/**
 * isFavorite sorgusu yoksa (kartlar skipQuery ile) bile liste/detay önbelleğinden
 * mevcut favori durumunu okur — optimistic toggle yönünü doğru hesaplamak için.
 */
function getCachedFavoriteStateForTarget(state: unknown, targetId: string): boolean | undefined {
    const apiState = (state as { api?: { queries?: Record<string, any> } })?.api;
    if (!apiState?.queries) return undefined;

    const fromAppointments = readFavoriteFromAppointmentCaches(state, targetId);
    if (fromAppointments !== undefined) {
        return fromAppointments;
    }

    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (qs?.endpointName === 'isFavorite' && sameFavoriteId(qs?.originalArgs as string, targetId) && qs.data !== undefined) {
            return qs.data as boolean;
        }
    }

    const listEndpoints = new Set([
        'getNearbyFreeBarber',
        'getNearbyStores',
        'getMineStores',
    ]);

    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (!qs?.data || !listEndpoints.has(qs.endpointName)) continue;
        const data = qs.data;
        if (Array.isArray(data)) {
            const item = data.find((x: { id?: string }) => sameFavoriteId(x?.id, targetId));
            if (item) return !!(item as { isFavorited?: boolean }).isFavorited;
        }
    }

    const detailEndpoints = new Set([
        'getFreeBarberForUsers',
        'getStoreForUsers',
        'getStoreById',
        'getFreeBarberMinePanelDetail',
        'getFreeBarberMinePanel',
    ]);
    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (!qs?.data || !detailEndpoints.has(qs.endpointName)) continue;
        const d = qs.data as { id?: string; isFavorited?: boolean };
        if (sameFavoriteId(d?.id, targetId)) return !!d.isFavorited;
    }

    /** Müşteri keşif POST cevabı (RTK cache) — useNearbyDiscovery ile aynı payload */
    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (qs?.endpointName !== 'getDiscoveryFiltered' || !qs?.data) continue;
        const d = qs.data as { stores?: { id: string; isFavorited?: boolean }[]; freeBarbers?: { id: string; isFavorited?: boolean }[] };
        for (const s of d.stores ?? []) {
            if (sameFavoriteId(s.id, targetId)) return !!s.isFavorited;
        }
        for (const f of d.freeBarbers ?? []) {
            if (sameFavoriteId(f.id, targetId)) return !!f.isFavorited;
        }
    }

    /**
     * Mesaj thread listesi — kısıtlı favori satırında kalp: karşı taraf favori değilse restricted=true.
     * Buradan okuyunca optimistic toggle yönü ve cache tutarlılığı doğru çalışır.
     */
    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (qs?.endpointName !== 'getChatThreads' || !Array.isArray(qs.data)) continue;
        for (const thread of qs.data as ChatThreadListItemDto[]) {
            if (!thread.isFavoriteThread || !thread.participants?.[0]) continue;
            const p = thread.participants[0];
            const threadTargetId =
                p.userType === UserType.BarberStore ? (thread.favoriteStoreId ?? p.userId) : p.userId;
            if (!sameFavoriteId(threadTargetId, targetId)) continue;
            return !thread.isRestrictedForCurrentUser;
        }
    }

    return undefined;
}

function resolveRtkQueryArgs(queryState: { originalArgs?: unknown; queryCacheKey?: string }): unknown {
    let queryArgs: unknown = queryState.originalArgs;
    if (queryArgs === undefined && queryState.queryCacheKey) {
        const match = queryState.queryCacheKey.match(/\((.+)\)$/);
        if (match) {
            try {
                queryArgs = JSON.parse(match[1]);
            } catch {
                // parse edilemezse bırak
            }
        }
    }
    return queryArgs;
}

type CachePatch = { undo: () => void };

function patchAllNotificationListCaches(
    dispatch: (action: unknown) => CachePatch,
    getState: () => unknown,
    updater: (draft: NotificationDto[]) => void,
): CachePatch[] {
    const patches: CachePatch[] = [];
    const apiState = (getState() as { api?: { queries?: Record<string, any> } })?.api;
    if (!apiState?.queries) return patches;

    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (qs?.endpointName !== 'getAllNotifications' || !Array.isArray(qs.data)) continue;
        const argsForUpdate = resolveRtkQueryArgs(qs);
        if (argsForUpdate === undefined || argsForUpdate === null) continue;
        patches.push(
            dispatch(
                api.util.updateQueryData(
                    'getAllNotifications',
                    argsForUpdate as { before?: string; beforeId?: string; limit?: number } | void,
                    updater,
                ),
            ) as CachePatch,
        );
    }
    return patches;
}

function patchAllAppointmentFilterCaches(
    dispatch: (action: unknown) => CachePatch,
    getState: () => unknown,
    updater: (draft: AppointmentGetDto[]) => void,
): CachePatch[] {
    const patches: CachePatch[] = [];
    const apiState = (getState() as { api?: { queries?: Record<string, any> } })?.api;
    if (!apiState?.queries) return patches;

    for (const queryKey of Object.keys(apiState.queries)) {
        const qs = apiState.queries[queryKey];
        if (qs?.endpointName !== 'getAllAppointmentByFilter' || !Array.isArray(qs.data)) continue;
        const argsForUpdate = resolveRtkQueryArgs(qs);
        if (argsForUpdate === undefined || argsForUpdate === null) continue;
        patches.push(
            dispatch(
                api.util.updateQueryData(
                    'getAllAppointmentByFilter',
                    argsForUpdate as { filter: AppointmentFilter; before?: string; beforeId?: string; limit?: number },
                    updater,
                ),
            ) as CachePatch,
        );
    }
    return patches;
}

function undoCachePatches(patches: CachePatch[]): void {
    for (const patch of patches) {
        patch.undo();
    }
}

const OPTIMISTIC_FAV_ID_PREFIX = 'optimistic-fav-';

function getMeUserIdFromRtkState(state: { api?: { queries?: Record<string, any> } }): string | undefined {
    const queries = state?.api?.queries;
    if (!queries) return undefined;
    for (const k of Object.keys(queries)) {
        const q = queries[k];
        if (q?.endpointName === 'getMe' && q?.data) {
            const inner = (q.data as ApiResponse<UserProfileDto>)?.data;
            if (inner?.id) return inner.id;
        }
    }
    return undefined;
}

function getMeUserTypeFromRtkState(state: { api?: { queries?: Record<string, any> } }): UserType | null {
    const queries = state?.api?.queries;
    if (!queries) return null;
    for (const k of Object.keys(queries)) {
        const q = queries[k];
        if (q?.endpointName === 'getMe' && q?.data) {
            const inner = (q.data as ApiResponse<UserProfileDto>)?.data;
            if (inner != null && typeof inner.userType === 'number') return inner.userType;
        }
    }
    return null;
}

type FavoriteEntityForCache = {
    targetType: FavoriteTargetType;
    store?: BarberStoreGetDto;
    freeBarber?: FreeBarGetDto;
    customer?: FavoriteGetDto['customer'];
};

function findFavoriteEntityInCaches(
    getState: () => unknown,
    targetId: string,
    typeHint?: FavoriteTargetType,
): FavoriteEntityForCache | null {
    const state = getState() as { api?: { queries?: Record<string, any> } };
    const queries = state?.api?.queries;
    if (!queries) return null;

    if (typeHint === FavoriteTargetType.Store || !typeHint) {
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getStoreForUsers' && (qs.data as { id?: string } | undefined)?.id === targetId) {
                return { targetType: FavoriteTargetType.Store, store: qs.data as BarberStoreGetDto };
            }
        }
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getNearbyStores' && Array.isArray(qs.data)) {
                const s = (qs.data as BarberStoreGetDto[]).find((x) => x.id === targetId);
                if (s) return { targetType: FavoriteTargetType.Store, store: s };
            }
        }
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getMineStores' && Array.isArray(qs.data)) {
                const s = (qs.data as BarberStoreGetDto[]).find((x) => x.id === targetId);
                if (s) return { targetType: FavoriteTargetType.Store, store: s };
            }
        }
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getDiscoveryFiltered' && qs.data) {
                const d = qs.data as { stores?: BarberStoreGetDto[] };
                const s = d.stores?.find((x) => x.id === targetId);
                if (s) return { targetType: FavoriteTargetType.Store, store: s };
            }
        }
    }

    if (typeHint === FavoriteTargetType.FreeBarber || !typeHint) {
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getFreeBarberForUsers' && (qs.data as { id?: string } | undefined)?.id === targetId) {
                return { targetType: FavoriteTargetType.FreeBarber, freeBarber: qs.data as FreeBarGetDto };
            }
        }
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getNearbyFreeBarber' && Array.isArray(qs.data)) {
                const f = (qs.data as FreeBarGetDto[]).find((x) => x.id === targetId);
                if (f) return { targetType: FavoriteTargetType.FreeBarber, freeBarber: f };
            }
        }
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getDiscoveryFiltered' && qs.data) {
                const d = qs.data as { freeBarbers?: FreeBarGetDto[] };
                const f = d.freeBarbers?.find((x) => x.id === targetId);
                if (f) return { targetType: FavoriteTargetType.FreeBarber, freeBarber: f };
            }
        }
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName === 'getFreeBarberMinePanel' && (qs.data as { id?: string } | undefined)?.id === targetId) {
                return { targetType: FavoriteTargetType.FreeBarber, freeBarber: qs.data as FreeBarGetDto };
            }
        }
    }

    if (typeHint === FavoriteTargetType.Customer || !typeHint) {
        for (const k of Object.keys(queries)) {
            const qs = queries[k];
            if (qs?.endpointName !== 'getAllAppointmentByFilter' || !Array.isArray(qs.data)) continue;
            const apt = (qs.data as any[]).find(
                (a) => a?.customerUserId === targetId && typeof a?.isCustomerFavorite === 'boolean',
            );
            if (apt) {
                const name: string = apt.customerName || '';
                const parts = name.trim().split(/\s+/);
                return {
                    targetType: FavoriteTargetType.Customer,
                    customer: {
                        id: targetId,
                        firstName: parts[0] || '—',
                        lastName: parts.length > 1 ? parts.slice(1).join(' ') : '',
                        imageUrl: apt.customerImage,
                        rating: Number(apt.customerAverageRating) || 0,
                        favoriteCount: 0,
                        reviewCount: 0,
                        isFavorited: true,
                    },
                };
            }
        }
    }

    return null;
}

function buildOptimisticFavoriteGetDto(
    getState: () => unknown,
    targetId: string,
    typeHint: FavoriteTargetType | undefined,
    favoriteCountHint: number | undefined,
): FavoriteGetDto | null {
    const fromId = getMeUserIdFromRtkState(getState() as { api?: { queries?: Record<string, any> } });
    if (!fromId) return null;
    const ent = findFavoriteEntityInCaches(getState, targetId, typeHint);
    if (!ent) return null;
    const now = new Date().toISOString();
    const rowId = `${OPTIMISTIC_FAV_ID_PREFIX}${targetId}`;

    if (ent.targetType === FavoriteTargetType.Store && ent.store) {
        const store = { ...ent.store, isFavorited: true as const };
        if (typeof favoriteCountHint === 'number' && (store as { favoriteCount?: number }).favoriteCount !== favoriteCountHint) {
            (store as { favoriteCount: number }).favoriteCount = favoriteCountHint;
        }
        return {
            id: rowId,
            favoritedFromId: fromId,
            favoritedToId: targetId,
            targetType: FavoriteTargetType.Store,
            createdAt: now,
            store,
        };
    }
    if (ent.targetType === FavoriteTargetType.FreeBarber && ent.freeBarber) {
        const freeBarber = { ...ent.freeBarber, isFavorited: true as const };
        if (typeof favoriteCountHint === 'number' && (freeBarber as { favoriteCount?: number }).favoriteCount !== favoriteCountHint) {
            (freeBarber as { favoriteCount: number }).favoriteCount = favoriteCountHint;
        }
        return {
            id: rowId,
            favoritedFromId: fromId,
            favoritedToId: targetId,
            targetType: FavoriteTargetType.FreeBarber,
            createdAt: now,
            freeBarber,
        };
    }
    if (ent.targetType === FavoriteTargetType.Customer && ent.customer) {
        return {
            id: rowId,
            favoritedFromId: fromId,
            favoritedToId: targetId,
            targetType: FavoriteTargetType.Customer,
            createdAt: now,
            customer: { ...ent.customer, isFavorited: true },
        };
    }

    return null;
}

function favoriteRowAlreadyInList(draft: FavoriteGetDto[] | undefined, targetId: string): boolean {
    if (!Array.isArray(draft)) return false;
    return draft.some(
        (f) =>
            f.favoritedToId === targetId ||
            f.id === targetId ||
            f.store?.id === targetId ||
            f.freeBarber?.id === targetId ||
            f.customer?.id === targetId,
    );
}

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['MineStores', 'GetStoreById', "MineFreeBarberPanel", "Notification", "Chat", "Appointment", "Favorite", "IsFavorite", "StoreForUsers", "FreeBarberForUsers", "UserProfile", "Setting", "HelpGuide", "Complaint", "Request", "Blocked", "Rating", "Subscription", "SavedFilter", "ServicePackage", "SocialProfile", "SocialProfilePosts", "SocialFeed", "SocialReels", "SocialStory", "SocialHighlight", "SocialComments", "SocialFollowList", "SocialArchive", "SocialSaved", "AppointmentSocialShare"],
    // Only refetch on reconnect for critical data (Notification)
    // refetchOnFocus is disabled to prevent unnecessary requests
    refetchOnReconnect: false,
    refetchOnFocus: false,
    // AbortError'ları global olarak handle et - tüm query'lerde AbortError sessizce ignore edilir
    keepUnusedDataFor: 60, // 60 saniye - unused query'lerin cache'lenmesi için
    endpoints: (builder) => ({

        // --- AUTH API ---
        sendOtp: builder.mutation<{ message: string; success: boolean }, { phoneNumber: string, userType?: UserType, otpPurpose: OtpPurpose, language?: string }>({
            query: (body) => ({ url: 'Auth/send-otp', method: 'POST', body }),
        }),
        verifyOtp: builder.mutation<ApiResponse<AccessTokenDto>, VerifyOtpRequest>({
            query: (body) => ({ url: 'Auth/verify-otp', method: 'POST', body }),
        }),
        revoke: builder.mutation<{ message: string, success: boolean }, { refreshToken: string }>({
            query: (body) => ({ url: 'Auth/revoke', method: 'POST', body }),
        }),
        refresh: builder.mutation<ApiResponse<AccessTokenDto>, { refreshToken: string }>({
            query: (body) => ({ url: 'Auth/refresh', method: 'POST', body }),
        }),

        // --- BARBER STORE API ---
        addBarberStore: builder.mutation<{ message: string, success: boolean, data?: string }, BarberStoreCreateDto>({
            query: (dto) => ({ url: 'BarberStore/create-store', method: 'POST', body: dto }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        'MineStores',
                        'SocialProfile',
                        { type: 'MineStores', id: 'LIST' },
                        { type: 'ServicePackage' as const, id: 'LIST' },
                        ...(result?.data
                            ? [{ type: 'ServicePackage' as const, id: result.data }]
                            : []),
                    ],
        }),
        updateBarberStore: builder.mutation<{ message: string, success: boolean }, BarberStoreUpdateDto>({
            query: (dto) => ({ url: 'BarberStore/update-store', method: 'PUT', body: dto }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        'MineStores',
                        { type: 'MineStores', id: 'LIST' },
                        { type: 'MineStores', id: arg.id },
                        { type: 'GetStoreById', id: arg.id },
                        { type: 'StoreForUsers' as const, id: arg.id },
                        { type: 'ServicePackage' as const, id: arg.id },
                        { type: 'ServicePackage' as const, id: 'LIST' },
                    ],
        }),
        getNearbyStores: builder.query<BarberStoreGetDto[], NearbyRequest>({
            query: ({ lat, lon, radiusKm = DEFAULT_FILTER_RADIUS_KM, limit }) => ({
                url: 'BarberStore/nearby',
                method: 'GET',
                params: { lat, lon, distance: radiusKm, ...(limit !== undefined ? { limit } : {}) },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: transformArrayResponse<BarberStoreGetDto>,
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [
                        ...result.map(({ id }) => ({ type: 'MineStores' as const, id })),
                        { type: 'MineStores' as const, id: 'LIST' },
                        { type: 'MineStores' as const, id: 'NEARBY' },
                    ]
                    : [
                        { type: 'MineStores' as const, id: 'LIST' },
                        { type: 'MineStores' as const, id: 'NEARBY' },
                    ],
        }),
        getMineStores: builder.query<BarberStoreMineDto[], void>({
            query: () => 'BarberStore/mine',
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: transformArrayResponse<BarberStoreMineDto>,
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [...result.map(({ id }) => ({ type: 'MineStores' as const, id })), { type: 'MineStores' as const, id: 'LIST' }]
                    : [{ type: 'MineStores' as const, id: 'LIST' }],
        }),
        getStoreById: builder.query<BarberStoreDetail, string>({
            query: (id) => `BarberStore/${id}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            providesTags: (result, error, id) => [{ type: 'GetStoreById' as const, id }],
            transformResponse: (response: any) => transformObjectResponse<BarberStoreDetail>(response),
        }),
        getStoreForUsers: builder.query<BarberStoreMineDto, string>({
            query: (storeId) => `BarberStore/get-store-for-users?storeId=${storeId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            providesTags: (result, error, storeId) => [{ type: 'StoreForUsers' as const, id: storeId }],
            transformResponse: (response: any) => transformObjectResponse<BarberStoreMineDto>(response),
        }),

        // --- FREE BARBER API ---
        addFreeBarberPanel: builder.mutation<{ message: string, success: boolean, data?: string }, FreeBarberCreateDto>({
            query: (dto) => ({ url: 'FreeBarber/create-free-barber', method: 'POST', body: dto }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        'MineFreeBarberPanel',
                        'SocialProfile',
                        { type: 'ServicePackage' as const, id: 'LIST' },
                        ...(result?.data
                            ? [{ type: 'ServicePackage' as const, id: result.data }]
                            : []),
                    ],
        }),
        updateFreeBarberPanel: builder.mutation<{ message: string, success: boolean, data?: string }, FreeBarberUpdateDto>({
            query: (dto) => ({ url: 'FreeBarber/update-free-barber', method: 'PUT', body: dto }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        'MineFreeBarberPanel',
                        { type: 'MineFreeBarberPanel' as const, id: arg.id },
                        { type: 'FreeBarberForUsers' as const, id: arg.id },
                        { type: 'ServicePackage' as const, id: arg.id },
                        { type: 'ServicePackage' as const, id: 'LIST' },
                    ],
        }),
        updateFreeBarberLocation: builder.mutation<ApiResponse<string>, UpdateLocationDto>({
            query: (body) => ({
                url: 'FreeBarber/update-location',
                method: 'POST',
                body: body,
            }),
            invalidatesTags: ['MineFreeBarberPanel'],
        }),
        updateFreeBarberAvailability: builder.mutation<{ message: string; success: boolean }, boolean>({
            query: (isAvailable) => ({
                url: `FreeBarber/update-availability?isAvailable=${isAvailable}`,
                method: 'POST',
            }),
            invalidatesTags: ['MineFreeBarberPanel'],
        }),
        getNearbyFreeBarber: builder.query<FreeBarGetDto[], NearbyRequest>({
            query: ({ lat, lon, radiusKm = DEFAULT_FILTER_RADIUS_KM, limit }) => ({
                url: 'FreeBarber/nearby',
                method: 'GET',
                params: { lat, lon, distance: radiusKm, ...(limit !== undefined ? { limit } : {}) },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: transformArrayResponse<FreeBarGetDto>,
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [
                        ...result.map(({ id }) => ({ type: 'MineFreeBarberPanel' as const, id })),
                        { type: 'MineFreeBarberPanel' as const, id: 'LIST' },
                        { type: 'MineFreeBarberPanel' as const, id: 'NEARBY' },
                    ]
                    : [
                        { type: 'MineFreeBarberPanel' as const, id: 'LIST' },
                        { type: 'MineFreeBarberPanel' as const, id: 'NEARBY' },
                    ],
        }),
        getFreeBarberMinePanel: builder.query<FreeBarberPanelDto, void>({
            query: () => 'FreeBarber/mypanel',
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            providesTags: ['MineFreeBarberPanel'],
            transformResponse: (response: any) => transformObjectResponse<FreeBarberPanelDto>(response),
        }),
        getFreeBarberMinePanelDetail: builder.query<FreeBarberMinePanelDetailDto, string>({
            query: (id) => `FreeBarber/${id}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            providesTags: (result, error, id) => [{ type: 'MineFreeBarberPanel' as const, id }],
            transformResponse: (response: any) => transformObjectResponse<FreeBarberMinePanelDetailDto>(response),
        }),
        getFreeBarberForUsers: builder.query<FreeBarberPanelDto, string>({
            query: (freeBarberId) => `FreeBarber/get-freebarber-for-users?freeBarberId=${freeBarberId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            providesTags: (result, error, freeBarberId) => [{ type: 'FreeBarberForUsers' as const, id: freeBarberId }],
            transformResponse: (response: any) => transformObjectResponse<FreeBarberPanelDto>(response),
        }),

        // --- MANUEL BARBER API ---
        addManuelBarber: builder.mutation<{ message: string; success: boolean }, { dto: ManuelBarberCreateDto }>({
            query: ({ dto }) => ({ url: `ManuelBarber`, method: 'POST', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        updateManuelBarber: builder.mutation<{ message: string; success: boolean }, { dto: ManuelBarberUpdateDto }>({
            query: ({ dto }) => ({ url: `ManuelBarber`, method: 'PUT', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        deleteManuelBarber: builder.mutation<{ message: string; success: boolean }, string>({
            query: (id) => ({ url: `ManuelBarber/${id}`, method: 'DELETE' }),
            invalidatesTags: ['GetStoreById'],
        }),

        // --- STORE CHAIR API ---
        addStoreChair: builder.mutation<{ message: string; success: boolean }, { dto: BarberChairCreateDto }>({
            query: ({ dto }) => ({ url: `BarberStoreChair`, method: 'POST', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        updateStoreChair: builder.mutation<{ message: string; success: boolean }, { dto: BarberChairUpdateDto }>({
            query: ({ dto }) => ({ url: `BarberStoreChair`, method: 'PUT', body: dto }),
            invalidatesTags: ['GetStoreById'],
        }),
        deleteStoreChair: builder.mutation<{ message: string; success: boolean }, string>({
            query: (id) => ({ url: `BarberStoreChair/${id}`, method: 'DELETE' }),
            invalidatesTags: ['GetStoreById'],
        }),

        // --- APPOINTMENT API ---

        // 1. Availability (Mevcut)
        getAvailability: builder.query<ChairSlotDto[], { storeId: string; dateOnly: string }>({
            query: ({ storeId, dateOnly }) => `Appointment/availability?storeId=${storeId}&dateOnly=${dateOnly}`,
            transformResponse: transformArrayResponse<ChairSlotDto>,
            providesTags: (result, error, { storeId, dateOnly }) => [
                { type: 'Appointment' as const, id: `availability-${storeId}-${dateOnly}` },
                { type: 'Appointment' as const, id: 'availability' },
            ],
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
        }),

        /** Tek istekte çok günlük müsaitlik (ör. önümüzdeki 7 gün); günlük endpoint ile aynı koltuk şekli. */
        getAvailabilityRange: builder.query<StoreDayAvailabilityDto[], { storeId: string; fromDate: string; toDate: string }>({
            query: ({ storeId, fromDate, toDate }) =>
                `Appointment/availability-range?storeId=${storeId}&fromDate=${fromDate}&toDate=${toDate}`,
            transformResponse: transformArrayResponse<StoreDayAvailabilityDto>,
            providesTags: (result, error, { storeId, fromDate, toDate }) => [
                { type: 'Appointment' as const, id: `availability-range-${storeId}-${fromDate}-${toDate}` },
                { type: 'Appointment' as const, id: 'availability' },
            ],
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
        }),

        // 2. Filtreli Randevu Listesi (Active/Completed/Cancelled) — INFINITE SCROLL
        //
        // Pagination stratejisi:
        //  - `serializeQueryArgs` sadece `filter`'a bakar → her filtre TEK cache entry'sine sahiptir.
        //  - `loadMore` çağrısı `{ filter, before }` ile yapılır; `forceRefetch` sayesinde server'dan
        //    yeni sayfa çekilir, `merge` sonuçları ilgili cache'in sonuna ekler (daha eski kayıtlar aşağıda).
        //  - Invalidation/refetch (before yok) → ilk sayfa sync (yüklenmiş eski sayfalar korunur) veya full replace (pull/tümünü sil).
        //  - Mevcut tüm `useGetAllAppointmentByFilterQuery(filter)` ve `updateQueryData(..., { filter }, ...)`
        //    çağrıları aynı cache slot'una denk gelir; paged dünyada da tutarlı çalışır.
        getAllAppointmentByFilter: builder.query<AppointmentGetDto[], { filter: AppointmentFilter; before?: string; beforeId?: string; limit?: number }>({
            query: ({ filter, before, beforeId, limit }) => ({
                url: `Appointment/getallbyfilter`,
                method: 'GET',
                params: {
                    filter,
                    ...(before ? { before } : {}),
                    ...(beforeId ? { beforeId } : {}),
                    ...(limit ? { limit } : {}),
                },
            }),
            serializeQueryArgs: ({ queryArgs }) => ({ filter: queryArgs.filter }),
            merge: (currentCache, newItems, { arg }) =>
                mergeAppointmentFilterCachePages(currentCache, newItems, arg),
            // forceRefetch: hem `before` hem `beforeId` değişimini tetiklemeli.
            // (before aynı ama beforeId farklı = aynı timestamp'ta ikinci tie-breaker sayfası.)
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<AppointmentGetDto>,
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [
                        ...result.map(({ id }) => ({ type: 'Appointment' as const, id })),
                        { type: 'Appointment', id: 'LIST' },
                    ]
                    : [{ type: 'Appointment', id: 'LIST' }],
        }),

        createCustomerToFreeBarberAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/customer-to-freebarber', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: 'LIST' },
                'Notification',
            ],
        }),
        createCustomerAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/customer', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: 'LIST' },
                'Notification',
                ...(arg.storeId && arg.appointmentDate ? [
                    { type: 'Appointment' as const, id: `availability-${arg.storeId}-${arg.appointmentDate}` },
                ] : []),
            ],
        }),
        addStoreToAppointment: builder.mutation<ApiResponse<boolean>, { appointmentId: string; body: AddStoreToAppointmentRequestDto }>({
            query: ({ appointmentId, body }) => ({
                url: `Appointment/${appointmentId}/add-store`,
                method: 'POST',
                body,
            }),
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
                'Notification',
                'Chat',
                { type: 'Appointment', id: 'availability' }
            ],
        }),
        createFreeBarberAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/freebarber', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                'Appointment', 'Notification',
                { type: 'Appointment', id: 'LIST' },
                ...(arg.storeId && arg.appointmentDate ? [
                    { type: 'Appointment' as const, id: `availability-${arg.storeId}-${arg.appointmentDate}` },
                    { type: 'Appointment' as const, id: 'availability' },
                ] : []),
            ],
        }),
        createStoreAppointment: builder.mutation<ApiResponse<{ id: string }>, CreateAppointmentRequestDto>({
            query: (body) => ({ url: 'Appointment/store', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                'Appointment', 'Notification',
                { type: 'Appointment', id: 'LIST' },
                ...(arg.storeId && arg.appointmentDate ? [
                    { type: 'Appointment' as const, id: `availability-${arg.storeId}-${arg.appointmentDate}` },
                    { type: 'Appointment' as const, id: 'availability' },
                ] : []),
            ],
        }),
        callFreeBarber: builder.mutation<ApiResponse<{ id: string }>, CreateStoreToFreeBarberRequestDto>({
            query: (body) => ({ url: 'Appointment/store/call-freebarber', method: 'POST', body }),
            invalidatesTags: [
                { type: 'Appointment', id: 'LIST' },
                'Notification',
            ],
        }),

        storeDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/store-decision`,
                method: 'POST',
                params: { approve },
            }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        { type: 'Appointment' as const, id: arg.appointmentId },
                        { type: 'Appointment' as const, id: 'LIST' },
                        { type: 'Notification' as const, id: 'LIST' },
                    ],
        }),
        freeBarberDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/freebarber-decision`,
                method: 'POST',
                params: { approve },
            }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        { type: 'Appointment' as const, id: arg.appointmentId },
                        { type: 'Appointment' as const, id: 'LIST' },
                        { type: 'Appointment' as const, id: 'availability' },
                        { type: 'Notification' as const, id: 'LIST' },
                    ],
        }),
        customerDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/customer-decision`,
                method: 'POST',
                params: { approve },
            }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        { type: 'Appointment' as const, id: arg.appointmentId },
                        { type: 'Appointment' as const, id: 'LIST' },
                        { type: 'Notification' as const, id: 'LIST' },
                    ],
        }),
        cancelAppointment: builder.mutation<
            ApiResponse<boolean>,
            { appointmentId: string; cancellationReason?: string | null }
        >({
            query: ({ appointmentId, cancellationReason }) => ({
                url: `Appointment/${appointmentId}/cancel`,
                method: 'POST',
                body:
                    cancellationReason != null && String(cancellationReason).trim().length > 0
                        ? { cancellationReason: String(cancellationReason).trim() }
                        : {},
            }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        { type: 'Appointment' as const, id: arg.appointmentId },
                        { type: 'Appointment' as const, id: 'LIST' },
                        { type: 'Notification' as const, id: 'LIST' },
                    ],
        }),

        // --- TAMAMLAMA ---
        // Artık sadece string (appointmentId) alıyor
        completeAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Appointment/${appointmentId}/complete`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, appointmentId) =>
                error
                    ? []
                    : [
                        { type: 'Appointment' as const, id: appointmentId },
                        { type: 'Appointment' as const, id: 'LIST' },
                        { type: 'Notification' as const, id: 'LIST' },
                    ],
        }),

        deleteAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (id) => ({ url: `Appointment/${id}`, method: 'DELETE' }),
            async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
                const patches = patchAllAppointmentFilterCaches(dispatch, getState, (draft) => {
                    if (!Array.isArray(draft)) return;
                    const idx = draft.findIndex((a) => a.id === id);
                    if (idx !== -1) draft.splice(idx, 1);
                });
                try {
                    await queryFulfilled;
                } catch {
                    undoCachePatches(patches);
                }
            },
            invalidatesTags: (result, error, id) =>
                error
                    ? []
                    : [
                        { type: 'Appointment' as const, id },
                        { type: 'Appointment' as const, id: 'LIST' },
                    ],
        }),
        deleteAllAppointments: builder.mutation<ApiResponse<boolean>, void>({
            query: () => ({ url: 'Appointment/all', method: 'DELETE' }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
                requestAllAppointmentsFiltersFullCacheReplace();
                const patches = patchAllAppointmentFilterCaches(dispatch, getState, (draft) => {
                    draft.length = 0;
                });
                try {
                    await queryFulfilled;
                    requestAllAppointmentsFiltersFullCacheReplace();
                } catch {
                    undoCachePatches(patches);
                }
            },
            invalidatesTags: (result, error) =>
                error ? [] : [{ type: 'Appointment' as const, id: 'LIST' }],
        }),

        // --- WORKING HOURS API ---
        getWorkingHoursByTarget: builder.query<WorkingHourGetDto[], string>({
            query: (targetId) => `Working/${targetId}`,
            transformResponse: transformArrayResponse<WorkingHourGetDto>,
            keepUnusedDataFor: CACHE_DURATIONS.STATIC,
        }),

        // --- NOTIFICATION API ---

        // Bildirimler — INFINITE SCROLL.
        // - `serializeQueryArgs` her zaman `{}` döner → tek cache slot
        //   (mevcut `useGetAllNotificationsQuery()` ve `updateQueryData(..., undefined, ...)` çağrıları aynen çalışır).
        // - `before` yok → ilk sayfa sync (yüklenmiş eski sayfaları koru) veya full replace (pull/tümünü sil)
        // - `before` var → eski sayfa append (liste DESC)
        getAllNotifications: builder.query<NotificationDto[], { before?: string; beforeId?: string; limit?: number } | void>({
            query: (arg) => ({
                url: 'Notification',
                params: {
                    ...(arg && (arg as any).before ? { before: (arg as any).before } : {}),
                    ...(arg && (arg as any).beforeId ? { beforeId: (arg as any).beforeId } : {}),
                    ...(arg && (arg as any).limit ? { limit: (arg as any).limit } : {}),
                },
            }),
            serializeQueryArgs: () => ({}),
            merge: (currentCache, newItems, { arg }) =>
                mergeNotificationsCachePages(currentCache, newItems, arg),
            forceRefetch: ({ currentArg, previousArg }) => {
                const cTs = (currentArg as any)?.before ?? null;
                const pTs = (previousArg as any)?.before ?? null;
                const cId = (currentArg as any)?.beforeId ?? null;
                const pId = (previousArg as any)?.beforeId ?? null;
                return cTs !== pTs || cId !== pId;
            },
            transformResponse: transformArrayResponse<NotificationDto>,
            providesTags: (result) => {
                if (!result || !Array.isArray(result)) return [{ type: 'Notification' as const, id: 'LIST' }];
                return [
                    ...result.map(({ id }) => ({ type: 'Notification' as const, id })),
                    { type: 'Notification' as const, id: 'LIST' },
                ];
            },
            keepUnusedDataFor: 60,
        }),
        markNotificationRead: builder.mutation<void, string>({
            query: (id) => ({ url: `Notification/read/${id}`, method: 'POST' }),
            invalidatesTags: (result, error, id) =>
                error
                    ? []
                    : [
                        { type: 'Notification' as const, id },
                        { type: 'Notification' as const, id: 'LIST' },
                    ],
        }),
        markAllNotificationsRead: builder.mutation<ApiResponse<boolean>, void>({
            query: () => ({ url: 'Notification/read-all', method: 'POST' }),
            invalidatesTags: (result, error) =>
                error ? [] : [{ type: 'Notification' as const, id: 'LIST' }],
        }),
        deleteNotification: builder.mutation<ApiResponse<boolean>, string>({
            query: (id) => ({ url: `Notification/${id}`, method: 'DELETE' }),
            async onQueryStarted(id, { dispatch, queryFulfilled, getState }) {
                const patches = patchAllNotificationListCaches(dispatch, getState, (draft) => {
                    if (!Array.isArray(draft)) return;
                    const idx = draft.findIndex((n) => n.id === id);
                    if (idx !== -1) draft.splice(idx, 1);
                });
                try {
                    await queryFulfilled;
                } catch {
                    undoCachePatches(patches);
                }
            },
            invalidatesTags: (result, error, id) =>
                error
                    ? []
                    : [
                        { type: 'Notification' as const, id },
                        { type: 'Notification' as const, id: 'LIST' },
                    ],
        }),
        deleteAllNotifications: builder.mutation<ApiResponse<boolean>, void>({
            query: () => ({ url: 'Notification/all', method: 'DELETE' }),
            async onQueryStarted(_arg, { dispatch, queryFulfilled, getState }) {
                requestNotificationsFullCacheReplace();
                const patches = patchAllNotificationListCaches(dispatch, getState, (draft) => {
                    draft.length = 0;
                });
                try {
                    await queryFulfilled;
                    requestNotificationsFullCacheReplace();
                } catch {
                    undoCachePatches(patches);
                }
            },
            invalidatesTags: (result, error) =>
                error ? [] : [{ type: 'Notification' as const, id: 'LIST' }],
        }),

        // --- CHAT API ---
        // Thread listesi — INFINITE SCROLL.
        //  - serializeQueryArgs: () => ({}) → tek cache slot, mevcut `updateQueryData("getChatThreads", undefined, ...)`
        //    çağrıları (useSignalRV2) aynen çalışır.
        //  - Liste LastMessageAt DESC sırada döner → eski sayfa SONA append edilir.
        //  - `before` yok → ilk sayfa (replace); `before` var → eski sayfa (append, dedup).
        getChatThreads: builder.query<ChatThreadListItemDto[], { before?: string; beforeId?: string; limit?: number } | void>({
            query: (arg) => ({
                url: 'Chat/threads',
                params: {
                    ...(arg && (arg as any).before ? { before: (arg as any).before } : {}),
                    ...(arg && (arg as any).beforeId ? { beforeId: (arg as any).beforeId } : {}),
                    ...(arg && (arg as any).limit ? { limit: (arg as any).limit } : {}),
                },
            }),
            serializeQueryArgs: () => ({}),
            merge: (currentCache, newItems, { arg }) => {
                const sanitized = newItems.filter((t) => !t.isSocialThread);
                const before = (arg as any)?.before as string | undefined;
                if (!before) return sanitized;
                const seen = new Set(currentCache.map((t) => t.threadId));
                const deduped = sanitized.filter((t) => !seen.has(t.threadId));
                return [...currentCache, ...deduped];
            },
            forceRefetch: ({ currentArg, previousArg }) => {
                const cTs = (currentArg as any)?.before ?? null;
                const pTs = (previousArg as any)?.before ?? null;
                const cId = (currentArg as any)?.beforeId ?? null;
                const pId = (previousArg as any)?.beforeId ?? null;
                return cTs !== pTs || cId !== pId;
            },
            transformResponse: transformArrayResponse<ChatThreadListItemDto>,
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [
                        ...result.map(({ threadId }) => ({ type: 'Chat' as const, id: threadId })),
                        { type: 'Chat' as const, id: 'LIST' },
                    ]
                    : [{ type: 'Chat' as const, id: 'LIST' }],
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
        }),
        getSocialChatThreads: builder.query<ChatThreadListItemDto[], SocialChatThreadsQueryArgs>({
            query: (arg) => ({
                url: 'Chat/social/threads',
                params: {
                    profileId: arg.profileId,
                    ...(arg.before ? { before: arg.before } : {}),
                    ...(arg.beforeId ? { beforeId: arg.beforeId } : {}),
                    ...(arg.limit ? { limit: arg.limit } : {}),
                },
            }),
            serializeQueryArgs: ({ queryArgs }) => queryArgs.profileId,
            merge: (currentCache, newItems, { arg }) => {
                const before = arg?.before;
                if (!before) return newItems;
                const seen = new Set(currentCache.map((t) => t.threadId));
                const deduped = newItems.filter((t) => !seen.has(t.threadId));
                return [...currentCache, ...deduped];
            },
            forceRefetch: ({ currentArg, previousArg }) => {
                const cTs = currentArg?.before ?? null;
                const pTs = previousArg?.before ?? null;
                const cId = currentArg?.beforeId ?? null;
                const pId = previousArg?.beforeId ?? null;
                return cTs !== pTs || cId !== pId;
            },
            transformResponse: transformArrayResponse<ChatThreadListItemDto>,
            providesTags: [{ type: 'Chat' as const, id: 'SOCIAL_LIST' }],
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
        }),
        getDeletedSocialChatThreads: builder.query<ChatThreadListItemDto[], SocialChatThreadsQueryArgs>({
            query: (arg) => ({
                url: 'Chat/social/threads/deleted',
                params: {
                    profileId: arg.profileId,
                    ...(arg.before ? { before: arg.before } : {}),
                    ...(arg.beforeId ? { beforeId: arg.beforeId } : {}),
                    ...(arg.limit ? { limit: arg.limit } : {}),
                },
            }),
            serializeQueryArgs: ({ queryArgs }) => `deleted-${queryArgs.profileId}`,
            merge: (currentCache, newItems, { arg }) => {
                const before = arg?.before;
                if (!before) return newItems;
                const seen = new Set(currentCache.map((t) => t.threadId));
                const deduped = newItems.filter((t) => !seen.has(t.threadId));
                return [...currentCache, ...deduped];
            },
            forceRefetch: ({ currentArg, previousArg }) => {
                const cTs = currentArg?.before ?? null;
                const pTs = previousArg?.before ?? null;
                const cId = currentArg?.beforeId ?? null;
                const pId = previousArg?.beforeId ?? null;
                return cTs !== pTs || cId !== pId;
            },
            transformResponse: transformArrayResponse<ChatThreadListItemDto>,
            providesTags: [{ type: 'Chat' as const, id: 'SOCIAL_DELETED' }],
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
        }),
        restoreSocialChatThread: builder.mutation<ApiResponse<boolean>, { threadId: string }>({
            query: ({ threadId }) => ({
                url: `Chat/social/thread/${threadId}/restore`,
                method: 'POST',
            }),
            invalidatesTags: [
                { type: 'Chat' as const, id: 'SOCIAL_LIST' },
                { type: 'Chat' as const, id: 'SOCIAL_DELETED' },
            ],
            transformResponse: (response: unknown) => transformApiResponse<boolean>(response),
        }),
        ensureSocialChatThread: builder.mutation<ApiResponse<string>, { fromProfileId: string; toProfileId: string }>({
            query: (body) => ({ url: 'Chat/social/thread', method: 'POST', body }),
            invalidatesTags: [{ type: 'Chat' as const, id: 'SOCIAL_LIST' }],
            transformResponse: (response: unknown) => transformApiResponse<string>(response),
        }),
        // Chat mesajları — INFINITE SCROLL (cursor-based).
        //
        // Backend her sayfayı OLDEST -> NEWEST sırada döner (en eski en başta).
        // - İlk sayfa: `before` yok → en yeni `limit` adet (default 30) gelir.
        // - Eski sayfa yükleme: `before = oldestCachedMessage.createdAt` ile çağrılır,
        //   server eski `limit` adet döner; merge ile cache'in BAŞINA prepend ederiz.
        //
        // Tek cache slot stratejisi (`serializeQueryArgs` sadece appointmentId/threadId'ye bakar):
        //  - Mevcut updateQueryData / SignalR push handler'ları DEĞİŞMEDEN çalışır
        //    (hepsi `{ appointmentId }` veya `{ threadId }` ile aynı slot'u günceller).
        //  - Yeni mesajlar (push veya gönderme) cache'in SONUNA append edilir; render
        //    sırası kronolojik olarak korunur.
        getChatMessages: builder.query<ChatMessageItemDto[], { appointmentId: string; before?: string; beforeId?: string; limit?: number }>({
            query: ({ appointmentId, before, beforeId, limit }) => ({
                url: `Chat/${appointmentId}/messages`,
                method: 'GET',
                params: {
                    ...(before ? { before } : {}),
                    ...(beforeId ? { beforeId } : {}),
                    ...(limit ? { limit } : {}),
                },
            }),
            serializeQueryArgs: ({ queryArgs }) => ({ appointmentId: queryArgs.appointmentId }),
            merge: (currentCache, newItems, { arg }) => {
                if (!arg.before) {
                    // İlk sayfa veya yeniden yükleme → cache'i replace et.
                    return newItems;
                }
                // Eski sayfa → cache'in başına prepend (duplicate filter).
                const seen = new Set(currentCache.map((m) => m.messageId));
                const deduped = newItems.filter((m) => !seen.has(m.messageId));
                return [...deduped, ...currentCache];
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            providesTags: (result, error, arg) => [
                { type: 'Chat' as const, id: 'MESSAGES' },
                { type: 'Chat' as const, id: `MESSAGES_APPT_${arg.appointmentId}` },
            ],
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<ChatMessageItemDto>,
        }),
        getChatMessagesByThread: builder.query<ChatMessageItemDto[], { threadId: string; before?: string; beforeId?: string; limit?: number }>({
            query: ({ threadId, before, beforeId, limit }) => ({
                url: `Chat/thread/${threadId}/messages`,
                method: 'GET',
                params: {
                    ...(before ? { before } : {}),
                    ...(beforeId ? { beforeId } : {}),
                    ...(limit ? { limit } : {}),
                },
            }),
            serializeQueryArgs: ({ queryArgs }) => ({ threadId: queryArgs.threadId }),
            merge: (currentCache, newItems, { arg }) => {
                if (!arg.before) {
                    return newItems;
                }
                const seen = new Set(currentCache.map((m) => m.messageId));
                const deduped = newItems.filter((m) => !seen.has(m.messageId));
                return [...deduped, ...currentCache];
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            providesTags: (result, error, arg) => [
                { type: 'Chat' as const, id: 'MESSAGES' },
                { type: 'Chat' as const, id: `MESSAGES_THREAD_${arg.threadId}` },
            ],
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<ChatMessageItemDto>,
        }),
        sendChatMessage: builder.mutation<ApiResponse<ChatMessageDto>, { appointmentId: string; text: string; replyToMessageId?: string | null }>({
            query: ({ appointmentId, text, replyToMessageId }) => ({
                url: `Chat/${appointmentId}/message`,
                method: 'POST',
                body: { text, replyToMessageId: replyToMessageId ?? null },
            }),
            async onQueryStarted({ appointmentId, text }, { dispatch, queryFulfilled }) {
                try {
                    const result = await queryFulfilled;
                    const messageDto = result.data?.data;
                    if (messageDto) {
                        dispatch(
                            api.util.updateQueryData("getChatMessages", { appointmentId }, (draft) => {
                                if (!draft) return;
                                if (!draft.find((m) => m.messageId === messageDto.messageId)) {
                                    draft.push({
                                        messageId: messageDto.messageId,
                                        senderUserId: messageDto.senderUserId,
                                        text: messageDto.text,
                                        createdAt: messageDto.createdAt,
                                        messageType: messageDto.messageType,
                                        mediaUrl: messageDto.mediaUrl,
                                        replyToMessageId: messageDto.replyToMessageId,
                                        replyToTextPreview: messageDto.replyToTextPreview,
                                    });
                                    draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                }
                            }),
                        );
                        if (messageDto.threadId) {
                            dispatch(
                                api.util.updateQueryData("getChatMessagesByThread", { threadId: messageDto.threadId }, (draft) => {
                                    if (!draft) return;
                                    if (!draft.find((m) => m.messageId === messageDto.messageId)) {
                                        draft.push({
                                            messageId: messageDto.messageId,
                                            senderUserId: messageDto.senderUserId,
                                            text: messageDto.text,
                                            createdAt: messageDto.createdAt,
                                            messageType: messageDto.messageType,
                                            mediaUrl: messageDto.mediaUrl,
                                            replyToMessageId: messageDto.replyToMessageId,
                                            replyToTextPreview: messageDto.replyToTextPreview,
                                        });
                                        draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                    }
                                }),
                            );
                        }
                    }
                } catch {
                    // SignalR will update cache anyway
                }
            },
            invalidatesTags: [],
        }),
        sendChatMessageByThread: builder.mutation<ApiResponse<ChatMessageDto>, { threadId: string; text: string; replyToMessageId?: string | null }>({
            query: ({ threadId, text, replyToMessageId }) => ({
                url: `Chat/thread/${threadId}/message`,
                method: 'POST',
                body: { text, replyToMessageId: replyToMessageId ?? null },
            }),
            async onQueryStarted({ threadId }, { dispatch, queryFulfilled }) {
                try {
                    const result = await queryFulfilled;
                    const messageDto = result.data?.data;
                    if (messageDto) {
                        dispatch(
                            api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                                if (!draft) return;
                                if (!draft.find((m) => m.messageId === messageDto.messageId)) {
                                    draft.push({
                                        messageId: messageDto.messageId,
                                        senderUserId: messageDto.senderUserId,
                                        text: messageDto.text,
                                        createdAt: messageDto.createdAt,
                                        messageType: messageDto.messageType,
                                        mediaUrl: messageDto.mediaUrl,
                                        replyToMessageId: messageDto.replyToMessageId,
                                        replyToTextPreview: messageDto.replyToTextPreview,
                                    });
                                    draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                }
                            }),
                        );
                    }
                } catch {
                    // SignalR will update cache anyway
                }
            },
            invalidatesTags: [],
        }),
        sendChatMediaMessage: builder.mutation<ApiResponse<ChatMessageDto>, { threadId: string; messageType: number; mediaUrl: string; replyToMessageId?: string | null; fileName?: string | null }>({
            query: ({ threadId, messageType, mediaUrl, replyToMessageId, fileName }) => ({
                url: `Chat/thread/${threadId}/media`,
                method: 'POST',
                body: { messageType, mediaUrl, replyToMessageId: replyToMessageId ?? null, fileName: fileName ?? null },
            }),
            async onQueryStarted({ threadId }, { dispatch, queryFulfilled }) {
                try {
                    const result = await queryFulfilled;
                    const messageDto = result.data?.data;
                    if (messageDto) {
                        dispatch(
                            api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                                if (!draft) return;
                                if (!draft.find((m) => m.messageId === messageDto.messageId)) {
                                    draft.push({
                                        messageId: messageDto.messageId,
                                        senderUserId: messageDto.senderUserId,
                                        text: messageDto.text,
                                        createdAt: messageDto.createdAt,
                                        messageType: messageDto.messageType,
                                        mediaUrl: messageDto.mediaUrl,
                                        replyToMessageId: messageDto.replyToMessageId,
                                        replyToTextPreview: messageDto.replyToTextPreview,
                                    });
                                    draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                }
                            }),
                        );
                    }
                } catch {
                    // SignalR will update cache anyway
                }
            },
            invalidatesTags: [],
        }),
        deleteChatMessage: builder.mutation<ApiResponse<boolean>, { messageId: string; threadId: string }>({
            query: ({ messageId }) => ({
                url: `Chat/message/${messageId}`,
                method: 'DELETE',
            }),
            async onQueryStarted({ messageId, threadId }, { dispatch, queryFulfilled }) {
                let lastRemaining: ChatMessageItemDto | undefined;
                const patchMessages = dispatch(
                    api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                        const idx = draft.findIndex((m) => m.messageId === messageId);
                        if (idx !== -1) draft.splice(idx, 1);
                        lastRemaining = draft.length ? plainMessageSnapshot(draft[draft.length - 1]) : undefined;
                    }),
                );
                const patchThreads = dispatch(
                    api.util.updateQueryData("getChatThreads", undefined, (threads) => {
                        if (!threads) return;
                        const thread = threads.find((t) => t.threadId === threadId);
                        if (!thread) return;
                        if (!lastRemaining) {
                            thread.lastMessagePreview = "";
                            thread.lastMessageAt = null;
                        } else {
                            thread.lastMessagePreview = lastMessagePreviewFromChatMessage(lastRemaining);
                            thread.lastMessageAt = lastRemaining.createdAt;
                        }
                    }),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchMessages.undo();
                    patchThreads.undo();
                }
            },
            invalidatesTags: [],
        }),
        deleteChatMessageForEveryone: builder.mutation<ApiResponse<boolean>, { messageId: string; threadId: string }>({
            query: ({ messageId }) => ({
                url: `Chat/message/${messageId}/everyone`,
                method: 'DELETE',
            }),
            async onQueryStarted({ messageId, threadId }, { dispatch, queryFulfilled }) {
                let lastRemaining: ChatMessageItemDto | undefined;
                const patchMessages = dispatch(
                    api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                        const idx = draft.findIndex((m) => m.messageId === messageId);
                        if (idx !== -1) draft.splice(idx, 1);
                        lastRemaining = draft.length ? plainMessageSnapshot(draft[draft.length - 1]) : undefined;
                    }),
                );
                const patchThreads = dispatch(
                    api.util.updateQueryData("getChatThreads", undefined, (threads) => {
                        if (!threads) return;
                        const thread = threads.find((t) => t.threadId === threadId);
                        if (!thread) return;
                        if (!lastRemaining) {
                            thread.lastMessagePreview = "";
                            thread.lastMessageAt = null;
                        } else {
                            thread.lastMessagePreview = lastMessagePreviewFromChatMessage(lastRemaining);
                            thread.lastMessageAt = lastRemaining.createdAt;
                        }
                    }),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchMessages.undo();
                    patchThreads.undo();
                }
            },
            invalidatesTags: [],
        }),
        updateChatMessage: builder.mutation<ApiResponse<boolean>, { messageId: string; threadId: string; text: string }>({
            query: ({ messageId, text }) => ({
                url: `Chat/message/${messageId}`,
                method: 'PATCH',
                body: { text },
            }),
            async onQueryStarted({ messageId, threadId, text }, { dispatch, queryFulfilled }) {
                let threadPreviewFromEdit: ChatMessageItemDto | undefined;
                const patchMessages = dispatch(
                    api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                        const msg = draft.find((m) => m.messageId === messageId);
                        if (msg) {
                            msg.text = text;
                            msg.isEdited = true;
                        }
                        const last = draft.length ? draft[draft.length - 1] : undefined;
                        if (last && last.messageId === messageId) {
                            threadPreviewFromEdit = plainMessageSnapshot(last);
                        }
                    }),
                );
                const patchThreads = threadPreviewFromEdit
                    ? dispatch(
                        api.util.updateQueryData("getChatThreads", undefined, (threads) => {
                            if (!threads) return;
                            const thread = threads.find((t) => t.threadId === threadId);
                            if (!thread) return;
                            thread.lastMessagePreview = lastMessagePreviewFromChatMessage(threadPreviewFromEdit);
                        }),
                    )
                    : null;
                try {
                    await queryFulfilled;
                } catch {
                    patchMessages.undo();
                    patchThreads?.undo();
                }
            },
            invalidatesTags: [],
        }),
        deleteChatThread: builder.mutation<ApiResponse<boolean>, { threadId: string }>({
            query: ({ threadId }) => ({
                url: `Chat/thread/${threadId}`,
                method: 'DELETE',
            }),
            async onQueryStarted({ threadId }, { dispatch, queryFulfilled }) {
                const patchMessages = dispatch(
                    api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                        if (!draft) return;
                        draft.splice(0, draft.length);
                    }),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patchMessages.undo();
                }
            },
            invalidatesTags: (result, error, arg) => [
                { type: 'Chat' as const, id: 'LIST' },
                { type: 'Chat' as const, id: 'SOCIAL_LIST' },
                { type: 'Chat' as const, id: 'SOCIAL_DELETED' },
                { type: 'Chat' as const, id: 'MESSAGES' },
                { type: 'Chat' as const, id: `MESSAGES_THREAD_${arg.threadId}` },
            ],
        }),
        deleteChatThreadForEveryone: builder.mutation<ApiResponse<boolean>, { threadId: string }>({
            query: ({ threadId }) => ({
                url: `Chat/thread/${threadId}/everyone`,
                method: 'DELETE',
            }),
            async onQueryStarted({ threadId }, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                        if (!draft) return;
                        draft.splice(0, draft.length);
                    }),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
            invalidatesTags: (result, error, arg) => [
                { type: 'Chat' as const, id: 'LIST' },
                { type: 'Chat' as const, id: 'SOCIAL_LIST' },
                { type: 'Chat' as const, id: 'SOCIAL_DELETED' },
                { type: 'Chat' as const, id: 'MESSAGES' },
                { type: 'Chat' as const, id: `MESSAGES_THREAD_${arg.threadId}` },
            ],
        }),
        markChatThreadRead: builder.mutation<ApiResponse<boolean>, string>({
            query: (threadId) => ({
                url: `Chat/thread/${threadId}/read`,
                method: 'POST',
            }),
            async onQueryStarted(threadId, { dispatch, queryFulfilled, getState }) {
                const patchThreads = dispatch(
                    api.util.updateQueryData("getChatThreads", undefined, (draft) => {
                        if (!Array.isArray(draft)) return;
                        const row = draft.find((t) => t.threadId === threadId);
                        if (!row) return;
                        row.unreadCount = 0;
                    }),
                );
                const socialPatches: { undo: () => void }[] = [];
                const queries = (getState() as { api?: { queries?: Record<string, { endpointName?: string; originalArgs?: unknown; data?: unknown }> } }).api?.queries ?? {};
                Object.values(queries).forEach((q) => {
                    if (q?.endpointName !== 'getSocialChatThreads' || !Array.isArray(q.data)) return;
                    try {
                        const patch = dispatch(
                            api.util.updateQueryData('getSocialChatThreads', q.originalArgs as SocialChatThreadsQueryArgs, (draft) => {
                                const row = draft.find((t) => t.threadId === threadId);
                                if (row) row.unreadCount = 0;
                            }),
                        );
                        if (patch && typeof (patch as { undo?: () => void }).undo === 'function') {
                            socialPatches.push(patch as { undo: () => void });
                        }
                    } catch {
                        /* ignore */
                    }
                });
                try {
                    await queryFulfilled;
                } catch {
                    patchThreads.undo();
                    socialPatches.forEach((p) => p.undo());
                }
            },
            // Invalidate both Chat thread and Badge count
            invalidatesTags: (result, error, threadId) => [
                { type: 'Chat' as const, id: threadId },
                { type: 'Chat' as const, id: 'LIST' },
                { type: 'Chat' as const, id: 'SOCIAL_LIST' },
                { type: 'Notification' as const, id: 'LIST' },
            ],
        }),
        markChatThreadReadByAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Chat/${appointmentId}/read`,
                method: 'POST',
            }),
            // Specific invalidation - thread will be updated via SignalR
            invalidatesTags: (result, error, appointmentId) => [
                { type: 'Chat' as const, id: appointmentId },
            ],
        }),
        markChatThreadReadByThread: builder.mutation<ApiResponse<boolean>, string>({
            query: (threadId) => ({
                url: `Chat/thread/${threadId}/read`,
                method: 'POST',
            }),
            // Specific invalidation - thread will be updated via SignalR
            invalidatesTags: (result, error, threadId) => [
                { type: 'Chat' as const, id: threadId },
            ],
        }),
        notifyTyping: builder.mutation<ApiResponse<boolean>, { threadId: string; isTyping: boolean }>({
            query: ({ threadId, isTyping }) => ({
                url: `Chat/thread/${threadId}/typing`,
                method: 'POST',
                body: { isTyping },
            }),
        }),

        // --- RATING API ---
        createRating: builder.mutation<ApiResponse<RatingGetDto>, CreateRatingDto>({
            query: (body) => ({ url: 'Rating/create', method: 'POST', body }),
            invalidatesTags: (result, error, arg) => [
                { type: 'StoreForUsers', id: arg.targetId },
                { type: 'FreeBarberForUsers', id: arg.targetId },
                { type: 'Rating', id: arg.targetId },
                { type: 'Rating', id: 'LIST' },
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
            ],
        }),
        deleteRating: builder.mutation<ApiResponse<boolean>, string>({
            query: (ratingId) => ({ url: `Rating/${ratingId}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'Rating', id: 'LIST' }],
        }),
        getRatingById: builder.query<RatingGetDto, string>({
            query: (ratingId) => `Rating/${ratingId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: any) => transformObjectResponse<RatingGetDto>(response),
        }),
        // Rating listesi — INFINITE SCROLL (target bazında).
        //  - serializeQueryArgs: sadece `targetId`'ye bakar → aynı target için tek cache slot.
        //  - Liste CreatedAt DESC → eski sayfa SONA append edilir.
        //  - `before` yok → ilk sayfa (replace); `before` var → eski sayfa (append, dedup).
        getRatingsByTarget: builder.query<RatingGetDto[], { targetId: string; before?: string; beforeId?: string; limit?: number }>({
            query: ({ targetId, before, beforeId, limit }) => ({
                url: `Rating/target/${targetId}`,
                params: {
                    ...(before ? { before } : {}),
                    ...(beforeId ? { beforeId } : {}),
                    ...(limit ? { limit } : {}),
                },
            }),
            serializeQueryArgs: ({ queryArgs }) => ({ targetId: queryArgs.targetId }),
            merge: (currentCache, newItems, { arg }) => {
                if (!arg.before) return newItems;
                const seen = new Set(currentCache.map((r) => r.id));
                const deduped = newItems.filter((r) => !seen.has(r.id));
                return [...currentCache, ...deduped];
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<RatingGetDto>,
            providesTags: (result, error, arg) => [
                { type: 'Rating' as const, id: arg.targetId },
                { type: 'Rating' as const, id: 'LIST' },
            ],
        }),
        getMyRatingForAppointment: builder.query<RatingGetDto, { appointmentId: string; targetId: string }>({
            query: ({ appointmentId, targetId }) => `Rating/appointment/${appointmentId}/target/${targetId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: any) => transformObjectResponse<RatingGetDto>(response),
        }),

        // --- FAVORITE API ---
        toggleFavorite: builder.mutation<ApiResponse<ToggleFavoriteResponseDto>, ToggleFavoriteDto>({
            query: (body) => ({ url: 'Favorite/toggle', method: 'POST', body }),
            async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
                // Optimistic update ile anında UI güncelleme
                const targetId = arg.targetId;
                const state = getState() as any;

                // Optimistic update için patch'leri sakla (rollback için)
                const patchResults: any[] = [];

                // Optimistic update: Anında UI'ı güncelle
                /** RTK void query'lerde originalArgs undefined — updateQueryData ikinci argümanı undefined olmalı */
                const voidFavoriteEndpoints = new Set(['getFreeBarberMinePanel', 'getMineStores']);

                const optimisticUpdateCache = (endpointName: string, optimisticToggle: boolean) => {
                    try {
                        const apiState = (state as any).api;
                        if (!apiState?.queries) return;

                        Object.keys(apiState.queries).forEach((queryKey) => {
                            const queryState = apiState.queries[queryKey];
                            if (queryState?.endpointName === endpointName && queryState?.data) {
                                try {
                                    let queryArgs = queryState.originalArgs;

                                    if (!queryArgs && queryState.queryCacheKey) {
                                        const match = queryState.queryCacheKey.match(/\((.+)\)$/);
                                        if (match) {
                                            try {
                                                queryArgs = JSON.parse(match[1]);
                                            } catch (e) {
                                                // Parse edilemezse atla
                                            }
                                        }
                                    }

                                    const useVoidArgs = voidFavoriteEndpoints.has(endpointName);
                                    const canPatch =
                                        useVoidArgs || (queryArgs !== undefined && queryArgs !== null);
                                    if (!canPatch) return;

                                    const argsForUpdate = useVoidArgs ? undefined : queryArgs;

                                    const patchResult = dispatch(
                                        api.util.updateQueryData(endpointName as any, argsForUpdate, (draft: any) => {
                                            if (Array.isArray(draft)) {
                                                const item = draft.find((s: any) => s.id === targetId);
                                                if (item) {
                                                    item.favoriteCount = (item.favoriteCount || 0) + (optimisticToggle ? 1 : -1);
                                                    if (item.favoriteCount < 0) item.favoriteCount = 0;
                                                    item.isFavorited = optimisticToggle;
                                                }
                                            } else if (draft && draft.id === targetId) {
                                                draft.favoriteCount = (draft.favoriteCount || 0) + (optimisticToggle ? 1 : -1);
                                                if (draft.favoriteCount < 0) draft.favoriteCount = 0;
                                                draft.isFavorited = optimisticToggle;
                                            }
                                        })
                                    );
                                    patchResults.push(patchResult);
                                } catch (e) {
                                    // Hata durumunda sessizce devam et
                                }
                            }
                        });
                    } catch (e) {
                        // Hata durumunda sessizce devam et
                    }
                };

                const currentIsFavorite = getCachedFavoriteStateForTarget(state, targetId);
                const canOptimisticFavorite = currentIsFavorite !== undefined;
                const optimisticToggle = canOptimisticFavorite ? !currentIsFavorite : false;

                const refetchMyFavoritesCache = () => {
                    try {
                        void dispatch(
                            api.endpoints.getMyFavorites.initiate(undefined, {
                                forceRefetch: true,
                                subscribe: false,
                            } as any)
                        );
                    } catch (e) {
                        // ignore
                    }
                };

                const applyMyFavoritesUnfavorite = () => {
                    try {
                        dispatch(
                            api.util.updateQueryData('getMyFavorites', undefined, (draft) => {
                                if (!Array.isArray(draft)) return;
                                return draft.filter((f: FavoriteGetDto) => {
                                    if (f.favoritedToId === targetId) return false;
                                    if (f.id?.startsWith(OPTIMISTIC_FAV_ID_PREFIX) && f.favoritedToId === targetId) return false;
                                    if (f.store && f.store.id === targetId) return false;
                                    if (f.freeBarber && f.freeBarber.id === targetId) return false;
                                    if (f.customer && f.customer.id === targetId) return false;
                                    if (f.manuelBarber && f.manuelBarber.id === targetId) return false;
                                    return true;
                                });
                            }),
                        );
                    } catch (e) {
                        // ignore
                    }
                };

                const tryPrependMyFavorites = (fcHint: number | undefined) => {
                    const row = buildOptimisticFavoriteGetDto(getState, targetId, arg.targetType, fcHint);
                    if (row) {
                        try {
                            dispatch(
                                api.util.updateQueryData('getMyFavorites', undefined, (draft) => {
                                    if (!Array.isArray(draft)) return;
                                    if (favoriteRowAlreadyInList(draft, targetId)) return;
                                    return [row, ...draft];
                                }),
                            );
                        } catch (e) {
                            // ignore
                        }
                    } else {
                        refetchMyFavoritesCache();
                    }
                };

                const removeStubFavoriteRowOnRollback = () => {
                    try {
                        dispatch(
                            api.util.updateQueryData('getMyFavorites', undefined, (draft) => {
                                if (!Array.isArray(draft)) return;
                                return draft.filter(
                                    (f) => !(f.id === `${OPTIMISTIC_FAV_ID_PREFIX}${targetId}` && f.favoritedToId === targetId),
                                );
                            }),
                        );
                    } catch (e) {
                        // ignore
                    }
                };

                /** Tüm getAllAppointmentByFilter slot'ları — originalArgs yoksa queryCacheKey parse (randevu listeleri) */
                const updateAppointmentFavoriteFlag = (isFavoriteVal: boolean) => {
                    try {
                        const apiState = (getState() as any).api;
                        if (!apiState?.queries) return;

                        Object.keys(apiState.queries).forEach((queryKey) => {
                            const queryState = apiState.queries[queryKey];
                            if (
                                queryState?.endpointName !== 'getAllAppointmentByFilter' ||
                                !queryState?.data ||
                                !Array.isArray(queryState.data)
                            ) {
                                return;
                            }

                            const argsForUpdate = resolveRtkQueryArgs(queryState);
                            if (argsForUpdate === undefined || argsForUpdate === null) {
                                return;
                            }

                            const hasMatch = queryState.data.some(
                                (apt: any) =>
                                    sameFavoriteId(apt.customerUserId, targetId) ||
                                    sameFavoriteId(apt.barberStoreId, targetId) ||
                                    sameFavoriteId(apt.freeBarberId, targetId)
                            );
                            if (!hasMatch) return;

                            dispatch(
                                api.util.updateQueryData(
                                    'getAllAppointmentByFilter' as any,
                                    argsForUpdate,
                                    (draft) => {
                                        if (!draft || !Array.isArray(draft)) return;
                                        draft.forEach((apt: any) => {
                                            if (sameFavoriteId(apt.customerUserId, targetId)) {
                                                apt.isCustomerFavorite = isFavoriteVal;
                                            }
                                            if (sameFavoriteId(apt.barberStoreId, targetId)) {
                                                apt.isStoreFavorite = isFavoriteVal;
                                            }
                                            if (sameFavoriteId(apt.freeBarberId, targetId)) {
                                                apt.isFreeBarberFavorite = isFavoriteVal;
                                            }
                                        });
                                    }
                                )
                            );
                        });
                    } catch (e) {
                        // ignore
                    }
                };

                const updateDiscoveryFilteredFavorite = (
                    isFav: boolean,
                    countDelta?: number,
                    favoriteCountAbsolute?: number,
                ) => {
                    try {
                        const apiState = (getState() as any).api;
                        if (!apiState?.queries) return;
                        Object.keys(apiState.queries).forEach((queryKey) => {
                            const queryState = apiState.queries[queryKey];
                            if (queryState?.endpointName !== 'getDiscoveryFiltered' || !queryState?.data) {
                                return;
                            }
                            const d = queryState.data as { stores?: any[]; freeBarbers?: any[] };
                            const inStores = d.stores?.some((s) => s?.id === targetId);
                            const inFbs = d.freeBarbers?.some((b) => b?.id === targetId);
                            if (!inStores && !inFbs) return;
                            const argsForUpdate = resolveRtkQueryArgs(queryState);
                            if (argsForUpdate === undefined || argsForUpdate === null) return;
                            dispatch(
                                api.util.updateQueryData('getDiscoveryFiltered' as any, argsForUpdate, (draft: any) => {
                                    if (!draft) return;
                                    draft.stores?.forEach((s: any) => {
                                        if (s.id === targetId) {
                                            s.isFavorited = isFav;
                                            if (
                                                favoriteCountAbsolute !== undefined &&
                                                typeof s.favoriteCount === 'number'
                                            ) {
                                                s.favoriteCount = favoriteCountAbsolute;
                                            } else if (
                                                countDelta !== undefined &&
                                                typeof s.favoriteCount === 'number'
                                            ) {
                                                s.favoriteCount = Math.max(0, s.favoriteCount + countDelta);
                                            }
                                        }
                                    });
                                    draft.freeBarbers?.forEach((b: any) => {
                                        if (b.id === targetId) {
                                            b.isFavorited = isFav;
                                            if (
                                                favoriteCountAbsolute !== undefined &&
                                                typeof b.favoriteCount === 'number'
                                            ) {
                                                b.favoriteCount = favoriteCountAbsolute;
                                            } else if (
                                                countDelta !== undefined &&
                                                typeof b.favoriteCount === 'number'
                                            ) {
                                                b.favoriteCount = Math.max(0, b.favoriteCount + countDelta);
                                            }
                                        }
                                    });
                                })
                            );
                        });
                    } catch (e) {
                        // ignore
                    }
                };

                const patchChatThreadsFavoriteRestriction = (counterpartyIsFavorited: boolean) => {
                    try {
                        dispatch(
                            api.util.updateQueryData('getChatThreads', undefined, (draft: ChatThreadListItemDto[]) => {
                                if (!Array.isArray(draft)) return;
                                for (const thread of draft) {
                                    if (!thread.isFavoriteThread || !thread.participants?.[0]) continue;
                                    const p = thread.participants[0];
                                    const tid =
                                        p.userType === UserType.BarberStore
                                            ? (thread.favoriteStoreId ?? p.userId)
                                            : p.userId;
                                    if (tid !== targetId) continue;
                                    thread.isRestrictedForCurrentUser = !counterpartyIsFavorited;
                                }
                            }),
                        );
                    } catch {
                        // ignore
                    }
                };

                /** Sunucu cevabıyla yakınlık / detay önbelleğindeki sayaç ve bayrak (invalidate beklemeden) */
                const patchAllListCachesFromServer = (isFav: boolean, fc?: number) => {
                    try {
                        const apiSt = (getState() as any)?.api;
                        if (!apiSt?.queries) return;
                        const listEndpoints = new Set(['getNearbyStores', 'getNearbyFreeBarber']);
                        Object.keys(apiSt.queries).forEach((qk) => {
                            const queryState = apiSt.queries[qk];
                            if (!queryState?.endpointName || !listEndpoints.has(queryState.endpointName)) return;
                            if (!Array.isArray(queryState.data)) return;
                            const queryArgs = resolveRtkQueryArgs(queryState);
                            if (queryArgs === undefined || queryArgs === null) return;
                            try {
                                dispatch(
                                    api.util.updateQueryData(
                                        queryState.endpointName as 'getNearbyStores' | 'getNearbyFreeBarber',
                                        queryArgs as NearbyRequest,
                                        (draft: any[]) => {
                                            const item = draft.find((x: any) => x?.id === targetId);
                                            if (item) {
                                                item.isFavorited = isFav;
                                                if (typeof fc === 'number') item.favoriteCount = fc;
                                            }
                                        },
                                    ),
                                );
                            } catch {
                                // ignore
                            }
                        });
                        Object.keys(apiSt.queries).forEach((qk) => {
                            const queryState = apiSt.queries[qk];
                            if (!queryState?.data) return;
                            const args = resolveRtkQueryArgs(queryState);
                            if (args !== targetId) return;
                            if (queryState.endpointName === 'getStoreForUsers') {
                                try {
                                    dispatch(
                                        api.util.updateQueryData('getStoreForUsers', targetId, (draft: any) => {
                                            if (draft?.id === targetId) {
                                                draft.isFavorited = isFav;
                                                if (typeof fc === 'number') draft.favoriteCount = fc;
                                            }
                                        }),
                                    );
                                } catch {
                                    // ignore
                                }
                            }
                            if (queryState.endpointName === 'getStoreById') {
                                try {
                                    dispatch(
                                        api.util.updateQueryData('getStoreById', targetId, (draft: any) => {
                                            if (draft?.id === targetId) {
                                                draft.isFavorited = isFav;
                                                if (typeof fc === 'number') draft.favoriteCount = fc;
                                            }
                                        }),
                                    );
                                } catch {
                                    // ignore
                                }
                            }
                            if (queryState.endpointName === 'getFreeBarberForUsers') {
                                try {
                                    dispatch(
                                        api.util.updateQueryData('getFreeBarberForUsers', targetId, (draft: any) => {
                                            if (draft?.id === targetId) {
                                                draft.isFavorited = isFav;
                                                if (typeof fc === 'number') draft.favoriteCount = fc;
                                            }
                                        }),
                                    );
                                } catch {
                                    // ignore
                                }
                            }
                        });
                    } catch {
                        // ignore
                    }
                };

                if (canOptimisticFavorite) {
                    try {
                        dispatch(
                            api.util.updateQueryData('isFavorite', targetId, () => optimisticToggle)
                        );
                    } catch (e) {
                        // ignore
                    }

                    optimisticUpdateCache('getNearbyStores', optimisticToggle);
                    optimisticUpdateCache('getMineStores', optimisticToggle);
                    optimisticUpdateCache('getNearbyFreeBarber', optimisticToggle);
                    optimisticUpdateCache('getFreeBarberMinePanel', optimisticToggle);
                    optimisticUpdateCache('getStoreForUsers', optimisticToggle);
                    optimisticUpdateCache('getStoreById', optimisticToggle);
                    optimisticUpdateCache('getFreeBarberForUsers', optimisticToggle);
                    updateAppointmentFavoriteFlag(optimisticToggle);
                    updateDiscoveryFilteredFavorite(optimisticToggle, optimisticToggle ? 1 : -1);
                    if (optimisticToggle) {
                        tryPrependMyFavorites(undefined);
                    } else {
                        applyMyFavoritesUnfavorite();
                    }
                    patchChatThreadsFavoriteRestriction(optimisticToggle);
                }

                // Backend'den dönen response'u bekle
                try {
                    const result = await queryFulfilled;
                    const responseData = result.data?.data || result.data;

                    if (responseData) {
                        const isFavorite = responseData.isFavorite ?? false;
                        const fc = responseData.favoriteCount;
                        updateAppointmentFavoriteFlag(isFavorite);
                        updateDiscoveryFilteredFavorite(
                            isFavorite,
                            undefined,
                            typeof fc === 'number' ? fc : undefined,
                        );
                        patchAllListCachesFromServer(isFavorite, typeof fc === 'number' ? fc : undefined);
                        patchChatThreadsFavoriteRestriction(isFavorite);
                        try {
                            dispatch(api.util.updateQueryData('isFavorite', targetId, () => isFavorite));
                        } catch {
                            // ignore
                        }

                        if (!isFavorite) {
                            applyMyFavoritesUnfavorite();
                        } else {
                            tryPrependMyFavorites(typeof fc === 'number' ? fc : undefined);
                        }

                        if (typeof fc === 'number') {
                            try {
                                dispatch(
                                    api.util.updateQueryData('getFreeBarberMinePanel', undefined, (draft: any) => {
                                        if (draft?.id === targetId) {
                                            draft.favoriteCount = fc;
                                            draft.isFavorited = isFavorite;
                                        }
                                    })
                                );
                            } catch {
                                // ignore
                            }
                            try {
                                dispatch(
                                    api.util.updateQueryData('getMineStores', undefined, (draft: any) => {
                                        if (!Array.isArray(draft)) return;
                                        const item = draft.find((s: any) => s.id === targetId);
                                        if (item) {
                                            item.favoriteCount = fc;
                                            if ('isFavorited' in item) item.isFavorited = isFavorite;
                                        }
                                    })
                                );
                            } catch {
                                // ignore
                            }
                        }
                    }
                } catch (error) {
                    patchResults.forEach((patchResult) => {
                        patchResult.undo();
                    });
                    if (canOptimisticFavorite && typeof currentIsFavorite === 'boolean') {
                        try {
                            dispatch(api.util.updateQueryData('isFavorite', targetId, () => currentIsFavorite));
                        } catch {
                            // ignore
                        }
                        updateAppointmentFavoriteFlag(currentIsFavorite);
                        updateDiscoveryFilteredFavorite(currentIsFavorite, optimisticToggle ? -1 : 1);
                        patchChatThreadsFavoriteRestriction(currentIsFavorite);
                        if (optimisticToggle) {
                            removeStubFavoriteRowOnRollback();
                        } else {
                            refetchMyFavoritesCache();
                        }
                    }
                }
            },
            invalidatesTags: (result, error, arg) => [
                'Favorite',
                { type: 'Chat' as const, id: 'LIST' },
                // Kısıtlı thread'de önce [] cache'lenmiş olabiliyor; favori sonrası mesajlar gelsin diye mesaj sorgularını yenile
                { type: 'Chat' as const, id: 'MESSAGES' },
                'MineFreeBarberPanel',
                'MineStores',
                // IsFavorite invalidate → refetch sırasında `getCachedFavoriteStateForTarget` yanlış okuyup
                // ardışık toggle yönünü bozuyordu; randevu kartı zaten onQueryStarted + fulfilled ile patch'leniyor.
                { type: 'StoreForUsers', id: arg.targetId },
                { type: 'FreeBarberForUsers', id: arg.targetId },
                { type: 'GetStoreById', id: arg.targetId },
                { type: 'MineStores', id: arg.targetId },
                { type: 'MineFreeBarberPanel', id: arg.targetId },
            ],
            transformResponse: (response: unknown): ApiResponse<ToggleFavoriteResponseDto> => {
                const transformed = transformApiResponse<ToggleFavoriteResponseDto>(response);
                if (transformed) {
                    return {
                        success: transformed.success,
                        message: transformed.message,
                        data: transformed.data,
                    };
                }
                return response as ApiResponse<ToggleFavoriteResponseDto>;
            },
        }),
        isFavorite: builder.query<boolean, string>({
            query: (targetId) => `Favorite/check/${targetId}`,
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            providesTags: (result, error, targetId) => [{ type: 'IsFavorite' as const, id: targetId }],
            transformResponse: transformBooleanResponse,
        }),
        // Favorilerim — INFINITE SCROLL.
        //  - serializeQueryArgs: () => ({}) → tek cache slot (mevcut useGetMyFavoritesQuery() kullanımları etkilenmez).
        //  - Liste CreatedAt DESC → eski sayfa SONA append edilir.
        //  - invalidatesTags: ['Favorite'] mutation'ları sonrası merge-cache refetch edilir.
        getMyFavorites: builder.query<FavoriteGetDto[], { before?: string; beforeId?: string; limit?: number } | void>({
            query: (arg) => ({
                url: 'Favorite/my-favorites',
                params: {
                    ...(arg && (arg as any).before ? { before: (arg as any).before } : {}),
                    ...(arg && (arg as any).beforeId ? { beforeId: (arg as any).beforeId } : {}),
                    ...(arg && (arg as any).limit ? { limit: (arg as any).limit } : {}),
                },
            }),
            serializeQueryArgs: () => ({}),
            merge: (currentCache, newItems, { arg }) => {
                const before = (arg as any)?.before as string | undefined;
                if (!before) return newItems;
                const seen = new Set(currentCache.map((f) => f.id));
                const deduped = newItems.filter((f) => !seen.has(f.id));
                return [...currentCache, ...deduped];
            },
            forceRefetch: ({ currentArg, previousArg }) => {
                const cTs = (currentArg as any)?.before ?? null;
                const pTs = (previousArg as any)?.before ?? null;
                const cId = (currentArg as any)?.beforeId ?? null;
                const pId = (previousArg as any)?.beforeId ?? null;
                return cTs !== pTs || cId !== pId;
            },
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            providesTags: ['Favorite'],
            transformResponse: transformArrayResponse<FavoriteGetDto>,
        }),
        removeFavorite: builder.mutation<ApiResponse<boolean>, string>({
            query: (targetId) => ({ url: `Favorite/${targetId}`, method: 'DELETE' }),
            invalidatesTags: ['Favorite'],
        }),

        // --- CATEGORY API ---
        getAllCategories: builder.query<any[], void>({
            query: () => 'Categories',
            keepUnusedDataFor: CACHE_DURATIONS.STATIC,
            transformResponse: transformArrayResponse<ChairSlotDto>,
        }),
        getParentCategories: builder.query<any[], void>({
            query: () => 'Categories/parents',
            keepUnusedDataFor: 300, // 5 dakika cache
            transformResponse: transformArrayResponse<ChairSlotDto>,
        }),
        getChildCategories: builder.query<any[], string>({
            query: (parentId) => `Categories/children/${parentId}`,
            keepUnusedDataFor: 300, // 5 dakika cache
            transformResponse: transformArrayResponse<ChairSlotDto>,
        }),
        getCategoryHierarchy: builder.query<CategoryHierarchyDto[], void>({
            query: () => 'Categories/hierarchy',
            keepUnusedDataFor: 600, // 10 dakika cache - static data
            transformResponse: transformArrayResponse<CategoryHierarchyDto>,
        }),

        // --- FILTERED API ---
        // Server clamps limit to [1, 200]; offset defaults to 0. Çağıranlar limit/offset
        // vermezse backend default 100 döndürür (eski davranış, sadece tavanlı).
        // Mutation version (for manual triggers)
        getFilteredStores: builder.mutation<BarberStoreGetDto[], FilterRequestDto & { limit?: number; offset?: number }>({
            query: ({ limit, offset, ...filter }) => ({
                url: 'BarberStore/filtered',
                method: 'POST',
                body: filter,
                params: {
                    ...(limit !== undefined ? { limit } : {}),
                    ...(offset !== undefined ? { offset } : {}),
                },
            }),
            invalidatesTags: [],
            transformResponse: transformArrayResponse<BarberStoreGetDto>,
        }),

        getFilteredFreeBarbers: builder.mutation<FreeBarGetDto[], FilterRequestDto & { limit?: number; offset?: number }>({
            query: ({ limit, offset, ...filter }) => ({
                url: 'FreeBarber/filtered',
                method: 'POST',
                body: filter,
                params: {
                    ...(limit !== undefined ? { limit } : {}),
                    ...(offset !== undefined ? { offset } : {}),
                },
            }),
            invalidatesTags: ['MineFreeBarberPanel'],
            transformResponse: transformArrayResponse<FreeBarGetDto>,
        }),

        // Query version (for useNearby hook with filters)
        getFilteredStoresQuery: builder.query<BarberStoreGetDto[], FilterRequestDto & { limit?: number; offset?: number }>({
            query: ({ limit, offset, ...filter }) => ({
                url: 'BarberStore/filtered',
                method: 'POST',
                body: filter,
                params: {
                    ...(limit !== undefined ? { limit } : {}),
                    ...(offset !== undefined ? { offset } : {}),
                },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: transformArrayResponse<BarberStoreGetDto>,
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [
                        ...result.map(({ id }) => ({ type: 'MineStores' as const, id })),
                        { type: 'MineStores' as const, id: 'LIST' },
                        { type: 'MineStores' as const, id: 'FILTERED' },
                    ]
                    : [
                        { type: 'MineStores' as const, id: 'LIST' },
                        { type: 'MineStores' as const, id: 'FILTERED' },
                    ],
        }),

        getFilteredFreeBarbersQuery: builder.query<FreeBarGetDto[], FilterRequestDto & { limit?: number; offset?: number }>({
            query: ({ limit, offset, ...filter }) => ({
                url: 'FreeBarber/filtered',
                method: 'POST',
                body: filter,
                params: {
                    ...(limit !== undefined ? { limit } : {}),
                    ...(offset !== undefined ? { offset } : {}),
                },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: transformArrayResponse<FreeBarGetDto>,
            providesTags: (result) =>
                result && Array.isArray(result)
                    ? [
                        ...result.map(({ id }) => ({ type: 'MineFreeBarberPanel' as const, id })),
                        { type: 'MineFreeBarberPanel' as const, id: 'LIST' },
                        { type: 'MineFreeBarberPanel' as const, id: 'FILTERED' },
                    ]
                    : [
                        { type: 'MineFreeBarberPanel' as const, id: 'LIST' },
                        { type: 'MineFreeBarberPanel' as const, id: 'FILTERED' },
                    ],
        }),

        /** Müşteri keşfi: dükkan + serbest berber (ayrı store/freeBarber offset) */
        getDiscoveryFiltered: builder.query<
            DiscoveryFilteredResponseDto,
            FilterRequestDto & { limit?: number; storeOffset?: number; freeBarberOffset?: number }
        >({
            query: ({ limit, storeOffset, freeBarberOffset, ...filter }) => ({
                url: 'Discovery/filtered',
                method: 'POST',
                body: filter,
                params: {
                    ...(limit !== undefined ? { limit } : {}),
                    ...(storeOffset !== undefined ? { storeOffset } : {}),
                    ...(freeBarberOffset !== undefined ? { freeBarberOffset } : {}),
                },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: (response: unknown): DiscoveryFilteredResponseDto => {
                const raw = transformObjectResponse<Record<string, unknown>>(response);
                const stores =
                    (raw.stores as BarberStoreGetDto[] | undefined) ??
                    (raw.Stores as BarberStoreGetDto[] | undefined) ??
                    [];
                const freeBarbers =
                    (raw.freeBarbers as FreeBarGetDto[] | undefined) ??
                    (raw.FreeBarbers as FreeBarGetDto[] | undefined) ??
                    [];
                return { stores, freeBarbers };
            },
        }),

        // --- IMAGE API ---
        getImagesByOwner: builder.query<ImageGetDto[], { ownerId: string; ownerType: ImageOwnerType }>({
            query: ({ ownerId, ownerType }) => ({
                url: `Image/owner/${ownerId}`,
                params: { ownerType },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<ImageGetDto>,
        }),
        uploadImage: builder.mutation<ApiResponse<string>, { data: FormData; isProfileImage?: boolean }>({
            query: ({ data, isProfileImage = true }) => ({
                url: `Image/upload?isProfileImage=${isProfileImage}`,
                method: 'POST',
                body: data,
            }),
            invalidatesTags: [
                { type: 'StoreForUsers', id: 'LIST' },
                { type: 'FreeBarberForUsers', id: 'LIST' },
                'MineStores',
                { type: 'MineStores', id: 'LIST' },
                'MineFreeBarberPanel',
                'UserProfile'
            ],
        }),

        uploadMultipleImages: builder.mutation<ApiResponse<string[]>, FormData>({
            query: (formData) => ({
                url: 'Image/upload-multiple',
                method: 'POST',
                body: formData,
            }),
            invalidatesTags: [
                { type: 'StoreForUsers', id: 'LIST' },
                { type: 'FreeBarberForUsers', id: 'LIST' },
                'MineStores',
                { type: 'MineStores', id: 'LIST' },
                'MineFreeBarberPanel',
            ],
        }),

        deleteImage: builder.mutation<ApiResponse<void>, string>({
            query: (id) => ({
                url: `Image/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: [
                { type: 'StoreForUsers', id: 'LIST' },
                { type: 'FreeBarberForUsers', id: 'LIST' },
                'MineStores',
                { type: 'MineStores', id: 'LIST' },
                'MineFreeBarberPanel',
                'GetStoreById',
            ],
        }),
        updateImageBlob: builder.mutation<ApiResponse<void>, { imageId: string; file: FormData }>({
            query: ({ imageId, file }) => {
                file.append('ImageId', imageId);
                return {
                    url: `Image/update-blob`,
                    method: 'PUT',
                    body: file,
                };
            },
            invalidatesTags: [
                { type: 'StoreForUsers', id: 'LIST' },
                { type: 'FreeBarberForUsers', id: 'LIST' },
                'MineStores',
                { type: 'MineStores', id: 'LIST' },
                'MineFreeBarberPanel',
                'GetStoreById',
                'UserProfile', // ✅ FIX: UserProfile cache'i invalidate et
            ],
        }),

        // --- USER API ---
        getMe: builder.query<ApiResponse<UserProfileDto>, void>({
            query: () => 'User/me',
            providesTags: ['UserProfile'],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: (response: unknown): ApiResponse<UserProfileDto> => {
                const transformed = transformApiResponse<UserProfileDto>(response);
                if (transformed) {
                    return {
                        success: transformed.success,
                        message: transformed.message,
                        data: transformed.data,
                    };
                }
                return response as ApiResponse<UserProfileDto>;
            },
        }),

        updateProfile: builder.mutation<ApiResponse<AccessTokenDto>, UpdateUserDto>({
            query: (dto) => ({
                url: 'User/update-profile',
                method: 'PUT',
                body: dto,
            }),
            invalidatesTags: ['UserProfile'],
        }),

        sendPhoneChangeOtp: builder.mutation<{ success: boolean; message: string }, { newPhone: string; language?: string }>({
            query: (body) => ({ url: 'User/send-phone-change-otp', method: 'POST', body }),
        }),
        updatePhone: builder.mutation<ApiResponse<AccessTokenDto>, { newPhone: string; otpCode: string }>({
            query: (body) => ({ url: 'User/update-phone', method: 'PUT', body }),
            invalidatesTags: ['UserProfile'],
        }),

        sendDeleteAccountOtp: builder.mutation<{ success: boolean; message: string }, { language?: string }>({
            query: (body) => ({ url: 'User/send-delete-account-otp', method: 'POST', body }),
        }),
        deleteAccount: builder.mutation<{ success: boolean; message: string }, { otpCode: string }>({
            query: (body) => ({ url: 'User/delete-account', method: 'DELETE', body }),
        }),
        completeHelpGuidePrompt: builder.mutation<{ success: boolean; message?: string }, void>({
            query: () => ({ url: 'User/complete-help-guide-prompt', method: 'POST' }),
        }),

        // --- SETTING API ---
        getSetting: builder.query<ApiResponse<SettingGetDto>, void>({
            query: () => 'Setting',
            providesTags: ['Setting'],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: (response: unknown): ApiResponse<SettingGetDto> => {
                const transformed = transformApiResponse<SettingGetDto>(response);
                if (transformed) {
                    return {
                        success: transformed.success,
                        message: transformed.message,
                        data: transformed.data,
                    };
                }
                return response as ApiResponse<SettingGetDto>;
            },
        }),
        updateSetting: builder.mutation<ApiResponse<boolean>, SettingUpdateDto>({
            query: (dto) => ({
                url: 'Setting',
                method: 'PUT',
                body: dto,
            }),
            async onQueryStarted(arg, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    api.util.updateQueryData('getSetting', undefined, (draft) => {
                        if (!draft?.data) return;
                        if (typeof arg.showImageAnimation === 'boolean') {
                            draft.data.showImageAnimation = arg.showImageAnimation;
                        }
                        if (typeof arg.showPriceAnimation === 'boolean') {
                            draft.data.showPriceAnimation = arg.showPriceAnimation;
                        }
                        if (typeof arg.enableNotificationSound === 'boolean') {
                            draft.data.enableNotificationSound = arg.enableNotificationSound;
                        }
                        if (typeof arg.socialNotifyPostEngagement === 'boolean') {
                            draft.data.socialNotifyPostEngagement = arg.socialNotifyPostEngagement;
                        }
                        if (typeof arg.socialNotifyComments === 'boolean') {
                            draft.data.socialNotifyComments = arg.socialNotifyComments;
                        }
                        if (typeof arg.socialNotifyFollowers === 'boolean') {
                            draft.data.socialNotifyFollowers = arg.socialNotifyFollowers;
                        }
                        if (typeof arg.socialNotifyMentions === 'boolean') {
                            draft.data.socialNotifyMentions = arg.socialNotifyMentions;
                        }
                        if (typeof arg.socialNotifyStoryEngagement === 'boolean') {
                            draft.data.socialNotifyStoryEngagement = arg.socialNotifyStoryEngagement;
                        }
                    }),
                );
                try {
                    await queryFulfilled;
                } catch {
                    patch.undo();
                }
            },
        }),

        // --- HELP GUIDE API ---
        getHelpGuideByUserType: builder.query<ApiResponse<HelpGuideGetDto[]>, number>({
            query: (userType) => `HelpGuide/${userType}`,
            providesTags: ['HelpGuide'],
            keepUnusedDataFor: CACHE_DURATIONS.STATIC, // Static data - 5 dakika cache
            transformResponse: (response: unknown): ApiResponse<HelpGuideGetDto[]> => {
                const transformed = transformApiResponse<HelpGuideGetDto[]>(response);
                if (transformed) {
                    return {
                        success: transformed.success,
                        message: transformed.message,
                        data: transformed.data,
                    };
                }
                return response as ApiResponse<HelpGuideGetDto[]>;
            },
        }),

        // --- FCM TOKEN API ---
        registerFcmToken: builder.mutation<ApiResponse<boolean>, { fcmToken: string; deviceId?: string; platform?: string }>({
            query: (body) => ({
                url: 'User/register-fcm-token',
                method: 'POST',
                body,
            }),
        }),
        unregisterFcmToken: builder.mutation<ApiResponse<boolean>, { fcmToken: string }>({
            query: (body) => ({
                url: 'User/unregister-fcm-token',
                method: 'POST',
                body,
            }),
        }),

        // --- BADGE API ---
        getBadgeCounts: builder.query<ApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; socialChatUnreadCount: number; threadUnreadCounts: Record<string, number>; socialThreadUnreadCounts?: Record<string, number>; socialProfileUnreadCounts?: Record<string, number> }>, void>({
            query: () => 'Badge',
            providesTags: [
                { type: 'Notification' as const, id: 'LIST' },
                { type: 'Chat' as const, id: 'LIST' },
            ],
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: (response: unknown): ApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; socialChatUnreadCount: number; threadUnreadCounts: Record<string, number>; socialThreadUnreadCounts?: Record<string, number>; socialProfileUnreadCounts?: Record<string, number> }> => {
                const transformed = transformApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; socialChatUnreadCount: number; threadUnreadCounts: Record<string, number>; socialThreadUnreadCounts?: Record<string, number>; socialProfileUnreadCounts?: Record<string, number> }>(response);
                if (transformed) {
                    return {
                        success: transformed.success,
                        message: transformed.message,
                        data: {
                            ...transformed.data,
                            socialChatUnreadCount: transformed.data?.socialChatUnreadCount ?? 0,
                        },
                    };
                }
                return response as ApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; socialChatUnreadCount: number; threadUnreadCounts: Record<string, number>; socialThreadUnreadCounts?: Record<string, number>; socialProfileUnreadCounts?: Record<string, number> }>;
            },
        }),

        // --- COMPLAINT API ---
        createComplaint: builder.mutation<ApiResponse<ComplaintGetDto>, CreateComplaintDto>({
            query: (body) => ({ url: 'Complaint/create', method: 'POST', body }),
            invalidatesTags: ['Complaint'],
        }),
        getMyComplaints: builder.query<ComplaintGetDto[], void>({
            query: () => 'Complaint/my-complaints',
            providesTags: ['Complaint'],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: transformArrayResponse<ComplaintGetDto>,
        }),
        deleteComplaint: builder.mutation<ApiResponse<boolean>, string>({
            query: (complaintId) => ({ url: `Complaint/${complaintId}`, method: 'DELETE' }),
            invalidatesTags: ['Complaint'],
        }),

        // --- REQUEST API ---
        createRequest: builder.mutation<ApiResponse<RequestGetDto>, CreateRequestDto>({
            query: (body) => ({ url: 'Request/create', method: 'POST', body }),
            invalidatesTags: ['Request'],
        }),
        getMyRequests: builder.query<RequestGetDto[], void>({
            query: () => 'Request/my-requests',
            providesTags: ['Request'],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: transformArrayResponse<RequestGetDto>,
        }),
        deleteRequest: builder.mutation<ApiResponse<boolean>, string>({
            query: (requestId) => ({ url: `Request/${requestId}`, method: 'DELETE' }),
            invalidatesTags: ['Request'],
        }),

        // --- BLOCKED API ---
        blockUser: builder.mutation<ApiResponse<BlockedGetDto>, CreateBlockedDto>({
            query: (body) => ({ url: 'Blocked/block', method: 'POST', body }),
            invalidatesTags: ['Blocked', { type: 'StoreForUsers', id: 'LIST' }, { type: 'FreeBarberForUsers', id: 'LIST' }],
        }),
        unblockUser: builder.mutation<ApiResponse<boolean>, UnblockDto>({
            query: (body) => ({ url: 'Blocked/unblock', method: 'POST', body }),
            invalidatesTags: ['Blocked', { type: 'StoreForUsers', id: 'LIST' }, { type: 'FreeBarberForUsers', id: 'LIST' }],
        }),
        getMyBlockedUsers: builder.query<BlockedGetDto[], void>({
            query: () => 'Blocked/my-blocked',
            providesTags: ['Blocked'],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: transformArrayResponse<BlockedGetDto>,
        }),
        getBlockStatus: builder.query<ApiResponse<BlockStatusDto>, string>({
            query: (otherUserId) => `Blocked/status/${otherUserId}`,
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
        }),
        getAllBlockedUserIds: builder.query<string[], void>({
            query: () => 'Blocked/all-blocked-ids',
            providesTags: ['Blocked'],
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: (response: unknown) => transformArrayResponse<string>(response).map(String),
        }),

        // --- SAVED FILTERS ---
        getSavedFilters: builder.query<ApiResponse<SavedFilterGetDto[]>, void>({
            query: () => 'SavedFilter',
            providesTags: [{ type: 'SavedFilter' as const, id: 'LIST' }],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: (response: unknown): ApiResponse<SavedFilterGetDto[]> => {
                const transformed = transformApiResponse<SavedFilterGetDto[]>(response);
                if (transformed) return { success: transformed.success, message: transformed.message, data: transformed.data };
                return response as ApiResponse<SavedFilterGetDto[]>;
            },
        }),
        createSavedFilter: builder.mutation<ApiResponse<SavedFilterGetDto>, SavedFilterCreateDto>({
            query: (body) => ({ url: 'SavedFilter', method: 'POST', body }),
            invalidatesTags: [{ type: 'SavedFilter', id: 'LIST' }],
        }),
        updateSavedFilter: builder.mutation<ApiResponse<SavedFilterGetDto>, SavedFilterUpdateDto>({
            query: (body) => ({ url: 'SavedFilter', method: 'PUT', body }),
            invalidatesTags: [{ type: 'SavedFilter', id: 'LIST' }],
        }),
        deleteSavedFilter: builder.mutation<ApiResponse<boolean>, string>({
            query: (filterId) => ({ url: `SavedFilter/${filterId}`, method: 'DELETE' }),
            invalidatesTags: [{ type: 'SavedFilter', id: 'LIST' }],
        }),

        // --- SUBSCRIPTION ---
        getSubscriptionStatus: builder.query<{
            success: boolean;
            data: {
                status: 'Active' | 'Expired' | 'Banned';
                subscriptionEndDate: string | null;
                isBanned: boolean;
                banReason: string | null;
                autoRenew: boolean;
                cancelAtPeriodEnd: boolean;
                subscriptionDaysLeft: number;
                gateEnabled: boolean;
            };
        }, void>({
            query: () => 'Subscription/status',
            providesTags: ['Subscription'],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
        }),

        verifyAppleIap: builder.mutation<ApiResponse<{ subscriptionEndDate: string }>, { transactionId: string }>({
            query: (body) => ({
                url: 'Subscription/iap/apple',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Subscription'],
        }),

        verifyGoogleIap: builder.mutation<ApiResponse<{ subscriptionEndDate: string }>, { productId: string; purchaseToken: string }>({
            query: (body) => ({
                url: 'Subscription/iap/google',
                method: 'POST',
                body,
            }),
            invalidatesTags: ['Subscription'],
        }),

        // --- EARNINGS API ---
        getBarberStoreEarnings: builder.query<EarningsDto, { storeId: string; startDate?: string; endDate?: string }>({
            query: ({ storeId, startDate, endDate }) => ({
                url: 'BarberStore/earnings',
                method: 'GET',
                params: { storeId, startDate, endDate },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: any) => transformObjectResponse<EarningsDto>(response),
        }),
        /** Birden fazla mağaza kazancını tek DTO’da birleştirir (backend). */
        getBarberStoreEarningsAggregated: builder.query<EarningsDto, { storeIds: string[]; startDate?: string; endDate?: string }>({
            query: ({ storeIds, startDate, endDate }) => ({
                url: 'BarberStore/earnings-aggregated',
                method: 'GET',
                params: { storeIds: storeIds.join(','), startDate, endDate },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: any) => transformObjectResponse<EarningsDto>(response),
        }),
        getFreeBarberEarnings: builder.query<EarningsDto, { startDate?: string; endDate?: string }>({
            query: ({ startDate, endDate }) => ({
                url: 'FreeBarber/earnings',
                method: 'GET',
                params: { startDate, endDate },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: any) => transformObjectResponse<EarningsDto>(response),
        }),

        // --- AI ASSISTANT API ---
        aiAssistant: builder.mutation<ApiResponse<AIAssistantResponseDto>, { message: string; language?: string; latitude?: number; longitude?: number }>({
            query: ({ message, language = 'tr', latitude, longitude }) => ({
                url: 'AI/assistant',
                method: 'POST',
                body: { message, language, latitude, longitude },
            }),
        }),

        // --- SERVICE PACKAGE API ---
        addServicePackage: builder.mutation<{ message: string; success: boolean }, ServicePackageCreateDto>({
            query: (dto) => ({ url: 'ServicePackage', method: 'POST', body: dto }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        { type: 'ServicePackage' as const, id: arg.ownerId },
                        { type: 'ServicePackage' as const, id: 'LIST' },
                        'GetStoreById',
                        'MineFreeBarberPanel',
                        'MineStores',
                    ],
        }),
        updateServicePackage: builder.mutation<{ message: string; success: boolean }, ServicePackageUpdateDto>({
            query: (dto) => ({ url: 'ServicePackage', method: 'PUT', body: dto }),
            invalidatesTags: (result, error, arg) =>
                error
                    ? []
                    : [
                        { type: 'ServicePackage' as const, id: arg.ownerId },
                        { type: 'ServicePackage' as const, id: 'LIST' },
                        'GetStoreById',
                        'MineFreeBarberPanel',
                        'MineStores',
                    ],
        }),
        deleteServicePackage: builder.mutation<{ message: string; success: boolean }, string>({
            query: (id) => ({ url: `ServicePackage/${id}`, method: 'DELETE' }),
            invalidatesTags: (result, error) =>
                error
                    ? []
                    : [
                        { type: 'ServicePackage' as const, id: 'LIST' },
                        'GetStoreById',
                        'MineFreeBarberPanel',
                        'MineStores',
                    ],
        }),
        getServicePackagesByOwner: builder.query<ServicePackageGetDto[], string>({
            query: (ownerId) => `ServicePackage/owner/${ownerId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<ServicePackageGetDto>,
            providesTags: (result, error, ownerId) => [
                { type: 'ServicePackage' as const, id: ownerId },
                { type: 'ServicePackage' as const, id: 'LIST' },
            ],
        }),
        getServicePackagesByAppointment: builder.query<AppointmentServicePackageDto[], string>({
            query: (appointmentId) => `ServicePackage/appointment/${appointmentId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<AppointmentServicePackageDto>,
        }),

        // ── Sosyal medya ──
        getSocialLimits: builder.query<SocialLimitsDto, void>({
            query: () => 'social/config/limits',
            keepUnusedDataFor: CACHE_DURATIONS.STATIC,
            transformResponse: transformObjectResponse<SocialLimitsDto>,
        }),
        getSocialFreeTierUsage: builder.query<SocialFreeTierUsageDto, void>({
            query: () => 'social/config/usage',
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: transformObjectResponse<SocialFreeTierUsageDto>,
        }),
        getSocialMyProfiles: builder.query<SocialProfileDto[], void>({
            query: () => 'social/profile/me',
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
            transformResponse: (response: unknown) =>
                normalizeSocialProfileList(transformArrayResponse<SocialProfileDto>(response)),
            providesTags: ['SocialProfile'],
        }),
        getSocialProfile: builder.query<
            SocialProfileDto,
            string | { profileId: string; latitude?: number; longitude?: number }
        >({
            query: (arg) => {
                const profileId = typeof arg === 'string' ? arg : arg.profileId;
                const qs = new URLSearchParams();
                if (typeof arg !== 'string') {
                    if (arg.latitude != null) qs.set('latitude', String(arg.latitude));
                    if (arg.longitude != null) qs.set('longitude', String(arg.longitude));
                }
                const q = qs.toString();
                return `social/profile/${profileId}${q ? `?${q}` : ''}`;
            },
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: unknown) => {
                const raw = transformObjectResponse<SocialProfileDto>(response);
                return normalizeSocialProfileDto(raw) ?? raw;
            },
            providesTags: (_r, _e, arg) => [{ type: 'SocialProfile', id: typeof arg === 'string' ? arg : arg.profileId }],
        }),
        updateSocialProfile: builder.mutation<
            { message: string; success: boolean },
            {
                profileId: string;
                username?: string;
                bio?: string;
                externalUrl?: string | null;
                dmPolicy?: number;
                latitude?: number;
                longitude?: number;
            }
        >({
            query: ({ profileId, ...body }) => ({
                url: `social/profile/${profileId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['SocialProfile'],
        }),
        uploadSocialProfileAvatar: builder.mutation<
            ApiResponse<SocialProfileDto>,
            { profileId: string; file: { uri: string; name: string; type: string } }
        >({
            query: ({ profileId, file }) => {
                const form = new FormData();
                form.append('file', {
                    uri: file.uri,
                    name: file.name,
                    type: file.type,
                } as unknown as Blob);
                return { url: `social/profile/${profileId}/avatar`, method: 'POST', body: form };
            },
            invalidatesTags: ['SocialProfile'],
            transformResponse: (response: unknown) => transformApiResponse<SocialProfileDto>(response),
        }),
        uploadSocialProfileCover: builder.mutation<
            ApiResponse<SocialProfileDto>,
            { profileId: string; file: { uri: string; name: string; type: string } }
        >({
            query: ({ profileId, file }) => {
                const form = new FormData();
                form.append('file', {
                    uri: file.uri,
                    name: file.name,
                    type: file.type,
                } as unknown as Blob);
                return { url: `social/profile/${profileId}/cover`, method: 'POST', body: form };
            },
            invalidatesTags: ['SocialProfile'],
            transformResponse: (response: unknown) => transformApiResponse<SocialProfileDto>(response),
        }),
        getSocialFeed: builder.query<SocialPostDto[], { before?: string; beforeId?: string; limit?: number } | void>({
            query: (params) => {
                const p = params ?? {};
                const qs = new URLSearchParams();
                if (p.before) qs.set('before', p.before);
                if (p.beforeId) qs.set('beforeId', p.beforeId);
                if (p.limit) qs.set('limit', String(p.limit));
                const q = qs.toString();
                return `social/post/feed${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: () => ({}),
            merge: (currentCache, newItems, { arg }) =>
                mergeSocialFeedCachePages(currentCache, newItems, arg),
            forceRefetch: socialPostListCursorForceRefetch,
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: (response: unknown) =>
                normalizeSocialPostList(transformArrayResponse<SocialPostDto>(response)),
            providesTags: ['SocialFeed'],
        }),
        getSocialReelsFeed: builder.query<
            SocialPostDto[],
            {
                before?: string;
                beforeId?: string;
                limit?: number;
                latitude?: number;
                longitude?: number;
                radiusKm?: number;
            } | void
        >({
            query: (params) => {
                const p = params ?? {};
                const qs = new URLSearchParams();
                if (p.before) qs.set('before', p.before);
                if (p.beforeId) qs.set('beforeId', p.beforeId);
                if (p.limit) qs.set('limit', String(p.limit));
                if (p.latitude != null) qs.set('latitude', String(p.latitude));
                if (p.longitude != null) qs.set('longitude', String(p.longitude));
                if (p.radiusKm != null) qs.set('radiusKm', String(p.radiusKm));
                const q = qs.toString();
                return `social/post/reels${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: () => ({}),
            merge: (currentCache, newItems, { arg }) =>
                mergeSocialReelsCachePages(currentCache, newItems, arg),
            forceRefetch: socialPostListCursorForceRefetch,
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: (response: unknown) =>
                normalizeSocialPostList(transformArrayResponse<SocialPostDto>(response)),
            providesTags: ['SocialReels'],
        }),
        getSocialPost: builder.query<SocialPostDto, string>({
            query: (postId) => `social/post/${postId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: unknown) => {
                const raw = transformObjectResponse<SocialPostDto>(response);
                return normalizeSocialPostDto(raw) ?? raw;
            },
            providesTags: (_r, _e, id) => [{ type: 'SocialFeed', id }],
        }),
        recordSocialPostView: builder.mutation<{ message: string; success: boolean }, { postId: string; profileId: string }>({
            query: ({ postId, profileId }) => ({
                url: `social/post/${postId}/view`,
                method: 'POST',
                body: { profileId },
            }),
        }),
        getSocialProfileByOwner: builder.query<
            SocialProfileDto,
            { ownerType: number; ownerId: string; latitude?: number; longitude?: number }
        >({
            query: ({ ownerType, ownerId, latitude, longitude }) => {
                const qs = new URLSearchParams();
                if (latitude != null) qs.set('latitude', String(latitude));
                if (longitude != null) qs.set('longitude', String(longitude));
                const q = qs.toString();
                return `social/profile/owner/${ownerType}/${ownerId}${q ? `?${q}` : ''}`;
            },
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: unknown) => {
                const raw = transformObjectResponse<SocialProfileDto>(response);
                return normalizeSocialProfileDto(raw) ?? raw;
            },
            providesTags: (_r, _e, arg) => [{ type: 'SocialProfile', id: `owner-${arg.ownerType}-${arg.ownerId}` }],
        }),
        getSocialProfileByUsername: builder.query<SocialProfileDto, string>({
            query: (username) => `social/profile/username/${encodeURIComponent(username.toLowerCase())}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: (response: unknown) => {
                const raw = transformObjectResponse<SocialProfileDto>(response);
                return normalizeSocialProfileDto(raw) ?? raw;
            },
            providesTags: (_r, _e, username) => [{ type: 'SocialProfile', id: `username-${username}` }],
        }),
        searchSocialProfiles: builder.query<
            SocialProfileSearchResultDto[],
            {
                q?: string;
                latitude?: number;
                longitude?: number;
                radiusKm?: number;
                limit?: number;
                availability?: number;
                serviceIds?: string[];
            }
        >({
            query: (params) => {
                const qs = new URLSearchParams();
                if (params.q) qs.set('q', params.q);
                if (params.latitude != null) qs.set('latitude', String(params.latitude));
                if (params.longitude != null) qs.set('longitude', String(params.longitude));
                if (params.radiusKm != null) qs.set('radiusKm', String(params.radiusKm));
                if (params.limit != null) qs.set('limit', String(params.limit));
                if (params.availability != null) qs.set('availability', String(params.availability));
                params.serviceIds?.forEach((id) => qs.append('serviceIds', id));
                const q = qs.toString();
                return `social/profile/search${q ? `?${q}` : ''}`;
            },
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialProfileSearchResultDto>,
        }),
        discoverSocialPosts: builder.query<
            SocialPostDto[],
            {
                q?: string;
                latitude?: number;
                longitude?: number;
                radiusKm?: number;
                profileId?: string;
                before?: string;
                beforeId?: string;
                limit?: number;
                availability?: number;
                serviceIds?: string[];
            }
        >({
            query: (params) => {
                const qs = new URLSearchParams();
                if (params.q) qs.set('q', params.q);
                if (params.latitude != null) qs.set('latitude', String(params.latitude));
                if (params.longitude != null) qs.set('longitude', String(params.longitude));
                if (params.radiusKm != null) qs.set('radiusKm', String(params.radiusKm));
                if (params.profileId) qs.set('profileId', params.profileId);
                if (params.before) qs.set('before', params.before);
                if (params.beforeId) qs.set('beforeId', params.beforeId);
                if (params.limit != null) qs.set('limit', String(params.limit));
                if (params.availability != null) qs.set('availability', String(params.availability));
                params.serviceIds?.forEach((id) => qs.append('serviceIds', id));
                const q = qs.toString();
                return `social/post/discover${q ? `?${q}` : ''}`;
            },
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialPostDto>,
        }),
        getSocialProfilePosts: builder.query<
            SocialPostDto[],
            { profileId: string; type?: SocialPostType; before?: string; beforeId?: string; limit?: number }
        >({
            query: ({ profileId, type, before, beforeId, limit }) => {
                const qs = new URLSearchParams();
                if (type !== undefined) qs.set('type', String(type));
                if (before) qs.set('before', before);
                if (beforeId) qs.set('beforeId', beforeId);
                if (limit) qs.set('limit', String(limit));
                const q = qs.toString();
                return `social/post/profile/${profileId}${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: ({ queryArgs }) => queryArgs.profileId,
            merge: (currentCache, newItems, { arg }) => {
                if (!arg.before) return newItems;
                const seen = new Set((currentCache ?? []).map((p) => p.id));
                return [...(currentCache ?? []), ...newItems.filter((p) => !seen.has(p.id))];
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: (response: unknown) => normalizeSocialPostList(transformArrayResponse<SocialPostDto>(response)),
            providesTags: (_r, _e, arg) => [{ type: 'SocialProfilePosts', id: arg.profileId }],
        }),
        toggleSocialLike: builder.mutation<{ message: string; success: boolean }, { profileId: string; targetType: number; targetId: string }>({
            query: (body) => ({ url: 'social/interaction/like', method: 'POST', body }),
            async onQueryStarted({ targetType, targetId }, { dispatch, queryFulfilled, getState }) {
                const patches =
                    targetType === 0
                        ? applyOptimisticSocialPostLike(getState, dispatch, targetId)
                        : applyOptimisticSocialCommentLike(getState, dispatch, targetId);
                try {
                    await queryFulfilled;
                } catch {
                    undoAll(patches);
                }
            },
        }),
        toggleSocialSave: builder.mutation<{ message: string; success: boolean }, { profileId: string; postId: string }>({
            query: (body) => ({ url: 'social/interaction/save', method: 'POST', body }),
            async onQueryStarted({ postId }, { dispatch, queryFulfilled, getState }) {
                const patches = applyOptimisticSocialPostSave(getState, dispatch, postId);
                try {
                    await queryFulfilled;
                } catch {
                    undoAll(patches);
                }
            },
            invalidatesTags: ['SocialSaved'],
        }),
        getSavedSocialPosts: builder.query<
            SocialPostDto[],
            { profileId: string; type?: SocialPostType; excludeType?: SocialPostType; before?: string; beforeId?: string; limit?: number }
        >({
            query: ({ profileId, type, excludeType, before, beforeId, limit }) => {
                const qs = new URLSearchParams();
                if (type !== undefined) qs.set('type', String(type));
                if (excludeType !== undefined) qs.set('excludeType', String(excludeType));
                if (before) qs.set('before', before);
                if (beforeId) qs.set('beforeId', beforeId);
                if (limit) qs.set('limit', String(limit));
                const q = qs.toString();
                return `social/post/saved/${profileId}${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: ({ queryArgs }) =>
                `${queryArgs.profileId}-${queryArgs.type ?? 'all'}-${queryArgs.excludeType ?? 'none'}`,
            merge: (currentCache, newItems, { arg }) => {
                if (!arg.before) return newItems;
                const seen = new Set((currentCache ?? []).map((p) => p.id));
                return [...(currentCache ?? []), ...newItems.filter((p) => !seen.has(p.id))];
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: (response: unknown) => normalizeSocialPostList(transformArrayResponse<SocialPostDto>(response)),
            providesTags: (_r, _e, arg) => [{ type: 'SocialSaved', id: `${arg.profileId}-${arg.type ?? 'all'}` }],
        }),
        getSocialComments: builder.query<
            SocialCommentDto[],
            { postId: string; parentCommentId?: string; before?: string; beforeId?: string; limit?: number }
        >({
            query: ({ postId, parentCommentId, before, beforeId, limit }) => {
                const qs = new URLSearchParams();
                if (parentCommentId) qs.set('parentCommentId', parentCommentId);
                if (before) qs.set('before', before);
                if (beforeId) qs.set('beforeId', beforeId);
                if (limit) qs.set('limit', String(limit));
                const q = qs.toString();
                return `social/interaction/comment/${postId}${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: ({ queryArgs }) =>
                `${queryArgs.postId}:${queryArgs.parentCommentId ?? ''}`,
            merge: (currentCache, newItems, { arg }) => {
                if (!arg.before) return newItems;
                const seen = new Set((currentCache ?? []).map((c) => c.id));
                return [...(currentCache ?? []), ...newItems.filter((c) => !seen.has(c.id))];
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialCommentDto>,
            providesTags: (_r, _e, arg) => [
                {
                    type: 'SocialComments',
                    id: arg.parentCommentId ? `replies-${arg.parentCommentId}` : arg.postId,
                },
            ],
        }),
        createSocialComment: builder.mutation<
            ApiResponse<SocialCommentDto>,
            { profileId: string; postId: string; text: string; parentCommentId?: string }
        >({
            query: (body) => ({ url: 'social/interaction/comment', method: 'POST', body }),
            async onQueryStarted(arg, { dispatch, queryFulfilled, getState }) {
                const myProfiles = api.endpoints.getSocialMyProfiles.select()(getState() as never)?.data;
                const profile = myProfiles?.find((p) => p.id === arg.profileId);
                if (!profile) return;

                const tempId = `optimistic-comment-${Date.now()}`;
                const patches = applyOptimisticSocialCommentAdded(getState, dispatch, {
                    postId: arg.postId,
                    parentCommentId: arg.parentCommentId,
                    text: arg.text,
                    profile,
                    tempId,
                });

                try {
                    const { data: result } = await queryFulfilled;
                    const created = result?.data;
                    if (created) {
                        replaceOptimisticSocialComment(
                            dispatch,
                            arg.postId,
                            arg.parentCommentId,
                            tempId,
                            created,
                        );
                    }
                } catch {
                    undoAll(patches);
                }
            },
            transformResponse: (response: unknown) => transformApiResponse<SocialCommentDto>(response),
        }),
        updateSocialComment: builder.mutation<
            ApiResponse<SocialCommentDto>,
            { commentId: string; profileId: string; text: string; postId: string; parentCommentId?: string | null }
        >({
            query: ({ commentId, profileId, text }) => ({
                url: `social/interaction/comment/${commentId}`,
                method: 'PUT',
                body: { profileId, text },
            }),
            invalidatesTags: (_r, _e, arg) => [
                {
                    type: 'SocialComments',
                    id: arg.parentCommentId ? `replies-${arg.parentCommentId}` : arg.postId,
                },
                'SocialFeed',
            ],
            transformResponse: (response: unknown) => transformApiResponse<SocialCommentDto>(response),
        }),
        deleteSocialComment: builder.mutation<
            { message: string; success: boolean },
            { commentId: string; profileId: string; postId: string; parentCommentId?: string | null }
        >({
            query: ({ commentId, profileId }) => ({
                url: `social/interaction/comment/${commentId}`,
                method: 'DELETE',
                body: { profileId },
            }),
            invalidatesTags: (_r, _e, arg) => [
                {
                    type: 'SocialComments',
                    id: arg.parentCommentId ? `replies-${arg.parentCommentId}` : arg.postId,
                },
                'SocialFeed',
            ],
        }),
        getSocialFollowList: builder.query<
            SocialFollowListItemDto[],
            {
                profileId: string;
                kind: 'followers' | 'following';
                before?: string;
                beforeId?: string;
                limit?: number;
            }
        >({
            query: ({ profileId, kind, before, beforeId, limit }) => {
                const qs = new URLSearchParams();
                if (before) qs.set('before', before);
                if (beforeId) qs.set('beforeId', beforeId);
                if (limit) qs.set('limit', String(limit));
                const q = qs.toString();
                return `social/interaction/${kind}/${profileId}${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: ({ queryArgs }) => serializeSocialFollowListArgs(queryArgs),
            merge: (currentCache, newItems, { arg }) => mergeSocialFollowListCachePages(currentCache, newItems, arg),
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialFollowListItemDto>,
            providesTags: (_r, _e, arg) => [{ type: 'SocialFollowList', id: `${arg.kind}-${arg.profileId}` }],
        }),
        followSocialProfile: builder.mutation<{ message: string; success: boolean }, { followerProfileId: string; followingProfileId: string }>({
            query: (body) => ({ url: 'social/interaction/follow', method: 'POST', body }),
            async onQueryStarted({ followingProfileId }, { dispatch, queryFulfilled, getState }) {
                const patches = applyOptimisticSocialFollow(getState, dispatch, followingProfileId, true);
                try {
                    await queryFulfilled;
                } catch {
                    undoAll(patches);
                }
            },
            invalidatesTags: ['SocialFollowList'],
        }),
        unfollowSocialProfile: builder.mutation<{ message: string; success: boolean }, { followerProfileId: string; followingProfileId: string }>({
            query: (body) => ({ url: 'social/interaction/unfollow', method: 'POST', body }),
            async onQueryStarted({ followingProfileId }, { dispatch, queryFulfilled, getState }) {
                const patches = applyOptimisticSocialFollow(getState, dispatch, followingProfileId, false);
                try {
                    await queryFulfilled;
                } catch {
                    undoAll(patches);
                }
            },
            invalidatesTags: ['SocialFollowList'],
        }),
        toggleSocialProfileMute: builder.mutation<
            { message: string; success: boolean },
            { mutedByProfileId: string; mutedProfileId: string }
        >({
            query: (body) => ({ url: 'social/interaction/mute', method: 'POST', body }),
            invalidatesTags: (_r, _e, arg) => [{ type: 'SocialProfile', id: arg.mutedProfileId }],
        }),
        getSocialMutualFollowers: builder.query<
            SocialFollowListItemDto[],
            { profileId: string; before?: string; beforeId?: string; limit?: number }
        >({
            query: ({ profileId, before, beforeId, limit }) => {
                const qs = new URLSearchParams();
                if (before) qs.set('before', before);
                if (beforeId) qs.set('beforeId', beforeId);
                if (limit) qs.set('limit', String(limit));
                const q = qs.toString();
                return `social/interaction/mutual/${profileId}${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: ({ queryArgs }) => serializeSocialMutualListArgs(queryArgs),
            merge: (currentCache, newItems, { arg }) => mergeSocialMutualListCachePages(currentCache, newItems, arg),
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialFollowListItemDto>,
            providesTags: (_r, _e, arg) => [{ type: 'SocialFollowList', id: `mutual-${arg.profileId}` }],
        }),
        getSocialStoryFeed: builder.query<SocialStoryGroupDto[], void>({
            query: () => 'social/story/feed',
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialStoryGroupDto>,
            providesTags: ['SocialStory'],
        }),
        createSocialStory: builder.mutation<
            ApiResponse<string>,
            {
                profileId: string;
                file: { uri: string; name: string; type: string };
                durationSec?: number;
                appointmentId?: string;
            }
        >({
            query: ({ profileId, file, durationSec, appointmentId }) => {
                const form = new FormData();
                form.append('profileId', profileId);
                if (durationSec != null) form.append('durationSec', String(durationSec));
                if (appointmentId) form.append('appointmentId', appointmentId);
                form.append('file', {
                    uri: file.uri,
                    name: file.name,
                    type: file.type,
                } as unknown as Blob);
                return { url: 'social/story', method: 'POST', body: form };
            },
            invalidatesTags: ['SocialStory', 'AppointmentSocialShare'],
            transformResponse: (response: unknown) => transformApiResponse<string>(response),
        }),
        deleteSocialStory: builder.mutation<{ message: string; success: boolean }, string>({
            query: (storyId) => ({ url: `social/story/${storyId}`, method: 'DELETE' }),
            invalidatesTags: ['SocialStory', 'SocialArchive'],
        }),
        recordSocialStoryView: builder.mutation<
            { message: string; success: boolean },
            { storyId: string; profileId: string }
        >({
            query: ({ storyId, profileId }) => ({
                url: `social/story/${storyId}/view`,
                method: 'POST',
                body: { profileId },
            }),
        }),
        getSocialStoryViewers: builder.query<
            SocialStoryViewerDto[],
            { storyId: string; before?: string; beforeId?: string; limit?: number }
        >({
            query: ({ storyId, before, beforeId, limit }) => {
                const qs = new URLSearchParams();
                if (before) qs.set('before', before);
                if (beforeId) qs.set('beforeId', beforeId);
                if (limit != null) qs.set('limit', String(limit));
                const q = qs.toString();
                return `social/story/${storyId}/viewers${q ? `?${q}` : ''}`;
            },
            serializeQueryArgs: ({ queryArgs }) => queryArgs.storyId,
            merge: (currentCache, newItems, { arg }) => {
                if (!arg.before) return newItems;
                const seen = new Set((currentCache ?? []).map((v) => v.viewId));
                return [...(currentCache ?? []), ...newItems.filter((v) => !seen.has(v.viewId))];
            },
            forceRefetch: ({ currentArg, previousArg }) =>
                (currentArg?.before ?? null) !== (previousArg?.before ?? null) ||
                (currentArg?.beforeId ?? null) !== (previousArg?.beforeId ?? null),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<SocialStoryViewerDto>,
        }),
        createSocialStoryReply: builder.mutation<
            { message: string; success: boolean },
            { storyId: string; profileId: string; text: string }
        >({
            query: ({ storyId, profileId, text }) => ({
                url: `social/story/${storyId}/reply`,
                method: 'POST',
                body: { profileId, text },
            }),
            invalidatesTags: ['Chat'],
        }),
        getSocialProfileStories: builder.query<SocialStoryDto[], string>({
            query: (profileId) => `social/story/profile/${profileId}`,
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialStoryDto>,
            providesTags: (_r, _e, profileId) => [{ type: 'SocialStory', id: profileId }],
        }),
        getSocialStoryHighlights: builder.query<SocialStoryHighlightDto[], string>({
            query: (profileId) => `social/story/highlight/profile/${profileId}`,
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<SocialStoryHighlightDto>,
            providesTags: (_r, _e, profileId) => [{ type: 'SocialHighlight', id: profileId }],
        }),
        getSocialStoryHighlightDetail: builder.query<SocialStoryHighlightDetailDto, string>({
            query: (highlightId) => `social/story/highlight/${highlightId}`,
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformObjectResponse<SocialStoryHighlightDetailDto>,
            providesTags: (_r, _e, id) => [{ type: 'SocialHighlight', id }],
        }),
        createSocialStoryHighlight: builder.mutation<
            ApiResponse<string>,
            { profileId: string; title: string; storyIds?: string[] }
        >({
            query: (body) => ({ url: 'social/story/highlight', method: 'POST', body }),
            invalidatesTags: ['SocialHighlight'],
            transformResponse: (response: unknown) => transformApiResponse<string>(response),
        }),
        addStoriesToSocialHighlight: builder.mutation<
            { message: string; success: boolean },
            { highlightId: string; storyIds: string[] }
        >({
            query: ({ highlightId, storyIds }) => ({
                url: `social/story/highlight/${highlightId}/items`,
                method: 'POST',
                body: { storyIds },
            }),
            invalidatesTags: ['SocialHighlight'],
        }),
        updateSocialStoryHighlight: builder.mutation<
            { message: string; success: boolean },
            { highlightId: string; title?: string; sortOrder?: number }
        >({
            query: ({ highlightId, ...body }) => ({
                url: `social/story/highlight/${highlightId}`,
                method: 'PUT',
                body,
            }),
            invalidatesTags: ['SocialHighlight', 'SocialArchive'],
        }),
        removeSocialStoryHighlightItem: builder.mutation<
            { message: string; success: boolean },
            { highlightId: string; itemId: string }
        >({
            query: ({ highlightId, itemId }) => ({
                url: `social/story/highlight/${highlightId}/items/${itemId}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['SocialHighlight', 'SocialArchive'],
        }),
        deleteSocialStoryHighlight: builder.mutation<{ message: string; success: boolean }, string>({
            query: (highlightId) => ({ url: `social/story/highlight/${highlightId}`, method: 'DELETE' }),
            invalidatesTags: ['SocialHighlight', 'SocialArchive'],
        }),
        deleteSocialPost: builder.mutation<{ message: string; success: boolean }, string>({
            query: (postId) => ({ url: `social/post/${postId}`, method: 'DELETE' }),
            invalidatesTags: ['SocialFeed', 'SocialReels', 'SocialProfile', 'SocialProfilePosts', 'SocialArchive'],
        }),
        updateSocialPost: builder.mutation<
            ApiResponse<SocialPostDto>,
            { postId: string; caption?: string }
        >({
            query: ({ postId, caption }) => ({
                url: `social/post/${postId}`,
                method: 'PUT',
                body: { caption: caption ?? '' },
            }),
            invalidatesTags: ['SocialFeed', 'SocialReels', 'SocialProfile', 'SocialProfilePosts'],
            async onQueryStarted({ postId, caption }, { dispatch, queryFulfilled }) {
                const patch = dispatch(
                    api.util.updateQueryData('getSocialPost', postId, (draft) => {
                        draft.caption = caption?.trim() ? caption.trim() : undefined;
                    }),
                );
                try {
                    const { data: res } = await queryFulfilled;
                    if (res?.success && res.data) {
                        dispatch(
                            api.util.updateQueryData('getSocialPost', postId, (draft) => {
                                Object.assign(draft, res.data);
                            }),
                        );
                    }
                } catch {
                    patch.undo();
                }
            },
            transformResponse: (response: unknown) => transformApiResponse<SocialPostDto>(response),
        }),
        pinSocialPost: builder.mutation<{ message: string; success: boolean }, string>({
            query: (postId) => ({ url: `social/post/${postId}/pin`, method: 'POST' }),
            invalidatesTags: ['SocialFeed', 'SocialProfile'],
        }),
        unpinSocialPost: builder.mutation<{ message: string; success: boolean }, string>({
            query: (postId) => ({ url: `social/post/${postId}/pin`, method: 'DELETE' }),
            invalidatesTags: ['SocialFeed', 'SocialProfile'],
        }),
        getSocialArchivedContent: builder.query<SocialArchivedContentDto, { profileId: string; limit?: number }>({
            query: ({ profileId, limit }) => {
                const q = limit != null ? `?limit=${limit}` : '';
                return `social/archive/profile/${profileId}${q}`;
            },
            transformResponse: transformObjectResponse<SocialArchivedContentDto>,
            providesTags: (_r, _e, { profileId }) => [{ type: 'SocialArchive', id: profileId }],
        }),
        restoreSocialArchivedItem: builder.mutation<ApiResponse<boolean>, SocialRestoreArchivedRequest>({
            query: (body) => ({ url: 'social/archive/restore', method: 'POST', body }),
            invalidatesTags: ['SocialFeed', 'SocialReels', 'SocialProfile', 'SocialProfilePosts', 'SocialHighlight', 'SocialStory', 'SocialArchive'],
            transformResponse: (response: unknown) => transformApiResponse<boolean>(response),
        }),
        createSocialPost: builder.mutation<
            ApiResponse<string>,
            {
                profileId: string;
                caption?: string;
                type: SocialPostType;
                files: { uri: string; name: string; type: string }[];
                durationSec?: number;
                durationSecs?: number[];
                appointmentId?: string;
            }
        >({
            query: ({ profileId, caption, type, files, durationSec, durationSecs, appointmentId }) => {
                const form = new FormData();
                form.append('profileId', profileId);
                if (caption) form.append('caption', caption);
                form.append('type', String(type));
                if (durationSec != null) form.append('durationSec', String(durationSec));
                durationSecs?.forEach((d) => form.append('durationSecs', String(d)));
                if (appointmentId) form.append('appointmentId', appointmentId);
                files.forEach((f) => {
                    form.append('files', {
                        uri: f.uri,
                        name: f.name,
                        type: f.type,
                    } as unknown as Blob);
                });
                return { url: 'social/post', method: 'POST', body: form };
            },
            invalidatesTags: ['SocialFeed', 'SocialReels', 'SocialProfile', 'SocialProfilePosts', 'AppointmentSocialShare'],
            transformResponse: (response: unknown) => transformApiResponse<string>(response),
        }),
        getAppointmentSocialShareStatus: builder.query<string[], { appointmentIds: string[] }>({
            query: ({ appointmentIds }) => ({
                url: 'social/appointment-share/status',
                method: 'POST',
                body: { appointmentIds },
            }),
            serializeQueryArgs: ({ queryArgs }) => queryArgs.appointmentIds.join(','),
            providesTags: ['AppointmentSocialShare'],
            transformResponse: transformArrayResponse<string>,
        }),

    }),
});

export const {
    useSendOtpMutation,
    useVerifyOtpMutation,
    useRevokeMutation,
    useRefreshMutation,
    useAddBarberStoreMutation,
    useUpdateBarberStoreMutation,
    useLazyGetNearbyStoresQuery,
    useGetStoreByIdQuery,
    useLazyGetStoreByIdQuery,
    useAddManuelBarberMutation,
    useDeleteManuelBarberMutation,
    useUpdateManuelBarberMutation,
    useAddStoreChairMutation,
    useUpdateStoreChairMutation,
    useDeleteStoreChairMutation,
    useGetFreeBarberMinePanelQuery,
    useLazyGetFreeBarberMinePanelQuery,
    useLazyGetFreeBarberMinePanelDetailQuery,
    useLazyGetNearbyFreeBarberQuery,
    useAddFreeBarberPanelMutation,
    useUpdateFreeBarberPanelMutation,
    useGetAvailabilityQuery,
    useGetAvailabilityRangeQuery,
    useGetAllAppointmentByFilterQuery,
    useGetStoreForUsersQuery,
    useGetWorkingHoursByTargetQuery,
    useGetFreeBarberForUsersQuery,
    useUpdateFreeBarberLocationMutation,
    useUpdateFreeBarberAvailabilityMutation,
    useGetAllNotificationsQuery,
    useMarkNotificationReadMutation,
    useMarkAllNotificationsReadMutation,
    useDeleteNotificationMutation,
    useDeleteAllNotificationsMutation,
    useCreateCustomerAppointmentMutation,
    useCreateCustomerToFreeBarberAppointmentMutation,
    useCreateFreeBarberAppointmentMutation,
    useCreateStoreAppointmentMutation,
    useCallFreeBarberMutation,
    useAddStoreToAppointmentMutation,
    useStoreDecisionMutation,
    useFreeBarberDecisionMutation,
    useGetMineStoresQuery,
    useLazyGetMineStoresQuery,
    useCustomerDecisionMutation,
    useCancelAppointmentMutation,
    useCompleteAppointmentMutation,
    useDeleteAppointmentMutation,
    useDeleteAllAppointmentsMutation,
    useGetChatThreadsQuery,
    useLazyGetChatThreadsQuery,
    useGetSocialChatThreadsQuery,
    useLazyGetSocialChatThreadsQuery,
    useGetDeletedSocialChatThreadsQuery,
    useLazyGetDeletedSocialChatThreadsQuery,
    useRestoreSocialChatThreadMutation,
    useEnsureSocialChatThreadMutation,
    useGetChatMessagesQuery,
    useGetChatMessagesByThreadQuery,
    useSendChatMessageMutation,
    useSendChatMessageByThreadMutation,
    useSendChatMediaMessageMutation,
    useDeleteChatMessageMutation,
    useDeleteChatMessageForEveryoneMutation,
    useUpdateChatMessageMutation,
    useDeleteChatThreadMutation,
    useDeleteChatThreadForEveryoneMutation,
    useMarkChatThreadReadMutation,
    useMarkChatThreadReadByThreadMutation,
    useNotifyTypingMutation,
    useCreateRatingMutation,
    useDeleteRatingMutation,
    useGetRatingByIdQuery,
    useGetRatingsByTargetQuery,
    useGetMyRatingForAppointmentQuery,
    useToggleFavoriteMutation,
    useIsFavoriteQuery,
    useGetMyFavoritesQuery,
    useRemoveFavoriteMutation,
    useVerifyAppleIapMutation,
    useVerifyGoogleIapMutation,
    useGetAllCategoriesQuery,
    useGetParentCategoriesQuery,
    useLazyGetChildCategoriesQuery,
    useGetCategoryHierarchyQuery,
    useGetFilteredStoresMutation,
    useGetFilteredFreeBarbersMutation,
    useLazyGetFilteredStoresQueryQuery,
    useLazyGetFilteredFreeBarbersQueryQuery,
    useLazyGetDiscoveryFilteredQuery,
    useGetImagesByOwnerQuery,
    useLazyGetImagesByOwnerQuery,
    useUploadImageMutation,
    useUploadMultipleImagesMutation,
    useDeleteImageMutation,
    useUpdateImageBlobMutation,
    useGetMeQuery,
    useUpdateProfileMutation,
    useGetSettingQuery,
    useUpdateSettingMutation,
    useGetHelpGuideByUserTypeQuery,
    useRegisterFcmTokenMutation,
    useUnregisterFcmTokenMutation,
    useGetBadgeCountsQuery,
    // Complaint
    useCreateComplaintMutation,
    useGetMyComplaintsQuery,
    useDeleteComplaintMutation,
    // Request
    useCreateRequestMutation,
    useGetMyRequestsQuery,
    useDeleteRequestMutation,
    // Blocked
    useBlockUserMutation,
    useUnblockUserMutation,
    useGetMyBlockedUsersQuery,
    useGetBlockStatusQuery,
    useGetAllBlockedUserIdsQuery,
    useGetSubscriptionStatusQuery,
    useSendPhoneChangeOtpMutation,
    useUpdatePhoneMutation,
    useSendDeleteAccountOtpMutation,
        useDeleteAccountMutation,
        useCompleteHelpGuidePromptMutation,
        // SavedFilter
    useGetSavedFiltersQuery,
    useCreateSavedFilterMutation,
    useUpdateSavedFilterMutation,
    useDeleteSavedFilterMutation,
    // Earnings
    useGetBarberStoreEarningsQuery,
    useLazyGetBarberStoreEarningsQuery,
    useGetBarberStoreEarningsAggregatedQuery,
    useLazyGetBarberStoreEarningsAggregatedQuery,
    useGetFreeBarberEarningsQuery,
    useLazyGetFreeBarberEarningsQuery,
    // AI Assistant
    useAiAssistantMutation,
    // Service Package
    useAddServicePackageMutation,
    useUpdateServicePackageMutation,
    useDeleteServicePackageMutation,
    useGetServicePackagesByOwnerQuery,
    useLazyGetServicePackagesByOwnerQuery,
    useGetServicePackagesByAppointmentQuery,
    // Social
    useGetSocialLimitsQuery,
    useGetSocialFreeTierUsageQuery,
    useGetSocialMyProfilesQuery,
    useGetSocialProfileQuery,
    useUpdateSocialProfileMutation,
    useUploadSocialProfileAvatarMutation,
    useUploadSocialProfileCoverMutation,
    useGetSocialFeedQuery,
    useLazyGetSocialFeedQuery,
    useDeleteSocialPostMutation,
    useUpdateSocialPostMutation,
    usePinSocialPostMutation,
    useUnpinSocialPostMutation,
    useGetSocialArchivedContentQuery,
    useRestoreSocialArchivedItemMutation,
    useDeleteSocialStoryMutation,
    useRecordSocialStoryViewMutation,
    useCreateSocialStoryReplyMutation,
    useGetSocialStoryViewersQuery,
    useLazyGetSocialStoryViewersQuery,
    useGetSocialProfileStoriesQuery,
    useGetSocialStoryHighlightsQuery,
    useLazyGetSocialStoryHighlightDetailQuery,
    useCreateSocialStoryHighlightMutation,
    useUpdateSocialStoryHighlightMutation,
    useAddStoriesToSocialHighlightMutation,
    useRemoveSocialStoryHighlightItemMutation,
    useGetSocialStoryHighlightDetailQuery,
    useDeleteSocialStoryHighlightMutation,
    useGetSocialReelsFeedQuery,
    useLazyGetSocialReelsFeedQuery,
    useGetSocialPostQuery,
    useRecordSocialPostViewMutation,
    useSearchSocialProfilesQuery,
    useLazySearchSocialProfilesQuery,
    useDiscoverSocialPostsQuery,
    useLazyDiscoverSocialPostsQuery,
    useGetSocialProfileByOwnerQuery,
    useGetSocialProfileByUsernameQuery,
    useLazyGetSocialProfileByUsernameQuery,
    useGetSocialProfilePostsQuery,
    useLazyGetSocialProfilePostsQuery,
    useToggleSocialLikeMutation,
    useToggleSocialSaveMutation,
    useGetSavedSocialPostsQuery,
    useLazyGetSavedSocialPostsQuery,
    useGetSocialCommentsQuery,
    useLazyGetSocialCommentsQuery,
    useCreateSocialCommentMutation,
    useUpdateSocialCommentMutation,
    useDeleteSocialCommentMutation,
    useGetSocialFollowListQuery,
    useLazyGetSocialFollowListQuery,
    useFollowSocialProfileMutation,
    useUnfollowSocialProfileMutation,
    useToggleSocialProfileMuteMutation,
    useGetSocialMutualFollowersQuery,
    useLazyGetSocialMutualFollowersQuery,
    useCreateSocialPostMutation,
    useGetAppointmentSocialShareStatusQuery,
    useGetSocialStoryFeedQuery,
    useCreateSocialStoryMutation,
} = api;
