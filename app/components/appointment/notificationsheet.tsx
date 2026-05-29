import { Icon } from "react-native-paper";
import { PricingType } from "../../types/store";
import { useAuth } from "../../hook/useAuth";
import {
  useGetAllNotificationsQuery,
  useMarkNotificationReadMutation,
  useMarkAllNotificationsReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useStoreDecisionMutation,
  useFreeBarberDecisionMutation,
  useCustomerDecisionMutation,
  api,
  requestNotificationsFullCacheReplace,
} from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { requestAppointmentListTab } from "../../store/appointmentUiSlice";
import { useStore } from "react-redux";
import { useLanguage } from "../../hook/useLanguage";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AppointmentStatus,
  DecisionStatus,
  NotificationDto,
  NotificationType,
  StoreSelectionType,
  UserType,
} from "../../types";
import { AppointmentFilter } from "../../types/appointment";
import { TouchableOpacity, View, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../common/Text";

import { NotificationItemOptimized } from "./NotificationItemOptimized";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useAlert } from "../../hook/useAlert";
import { useActionGuard } from "../../hook/useActionGuard";
import { useTheme } from "../../hook/useTheme";
import { getErrorMessage } from "../../utils/errorHandler";

/** RN `onEndReached` ilk layout'ta yanlış tetiklenebilir — footer spinner flash'ını önler. */
const NOTIFICATIONS_END_REACHED_GRACE_MS = 450;

// ---------------------------------------------------------------------------
// 2. Ana NotificationsSheet Bileşeni
// ---------------------------------------------------------------------------
export function NotificationsSheet({
  onClose,
  onOpenAppointmentDecision,
  autoOpenFirstUnread = false,
  onDeleteSuccess,
  onDeleteInfo,
  onDeleteError,
}: {
  onClose?: () => void;
  onOpenAppointmentDecision?: (
    appointmentId: string,
    notificationId: string,
  ) => void;
  autoOpenFirstUnread?: boolean;
  onDeleteSuccess?: (message: string) => void;
  onDeleteInfo?: (message: string) => void;
  onDeleteError?: (message: string) => void;
}) {
  const router = useSafeNavigation();
  const guard = useActionGuard();
  const dispatch = useAppDispatch();
  const reduxStore = useStore();
  const insets = useSafeAreaInsets();
  const NOTIFICATIONS_PAGE_SIZE = 30;
  const { data, isFetching, isLoading, refetch } = useGetAllNotificationsQuery(
    { limit: NOTIFICATIONS_PAGE_SIZE },
    { refetchOnMountOrArgChange: 30 },
  );
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

  // NOT: Eski "her sheet open'da refetch" yaklaşımı kaldırıldı (kullanıcı isteği).
  // Bunun yerine RTK Query'nin doğal `refetchOnMountOrArgChange: 30` mekanizması kullanılıyor:
  // sheet açıldığında son fetch 30 saniyeden eski ise otomatik refetch — değilse cache hit.
  // SignalR `notification.updated` zaten realtime cache patch yapıyor; bu sadece reconnect/network
  // glitch sonrası belt-and-suspenders.

  // Infinite scroll state — aynı pattern ChatDetailScreen'de kullanıldı.
  // Liste DESC sıralı (en yeniden eskiye) → `onEndReached` aşağı scroll'da tetiklenir
  // ve en eski bildirimin createdAt'i cursor olarak server'a gönderilir.
  const [isLoadingOlder, setIsLoadingOlder] = React.useState(false);
  const isLoadingOlderRef = useRef(false);
  const hasMoreRef = useRef(true);
  const lastLoadedBeforeRef = useRef<string | null>(null);
  const suppressEndReachedUntilMsRef = useRef(0);
  const bumpEndReachedGrace = useCallback(() => {
    suppressEndReachedUntilMsRef.current = Date.now() + NOTIFICATIONS_END_REACHED_GRACE_MS;
  }, []);

  useEffect(() => {
    bumpEndReachedGrace();
  }, [bumpEndReachedGrace]);

  const resetNotificationsPagination = useCallback(() => {
    hasMoreRef.current = true;
    lastLoadedBeforeRef.current = null;
  }, []);

  const loadOlderNotifications = useCallback(async () => {
    if (Date.now() < suppressEndReachedUntilMsRef.current) return;
    if (isLoadingOlderRef.current) return;
    if (!hasMoreRef.current) return;
    if (!data || data.length === 0) return;
    const oldest = data[data.length - 1];
    if (!oldest?.createdAt) return;
    const beforeIso = oldest.createdAt;
    // Tie-breaker: aynı CreatedAt'a sahip 2+ bildirimde NotificationId ile sıkı sıralama.
    const beforeNotifId = oldest.id;
    const cursorKey = `${beforeIso}|${beforeNotifId ?? ""}`;
    if (lastLoadedBeforeRef.current === cursorKey) return;

    isLoadingOlderRef.current = true;
    lastLoadedBeforeRef.current = cursorKey;
    setIsLoadingOlder(true);
    try {
      const result = await dispatch(
        api.endpoints.getAllNotifications.initiate(
          { before: beforeIso, beforeId: beforeNotifId, limit: NOTIFICATIONS_PAGE_SIZE },
          { subscribe: false, forceRefetch: true },
        ),
      ).unwrap();
      const fetched = Array.isArray(result) ? result.length : 0;
      if (fetched < NOTIFICATIONS_PAGE_SIZE) {
        hasMoreRef.current = false;
      }
    } catch {
      lastLoadedBeforeRef.current = null;
    } finally {
      isLoadingOlderRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [data, dispatch]);
  const [markRead] = useMarkNotificationReadMutation();
  const [deleteNotification, { isLoading: isDeletingNotification }] =
    useDeleteNotificationMutation();
  const [deleteAllNotifications, { isLoading: isDeletingAllNotifications }] =
    useDeleteAllNotificationsMutation();
  const [markAllNotificationsRead, { isLoading: isMarkingAllNotificationsRead }] =
    useMarkAllNotificationsReadMutation();
  const [deletingNotificationId, setDeletingNotificationId] = React.useState<string | null>(null);
  const { userType } = useAuth();
  const { t } = useLanguage();
  const { isDark, colors } = useTheme();
  const { alert, alertError, confirm } = useAlert();
  const [storeDecision, { reset: resetStoreDecision }] = useStoreDecisionMutation();
  const [freeBarberDecision, { reset: resetFreeBarberDecision }] = useFreeBarberDecisionMutation();
  const [customerDecision, { reset: resetCustomerDecision }] = useCustomerDecisionMutation();

  // Double-tap prevention: Track which notifications are being processed
  const processingNotificationsRef = useRef<Set<string>>(new Set());
  /** Yalnızca bu bildirim satırında Onayla/Reddet loading — tüm liste değil. */
  const [decidingNotificationId, setDecidingNotificationId] = useState<string | null>(null);

  // Kullanıcı bu sheet hayatı boyunca karar verdiği appointmentId'leri tutar.
  // useRef yerine useState — concludedAppointmentIds useMemo'sunu yeniden tetiklemek için
  // re-render gerekiyor. 60s TTL ile temizlenir (outcome bildirimi gelmezse de zarar olmasın).
  // Bu shield, AppState `active` → refetch sonrası backend henüz güncel payload'ı yansıtmamış
  // olsa bile butonun tekrar görünmesini engeller → "Bekleme yok" hatası önlenir.
  const [decidedAppointmentIds, setDecidedAppointmentIds] = useState<Set<string>>(new Set());
  const decidedTtlTimersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const NOTIFICATION_ACTION_TIMEOUT_MS = 30_000;
  const runNotificationActionWithTimeout = useCallback(
    async <T,>(promise: Promise<T>, label: string): Promise<T> => {
      let timer: ReturnType<typeof setTimeout> | null = null;
      try {
        return await Promise.race([
          promise,
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () => reject(new Error(`${label}_TIMEOUT`)),
              NOTIFICATION_ACTION_TIMEOUT_MS,
            );
          }),
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    },
    [],
  );

  const addDecidedAppointmentId = useCallback((appointmentId: string) => {
    setDecidedAppointmentIds((prev) => {
      if (prev.has(appointmentId)) return prev;
      const next = new Set(prev);
      next.add(appointmentId);
      return next;
    });
    const existing = decidedTtlTimersRef.current.get(appointmentId);
    if (existing) clearTimeout(existing);
    const timer = setTimeout(() => {
      setDecidedAppointmentIds((prev) => {
        if (!prev.has(appointmentId)) return prev;
        const next = new Set(prev);
        next.delete(appointmentId);
        return next;
      });
      decidedTtlTimersRef.current.delete(appointmentId);
    }, 60_000);
    decidedTtlTimersRef.current.set(appointmentId, timer);
  }, []);

  useEffect(() => {
    const timers = decidedTtlTimersRef.current;
    return () => {
      timers.forEach((t) => clearTimeout(t));
      timers.clear();
    };
  }, []);




  // FreeBarber için "Dükkan Ekle" butonu handler
  const handleAddStore = useCallback(
    (appointmentId: string) => {
      if (onClose) {
        onClose();
      }

      setTimeout(() => {
        try {
          router.push({
            pathname: "/(freebarbertabs)/(panel)",
            params: {
              mode: "add-store",
              appointmentId: appointmentId,
            },
          });
        } catch (error) {
          alertError(t("common.error"), t("notification.redirectFailed"));
        }
      }, 300);
    },
    [router, onClose, alertError],
  );

  const handleMarkRead = useCallback(
    async (n: NotificationDto) => {
      // Double-tap prevention: Skip if already processing
      if (processingNotificationsRef.current.has(n.id) || n.isRead) {
        return;
      }

      // Mark as processing to prevent double-tap
      processingNotificationsRef.current.add(n.id);

      try {
        // Backend başarılı olunca LIST invalidate → liste + badge refetch.
        await markRead(n.id);
      } catch {
        // Hata: liste değişmez; SignalR sonradan senkronlayabilir.
      } finally {
        // Remove from processing set after a short delay to allow backend event to arrive
        setTimeout(() => {
          processingNotificationsRef.current.delete(n.id);
        }, 1000);
      }
    },
    [markRead],
  );

  // Stale state hatalarını tanıyıp alert göstermeden sessizce refresh yap.
  // Senaryo: Kullanıcı butona basar, ama arka planda SignalR/payload update gelmemiş.
  // Backend "Bekleme yok" / "Karar zaten verilmiş" döner. Bu durum kullanıcı için "hata" değil —
  // sadece UI'sı bayat. Alert göstermek yerine listeyi tazeliyoruz, butonlar kaybolur, durum bandı çıkar.
  const isStaleStateError = useCallback((errorMessage: string | undefined | null): boolean => {
    if (!errorMessage) return false;
    const msg = errorMessage.toLowerCase();
    return (
      msg.includes("bekleme yok") ||
      msg.includes("karar zaten verilmi") ||
      msg.includes("beklemede değil") ||
      msg.includes("beklemede degil") ||
      msg.includes("reddetme süresi doldu") ||
      msg.includes("reddetme suresi doldu") ||
      msg.includes("randevu süresi dolmuş") ||
      msg.includes("randevu suresi dolmus") ||
      msg.includes("appointmentnotpending") ||
      msg.includes("appointmentdecisionalready") ||
      msg.includes("appointmentexpired")
    );
  }, []);

  // --- Backend-Authoritative Decision Handler ---
  // UI + snackbar yalnızca API başarısı (ve ardından refetch / SignalR) sonrası güncellenir.
  const handleDecision = useCallback(
    (notification: NotificationDto, approve: boolean) => guard(async () => {
      if (!notification.appointmentId) return;
      if (
        processingNotificationsRef.current.has(notification.id) ||
        decidedAppointmentIds.has(notification.appointmentId)
      ) {
        return;
      }
      processingNotificationsRef.current.add(notification.id);
      setDecidingNotificationId(notification.id);
      const releaseProcessing = () => {
        processingNotificationsRef.current.delete(notification.id);
      };

      let parsedPayload: any = null;
      try {
        if (
          notification.payloadJson &&
          notification.payloadJson.trim() !== "" &&
          notification.payloadJson !== "{}"
        ) {
          parsedPayload = JSON.parse(notification.payloadJson);
        }
      } catch {
        parsedPayload = null;
      }

      const isStoreSelection =
        parsedPayload?.storeSelectionType === StoreSelectionType.StoreSelection;

      // FreeBarber rejection check after customer approval
      if (
        userType === UserType.FreeBarber &&
        isStoreSelection &&
        (parsedPayload?.customerDecision === DecisionStatus.Approved ||
          parsedPayload?.status === AppointmentStatus.Approved)
      ) {
        alert(
          t("notification.info"),
          t("notification.cannotRejectAfterCustomerApproval"),
        );
        releaseProcessing();
        return;
      }

      let result;

      const buildDecisionSnackMessage = () => {
        if (isStoreSelection && userType === UserType.BarberStore) {
          const title = approve ? t("notification.storeApprovalTitle") : t("notification.rejectionTitle");
          const msg = approve ? t("notification.storeApprovalSent") : t("notification.storeRejected");
          return `${title} — ${msg}`;
        }
        if (isStoreSelection && userType === UserType.Customer) {
          const title = approve ? t("notification.approvalTitle") : t("notification.rejectionTitle");
          const msg = approve ? t("notification.appointmentApproved") : t("notification.storeRejected");
          return `${title} — ${msg}`;
        }
        const title = approve ? t("notification.approvalTitle") : t("notification.rejectionTitle");
        const msg = approve ? t("notification.appointmentApproved") : t("notification.appointmentRejected");
        return `${title} — ${msg}`;
      };

      const refreshAfterDecision = () => {
        dispatch(
          api.util.invalidateTags([
            { type: "Notification", id: "LIST" },
            { type: "Appointment", id: "LIST" },
          ]),
        );
        void refetch();
      };

      const handleDecisionError = (errorObj: any): void => {
        const rawMsg = errorObj?.data?.message as string | undefined;
        if (isStaleStateError(rawMsg)) {
          if (notification.appointmentId) {
            addDecidedAppointmentId(notification.appointmentId);
          }
          refreshAfterDecision();
          return;
        }
        refreshAfterDecision();
        const errorMessage = rawMsg || t("common.operationFailed");
        alertError(t("common.error"), errorMessage);
      };

      try {
        if (userType === UserType.BarberStore) {
          const storeResult = await runNotificationActionWithTimeout(
            storeDecision({
              appointmentId: notification.appointmentId,
              approve,
            }) as unknown as Promise<any>,
            "STORE_DECISION",
          );
          if ("error" in storeResult) {
            handleDecisionError(storeResult.error);
            releaseProcessing();
            return;
          }
          result = storeResult.data;
        } else if (userType === UserType.FreeBarber) {
          const freeBarberResult = await runNotificationActionWithTimeout(
            freeBarberDecision({
              appointmentId: notification.appointmentId,
              approve,
            }) as unknown as Promise<any>,
            "FREE_BARBER_DECISION",
          );
          if ("error" in freeBarberResult) {
            handleDecisionError(freeBarberResult.error);
            releaseProcessing();
            return;
          }
          result = freeBarberResult.data;
        } else if (userType === UserType.Customer) {
          const customerResult = await runNotificationActionWithTimeout(
            customerDecision({
              appointmentId: notification.appointmentId,
              approve,
            }) as unknown as Promise<any>,
            "CUSTOMER_DECISION",
          );
          if ("error" in customerResult) {
            handleDecisionError(customerResult.error);
            releaseProcessing();
            return;
          }
          result = customerResult.data;
        } else {
          releaseProcessing();
          return;
        }

        if (result?.success) {
          addDecidedAppointmentId(notification.appointmentId);
          dispatch(showSnack({ message: buildDecisionSnackMessage(), isError: false }));

          const targetFilter = !approve
            ? AppointmentFilter.Cancelled
            : isStoreSelection && userType === UserType.BarberStore
              ? AppointmentFilter.Pending
              : AppointmentFilter.Active;
          dispatch(requestAppointmentListTab({ filter: targetFilter }));
        } else {
          refreshAfterDecision();
          alertError(
            t("common.error"),
            result?.message || t("common.operationFailed"),
          );
          releaseProcessing();
        }
        setTimeout(() => {
          processingNotificationsRef.current.delete(notification.id);
        }, 5000);
      } catch (err: any) {
        releaseProcessing();
        if (String(err?.message ?? "").endsWith("_TIMEOUT")) {
          resetStoreDecision();
          resetFreeBarberDecision();
          resetCustomerDecision();
          alertError(t("common.error"), t("common.requestTimeout"));
          return;
        }
        alertError(
          t("common.error"),
          getErrorMessage(err) || t("common.operationFailed"),
        );
      } finally {
        setDecidingNotificationId(null);
      }
    }),
    [
      guard,
      userType,
      storeDecision,
      freeBarberDecision,
      customerDecision,
      runNotificationActionWithTimeout,
      resetStoreDecision,
      resetFreeBarberDecision,
      resetCustomerDecision,
      dispatch,
      t,
      alert,
      alertError,
      refetch,
      decidedAppointmentIds,
      addDecidedAppointmentId,
      isStaleStateError,
    ],
  );

  const handleDelete = useCallback(
    async (notification: NotificationDto) => {
      confirm(
        t("notification.deleteNotification"),
        t("notification.deleteNotificationConfirm"),
        async () => {
          setDeletingNotificationId(notification.id);
          const deleteResult = await deleteNotification(notification.id);
          if ("error" in deleteResult) {
            const errorMessage =
              getErrorMessage(deleteResult.error) ||
              t("notification.notificationDeleteFailed");
            if (onDeleteError) {
              onDeleteError(errorMessage);
            } else {
              alertError(t("common.error"), errorMessage);
            }
            setDeletingNotificationId(null);
            return;
          }
          if (onDeleteSuccess) {
            onDeleteSuccess(t("notification.notificationDeleted"));
          }
          setDeletingNotificationId(null);
        },
        undefined,
        t("common.delete"),
        t("common.cancel"),
      );
    },
    [deleteNotification, onDeleteSuccess, onDeleteError, t, confirm, alertError],
  );

  const handleDeleteAll = useCallback(async () => {
    confirm(
      t("notification.deleteAllNotifications"),
      t("notification.deleteAllNotificationsConfirm"),
      async () => {
        requestNotificationsFullCacheReplace();
        resetNotificationsPagination();
        const deleteAllResult = await deleteAllNotifications();
        if ("error" in deleteAllResult) {
          const errorMessage =
            getErrorMessage(deleteAllResult.error) ||
            t("notification.notificationsDeleteFailed");
          if (onDeleteError) {
            onDeleteError(errorMessage);
          } else {
            alertError(t("common.error"), errorMessage);
          }
          return;
        }
        if (onDeleteSuccess) {
          onDeleteSuccess(t("notification.notificationsDeleted"));
        }
      },
      undefined,
      t("common.delete"),
      t("common.cancel"),
    );
  }, [deleteAllNotifications, onDeleteSuccess, onDeleteError, t, confirm, alertError, resetNotificationsPagination]);

  const handleMarkAllRead = useCallback(() => {
    guard(async () => {
      requestNotificationsFullCacheReplace();
      resetNotificationsPagination();
      const result = await markAllNotificationsRead();
      if ("error" in result) {
        const errorMessage =
          getErrorMessage(result.error) ||
          t("notification.markAllReadFailed");
        if (onDeleteError) {
          onDeleteError(errorMessage);
        } else {
          alertError(t("common.error"), errorMessage);
        }
        return;
      }
      if (onDeleteSuccess) {
        onDeleteSuccess(t("notification.markAllReadSuccess"));
      }
    });
  }, [
    guard,
    markAllNotificationsRead,
    onDeleteSuccess,
    onDeleteError,
    t,
    alertError,
    resetNotificationsPagination,
  ]);

  // Helper functions
  const formatTime = useCallback((timeStr?: string) => {
    if (!timeStr) return "";
    try {
      const parts = timeStr.split(":");
      return `${parts[0]}:${parts[1]}`;
    } catch {
      return timeStr;
    }
  }, []);

  const formatDate = useCallback((dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  }, []);

  const formatPricingPolicy = useCallback(
    (pricingType?: number, pricingValue?: number) => {
      if (pricingType === undefined || pricingValue === undefined) return null;
      if (pricingType === PricingType.Percent)
        return t("card.pricingPercent", { value: pricingValue });
      if (pricingType === PricingType.Rent)
        return t("card.pricingRent", { value: pricingValue });
      return null;
    },
    [t],
  );

  const formatRating = useCallback(
    (rating?: number) => rating?.toFixed(1) ?? null,
    [],
  );

  const concludedAppointmentIds = useMemo(() => {
    // Kullanıcının bu oturumda karar verdiği appointment'ları da "concluded" say:
    // refetch ile gelen eski payload yüzünden butonların tekrar görünmesi engellenir.
    const set = new Set<string>(decidedAppointmentIds);
    if (!data || !Array.isArray(data)) return set;
    const concludedTypes = new Set<NotificationType>([
      NotificationType.AppointmentApproved,
      NotificationType.AppointmentRejected,
      NotificationType.AppointmentCancelled,
      NotificationType.AppointmentCompleted,
      NotificationType.AppointmentUnanswered,
      NotificationType.FreeBarberRejectedInitial,
      NotificationType.CustomerApprovedFinal,
      NotificationType.CustomerRejectedFinal,
      NotificationType.CustomerFinalTimeout,
      NotificationType.StoreSelectionTimeout,
    ]);
    for (const n of data) {
      if (!n.appointmentId) continue;
      if (concludedTypes.has(n.type)) {
        set.add(n.appointmentId);
      }
    }
    return set;
  }, [data, decidedAppointmentIds]);

  // renderItem - NotificationItemOptimized kullanıyor (performance optimized)
  // Reader pattern (RP4): Subscription notification'ları (appointmentId yok) için
  // basit bir kart döndürürüz; NotificationItemOptimized appointment-spesifiktir.
  const renderItem = useCallback(
    ({ item }: { item: NotificationDto }) => {
      const isSubscriptionNotif =
        item.type === NotificationType.SubscriptionExpiringSoon ||
        item.type === NotificationType.SubscriptionExpiringTomorrow ||
        item.type === NotificationType.SubscriptionExpired;

      if (isSubscriptionNotif) {
        return (
          <SubscriptionNotificationCard
            item={item}
            onMarkRead={handleMarkRead}
            onDelete={handleDelete}
            isDeleting={deletingNotificationId === item.id && isDeletingNotification}
            onCloseSheet={onClose}
          />
        );
      }

      return (
        <NotificationItemOptimized
          item={item}
          userType={userType}
          onMarkRead={handleMarkRead}
          onDecision={handleDecision}
          onDelete={handleDelete}
          isProcessing={decidingNotificationId === item.id}
          isDeleting={deletingNotificationId === item.id && isDeletingNotification}
          formatDate={formatDate}
          formatTime={formatTime}
          formatPricingPolicy={formatPricingPolicy}
          formatRating={formatRating}
          onAddStore={handleAddStore}
          onCloseSheet={onClose}
          concludedAppointmentIds={concludedAppointmentIds}
        />
      );
    },
    [
      userType,
      handleMarkRead,
      handleDecision,
      handleDelete,
      decidingNotificationId,
      isDeletingNotification,
      formatDate,
      formatTime,
      formatPricingPolicy,
      formatRating,
      handleAddStore,
      concludedAppointmentIds,
    ],
  );

  const handleRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    bumpEndReachedGrace();
    try {
      requestNotificationsFullCacheReplace();
      resetNotificationsPagination();
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch, bumpEndReachedGrace, resetNotificationsPagination]);

  return (
    <View className="flex-1 px-3" style={{ paddingTop: 10 + Math.min(insets.top, 8) }}>
      <View className="flex-row justify-between items-center mb-3 mt-1">
        <Text className="flex-1 pr-2 text-white text-lg font-bold" numberOfLines={1}>
          {t("navigation.notifications")}
        </Text>
        <View className="flex-row items-center gap-2 flex-shrink-0">
          {data && data.length > 0 && (
            <>
              {data.some((n) => !n.isRead) && (
                <TouchableOpacity
                  onPress={handleMarkAllRead}
                  disabled={isMarkingAllNotificationsRead}
                  className={`rounded-lg px-2.5 py-2 flex-row items-center gap-1 ${isMarkingAllNotificationsRead ? "opacity-60" : ""}`}
                  style={{
                    backgroundColor: isDark ? "rgba(34,197,94,0.16)" : "rgba(187,247,208,0.55)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(74,222,128,0.35)" : "rgba(22,163,74,0.22)",
                  }}
                >
                  {isMarkingAllNotificationsRead ? (
                    <ActivityIndicator size="small" color={isDark ? "#86efac" : "#15803d"} />
                  ) : (
                    <Icon source="email-open-multiple-outline" size={17} color={isDark ? "#86efac" : "#166534"} />
                  )}
                  <Text
                    className="font-semibold text-xs"
                    numberOfLines={1}
                    style={{ color: isDark ? "#bbf7d0" : "#14532d", fontFamily: "CenturyGothic-Bold" }}
                  >
                    {t("notification.markAllRead")}
                  </Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                onPress={handleDeleteAll}
                disabled={isDeletingAllNotifications}
                className={`rounded-lg px-2.5 py-2 flex-row items-center gap-1 ${isDeletingAllNotifications ? "opacity-60" : ""}`}
                style={{
                  backgroundColor: isDark ? "rgba(248,113,113,0.14)" : "rgba(254,202,202,0.55)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(248,113,113,0.38)" : "rgba(220,38,38,0.22)",
                }}
              >
                {isDeletingAllNotifications ? (
                  <ActivityIndicator size="small" color={isDark ? "#fca5a5" : "#dc2626"} />
                ) : (
                  <Icon source="delete-sweep-outline" size={17} color={isDark ? "#fca5a5" : "#b91c1c"} />
                )}
                <Text
                  className="font-semibold text-xs"
                  numberOfLines={1}
                  style={{ color: isDark ? "#fecaca" : "#991b1b", fontFamily: "CenturyGothic-Bold" }}
                >
                  {t("notification.deleteAllNotifications")}
                </Text>
              </TouchableOpacity>
            </>
          )}
          {onClose ? (
            <TouchableOpacity
              onPress={onClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Icon source="close" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <BottomSheetFlatList
        data={data ?? []}
        keyExtractor={(x: NotificationDto) => `${x.id}-${x.type}-${x.createdAt}`}
        // CRITICAL: extraData must change when any notification's _updatedAt changes
        // This forces FlatList to re-render items when SignalR updates arrive
        extraData={data?.map(n => `${n.id}-${n._updatedAt || 0}`).join(',')}
        refreshing={isPullRefreshing}
        onRefresh={handleRefresh}
        onEndReached={loadOlderNotifications}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          isLoadingOlder ? (
            <View className="py-3 items-center">
              <ActivityIndicator size="small" color={isDark ? "#fbbf24" : "#f59e0b"} />
            </View>
          ) : null
        }
        style={{ flex: 1 }}
        contentContainerStyle={{
          flexGrow: 1, // Liste boş olsa bile kaydırma davranışını korur
          // Android nav bar / iOS home indicator: son item'ın safe-area altında kalmaması için.
          paddingBottom: insets.bottom + 24,
        }}
        keyboardShouldPersistTaps="handled"
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading || (isFetching && (!data || data.length === 0)) ? (
            <View className="p-8 items-center justify-center min-h-[160px]">
              <ActivityIndicator size="large" color={isDark ? "#fbbf24" : "#f59e0b"} />
              <Text className="text-[#8b8c90] mt-3 text-sm" style={{ fontFamily: "CenturyGothic" }}>
                {t("common.loading")}
              </Text>
            </View>
          ) : (
            <View className="p-4.5">
              <Text className="text-[#8b8c90]">{t("empty.noNotifications")}</Text>
            </View>
          )
        }
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// SubscriptionNotificationCard
// Reader pattern (RP4): Subscription bitiş hatırlatmaları için minimal kart.
// AppointmentItemOptimized appointment-spesifik olduğundan ayrı render edilir.
// "Aboneliği yenile" butonu kullanıcıyı subscription sayfasına yönlendirir
// (mobilde reader pattern: SMS ile ödeme linki gönder akışı oradan başlar).
// ---------------------------------------------------------------------------
const SubscriptionNotificationCard = React.memo(function SubscriptionNotificationCard({
  item,
  onMarkRead,
  onDelete,
  isDeleting,
  onCloseSheet,
}: {
  item: NotificationDto;
  onMarkRead: (notification: NotificationDto) => Promise<void>;
  onDelete: (notification: NotificationDto) => Promise<void>;
  isDeleting: boolean;
  onCloseSheet?: () => void;
}) {
  const { isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();

  const isExpired = item.type === NotificationType.SubscriptionExpired;
  const accentColor = isExpired ? "#ef4444" : "#f59e0b";
  const iconName = isExpired ? "alert-circle-outline" : "clock-alert-outline";

  const handleOpen = useCallback(() => {
    if (!item.isRead) {
      void onMarkRead(item);
    }
    onCloseSheet?.();
    router.push("/(screens)/subscription");
  }, [item.isRead, item, onMarkRead, onCloseSheet, router]);

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
        backgroundColor: isDark ? "#1a1d24" : "#ffffff",
        padding: 14,
        opacity: item.isRead ? 0.78 : 1,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: 10 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: `${accentColor}22`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon source={iconName} size={20} color={accentColor} />
        </View>
        <View style={{ flex: 1 }}>
          <Text
            style={{
              color: isDark ? "#e5e7eb" : "#111827",
              fontSize: 14,
              fontFamily: "CenturyGothic-Bold",
              marginBottom: 4,
            }}
            numberOfLines={2}
          >
            {item.title}
          </Text>
          {!!item.body && (
            <Text
              style={{
                color: isDark ? "#9ca3af" : "#4b5563",
                fontSize: 12,
                fontFamily: "CenturyGothic",
                lineHeight: 17,
              }}
              numberOfLines={3}
            >
              {item.body}
            </Text>
          )}
        </View>
      </View>

      <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
        <TouchableOpacity
          onPress={handleOpen}
          activeOpacity={0.85}
          style={{
            flex: 1,
            backgroundColor: accentColor,
            paddingVertical: 10,
            borderRadius: 8,
            alignItems: "center",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Icon source="cellphone-message" size={15} color="#fff" />
          <Text style={{ color: "#fff", fontSize: 12, fontFamily: "CenturyGothic-Bold" }}>
            {t("subscription.renewSubscription")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onDelete(item)}
          disabled={isDeleting}
          activeOpacity={0.85}
          style={{
            paddingVertical: 10,
            paddingHorizontal: 14,
            borderRadius: 8,
            borderWidth: 1,
            borderColor: isDark ? "rgba(248,113,113,0.4)" : "rgba(220,38,38,0.25)",
            backgroundColor: isDark ? "rgba(248,113,113,0.10)" : "rgba(254,202,202,0.45)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={isDark ? "#fca5a5" : "#dc2626"} />
          ) : (
            <Icon source="trash-can-outline" size={16} color={isDark ? "#fca5a5" : "#b91c1c"} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
});

