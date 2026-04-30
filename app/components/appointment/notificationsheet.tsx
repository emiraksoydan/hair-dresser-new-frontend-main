import { Icon } from "react-native-paper";
import { PricingType } from "../../types/store";
import { useAuth } from "../../hook/useAuth";
import {
  useGetAllNotificationsQuery,
  useMarkNotificationReadMutation,
  useDeleteNotificationMutation,
  useDeleteAllNotificationsMutation,
  useStoreDecisionMutation,
  useFreeBarberDecisionMutation,
  useCustomerDecisionMutation,
  api,
} from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { useLanguage } from "../../hook/useLanguage";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AppointmentStatus,
  DecisionStatus,
  NotificationDto,
  StoreSelectionType,
  UserType,
} from "../../types";
import { TouchableOpacity, View, ActivityIndicator } from "react-native";
import { Text } from "../common/Text";

import { NotificationItemOptimized } from "./NotificationItemOptimized";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useAlert } from "../../hook/useAlert";
import { useActionGuard } from "../../hook/useActionGuard";
import { useTheme } from "../../hook/useTheme";

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
  const NOTIFICATIONS_PAGE_SIZE = 30;
  const { data, isFetching, isLoading, refetch } = useGetAllNotificationsQuery({
    limit: NOTIFICATIONS_PAGE_SIZE,
  });
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);

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
  const [deletingNotificationId, setDeletingNotificationId] = React.useState<string | null>(null);
  const { userType } = useAuth();
  const { t } = useLanguage();
  const { isDark } = useTheme();
  const { alert, alertSuccess, alertError, confirm } = useAlert();
  const [storeDecision, { isLoading: isStoreDeciding }] =
    useStoreDecisionMutation();
  const [freeBarberDecision, { isLoading: isFreeBarberDeciding }] =
    useFreeBarberDecisionMutation();
  const [customerDecision, { isLoading: isCustomerDeciding }] =
    useCustomerDecisionMutation();

  // Double-tap prevention: Track which notifications are being processed
  const processingNotificationsRef = useRef<Set<string>>(new Set());

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
        // NO optimistic update - backend notification.updated event is source of truth
        // Backend will send notification.updated event with correct isRead status
        await markRead(n.id);
        // Badge refetch via invalidatesTags (Notification LIST) in markNotificationRead
        // notification.updated SignalR event will update the notification state
      } catch {
        // Error handling is silent - backend events are source of truth
        // If backend call fails, notification.updated event won't come, so state stays unchanged
      } finally {
        // Remove from processing set after a short delay to allow backend event to arrive
        setTimeout(() => {
          processingNotificationsRef.current.delete(n.id);
        }, 1000);
      }
    },
    [markRead],
  );

  // --- Backend-Authoritative Decision Handler ---
  // NO optimistic updates - UI changes only when SignalR events arrive from backend
  const handleDecision = useCallback(
    (notification: NotificationDto, approve: boolean) => guard(async () => {
      if (!notification.appointmentId) return;

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
        return;
      }

      // Call the appropriate API based on user type
      // NO optimistic updates - wait for SignalR events
      let result;
      if (userType === UserType.BarberStore) {
        const storeResult = await storeDecision({
          appointmentId: notification.appointmentId,
          approve,
        });
        if ("error" in storeResult) {
          const errorMessage =
            (storeResult.error as any)?.data?.message ||
            t("common.operationFailed");
          alertError(t("common.error"), errorMessage);
          return;
        }
        result = storeResult.data;
      } else if (userType === UserType.FreeBarber) {
        const freeBarberResult = await freeBarberDecision({
          appointmentId: notification.appointmentId,
          approve,
        });
        if ("error" in freeBarberResult) {
          const errorMessage =
            (freeBarberResult.error as any)?.data?.message ||
            t("common.operationFailed");
          alertError(t("common.error"), errorMessage);
          return;
        }
        result = freeBarberResult.data;
      } else if (userType === UserType.Customer) {
        const customerResult = await customerDecision({
          appointmentId: notification.appointmentId,
          approve,
        });
        if ("error" in customerResult) {
          const errorMessage =
            (customerResult.error as any)?.data?.message ||
            t("common.operationFailed");
          alertError(t("common.error"), errorMessage);
          return;
        }
        result = customerResult.data;
      } else {
        return;
      }

      if (result?.success) {
        // Auto-mark notification as read after successful decision
        // NO optimistic update - backend notification.updated event is source of truth
        if (!notification.isRead && !processingNotificationsRef.current.has(notification.id)) {
          processingNotificationsRef.current.add(notification.id);
          try {
            await markRead(notification.id);
            // notification.updated SignalR event will update the notification state
          } catch {
            /* badge.updated / invalidatesTags handle count */
          } finally {
            setTimeout(() => {
              processingNotificationsRef.current.delete(notification.id);
            }, 1000);
          }
        }

        // Show success message
        const { title: successTitle, message: successMessage } = (() => {
          if (isStoreSelection && userType === UserType.BarberStore) {
            return {
              title: approve ? t("notification.storeApprovalTitle") : t("notification.rejectionTitle"),
              message: approve ? t("notification.storeApprovalSent") : t("notification.storeRejected"),
            };
          }
          if (isStoreSelection && userType === UserType.Customer) {
            return {
              title: approve ? t("notification.approvalTitle") : t("notification.rejectionTitle"),
              message: approve ? t("notification.appointmentApproved") : t("notification.storeRejected"),
            };
          }
          return {
            title: approve ? t("notification.approvalTitle") : t("notification.rejectionTitle"),
            message: approve ? t("notification.appointmentApproved") : t("notification.appointmentRejected"),
          };
        })();

        alertSuccess(successTitle, successMessage);

        // UI UPDATES:
        // - notification.updated event will update the notification payload (hide buttons, show status)
        // - badge.updated event will update the badge count
        // - appointment.updated event will update the appointment list
        // All handled by SignalR in useSignalRV2
      } else {
        alertError(
          t("common.error"),
          result?.message || t("common.operationFailed"),
        );
      }
    }),
    [
      guard,
      userType,
      storeDecision,
      freeBarberDecision,
      customerDecision,
      markRead,
      dispatch,
      t,
      alert,
      alertSuccess,
      alertError,
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
              (deleteResult.error as any)?.data?.message ||
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
        const deleteAllResult = await deleteAllNotifications();
        if ("error" in deleteAllResult) {
          const errorMessage =
            (deleteAllResult.error as any)?.data?.message ||
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
  }, [deleteAllNotifications, onDeleteSuccess, onDeleteError, t, confirm, alertError]);

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

  // renderItem - NotificationItemOptimized kullanıyor (performance optimized)
  const renderItem = useCallback(
    ({ item }: { item: NotificationDto }) => {
      return (
        <NotificationItemOptimized
          item={item}
          userType={userType}
          onMarkRead={handleMarkRead}
          onDecision={handleDecision}
          onDelete={handleDelete}
          isProcessing={
            isStoreDeciding || isFreeBarberDeciding || isCustomerDeciding
          }
          isDeleting={deletingNotificationId === item.id && isDeletingNotification}
          formatDate={formatDate}
          formatTime={formatTime}
          formatPricingPolicy={formatPricingPolicy}
          formatRating={formatRating}
          onAddStore={handleAddStore}
          onCloseSheet={onClose}
        />
      );
    },
    [
      userType,
      handleMarkRead,
      handleDecision,
      handleDelete,
      isStoreDeciding,
      isFreeBarberDeciding,
      isCustomerDeciding,
      isDeletingNotification,
      formatDate,
      formatTime,
      formatPricingPolicy,
      formatRating,
      handleAddStore,
    ],
  );

  const handleRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    bumpEndReachedGrace();
    try {
      // Refresh → pagination state'i sıfırla
      hasMoreRef.current = true;
      lastLoadedBeforeRef.current = null;
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch, bumpEndReachedGrace]);

  return (
    <View className="flex-1 px-3">
      <View className="flex-row justify-between items-center my-3">
        <Text className="text-white text-lg font-bold">{t("navigation.notifications")}</Text>
        <View className="flex-row items-center gap-3">
          {data && data.length > 0 && (
            <TouchableOpacity
              onPress={handleDeleteAll}
              disabled={isDeletingAllNotifications}
              className={`rounded-lg px-3 py-2 flex-row items-center gap-1.5 ${isDeletingAllNotifications ? "opacity-60" : ""}`}
              style={{
                backgroundColor: isDark ? "rgba(248,113,113,0.14)" : "rgba(254,202,202,0.55)",
                borderWidth: 1,
                borderColor: isDark ? "rgba(248,113,113,0.38)" : "rgba(220,38,38,0.22)",
              }}
            >
              {isDeletingAllNotifications ? (
                <ActivityIndicator size="small" color={isDark ? "#fca5a5" : "#dc2626"} />
              ) : (
                <Icon source="delete-sweep-outline" size={18} color={isDark ? "#fca5a5" : "#b91c1c"} />
              )}
              <Text
                className="font-semibold text-sm"
                style={{ color: isDark ? "#fecaca" : "#991b1b", fontFamily: "CenturyGothic-Bold" }}
              >
                {t("notification.deleteAllNotifications")}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={onClose}>
            <Text className="text-[#f05e23] font-semibold">{t("common.close")}</Text>
          </TouchableOpacity>
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
        }}
        renderItem={renderItem}
        ListEmptyComponent={
          isLoading || (isFetching && (!data || data.length === 0)) ? (
            <View className="p-8 items-center justify-center min-h-[160px]">
              <ActivityIndicator size="large" color={isDark ? "#fbbf24" : "#f59e0b"} />
              <Text className="text-[#8b8c90] mt-3 text-sm" style={{ fontFamily: "CenturyGothic" }}>
                {t("common.loading") || "…"}
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
