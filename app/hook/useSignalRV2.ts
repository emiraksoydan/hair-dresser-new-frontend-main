import "react-native-url-polyfill/auto";
import { useEffect, useRef, useCallback } from "react";
import { unstable_batchedUpdates, AppState } from "react-native";
import * as Notifications from "expo-notifications";
import * as SignalR from "@microsoft/signalr";
import { useAppDispatch, useAppSelector } from "../store/hook";
import { useStore } from "react-redux";
import { api } from "../store/api";
import type { RootState, AppDispatch } from "../store/redux-store";
import { tokenStore } from "../lib/tokenStore";
import { getActiveThreadId } from "../lib/activeChatThread";
import {
  setConnected,
  setGlobalConnection,
  getGlobalConnection,
  getConnectionUserId,
} from "../store/signalrSlice";
import type {
  NotificationDto,
  ChatThreadListItemDto,
  ChatMessageDto,
  ChatMessageItemDto,
  AppointmentGetDto,
  ChatMessagesReadEvent,
} from "../types";
import { lastMessagePreviewFromChatMessage, plainMessageSnapshot } from "../utils/chat/lastMessagePreview";
import { AppointmentStatus, AppointmentFilter } from "../types/appointment";
import { API_CONFIG } from "../constants/api";
import { useAuth } from "./useAuth";
const HUB_URL = API_CONFIG.SIGNALR_HUB_URL;

/**
 * SignalR kaçıran veya OS arka planda socket’i donduran senaryolarda REST ile hizala.
 * `onreconnected` / ilk `start` / ön plana dönüş — aynı tag seti.
 */
const FALLBACK_RESYNC_TAGS = [
  { type: "Notification" as const, id: "LIST" },
  { type: "Chat" as const, id: "LIST" },
  { type: "Appointment" as const, id: "LIST" },
];

const APPOINTMENT_SIGNALR_PAGE = 30;

function normAppointmentId(id: string | null | undefined) {
  return String(id ?? "").replace(/-/g, "").toLowerCase();
}

function resolveQueryArgsFromCacheEntry(queryState: {
  originalArgs?: unknown;
  queryCacheKey?: string;
}): unknown {
  let queryArgs: unknown = queryState.originalArgs;
  if (queryArgs === undefined && queryState.queryCacheKey) {
    const match = queryState.queryCacheKey.match(/\((.+)\)$/);
    if (match) {
      try {
        queryArgs = JSON.parse(match[1]);
      } catch {
        /* ignore */
      }
    }
  }
  return queryArgs;
}

function shouldAppointmentAppearInFilter(filter: AppointmentFilter, status: AppointmentStatus): boolean {
  return (
    (filter === AppointmentFilter.Active && status === AppointmentStatus.Approved) ||
    (filter === AppointmentFilter.Pending && status === AppointmentStatus.Pending) ||
    (filter === AppointmentFilter.Completed && status === AppointmentStatus.Completed) ||
    (filter === AppointmentFilter.Cancelled &&
      (status === AppointmentStatus.Cancelled ||
        status === AppointmentStatus.Rejected ||
        status === AppointmentStatus.Unanswered))
  );
}

/** Bildirim payload'ında buton / durum bandı için ortak kullanılan randevu alanları. */
type NotificationAppointmentSyncFields = {
  status?: AppointmentStatus;
  storeDecision?: number | null;
  freeBarberDecision?: number | null;
  customerDecision?: number | null;
  pendingExpiresAt?: string | null;
  cancellationReason?: string | null;
};

/**
 * Aynı appointmentId'ye sahip tüm bildirim satırlarının payload'ına randevu alanlarını yazar.
 * Sayfalı `getAllNotifications` cache anahtarlarının tamamını dolaşır (yalnızca `limit: 30` değil).
 */
function patchNotificationCachesByAppointmentId(
  getState: () => RootState,
  dispatch: AppDispatch,
  appointmentId: string | null | undefined,
  fields: NotificationAppointmentSyncFields,
) {
  const idN = normAppointmentId(appointmentId);
  if (!idN) return;
  const fieldKeys = Object.keys(fields) as (keyof NotificationAppointmentSyncFields)[];
  if (!fieldKeys.some((k) => fields[k] !== undefined)) return;

  const apiState = (getState() as RootState).api as {
    queries?: Record<
      string,
      {
        endpointName?: string;
        status?: string;
        data?: unknown;
        originalArgs?: unknown;
        queryCacheKey?: string;
      }
    >;
  };
  const queries = apiState?.queries;
  if (!queries) return;

  for (const key of Object.keys(queries)) {
    const qs = queries[key];
    if (qs?.endpointName !== "getAllNotifications" || qs.status !== "fulfilled" || !Array.isArray(qs.data)) {
      continue;
    }
    const originalArgs = resolveQueryArgsFromCacheEntry(qs);
    dispatch(
      api.util.updateQueryData("getAllNotifications" as any, originalArgs as any, (draft: any) => {
        if (!Array.isArray(draft)) return;
        for (let i = 0; i < draft.length; i++) {
          const n = draft[i] as NotificationDto;
          if (normAppointmentId(n.appointmentId) !== idN) continue;
          try {
            let payload: Record<string, unknown> = {};
            if (n.payloadJson && n.payloadJson.trim() !== "" && n.payloadJson !== "{}") {
              payload = JSON.parse(n.payloadJson) as Record<string, unknown>;
            }
            let touched = false;
            for (const fkey of fieldKeys) {
              const v = fields[fkey];
              if (v === undefined) continue;
              if (payload[fkey as string] !== v) {
                payload[fkey as string] = v;
                touched = true;
              }
            }
            if (!touched) continue;
            draft[i] = { ...n, payloadJson: JSON.stringify(payload), _updatedAt: Date.now() };
          } catch {
            /* ignore */
          }
        }
      }),
    );
  }
}

function fieldsFromAppointmentGetDto(appt: AppointmentGetDto): NotificationAppointmentSyncFields {
  const o: NotificationAppointmentSyncFields = { status: appt.status };
  if (appt.storeDecision !== undefined) o.storeDecision = appt.storeDecision as number;
  if (appt.freeBarberDecision !== undefined) o.freeBarberDecision = appt.freeBarberDecision as number;
  if (appt.customerDecision !== undefined) o.customerDecision = appt.customerDecision as number;
  if (appt.cancellationReason !== undefined) o.cancellationReason = appt.cancellationReason;
  return o;
}

/** SignalR bildirim payload'ından yalnızca randevu senkron alanlarını çıkarır (aynı randevunun diğer satırlarına yaymak için). */
function extractNotificationAppointmentSyncFields(
  payloadJson: string | null | undefined,
): NotificationAppointmentSyncFields | null {
  if (!payloadJson || payloadJson.trim() === "" || payloadJson === "{}") return null;
  try {
    const p = JSON.parse(payloadJson) as Record<string, unknown>;
    const o: NotificationAppointmentSyncFields = {};
    if (p.status !== undefined && p.status !== null) o.status = p.status as AppointmentStatus;
    if ("storeDecision" in p) o.storeDecision = p.storeDecision as number | null;
    if ("freeBarberDecision" in p) o.freeBarberDecision = p.freeBarberDecision as number | null;
    if ("customerDecision" in p) o.customerDecision = p.customerDecision as number | null;
    if ("pendingExpiresAt" in p) o.pendingExpiresAt = (p.pendingExpiresAt as string | null | undefined) ?? null;
    if ("cancellationReason" in p) o.cancellationReason = (p.cancellationReason as string | null | undefined) ?? null;
    return Object.keys(o).length ? o : null;
  } catch {
    return null;
  }
}

function spreadPayloadToAppointmentNotificationSiblings(
  getState: () => RootState,
  dispatch: AppDispatch,
  dto: NotificationDto,
) {
  if (!dto.appointmentId) return;
  const fields = extractNotificationAppointmentSyncFields(dto.payloadJson);
  if (!fields) return;
  patchNotificationCachesByAppointmentId(getState, dispatch, dto.appointmentId, fields);
}

/** `notification.updated` — bildirim id'si tüm sayfalı cache slotlarında aranır (yalnızca ilk sayfa değil). */
function replaceNotificationByIdInAllCaches(getState: () => RootState, dispatch: AppDispatch, dto: NotificationDto) {
  const norm = (s: string) => s.replace(/-/g, "").toLowerCase();
  const idN = norm(dto.id);

  const apiState = (getState() as RootState).api as {
    queries?: Record<
      string,
      {
        endpointName?: string;
        status?: string;
        data?: unknown;
        originalArgs?: unknown;
        queryCacheKey?: string;
      }
    >;
  };
  const queries = apiState?.queries;
  if (!queries) return;

  for (const key of Object.keys(queries)) {
    const qs = queries[key];
    if (qs?.endpointName !== "getAllNotifications" || qs.status !== "fulfilled" || !Array.isArray(qs.data)) {
      continue;
    }
    const originalArgs = resolveQueryArgsFromCacheEntry(qs);
    dispatch(
      api.util.updateQueryData("getAllNotifications" as any, originalArgs as any, (draft: any) => {
        if (!Array.isArray(draft)) return;
        const index = draft.findIndex((n: NotificationDto) => norm(n.id) === idN);
        if (index >= 0) {
          // Karar alanlarını koru: optimistic patch Approved/Rejected set ettiyse
          // ve SignalR dto'su henüz Pending/null getiriyorsa (race condition),
          // mevcut kararı koru — karar geri alınamaz.
          let mergedPayloadJson = dto.payloadJson;
          const existing = draft[index] as NotificationDto;
          if (existing.payloadJson && dto.payloadJson) {
            try {
              const existingP = JSON.parse(existing.payloadJson) as Record<string, unknown>;
              const dtoP = JSON.parse(dto.payloadJson) as Record<string, unknown>;
              const decisionFields = ['storeDecision', 'freeBarberDecision', 'customerDecision'] as const;
              let merged = false;
              for (const field of decisionFields) {
                const ev = existingP[field] as number | null | undefined;
                const dv = dtoP[field] as number | null | undefined;
                // Mevcut cache'de Approved(1) veya Rejected(2) varsa koru
                if ((ev === 1 || ev === 2) && (dv === 0 || dv === null || dv === undefined)) {
                  dtoP[field] = ev;
                  merged = true;
                }
              }
              if (merged) mergedPayloadJson = JSON.stringify(dtoP);
            } catch { /* parse hatası — dto olduğu gibi kullan */ }
          }
          // FLICKER FIX: `_updatedAt` sadece görünür alanlar değiştiyse güncellenir.
          // Aksi halde NotificationItemOptimized `areEqual` her event'te false dönüyor
          // ve gereksiz re-render olarak status banner/buton anlık titremesi yaratıyordu.
          const existed = draft[index] as NotificationDto;
          const visiblyChanged =
            existed.payloadJson !== mergedPayloadJson ||
            existed.isRead !== dto.isRead ||
            existed.appointmentId !== dto.appointmentId ||
            existed.type !== dto.type;
          draft[index] = {
            ...dto,
            payloadJson: mergedPayloadJson,
            _updatedAt: visiblyChanged ? Date.now() : (existed._updatedAt ?? Date.now()),
          };
        }
      }),
    );
  }
}

/**
 * useSignalRV2 - SignalR hook with backend-authoritative state updates
 */
export const useSignalRV2 = () => {
  const dispatch = useAppDispatch();
  const reduxStore = useStore<RootState>();
  const getState = useCallback(() => reduxStore.getState(), [reduxStore]);
  const { token, userId } = useAuth();
  const isConnected = useAppSelector((state) => state.signalr.isConnected);

  const connectionRef = useRef<SignalR.HubConnection | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);
  const maxReconnectAttempts = 10;
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollingRetryCountRef = useRef(0);
  const maxPollingRetries = 5; // Polling fallback'te max 5 kez dene, sonra dur
  const isTokenRefreshingRef = useRef(false); // Token refresh sırasında reconnect'i engelle
  const appStateRef = useRef(AppState.currentState);
  const foregroundResyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep userId in ref for event handlers
  const userIdRef = useRef<string | null>(userId);
  userIdRef.current = userId;

  // Setup event handlers
  const setupEventHandlers = useCallback((conn: SignalR.HubConnection) => {
    conn.on("notification.received", (dto: NotificationDto) => {
      unstable_batchedUpdates(() => {
        const patchReceived = (args: any) => dispatch(
          api.util.updateQueryData("getAllNotifications", args, (draft) => {
            if (!draft) return;
            const norm = (s: string) => s.replace(/-/g, "").toLowerCase();
            const idN = norm(dto.id);
            if (!draft.some((n) => norm(n.id) === idN)) {
              draft.unshift({ ...dto, _updatedAt: Date.now() });
            }
          }),
        );
        patchReceived(undefined);
        patchReceived({ limit: 30 });
        // Aynı randevunun eski satırları (ör. AppointmentCreated) yeni olayın payload'ı ile hizalansın.
        spreadPayloadToAppointmentNotificationSiblings(getState, dispatch, dto);
      });
    });

    conn.on("notification.updated", (dto: NotificationDto) => {
      unstable_batchedUpdates(() => {
        replaceNotificationByIdInAllCaches(getState, dispatch, dto);
        // Güncellenen satırdaki status/karar alanlarını aynı appointmentId'li diğer satırlara yay (eski AppointmentCreated vb.).
        spreadPayloadToAppointmentNotificationSiblings(getState, dispatch, dto);
      });
    });

    conn.on("chat.message", (dto: ChatMessageDto) => {
      const isOwnMessage = dto.senderUserId === userIdRef.current;

      let suppressIncomingForRestrictedFavorite = false;

      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const thread = draft.find((t) => t.threadId === dto.threadId);
          if (thread) {
            suppressIncomingForRestrictedFavorite =
              !!thread.isFavoriteThread &&
              !!thread.isRestrictedForCurrentUser &&
              !isOwnMessage;
            if (suppressIncomingForRestrictedFavorite) {
              thread.lastMessageAt = dto.createdAt;
            } else {
              const raw = dto.text ?? "";
              thread.lastMessagePreview = raw.length > 60 ? raw.substring(0, 60) : raw;
              thread.lastMessageAt = dto.createdAt;
            }
            // NOT: Thread'un unreadCount'unu optimistic update yapmıyoruz
            // Backend'den chat.threadUpdated event'i ile authoritative unreadCount gelecek
            // Bu sayede çakışma (race condition) sorunu önlenir
            // Eğer chat.threadUpdated event'i gecikirse, kullanıcı kısa bir süre yanlış count görebilir
            // ama bu, çift artırma veya yanlış count gösterme sorunundan daha iyidir
          }
        }),
      );

      // NOT: Ana mesaj ikonundaki badge count'u optimistic update yapmıyoruz
      // Backend'den badge.updated event'i ile authoritative count gelecek
      // Bu sayede çift artırma (double increment) sorunu önlenir

      // Kendi mesajlarını SignalR üzerinden cache'e EKLEMİYORUZ.
      // Çünkü api.tsx'deki onQueryStarted, HTTP yanıtından sonra cache'e ekliyor.
      // SignalR ile de eklenirse: optimistic(tempId) + real(uuid) aynı anda görünür → çift balon sorunu.
      // Favori thread'de karşıyı favorilememiş kullanıcı: mesaj içeriği gösterilmez (bildirim/thread güncellemesi yeterli).
      if (!isOwnMessage && !suppressIncomingForRestrictedFavorite) {
        dispatch(
          api.util.updateQueryData("getChatMessagesByThread", { threadId: dto.threadId }, (draft) => {
            if (!draft) return;
            if (!draft.find((m) => m.messageId === dto.messageId)) {
              draft.push({
                messageId: dto.messageId,
                senderUserId: dto.senderUserId,
                text: dto.text,
                createdAt: dto.createdAt,
                messageType: dto.messageType,
                mediaUrl: dto.mediaUrl,
                replyToMessageId: dto.replyToMessageId,
                replyToTextPreview: dto.replyToTextPreview,
              });
              draft.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
            }
          }),
        );
      }
    });

    conn.on("chat.messageRemoved", (data: { threadId: string; messageId: string }) => {
      let lastRemaining: ChatMessageItemDto | undefined;
      dispatch(
        api.util.updateQueryData("getChatMessagesByThread", { threadId: data.threadId }, (draft) => {
          if (!draft) return;
          const idx = draft.findIndex((m) => m.messageId === data.messageId);
          if (idx !== -1) draft.splice(idx, 1);
          lastRemaining = draft.length ? plainMessageSnapshot(draft[draft.length - 1]) : undefined;
        }),
      );
      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const thread = draft.find((t) => t.threadId === data.threadId);
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
    });

    conn.on("chat.messageEdited", (data: { threadId: string; messageId: string; newText: string }) => {
      let previewMsg: ChatMessageItemDto | undefined;
      dispatch(
        api.util.updateQueryData("getChatMessagesByThread", { threadId: data.threadId }, (draft) => {
          if (!draft) return;
          const msg = draft.find((m) => m.messageId === data.messageId);
          if (msg) {
            msg.text = data.newText;
            msg.isEdited = true;
          }
          const last = draft.length ? draft[draft.length - 1] : undefined;
          if (last?.messageId === data.messageId) {
            previewMsg = plainMessageSnapshot(last);
          }
        }),
      );
      if (previewMsg) {
        dispatch(
          api.util.updateQueryData("getChatThreads", undefined, (draft) => {
            if (!draft) return;
            const thread = draft.find((t) => t.threadId === data.threadId);
            if (!thread) return;
            thread.lastMessagePreview = lastMessagePreviewFromChatMessage(previewMsg);
          }),
        );
      }
    });

    conn.on("chat.threadCreated", (dto: ChatThreadListItemDto) => {
      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          if (!draft.find((t) => t.threadId === dto.threadId)) {
            draft.unshift(dto);
          }
        }),
      );
    });

    conn.on("chat.threadUpdated", (dto: ChatThreadListItemDto) => {
      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const index = draft.findIndex((t) => t.threadId === dto.threadId);
          const shouldBeVisible = dto.isFavoriteThread || dto.status === AppointmentStatus.Pending || dto.status === AppointmentStatus.Approved;

          if (shouldBeVisible) {
            if (index >= 0) draft[index] = dto;
            else draft.unshift(dto);
          } else if (index >= 0) {
            draft.splice(index, 1);
          }
        }),
      );
    });

    conn.on("chat.threadRemoved", (threadId: string | null | undefined) => {
      if (!threadId) return;
      dispatch(
        api.util.updateQueryData("getChatThreads", undefined, (draft) => {
          if (!draft) return;
          const index = draft.findIndex((t) => t.threadId === threadId);
          if (index >= 0) draft.splice(index, 1);
        }),
      );
    });

    conn.on("chat.messagesRead", (data: ChatMessagesReadEvent) => {
      const messageIdSet = new Set(data.messageIds);
      dispatch(
        api.util.updateQueryData("getChatMessagesByThread", { threadId: data.threadId }, (draft) => {
          if (!draft || !Array.isArray(draft)) return;
          draft.forEach((msg) => {
            if (messageIdSet.has(msg.messageId)) {
              msg.isFullyRead = true;
            }
          });
        }),
      );
    });

    conn.on("store.availability.changed", (payload: { storeId?: string; date?: string }) => {
      if (!payload?.storeId || !payload?.date) return;
      dispatch(
        api.util.invalidateTags([
          { type: "Appointment", id: `availability-${payload.storeId}-${payload.date}` },
          { type: "Appointment", id: "availability" },
        ]),
      );
    });

    // Free barber müsaitlik durumu (Müsait ↔ Meşgul) değiştiğinde anlık yayın.
    // Server: SetFreeBarberAvailabilityAsync / FreeBarberManager.UpdateAvailabilityAsync.
    // Açık olan customer/barbershop detay sayfaları + nearby/filtered listeler tazelenir,
    // müsaite döner dönmez "İsteğime Göre" / "Dükkan Ekle" / "Randevu Al" butonları aktife geçer.
    conn.on("freebarber.availability.changed", (payload: { freeBarberId?: string; freeBarberUserId?: string; isAvailable?: boolean }) => {
      if (!payload?.freeBarberId) return;
      const freeBarberId = payload.freeBarberId;
      const isAvailable = !!payload.isAvailable;

      // 1) Açık detay query'sini direkt patchle (flicker yok, anlık değişim)
      dispatch(
        api.util.updateQueryData("getFreeBarberForUsers", freeBarberId, (draft: any) => {
          if (draft) {
            draft.isAvailable = isAvailable;
          }
        }),
      );

      // 2) Kart listesi cache'lerinde de aynı id'ye sahip kayıtları patchle
      const listEndpoints = ["getNearbyFreeBarber", "getFilteredFreeBarbersQuery"] as const;
      const queries = api.util.selectInvalidatedBy(getState(), [
        { type: "MineFreeBarberPanel", id: "LIST" },
        { type: "MineFreeBarberPanel", id: "NEARBY" },
        { type: "FreeBarberForUsers", id: "LIST" },
      ]);
      for (const q of queries ?? []) {
        if (!listEndpoints.includes(q.endpointName as any)) continue;
        dispatch(
          api.util.updateQueryData(q.endpointName as any, q.originalArgs as any, (draft: any) => {
            if (!Array.isArray(draft)) return;
            for (const item of draft) {
              if (item && item.id === freeBarberId) {
                item.isAvailable = isAvailable;
              }
            }
          }),
        );
      }
    });

    conn.on("appointment.updated", (appointment: AppointmentGetDto) => {
      const st = appointment.status as AppointmentStatus;

      // Tüm randevu listesi RTK slot'larını tara (sayfalı cache'ler dahil); sadece { filter }
      // ile patchlemek yarım kalıyordu. İlk sayfada yeni satır = unshift (createdAt DESC).
      // Sekme değiştirme yok — kullanıcı hangi filtredeyse orada kalır; cache arka planda güncellenir.
      unstable_batchedUpdates(() => {
        const apiState = (getState() as RootState).api as any;
        const seenFilterValues = new Set<number>();

        if (apiState?.queries) {
          for (const key of Object.keys(apiState.queries)) {
            const qs = apiState.queries[key];
            if (qs?.endpointName !== "getAllAppointmentByFilter" || qs.status !== "fulfilled" || !Array.isArray(qs.data)) {
              continue;
            }
            const args = resolveQueryArgsFromCacheEntry(qs) as {
              filter?: AppointmentFilter;
              before?: string;
              beforeId?: string;
            } | null;
            const filter = args?.filter;
            if (filter === undefined || filter === AppointmentFilter.All) continue;

            seenFilterValues.add(filter);
            const should = shouldAppointmentAppearInFilter(filter, st);
            const originalArgs = resolveQueryArgsFromCacheEntry(qs);

            dispatch(
              api.util.updateQueryData("getAllAppointmentByFilter" as any, originalArgs as any, (draft: any) => {
                if (!Array.isArray(draft)) return;
                const idx = draft.findIndex((a: AppointmentGetDto) => normAppointmentId(a.id) === normAppointmentId(appointment.id));
                if (idx >= 0) {
                  if (should) draft[idx] = { ...appointment, _updatedAt: Date.now() };
                  else draft.splice(idx, 1);
                } else if (should) {
                  // `serializeQueryArgs` yalnızca `filter` kullandığı için cache tek dizi; `before` dolu olsa da yeni randevu üste eklenmeli.
                  draft.unshift({ ...appointment, _updatedAt: Date.now() });
                }
              }),
            );
          }
        }

        const filtersToSeed = [
          AppointmentFilter.Active,
          AppointmentFilter.Pending,
          AppointmentFilter.Completed,
          AppointmentFilter.Cancelled,
        ].filter((f) => shouldAppointmentAppearInFilter(f, st));

        for (const f of filtersToSeed) {
          if (!seenFilterValues.has(f)) {
            void dispatch(
              api.endpoints.getAllAppointmentByFilter.initiate(
                { filter: f, limit: APPOINTMENT_SIGNALR_PAGE },
                { subscribe: false, forceRefetch: true },
              ),
            );
          }
        }

        // Tüm durum değişimlerinde: aynı randevuya ait bildirim satırlarının payload'ı tek tip olsun (buton bayatlığı).
        patchNotificationCachesByAppointmentId(
          getState,
          dispatch,
          appointment.id,
          fieldsFromAppointmentGetDto(appointment),
        );

        dispatch(
          api.util.updateQueryData("getChatThreads", undefined, (draft) => {
            if (!draft) return;
            const threadIndex = draft.findIndex(
              (t) => normAppointmentId(t.appointmentId) === normAppointmentId(appointment.id),
            );
            const shouldBeVisible = st === AppointmentStatus.Pending || st === AppointmentStatus.Approved;

            if (threadIndex >= 0) {
              if (shouldBeVisible) draft[threadIndex].status = st;
              else draft.splice(threadIndex, 1);
            }
          }),
        );

        if (appointment.barberStoreId && appointment.appointmentDate) {
          dispatch(api.util.invalidateTags([
            { type: "Appointment", id: `availability-${appointment.barberStoreId}-${appointment.appointmentDate}` },
            { type: "Appointment", id: "availability" },
          ]));
        }
      });
    });

    conn.on("badge.updated", (counts?: { notificationUnreadCount?: number; chatUnreadCount?: number; threadUnreadCounts?: Record<string, number> }) => {
      if (counts && (counts.notificationUnreadCount !== undefined || counts.chatUnreadCount !== undefined || counts.threadUnreadCounts !== undefined)) {
        let osBadgeTotal: number | null = null;
        const badgePatch = dispatch(
          api.util.updateQueryData("getBadgeCounts", undefined, (draft) => {
            if (!draft?.data) return;
            if (counts.notificationUnreadCount !== undefined) draft.data.notificationUnreadCount = counts.notificationUnreadCount;
            if (counts.chatUnreadCount !== undefined) draft.data.chatUnreadCount = counts.chatUnreadCount;
            if (counts.threadUnreadCounts !== undefined) {
              // Thread unread counts'u merge et (yeni değerlerle güncelle)
              draft.data.threadUnreadCounts = {
                ...draft.data.threadUnreadCounts,
                ...counts.threadUnreadCounts,
              };
            }
            // OS launcher badge için: cache'in BİRLEŞİK son hâlinden hesapla.
            // Event sadece notif veya sadece chat gönderiyor olabilir — diğerini
            // mutasyon sonrası draft'tan al ki "yarım resim" badge'i bozmasın.
            osBadgeTotal = Math.max(
              0,
              (draft.data.notificationUnreadCount ?? 0) + (draft.data.chatUnreadCount ?? 0),
            );
          }),
        );

        // Cache patch'i tamamlandıktan sonra OS rozetini senkronize et.
        if (osBadgeTotal !== null) {
          Notifications.setBadgeCountAsync(osBadgeTotal).catch(() => { /* ignore */ });
        } else if (!badgePatch.patches || badgePatch.patches.length === 0) {
          dispatch(
            api.endpoints.getBadgeCounts.initiate(undefined, {
              subscribe: false,
              forceRefetch: true,
            }),
          );
        }
      } else {
        dispatch(api.util.invalidateTags([...FALLBACK_RESYNC_TAGS]));
      }
    });

    conn.on("image.updated", () => {
      dispatch(api.util.invalidateTags(["UserProfile", "Chat", "Notification", { type: "StoreForUsers", id: "LIST" }, { type: "FreeBarberForUsers", id: "LIST" }, "MineStores", "MineFreeBarberPanel"]));
    });

    conn.on("image.removed", () => {
      dispatch(api.util.invalidateTags(["UserProfile", "Chat", "Notification", { type: "StoreForUsers", id: "LIST" }, { type: "FreeBarberForUsers", id: "LIST" }, "MineStores", "MineFreeBarberPanel"]));
    });

    conn.on("group.joined", (data: { userId?: string; success: boolean; error?: string }) => {
    });
  }, [dispatch, getState]);

  // Create connection
  const createConnection = useCallback(async (currentUserId: string) => {
    if (isConnectingRef.current) {
      return;
    }

    const currentToken = tokenStore.access;
    if (!currentToken) {
      return;
    }

    isConnectingRef.current = true;

    try {
      const connection = new SignalR.HubConnectionBuilder()
        .withUrl(HUB_URL, {
          transport: SignalR.HttpTransportType.WebSockets,
          skipNegotiation: true,
          accessTokenFactory: () => tokenStore.access || "",
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(SignalR.LogLevel.None)
        .build();

      setupEventHandlers(connection);

      connection.onclose(() => {
        dispatch(setConnected({ connected: false }));
        // Ağ kopukken invalidateTags çağırmıyoruz — HTTP isteği başarısız olur ve error state'e girer
        // Optimistic updates badge'i senkron tutar; reconnect sonrası invalidateTags zaten çalışır
        if (userIdRef.current === currentUserId && tokenStore.access) {
          attemptReconnect(currentUserId);
        }
      });

      connection.onreconnecting(() => {
        dispatch(setConnected({ connected: false }));
        // Reconnecting sırasında invalidate etme - performans için
        // Sadece reconnected veya close durumlarında invalidate et
      });

      connection.onreconnected(async () => {
        reconnectAttemptsRef.current = 0;
        pollingRetryCountRef.current = 0; // Reconnect başarılı - polling counter'ı sıfırla

        // Polling interval'ı temizle
        if (pollingIntervalRef.current) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        dispatch(setConnected({ connected: true, userId: currentUserId }));
        try {
          await connection.invoke("JoinUserGroup");
        } catch (e) {
          // Silent fail
        }
        // Notification + Chat + Appointment — offline'da kaçırılan event'leri senkronize et
        dispatch(api.util.invalidateTags([...FALLBACK_RESYNC_TAGS]));
        // F10: Kullanıcı aktif bir thread ekranındaysa, o thread'in mesaj cache'ini
        // de invalidate et. Aksi halde offline'da kaçırılan `chat.message` event'leri
        // sadece thread listesinden görülür, açık ekrandaki mesajlar eksik kalır.
        // `getActiveThreadId` global state'ten ekranın mount'ta yazdığı thread'i okur.
        const activeThreadId = getActiveThreadId();
        if (activeThreadId) {
          // Tag id api.tsx'deki provider ile birebir eşleşmeli: `MESSAGES_THREAD_{id}`.
          dispatch(
            api.util.invalidateTags([{ type: "Chat", id: `MESSAGES_THREAD_${activeThreadId}` }]),
          );
          // RTK Query endpoint cache'i ayrıca refetch — tag tetiklenmese de güvence.
          dispatch(
            api.endpoints.getChatMessagesByThread.initiate(
              { threadId: activeThreadId },
              { subscribe: false, forceRefetch: true },
            ),
          );
        }
      });

      await connection.start();

      connectionRef.current = connection;
      setGlobalConnection(connection, currentUserId);
      reconnectAttemptsRef.current = 0;
      pollingRetryCountRef.current = 0; // Bağlantı başarılı - polling retry count'u sıfırla

      // Polling interval'ı temizle (artık gerek yok)
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      dispatch(setConnected({ connected: true, userId: currentUserId }));


      // Join group
      try {
        await connection.invoke("JoinUserGroup");
      } catch (e) {
        // Silent fail
      }

      // Uygulama kapalıyken gelen event'leri senkronize et
      dispatch(api.util.invalidateTags([...FALLBACK_RESYNC_TAGS]));

    } catch (e) {
      dispatch(setConnected({ connected: false }));
      attemptReconnect(currentUserId);
    } finally {
      isConnectingRef.current = false;
    }
  }, [dispatch, setupEventHandlers]);

  // Reconnection logic
  const attemptReconnect = useCallback((expectedUserId: string) => {
    // F10: Dedupe — önceki bekleyen reconnect timer'ını iptal et. Birden fazla
    // event (`onclose`, `createConnection` catch, cascading) eş zamanlı
    // tetiklediğinde eskiden timer stack'lenip paralel connection deneniyordu;
    // bu da `isConnectingRef` flip-flopuna ve sunucuda duplicate group join'e
    // yol açabiliyordu. Tek aktif zamanlayıcı garanti.
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    // Token refresh sırasında reconnect yapma
    if (isTokenRefreshingRef.current) {
      reconnectTimeoutRef.current = setTimeout(() => {
        attemptReconnect(expectedUserId);
      }, 2000);
      return;
    }

    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {

      // Mevcut polling interval'ı temizle
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }

      // Max polling retry'a ulaştıysa sadece polling yap, reconnect deneme
      if (pollingRetryCountRef.current >= maxPollingRetries) {
        pollingIntervalRef.current = setInterval(() => {
          if (userIdRef.current === expectedUserId && tokenStore.access) {
            dispatch(api.util.invalidateTags([...FALLBACK_RESYNC_TAGS]));
          } else {
            if (pollingIntervalRef.current) {
              clearInterval(pollingIntervalRef.current);
              pollingIntervalRef.current = null;
            }
          }
        }, 120000); // 2 dakikada bir (daha az agresif)
        return;
      }

      // Polling fallback modunda: her 60 saniyede bir kez reconnect dene
      pollingRetryCountRef.current++;

      pollingIntervalRef.current = setInterval(() => {
        if (userIdRef.current === expectedUserId && tokenStore.access) {
          dispatch(api.util.invalidateTags([...FALLBACK_RESYNC_TAGS]));
        } else {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }
        }
      }, 60000);

      // 30 saniye sonra bir kez reconnect dene (polling interval'dan bağımsız)
      reconnectTimeoutRef.current = setTimeout(async () => {
        if (userIdRef.current === expectedUserId && tokenStore.access && !isTokenRefreshingRef.current) {
          reconnectAttemptsRef.current = 0;
          await createConnection(expectedUserId);
        }
      }, 30000);

      return;
    }

    if (userIdRef.current !== expectedUserId) {
      return;
    }

    reconnectAttemptsRef.current++;
    const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current - 1), 30000);


    reconnectTimeoutRef.current = setTimeout(async () => {
      if (!tokenStore.access || userIdRef.current !== expectedUserId) {
        reconnectAttemptsRef.current = 0;
        return;
      }
      // Token refresh kontrolü
      if (isTokenRefreshingRef.current) {
        attemptReconnect(expectedUserId);
        return;
      }
      await createConnection(expectedUserId);
    }, delay);
  }, [createConnection, dispatch]);

  /** Arka plandan dönüş: socket "Connected" kalsa bile OS event'leri düşürebilir; reconnect ile aynı REST senkronu. */
  const scheduleForegroundListResync = useCallback(() => {
    if (foregroundResyncTimeoutRef.current) {
      clearTimeout(foregroundResyncTimeoutRef.current);
      foregroundResyncTimeoutRef.current = null;
    }
    foregroundResyncTimeoutRef.current = setTimeout(() => {
      foregroundResyncTimeoutRef.current = null;
      if (!tokenStore.access || !userIdRef.current) return;
      dispatch(api.util.invalidateTags([...FALLBACK_RESYNC_TAGS]));
    }, 450);
  }, [dispatch]);

  // Stop connection
  const stopConnection = useCallback(async () => {

    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (foregroundResyncTimeoutRef.current) {
      clearTimeout(foregroundResyncTimeoutRef.current);
      foregroundResyncTimeoutRef.current = null;
    }

    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }

    isConnectingRef.current = false;

    const conn = connectionRef.current;
    if (conn) {
      try {
        // F10: Tüm registered event'leri kaldır — önceden `chat.messageRemoved`
        // ve `chat.messageEdited` listesi eksikti, bu da restart/reconnect sonrası
        // duplicate handler birikmesine ve aynı event'in iki kez işlenmesine
        // neden olabilirdi. Tam liste `setupEventHandlers`'daki `conn.on` çağrıları
        // ile birebir senkronize.
        conn.off("notification.received");
        conn.off("notification.updated");
        conn.off("chat.message");
        conn.off("chat.messageRemoved");
        conn.off("chat.messageEdited");
        conn.off("chat.threadCreated");
        conn.off("chat.threadUpdated");
        conn.off("chat.threadRemoved");
        conn.off("chat.messagesRead");
        conn.off("appointment.updated");
        conn.off("badge.updated");
        conn.off("image.updated");
        conn.off("image.removed");
        conn.off("group.joined");
        await conn.stop();
      } catch (e) {
        // Silent fail
      }
    }

    connectionRef.current = null;
    setGlobalConnection(null);
    reconnectAttemptsRef.current = 0;
    pollingRetryCountRef.current = 0; // Reset polling retry count
    dispatch(setConnected({ connected: false }));

  }, [dispatch]);

  // Token refresh durumunu dinle
  useEffect(() => {
    const unsubscribe = tokenStore.onRefreshStateChange((refreshing) => {
      isTokenRefreshingRef.current = refreshing;
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      const prev = appStateRef.current;
      appStateRef.current = next;
      if (next === "active" && (prev === "background" || prev === "inactive")) {
        scheduleForegroundListResync();
      }
    });
    return () => {
      sub.remove();
      if (foregroundResyncTimeoutRef.current) {
        clearTimeout(foregroundResyncTimeoutRef.current);
        foregroundResyncTimeoutRef.current = null;
      }
    };
  }, [scheduleForegroundListResync]);

  useEffect(() => {
    // No token or userId - stop connection
    if (!token || !userId) {
      stopConnection();
      return;
    }

    const globalConn = getGlobalConnection();
    const connectedUserId = getConnectionUserId();


    // Different user - stop old connection and create new
    if (globalConn && connectedUserId && connectedUserId !== userId) {
      const targetUserId = userId; // Capture current userId
      (async () => {
        await stopConnection();
        // Double check user hasn't changed during stop
        if (userIdRef.current === targetUserId && tokenStore.access) {
          await createConnection(targetUserId);
        }
      })();
      return;
    }

    // Same user with valid connection
    if (globalConn && connectedUserId === userId) {
      connectionRef.current = globalConn;
      if (globalConn.state === SignalR.HubConnectionState.Connected) {
        dispatch(setConnected({ connected: true, userId }));
        return;
      } else if (globalConn.state === SignalR.HubConnectionState.Disconnected) {
        stopConnection().then(() => createConnection(userId));
        return;
      }
      // Connecting or Reconnecting - wait
      return;
    }

    // No connection - create new
    if (!isConnectingRef.current) {
      createConnection(userId);
    }

  }, [token, userId, dispatch, createConnection, stopConnection]);

  return { isConnected, connectionRef };
};
