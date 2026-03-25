import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithReauth } from './baseQuery';
import {
    AccessTokenDto, ApiResponse, BarberChairCreateDto, BarberChairUpdateDto,
    BarberStoreCreateDto, BarberStoreDetail, BarberStoreGetDto, BarberStoreMineDto,
    BarberStoreUpdateDto, ChairSlotDto, CreateAppointmentRequestDto, FreeBarberCreateDto,
    FreeBarberMinePanelDetailDto, FreeBarberPanelDto, FreeBarberUpdateDto, FreeBarGetDto,
    ManuelBarberCreateDto, ManuelBarberUpdateDto, NearbyRequest, NotificationDto,
    OtpPurpose, UpdateLocationDto, UserType, VerifyOtpRequest, WorkingHourGetDto,
    ChatThreadListItemDto, ChatMessageItemDto, ChatMessageDto,
    AppointmentGetDto, AppointmentFilter,
    CreateRatingDto, RatingGetDto,
    ToggleFavoriteDto, ToggleFavoriteResponseDto, FavoriteGetDto,
    ImageGetDto, ImageOwnerType,
    AddStoreToAppointmentRequestDto, CreateStoreToFreeBarberRequestDto,
    UpdateUserDto, UserProfileDto, SettingGetDto, SettingUpdateDto, HelpGuideGetDto,
    ComplaintGetDto, CreateComplaintDto,
    RequestGetDto, CreateRequestDto,
    BlockedGetDto, CreateBlockedDto, UnblockDto, BlockStatusDto,
    CategoryHierarchyDto
} from '../types';
import { FilterRequestDto, SavedFilterGetDto, SavedFilterCreateDto, SavedFilterUpdateDto } from '../types/filter';
import { transformArrayResponse, transformObjectResponse, transformBooleanResponse, transformApiResponse } from '../utils/api/transform-response';

// Cache duration constants (in seconds)
const CACHE_DURATIONS = {
    STATIC: 300,      // 5 minutes - Categories, Settings
    USER_DATA: 60,    // 1 minute - User profile
    DYNAMIC: 30,      // 30 seconds - Store/FreeBarber details, Ratings
    LIST: 10,         // 10 seconds - Lists (Appointments, Chat threads)

    REAL_TIME: 5,     // 5 seconds - Nearby lists
} as const;

export const api = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: ['MineStores', 'GetStoreById', "MineFreeBarberPanel", "Notification", "Chat", "Appointment", "Favorite", "IsFavorite", "StoreForUsers", "FreeBarberForUsers", "UserProfile", "Setting", "HelpGuide", "Complaint", "Request", "Blocked", "Rating", "Subscription", "SavedFilter"],
    // Only refetch on reconnect for critical data (Notification)
    // refetchOnFocus is disabled to prevent unnecessary requests
    refetchOnReconnect: false,
    refetchOnFocus: false,
    // AbortError'ları global olarak handle et - tüm query'lerde AbortError sessizce ignore edilir
    keepUnusedDataFor: 60, // 60 saniye - unused query'lerin cache'lenmesi için
    endpoints: (builder) => ({

        // --- AUTH API ---
        sendOtp: builder.mutation<{ message: string; success: boolean }, { phoneNumber: string, userType?: UserType, otpPurpose: OtpPurpose }>({
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
            invalidatesTags: ['MineStores', { type: 'MineStores', id: 'LIST' }],
        }),
        updateBarberStore: builder.mutation<{ message: string, success: boolean }, BarberStoreUpdateDto>({
            query: (dto) => ({ url: 'BarberStore/update-store', method: 'PUT', body: dto }),
            invalidatesTags: (result, error, arg) => [
                'MineStores',
                { type: 'MineStores', id: 'LIST' },
                { type: 'MineStores', id: arg.id },
                { type: 'GetStoreById', id: arg.id },
                { type: 'StoreForUsers' as const, id: arg.id },
            ],
        }),
        getNearbyStores: builder.query<BarberStoreGetDto[], NearbyRequest>({
            query: ({ lat, lon, radiusKm = 10 }) => ({
                url: 'BarberStore/nearby',
                method: 'GET',
                params: { lat, lon, distance: radiusKm },
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
            invalidatesTags: ['MineFreeBarberPanel'],
        }),
        updateFreeBarberPanel: builder.mutation<{ message: string, success: boolean, data?: string }, FreeBarberUpdateDto>({
            query: (dto) => ({ url: 'FreeBarber/update-free-barber', method: 'PUT', body: dto }),
            invalidatesTags: (result, error, arg) => [
                'MineFreeBarberPanel',
                { type: 'MineFreeBarberPanel' as const, id: arg.id },
                { type: 'FreeBarberForUsers' as const, id: arg.id },
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
            query: ({ lat, lon, radiusKm = 10 }) => ({
                url: 'FreeBarber/nearby',
                method: 'GET',
                params: { lat, lon, distance: radiusKm },
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

        // 2. YENİ EKLENEN: Filtreli Randevu Listesi (Active/Completed/Cancelled)
        getAllAppointmentByFilter: builder.query<AppointmentGetDto[], AppointmentFilter>({
            query: (filter) => ({
                url: `Appointment/getallbyfilter`,
                method: 'GET',
                params: { filter },
            }),
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<AppointmentGetDto>,
            // Listeyi 'LIST' etiketiyle ve her öğeyi kendi ID'siyle etiketle
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
            // NO optimistic update - backend SignalR events are source of truth
            // Backend sends: notification.updated, badge.updated, appointment.updated
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
            ],
        }),
        freeBarberDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/freebarber-decision`,
                method: 'POST',
                params: { approve },
            }),
            // NO optimistic update - backend SignalR events are source of truth
            // Backend sends: notification.updated, badge.updated, appointment.updated
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
                { type: 'Appointment', id: 'availability' }
            ],
        }),
        customerDecision: builder.mutation<ApiResponse<boolean>, { appointmentId: string; approve: boolean }>({
            query: ({ appointmentId, approve }) => ({
                url: `Appointment/${appointmentId}/customer-decision`,
                method: 'POST',
                params: { approve },
            }),
            // NO optimistic update - backend SignalR events are source of truth
            // Backend sends: notification.updated, badge.updated, appointment.updated
            invalidatesTags: (result, error, arg) => [
                { type: 'Appointment', id: arg.appointmentId },
                { type: 'Appointment', id: 'LIST' },
            ],
        }),
        cancelAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Appointment/${appointmentId}/cancel`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, appointmentId) => [
                { type: 'Appointment', id: appointmentId },
                { type: 'Appointment', id: 'LIST' },
                // Notification invalidation removed - badge.updated SignalR event handles this
            ],
        }),

        // --- TAMAMLAMA ---
        // Artık sadece string (appointmentId) alıyor
        completeAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (appointmentId) => ({
                url: `Appointment/${appointmentId}/complete`,
                method: 'POST',
            }),
            invalidatesTags: (result, error, appointmentId) => [
                { type: 'Appointment', id: appointmentId },
                { type: 'Appointment', id: 'LIST' },
                // Notification invalidation removed - badge.updated SignalR event handles this
            ],
        }),

        deleteAppointment: builder.mutation<ApiResponse<boolean>, string>({
            query: (id) => ({ url: `Appointment/${id}`, method: 'DELETE' }),
            invalidatesTags: (result, error, id) => [
                { type: 'Appointment', id },
                { type: 'Appointment', id: 'LIST' },
            ],
        }),
        deleteAllAppointments: builder.mutation<ApiResponse<boolean>, void>({
            query: () => ({ url: 'Appointment/all', method: 'DELETE' }),
            invalidatesTags: [
                { type: 'Appointment', id: 'LIST' },
            ],
        }),

        // --- WORKING HOURS API ---
        getWorkingHoursByTarget: builder.query<WorkingHourGetDto[], string>({
            query: (targetId) => `Working/${targetId}`,
            transformResponse: transformArrayResponse<WorkingHourGetDto>,
            keepUnusedDataFor: CACHE_DURATIONS.STATIC,
        }),

        // --- NOTIFICATION API ---

        getAllNotifications: builder.query<NotificationDto[], void>({
            query: () => 'Notification',
            transformResponse: transformArrayResponse<NotificationDto>,
            providesTags: (result) => {
                if (!result || !Array.isArray(result)) return [{ type: 'Notification' as const, id: 'LIST' }];
                return [
                    ...result.map(({ id }) => ({ type: 'Notification' as const, id })),
                    { type: 'Notification' as const, id: 'LIST' },
                ];
            },
            keepUnusedDataFor: 60, // 60 saniye cache
        }),
        markNotificationRead: builder.mutation<void, string>({
            query: (id) => ({ url: `Notification/read/${id}`, method: 'POST' }),
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                const listPatch = dispatch(
                    api.util.updateQueryData('getAllNotifications', undefined, (draft) => {
                        const notification = draft.find((n) => n.id === id);
                        if (notification) { notification.isRead = true; }
                    }),
                );
                const badgePatch = dispatch(
                    api.util.updateQueryData('getBadgeCounts', undefined, (draft) => {
                        if (draft?.data?.notificationUnreadCount !== undefined) {
                            draft.data.notificationUnreadCount = Math.max(0, draft.data.notificationUnreadCount - 1);
                        }
                    }),
                );
                try { await queryFulfilled; }
                catch { listPatch.undo(); badgePatch.undo(); }
            },
        }),
        deleteNotification: builder.mutation<ApiResponse<boolean>, string>({
            query: (id) => ({ url: `Notification/${id}`, method: 'DELETE' }),
            async onQueryStarted(id, { dispatch, queryFulfilled }) {
                let wasUnread = false;
                const listPatch = dispatch(
                    api.util.updateQueryData('getAllNotifications', undefined, (draft) => {
                        const index = draft.findIndex((n) => n.id === id);
                        if (index >= 0) { wasUnread = !draft[index].isRead; draft.splice(index, 1); }
                    }),
                );
                const badgePatch = wasUnread ? dispatch(
                    api.util.updateQueryData('getBadgeCounts', undefined, (draft) => {
                        if (draft?.data?.notificationUnreadCount !== undefined) {
                            draft.data.notificationUnreadCount = Math.max(0, draft.data.notificationUnreadCount - 1);
                        }
                    }),
                ) : null;
                try { await queryFulfilled; }
                catch { listPatch.undo(); badgePatch?.undo(); }
            },
        }),
        deleteAllNotifications: builder.mutation<ApiResponse<boolean>, void>({
            query: () => ({ url: 'Notification/all', method: 'DELETE' }),
            async onQueryStarted(_, { dispatch, queryFulfilled }) {
                try {
                    await queryFulfilled;
                    // Backend bazı bildirimleri silmeyebilir (aktif randevu vs), o yüzden refetch
                    dispatch(api.util.invalidateTags([{ type: 'Notification' as const, id: 'LIST' }]));
                } catch { /* hata durumunda listeyi bozmayalım */ }
            },
        }),

        // --- CHAT API ---
        getChatThreads: builder.query<ChatThreadListItemDto[], void>({
            query: () => 'Chat/threads',
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
        getChatMessages: builder.query<ChatMessageItemDto[], { appointmentId: string; before?: string }>({
            query: ({ appointmentId, before }) => ({
                url: `Chat/${appointmentId}/messages`,
                method: 'GET',
                params: before ? { before } : undefined,
            }),
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<ChatMessageItemDto>,
        }),
        getChatMessagesByThread: builder.query<ChatMessageItemDto[], { threadId: string; before?: string }>({
            query: ({ threadId, before }) => ({
                url: `Chat/thread/${threadId}/messages`,
                method: 'GET',
                params: before ? { before } : undefined,
            }),
            keepUnusedDataFor: CACHE_DURATIONS.LIST,
            transformResponse: transformArrayResponse<ChatMessageItemDto>,
        }),
        sendChatMessage: builder.mutation<ApiResponse<ChatMessageDto>, { appointmentId: string; text: string }>({
            query: ({ appointmentId, text }) => ({
                url: `Chat/${appointmentId}/message`,
                method: 'POST',
                body: { text },
            }),
            // Optimistic update: Add message to cache immediately when sent
            async onQueryStarted({ appointmentId, text }, { dispatch, queryFulfilled }) {
                try {
                    const result = await queryFulfilled;
                    const messageDto = result.data?.data;
                    if (messageDto) {
                        // Update cache with the message from backend response
                        // This ensures user sees their message immediately
                        dispatch(
                            api.util.updateQueryData("getChatMessages", { appointmentId }, (draft) => {
                                if (!draft) return;
                                if (!draft.find((m) => m.messageId === messageDto.messageId)) {
                                    draft.push({
                                        messageId: messageDto.messageId,
                                        senderUserId: messageDto.senderUserId,
                                        text: messageDto.text,
                                        createdAt: messageDto.createdAt,
                                    });
                                    draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                }
                            }),
                        );
                        // Also update by thread
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
                                        });
                                        draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                    }
                                }),
                            );
                        }
                    }
                } catch {
                    // Error handling - SignalR will update cache anyway
                }
            },
            // SignalR handles real-time updates, no need for full invalidation
            invalidatesTags: [],
        }),
        sendChatMessageByThread: builder.mutation<ApiResponse<ChatMessageDto>, { threadId: string; text: string }>({
            query: ({ threadId, text }) => ({
                url: `Chat/thread/${threadId}/message`,
                method: 'POST',
                body: { text },
            }),
            // Optimistic update: Add message to cache immediately when sent
            async onQueryStarted({ threadId, text }, { dispatch, queryFulfilled }) {
                try {
                    const result = await queryFulfilled;
                    const messageDto = result.data?.data;
                    if (messageDto) {
                        // Update cache with the message from backend response
                        // This ensures user sees their message immediately
                        dispatch(
                            api.util.updateQueryData("getChatMessagesByThread", { threadId }, (draft) => {
                                if (!draft) return;
                                if (!draft.find((m) => m.messageId === messageDto.messageId)) {
                                    draft.push({
                                        messageId: messageDto.messageId,
                                        senderUserId: messageDto.senderUserId,
                                        text: messageDto.text,
                                        createdAt: messageDto.createdAt,
                                    });
                                    draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
                                }
                            }),
                        );
                        // Also update by appointment if exists
                    }
                } catch {
                    // Error handling - SignalR will update cache anyway
                }
            },
            // SignalR handles real-time updates, no need for full invalidation
            invalidatesTags: [],
        }),
        markChatThreadRead: builder.mutation<ApiResponse<boolean>, string>({
            query: (threadId) => ({
                url: `Chat/thread/${threadId}/read`,
                method: 'POST',
            }),
            // Invalidate both Chat thread and Badge count
            invalidatesTags: (result, error, threadId) => [
                { type: 'Chat' as const, id: threadId },
                { type: 'Chat' as const, id: 'LIST' },
                { type: 'Notification' as const, id: 'LIST' }, // Badge count refetch
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
        getRatingsByTarget: builder.query<RatingGetDto[], string>({
            query: (targetId) => `Rating/target/${targetId}`,
            keepUnusedDataFor: CACHE_DURATIONS.DYNAMIC,
            transformResponse: transformArrayResponse<RatingGetDto>,
            providesTags: (result, error, targetId) => [
                { type: 'Rating' as const, id: targetId },
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

                                    if (queryArgs) {
                                        const patchResult = dispatch(
                                            api.util.updateQueryData(endpointName as any, queryArgs, (draft: any) => {
                                                if (Array.isArray(draft)) {
                                                    const item = draft.find((s: any) => s.id === targetId);
                                                    if (item) {
                                                        // Optimistic: favoriteCount'u tahmin et
                                                        item.favoriteCount = (item.favoriteCount || 0) + (optimisticToggle ? 1 : -1);
                                                        if (item.favoriteCount < 0) item.favoriteCount = 0;
                                                    }
                                                } else if (draft && draft.id === targetId) {
                                                    draft.favoriteCount = (draft.favoriteCount || 0) + (optimisticToggle ? 1 : -1);
                                                    if (draft.favoriteCount < 0) draft.favoriteCount = 0;
                                                }
                                            })
                                        );
                                        patchResults.push(patchResult);
                                    }
                                } catch (e) {
                                    // Hata durumunda sessizce devam et
                                }
                            }
                        });
                    } catch (e) {
                        // Hata durumunda sessizce devam et
                    }
                };

                // İlk önce optimistic update yap (kullanıcı anında feedback alır)
                const currentIsFavorite = await (async () => {
                    try {
                        const apiState = (state as any).api;
                        if (apiState?.queries) {
                            for (const queryKey of Object.keys(apiState.queries)) {
                                const queryState = apiState.queries[queryKey];
                                if (queryState?.endpointName === 'isFavorite' && queryState?.data !== undefined) {
                                    const args = queryState.originalArgs;
                                    if (args === targetId) {
                                        return queryState.data as boolean;
                                    }
                                }
                            }
                        }
                    } catch (e) {
                        // Hata durumunda false döndür
                    }
                    return false;
                })();

                const optimisticToggle = !currentIsFavorite;

                // isFavorite query'sini optimistic olarak güncelle (anında UI feedback)
                try {
                    dispatch(
                        api.util.updateQueryData('isFavorite', targetId, () => optimisticToggle)
                    );
                } catch (e) {
                    // Hata durumunda sessizce devam et
                }
                // Not: Favoriler listesi invalidateTags ile otomatik refetch yapılacak ('Favorite' tag'i)

                // Tüm ilgili cache'leri optimistic olarak güncelle
                optimisticUpdateCache('getNearbyStores', optimisticToggle);
                optimisticUpdateCache('getMineStores', optimisticToggle);
                optimisticUpdateCache('getNearbyFreeBarber', optimisticToggle);
                optimisticUpdateCache('getFreeBarberMinePanel', optimisticToggle);
                optimisticUpdateCache('getStoreForUsers', optimisticToggle);
                optimisticUpdateCache('getFreeBarberForUsers', optimisticToggle);

                // Appointment listesi için isFavorite flag'ini güncelle
                const updateAppointmentFavoriteFlag = (isFavorite: boolean) => {
                    try {
                        const apiState = (state as any).api;
                        if (apiState?.queries) {
                            Object.keys(apiState.queries).forEach((queryKey) => {
                                const queryState = apiState.queries[queryKey];
                                if (queryState?.endpointName === 'getAllAppointmentByFilter' && queryState?.data && Array.isArray(queryState.data)) {
                                    const appointment = queryState.data.find((apt: any) =>
                                        apt.customerUserId === targetId ||
                                        apt.barberStoreId === targetId ||
                                        apt.freeBarberId === targetId
                                    );

                                    if (appointment && queryState.originalArgs !== undefined) {
                                        dispatch(
                                            api.util.updateQueryData('getAllAppointmentByFilter', queryState.originalArgs, (draft) => {
                                                if (!draft || !Array.isArray(draft)) return;
                                                const draftAppointment = draft.find((apt: any) =>
                                                    apt.customerUserId === targetId ||
                                                    apt.barberStoreId === targetId ||
                                                    apt.freeBarberId === targetId
                                                );
                                                if (draftAppointment) {
                                                    if (draftAppointment.customerUserId === targetId) {
                                                        draftAppointment.isCustomerFavorite = isFavorite;
                                                    }
                                                    if (draftAppointment.barberStoreId === targetId) {
                                                        draftAppointment.isStoreFavorite = isFavorite;
                                                    }
                                                    if (draftAppointment.freeBarberId === targetId) {
                                                        draftAppointment.isFreeBarberFavorite = isFavorite;
                                                    }
                                                }
                                            })
                                        );
                                    }
                                }
                            });
                        }
                    } catch (e) {
                        // Hata durumunda sessizce devam et
                    }
                };

                // Backend'den dönen response'u bekle
                try {
                    const result = await queryFulfilled;
                    const responseData = result.data?.data || result.data;

                    if (responseData) {
                        const isFavorite = responseData.isFavorite ?? false;
                        // Appointment favorite flag'lerini güncelle
                        updateAppointmentFavoriteFlag(isFavorite);
                    }
                    // Not: invalidatesTags zaten cache'i temizleyecek ve refetch yapacak, bu yüzden updateCacheWithFavoriteCount gereksiz
                } catch (error) {
                    // Hata durumunda optimistic update'i geri al
                    patchResults.forEach(patchResult => {
                        patchResult.undo();
                    });
                    // invalidatesTags zaten cache'i temizleyecek ve refetch yapacak
                }
            },
            invalidatesTags: (result, error, arg) => [
                'Favorite',
                { type: 'IsFavorite', id: arg.targetId },
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
        getMyFavorites: builder.query<FavoriteGetDto[], void>({
            query: () => 'Favorite/my-favorites',
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
        // Mutation version (for manual triggers)
        getFilteredStores: builder.mutation<BarberStoreGetDto[], FilterRequestDto>({
            query: (filter) => ({
                url: 'BarberStore/filtered',
                method: 'POST',
                body: filter,
            }),
            invalidatesTags: [],
            transformResponse: transformArrayResponse<BarberStoreGetDto>,
        }),

        getFilteredFreeBarbers: builder.mutation<FreeBarGetDto[], FilterRequestDto>({
            query: (filter) => ({
                url: 'FreeBarber/filtered',
                method: 'POST',
                body: filter,
            }),
            invalidatesTags: ['MineFreeBarberPanel'],
            transformResponse: transformArrayResponse<FreeBarGetDto>,
        }),

        // Query version (for useNearby hook with filters)
        getFilteredStoresQuery: builder.query<BarberStoreGetDto[], FilterRequestDto>({
            query: (filter) => ({
                url: 'BarberStore/filtered',
                method: 'POST',
                body: filter,
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

        getFilteredFreeBarbersQuery: builder.query<FreeBarGetDto[], FilterRequestDto>({
            query: (filter) => ({
                url: 'FreeBarber/filtered',
                method: 'POST',
                body: filter,
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

        sendPhoneChangeOtp: builder.mutation<{ success: boolean; message: string }, { newPhone: string }>({
            query: (body) => ({ url: 'User/send-phone-change-otp', method: 'POST', body }),
        }),
        updatePhone: builder.mutation<ApiResponse<AccessTokenDto>, { newPhone: string; otpCode: string }>({
            query: (body) => ({ url: 'User/update-phone', method: 'PUT', body }),
            invalidatesTags: ['UserProfile'],
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
            invalidatesTags: ['Setting'],
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
        getBadgeCounts: builder.query<ApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; threadUnreadCounts: Record<string, number> }>, void>({
            query: () => 'Badge',
            providesTags: [
                { type: 'Notification' as const, id: 'LIST' },
                { type: 'Chat' as const, id: 'LIST' },
            ],
            keepUnusedDataFor: CACHE_DURATIONS.REAL_TIME,
            transformResponse: (response: unknown): ApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; threadUnreadCounts: Record<string, number> }> => {
                const transformed = transformApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; threadUnreadCounts: Record<string, number> }>(response);
                if (transformed) {
                    return {
                        success: transformed.success,
                        message: transformed.message,
                        data: transformed.data,
                    };
                }
                return response as ApiResponse<{ notificationUnreadCount: number; chatUnreadCount: number; threadUnreadCounts: Record<string, number> }>;
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
                status: 'Trial' | 'Active' | 'Expired' | 'Banned';
                trialEndDate: string;
                subscriptionEndDate: string | null;
                isBanned: boolean;
                banReason: string | null;
                autoRenew: boolean;
                cancelAtPeriodEnd: boolean;
                trialDaysLeft: number;
                subscriptionDaysLeft: number;
            };
        }, void>({
            query: () => 'Subscription/status',
            providesTags: ['Subscription'],
            keepUnusedDataFor: CACHE_DURATIONS.USER_DATA,
        }),

        createPaytrToken: builder.mutation<ApiResponse<{ token: string; merchantOid: string; paymentAmount: number }>, { plan: 'FreeBarber' | 'BarberStore'; months?: number }>({
            query: (body) => ({
                url: 'Subscription/paytr/token',
                method: 'POST',
                body,
            }),
        }),
        cancelSubscription: builder.mutation<ApiResponse<boolean>, void>({
            query: () => ({
                url: 'Subscription/cancel',
                method: 'POST',
            }),
            invalidatesTags: ['Subscription'],
        }),
        reactivateSubscription: builder.mutation<ApiResponse<boolean>, void>({
            query: () => ({
                url: 'Subscription/reactivate',
                method: 'POST',
            }),
            invalidatesTags: ['Subscription'],
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
    useGetAllAppointmentByFilterQuery,
    useGetStoreForUsersQuery,
    useGetWorkingHoursByTargetQuery,
    useGetFreeBarberForUsersQuery,
    useUpdateFreeBarberLocationMutation,
    useUpdateFreeBarberAvailabilityMutation,
    useGetAllNotificationsQuery,
    useMarkNotificationReadMutation,
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
    useGetChatMessagesQuery,
    useGetChatMessagesByThreadQuery,
    useSendChatMessageMutation,
    useSendChatMessageByThreadMutation,
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
    useCreatePaytrTokenMutation,
    useCancelSubscriptionMutation,
    useReactivateSubscriptionMutation,
    useGetAllCategoriesQuery,
    useGetParentCategoriesQuery,
    useLazyGetChildCategoriesQuery,
    useGetCategoryHierarchyQuery,
    useGetFilteredStoresMutation,
    useGetFilteredFreeBarbersMutation,
    useLazyGetFilteredStoresQueryQuery,
    useLazyGetFilteredFreeBarbersQueryQuery,
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
    useGetSubscriptionStatusQuery,
    useSendPhoneChangeOtpMutation,
    useUpdatePhoneMutation,
    // SavedFilter
    useGetSavedFiltersQuery,
    useCreateSavedFilterMutation,
    useUpdateSavedFilterMutation,
    useDeleteSavedFilterMutation,
} = api;
