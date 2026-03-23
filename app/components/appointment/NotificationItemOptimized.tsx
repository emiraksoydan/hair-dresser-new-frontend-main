import { View, TouchableOpacity, ActivityIndicator } from "react-native";
import { Text } from "../common/Text";
import { Icon } from "react-native-paper";
import type { NotificationDto, NotificationPayload } from "../../types";
import {
  NotificationType,
  AppointmentStatus,
  DecisionStatus,
  StoreSelectionType,
} from "../../types";
import { UserType } from "../../types";
import React from "react";
import { useIsFavoriteQuery } from "../../store/api";
import { useAuth } from "../../hook/useAuth";
import { useLanguage } from "../../hook/useLanguage";
import { NotificationParticipantView } from "./NotificationParticipantView";
import { getMessage } from "../../utils/errorHandler";
import { useTheme } from "../../hook/useTheme";

// ---------------------------------------------------------------------------
// Sadeleştirilmiş Notification Item Component
//
// Mantık:
// 1. Status gösterimi: Bildirim tipi status bildirimi ise VEYA kullanıcı karar verdiyse
// 2. Buton gösterimi: AppointmentCreated + pending + kullanıcı karar vermemişse
// ---------------------------------------------------------------------------

interface NotificationItemProps {
  item: NotificationDto;
  userType: number | null;
  onMarkRead: (n: NotificationDto) => void;
  onDecision: (n: NotificationDto, approve: boolean) => void;
  onDelete?: (n: NotificationDto) => void;
  isProcessing: boolean;
  isDeleting?: boolean;
  formatDate: (d: string) => string;
  formatTime: (t?: string) => string;
  formatPricingPolicy: (t?: number, v?: number) => any;
  formatRating: (r?: number) => any;
  onAddStore?: (appointmentId: string) => void;
}

// Status tipi için yardımcı tip
type StatusKind =
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed"
  | "unanswered"
  | null;

// Status renkleri ve ikonları
const STATUS_CONFIG: Record<
  NonNullable<StatusKind>,
  { bg: string; border: string; text: string; icon: string; color: string }
> = {
  approved: {
    bg: "bg-green-900/20",
    border: "border-green-800/30",
    text: "text-green-400",
    icon: "check-circle",
    color: "#10b981",
  },
  rejected: {
    bg: "bg-red-900/20",
    border: "border-red-800/30",
    text: "text-red-400",
    icon: "close-circle",
    color: "#ef4444",
  },
  cancelled: {
    bg: "bg-orange-900/20",
    border: "border-orange-800/30",
    text: "text-orange-400",
    icon: "cancel",
    color: "#f97316",
  },
  completed: {
    bg: "bg-blue-900/20",
    border: "border-blue-800/30",
    text: "text-blue-400",
    icon: "check-all",
    color: "#3b82f6",
  },
  unanswered: {
    bg: "bg-yellow-900/20",
    border: "border-yellow-800/30",
    text: "text-yellow-400",
    icon: "clock-alert",
    color: "#fbbf24",
  },
};

// Decision değerini normalize et (backend'den number gelir)
const normalizeDecision = (v: any): DecisionStatus | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "number") return v as DecisionStatus;
  return null;
};

// Kullanıcının kendi kararını al
const getMyDecision = (
  userType: number | null,
  recipientRole: string | undefined,
  storeDecision: DecisionStatus | null,
  freeBarberDecision: DecisionStatus | null,
  customerDecision: DecisionStatus | null,
): DecisionStatus | null => {
  // Önce recipientRole'e bak (backend'den gelen), yoksa userType'a bak
  const role =
    recipientRole ??
    (userType === UserType.BarberStore
      ? "store"
      : userType === UserType.FreeBarber
        ? "freebarber"
        : userType === UserType.Customer
          ? "customer"
          : null);

  if (role === "store") return storeDecision;
  if (role === "freebarber") return freeBarberDecision;
  if (role === "customer") return customerDecision;
  return null;
};

// Helper function to safely parse payload and extract decision fields
const parsePayloadDecisions = (payloadJson: string | undefined | null) => {
  if (!payloadJson || payloadJson.trim() === "" || payloadJson === "{}") {
    return { storeDecision: null, freeBarberDecision: null, customerDecision: null, status: null };
  }
  try {
    const payload = JSON.parse(payloadJson);
    return {
      storeDecision: payload?.storeDecision ?? null,
      freeBarberDecision: payload?.freeBarberDecision ?? null,
      customerDecision: payload?.customerDecision ?? null,
      status: payload?.status ?? null,
    };
  } catch {
    return { storeDecision: null, freeBarberDecision: null, customerDecision: null, status: null };
  }
};

// Custom comparison function for React.memo
const areEqual = (prev: NotificationItemProps, next: NotificationItemProps) => {
  // CRITICAL: _updatedAt check - this is the primary mechanism for forcing re-renders
  // When SignalR sends notification.updated event, _updatedAt is set to Date.now()
  if (prev.item._updatedAt !== next.item._updatedAt) return false;

  // Basic field comparison
  if (prev.item.id !== next.item.id) return false;
  if (prev.item.isRead !== next.item.isRead) return false;
  if (prev.isProcessing !== next.isProcessing) return false;
  if (prev.isDeleting !== next.isDeleting) return false;

  // String comparison for payloadJson
  if (prev.item.payloadJson !== next.item.payloadJson) return false;

  // Deep comparison for decision fields (belt and suspenders approach)
  const prevDecisions = parsePayloadDecisions(prev.item.payloadJson);
  const nextDecisions = parsePayloadDecisions(next.item.payloadJson);

  if (prevDecisions.storeDecision !== nextDecisions.storeDecision) return false;
  if (prevDecisions.freeBarberDecision !== nextDecisions.freeBarberDecision) return false;
  if (prevDecisions.customerDecision !== nextDecisions.customerDecision) return false;
  if (prevDecisions.status !== nextDecisions.status) return false;

  return true;
};

export const NotificationItemOptimized = React.memo<NotificationItemProps>(
  ({
    item,
    userType,
    onMarkRead,
    onDecision,
    onDelete,
    isProcessing,
    isDeleting,
    formatDate,
    formatTime,
    formatPricingPolicy,
    formatRating,
    onAddStore,
  }) => {
    const { colors, isDark } = useTheme();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();

    // ========== PAYLOAD PARSING ==========
    const payload = React.useMemo<NotificationPayload | null>(() => {
      try {
        if (
          item.payloadJson &&
          item.payloadJson.trim() !== "" &&
          item.payloadJson !== "{}"
        ) {
          return JSON.parse(item.payloadJson);
        }
      } catch {}
      return null;
    }, [item.payloadJson]);

    // ========== TEMEL DEĞİŞKENLER ==========
    const recipientRole = payload?.recipientRole;

    // Decision değerleri (backend'den number olarak gelir: 0=Pending, 1=Approved, 2=Rejected, 3=NoAnswer)
    const storeDecision = normalizeDecision(payload?.storeDecision);
    const freeBarberDecision = normalizeDecision(payload?.freeBarberDecision);
    const customerDecision = normalizeDecision(payload?.customerDecision);

    // Benim kararım
    const myDecision = getMyDecision(
      userType,
      recipientRole,
      storeDecision,
      freeBarberDecision,
      customerDecision,
    );

    // Karar verdim mi? (Pending=0 veya null değilse karar verilmiş demektir)
    const hasMyDecision =
      myDecision !== null && myDecision !== DecisionStatus.Pending;

    // Randevu durumu
    const appointmentStatus = React.useMemo(() => {
      if (payload?.status !== undefined)
        return payload.status as AppointmentStatus;
      if (item.type === NotificationType.AppointmentUnanswered)
        return AppointmentStatus.Unanswered;
      return AppointmentStatus.Pending;
    }, [payload?.status, item.type]);

    // Süre kontrolü - expired ise status'u unanswered olarak güncelle
    const isExpiredCheck = React.useMemo(() => {
      // pendingExpiresAt varsa onu kullan
      if (payload?.pendingExpiresAt) {
        let dateStr = payload.pendingExpiresAt;
        if (
          typeof dateStr === "string" &&
          !dateStr.endsWith("Z") &&
          !dateStr.includes("+")
        ) {
          dateStr += "Z";
        }
        return new Date().getTime() > new Date(dateStr).getTime();
      }

      // Yoksa createdAt + timeout hesapla
      if (appointmentStatus === AppointmentStatus.Pending) {
        let createdStr = item.createdAt;
        if (
          typeof createdStr === "string" &&
          !createdStr.endsWith("Z") &&
          !createdStr.includes("+")
        ) {
          createdStr += "Z";
        }
        const createdAt = new Date(createdStr);

        // StoreSelection flow'da müşteri için 30dk, diğerleri için 5dk
        const isStoreSelectionFlow =
          payload?.storeSelectionType === StoreSelectionType.StoreSelection;
        const isCustomerWaitingForStore =
          isStoreSelectionFlow &&
          userType === UserType.Customer &&
          payload?.store &&
          storeDecision === DecisionStatus.Approved;

        const timeoutMinutes = isCustomerWaitingForStore ? 30 : 5;
        const expiresAt = new Date(
          createdAt.getTime() + timeoutMinutes * 60 * 1000,
        );

        return new Date().getTime() > expiresAt.getTime();
      }

      return false;
    }, [
      payload?.pendingExpiresAt,
      payload?.storeSelectionType,
      payload?.store,
      appointmentStatus,
      item.createdAt,
      userType,
      storeDecision,
    ]);

    // Expired ise status'u unanswered olarak güncelle
    const finalAppointmentStatus = React.useMemo(() => {
      if (isExpiredCheck && appointmentStatus === AppointmentStatus.Pending) {
        return AppointmentStatus.Unanswered;
      }
      return appointmentStatus;
    }, [isExpiredCheck, appointmentStatus]);

    const isPending = finalAppointmentStatus === AppointmentStatus.Pending;

    // ========== SÜRE KONTROLÜ ==========
    const isExpired = isExpiredCheck;

    // ========== STATUS GÖSTERİMİ ==========
    // Status bildirimi tipleri (bu tipler doğrudan status gösterir)
    const isStatusNotification = [
      NotificationType.AppointmentApproved,
      NotificationType.AppointmentRejected,
      NotificationType.AppointmentCancelled,
      NotificationType.AppointmentCompleted,
      NotificationType.AppointmentUnanswered,
    ].includes(item.type);

    // Status'u belirle
    const statusKind = React.useMemo<StatusKind>(() => {
      // 1. Randevu durumuna göre (finalAppointmentStatus - expired kontrolü ile güncellenmiş)
      if (finalAppointmentStatus === AppointmentStatus.Approved) return "approved";
      if (finalAppointmentStatus === AppointmentStatus.Rejected) return "rejected";
      if (finalAppointmentStatus === AppointmentStatus.Cancelled) return "cancelled";
      if (finalAppointmentStatus === AppointmentStatus.Completed) return "completed";
      if (finalAppointmentStatus === AppointmentStatus.Unanswered)
        return "unanswered";

      // 2. Status bildirim tipine göre
      if (item.type === NotificationType.AppointmentApproved) return "approved";
      if (item.type === NotificationType.AppointmentRejected) return "rejected";
      if (item.type === NotificationType.AppointmentCancelled)
        return "cancelled";
      if (item.type === NotificationType.AppointmentCompleted)
        return "completed";
      if (item.type === NotificationType.AppointmentUnanswered)
        return "unanswered";

      // 3. Kullanıcı karar verdiyse ve randevu hala pending ise (kendi kararını göster)
      if (isPending && hasMyDecision) {
        if (myDecision === DecisionStatus.Approved) return "approved";
        if (myDecision === DecisionStatus.Rejected) return "rejected";
        if (myDecision === DecisionStatus.NoAnswer) return "unanswered";
      }

      return null;
    }, [finalAppointmentStatus, item.type, isPending, hasMyDecision, myDecision]);

    // Status gösterilecek mi?
    const showStatus = statusKind !== null || isStatusNotification;

    // ========== BUTON GÖSTERİMİ ==========
    // Butonlar sadece şu koşullarda gösterilir:
    // 1. AppointmentCreated veya StoreApprovedSelection tipi
    // 2. Randevu pending durumda
    // 3. Süre dolmamış
    // 4. Kullanıcı henüz karar vermemiş
    // 5. Status gösterilmiyor (yani final bir durum yok)

    const isActionableType =
      item.type === NotificationType.AppointmentCreated ||
      item.type === NotificationType.StoreApprovedSelection;

    const canShowButtons = React.useMemo(() => {
      // Temel kontroller
      if (!isActionableType) return false;
      if (!isPending) return false;
      if (isExpired) return false;
      if (hasMyDecision) return false;
      if (statusKind !== null) return false; // Final status varsa buton gösterme

      // KRİTİK: Herhangi bir taraf reddettiyse tüm kullanıcılarda butonları gizle
      // Bu kontrol, backend'den payload güncellemesi gelmeden önce de çalışır
      if (storeDecision === DecisionStatus.Rejected) return false;
      if (freeBarberDecision === DecisionStatus.Rejected) return false;
      if (customerDecision === DecisionStatus.Rejected) return false;

      // KRİTİK: Herhangi bir tarafın kararı NoAnswer ise (timeout) butonları gizle
      if (storeDecision === DecisionStatus.NoAnswer) return false;
      if (freeBarberDecision === DecisionStatus.NoAnswer) return false;
      if (customerDecision === DecisionStatus.NoAnswer) return false;

      // Rol bazlı kontroller
      if (userType === UserType.BarberStore) {
        // Store her zaman onay/red verebilir (kendi kararını vermemişse)
        return (
          storeDecision === null || storeDecision === DecisionStatus.Pending
        );
      }

      if (userType === UserType.FreeBarber) {
        // StoreSelection flow'da özel kontroller
        if (payload?.storeSelectionType === StoreSelectionType.StoreSelection) {
          // Dükkan seçildiyse ve Store'un kararı bekleniyorsa → buton yok
          // FreeBarber dükkan seçtikten sonra artık karar veremez (Store'un sırası)
          if (payload?.store && storeDecision === DecisionStatus.Pending) {
            return false;
          }
          // Dükkan seçilmemişse sadece RED butonu gösterilecek (showOnlyRejectButton)
          // Bu durumda canShowButtons true olmalı
          if (!payload?.store) {
            return (
              freeBarberDecision === null ||
              freeBarberDecision === DecisionStatus.Pending
            );
          }
          // Store onayladıysa ve Customer'ın kararı bekleniyorsa → buton yok
          if (storeDecision === DecisionStatus.Approved) {
            return false;
          }
        }
        // CustomRequest flow veya diğer durumlar
        return (
          freeBarberDecision === null ||
          freeBarberDecision === DecisionStatus.Pending
        );
      }

      if (userType === UserType.Customer) {
        // Customer: StoreSelection flow'da store onayladıysa karar verebilir
        if (payload?.storeSelectionType === StoreSelectionType.StoreSelection) {
          return (
            payload?.store &&
            storeDecision === DecisionStatus.Approved &&
            (customerDecision === null ||
              customerDecision === DecisionStatus.Pending)
          );
        }
        // Normal flow
        return (
          customerDecision === null ||
          customerDecision === DecisionStatus.Pending
        );
      }

      return false;
    }, [
      isActionableType,
      isPending,
      isExpired,
      hasMyDecision,
      statusKind,
      userType,
      storeDecision,
      freeBarberDecision,
      customerDecision,
      payload?.storeSelectionType,
      payload?.store,
    ]);

    // FreeBarber için özel durum: StoreSelection'da store seçilmemişse sadece RED butonu
    const showOnlyRejectButton =
      userType === UserType.FreeBarber &&
      payload?.storeSelectionType === StoreSelectionType.StoreSelection &&
      !payload?.store;

    // ========== FAVORİ KONTROLLARI ==========
    const storeId = payload?.store?.storeId;
    const freeBarberId = payload?.freeBarber?.userId;
    const customerId = payload?.customer?.userId;

    const { data: isStoreFavorite } = useIsFavoriteQuery(storeId || "", {
      skip: !isAuthenticated || !storeId,
    });
    const { data: isFreeBarberFavorite } = useIsFavoriteQuery(
      freeBarberId || "",
      {
        skip: !isAuthenticated || !freeBarberId,
      },
    );
    const { data: isCustomerFavorite } = useIsFavoriteQuery(customerId || "", {
      skip: !isAuthenticated || !customerId,
    });

    const isStoreInFavorites =
      isStoreFavorite ??
      payload?.store?.isInFavorites ??
      payload?.isStoreInFavorites ??
      false;
    const isFreeBarberInFavorites =
      isFreeBarberFavorite ??
      payload?.freeBarber?.isInFavorites ??
      payload?.isFreeBarberInFavorites ??
      false;
    const isCustomerInFavorites =
      isCustomerFavorite ??
      payload?.customer?.isInFavorites ??
      payload?.isCustomerInFavorites ??
      false;

    // ========== EVENT HANDLERS ==========
    const handleApprove = React.useCallback(
      () => onDecision(item, true),
      [item, onDecision],
    );
    const handleReject = React.useCallback(
      () => onDecision(item, false),
      [item, onDecision],
    );
    const handleDelete = React.useCallback(
      () => onDelete?.(item),
      [item, onDelete],
    );
    const handleAddStore = React.useCallback(() => {
      if (onAddStore && item.appointmentId) onAddStore(item.appointmentId);
    }, [item.appointmentId, onAddStore]);

    // Tıklama: Aksiyon bildirimlerinde (onay/red) dokunarak okuma yok; sadece diğer türlerde.
    // Karar bekleyen + süresi dolmamış aksiyonlarda kart tıklanmasın (butonlara odaklanılsın).
    // ANCAK: Status belli olan bildirimlerde (onaylandı/reddedildi/iptal vb.) tap ile okunabilir.
    const isAwaitingDecision =
      isActionableType && isPending && !isExpired && !hasMyDecision;
    const handlePress = React.useCallback(() => {
      // Karar bekleyen aksiyon bildirimlerinde dokunarak okuma yapılmaz (butonlara odaklanılsın)
      if (isActionableType && !showStatus) return;
      if (!item.isRead) {
        onMarkRead(item);
      }
    }, [isActionableType, showStatus, item, onMarkRead]);

    const unread = !item.isRead;

    // ========== RENDER ==========
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isAwaitingDecision}
        className="p-4 mb-3 rounded-xl"
        style={{
          backgroundColor: unread ? (isDark ? '#1c1d20' : '#ffffff') : colors.screenBg,
          borderWidth: 1,
          borderColor: unread ? (isDark ? '#2a2c30' : '#e2e8f0') : (isDark ? '#1f2023' : '#f3f4f6'),
        }}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View className="flex-row items-center mb-2">
          {unread && (
            <View className="w-2 h-2 rounded-full bg-[#f05e23] mr-2" />
          )}
          <Text
            className={`flex-1 text-base ${unread ? "font-bold" : "font-medium"}`}
            style={{ color: colors.sectionHeaderText }}
          >
            {getMessage(item.title)}
          </Text>
          <View className="flex-row items-center gap-2">
            {onDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={isDeleting}
                  className={`p-1 ${isDeleting ? "opacity-60" : ""}`}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Icon source="delete-outline" size={18} color="#ef4444" />
                  )}
                </TouchableOpacity>
              )}
            <Text className="text-[#8b8c90] text-xs">
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Payload Content */}
        {payload && (
          <View className="mt-2 pt-3 border-t" style={{ borderTopColor: colors.borderColor }}>
            {/* Date and Time */}
            {payload.date && payload.startTime && payload.endTime && (
              <View className="flex-row justify-end items-center mb-3">
                <Icon source="calendar" size={16} color="#6b7280" />
                <Text className="text-[#9ca3af] text-sm ml-1.5">
                  {formatDate(payload.date)}
                </Text>
                <Text className="text-[#6b7280] mx-1.5">-</Text>
                <Icon source="clock-outline" size={14} color="#6b7280" />
                <Text className="text-[#9ca3af] text-sm ml-1">
                  {formatTime(payload.startTime)} -{" "}
                  {formatTime(payload.endTime)}
                </Text>
              </View>
            )}

            {/* Participants */}
            <View className="mb-3">
              <NotificationParticipantView
                payload={payload}
                recipientRole={recipientRole}
                isStoreInFavorites={isStoreInFavorites}
                isFreeBarberInFavorites={isFreeBarberInFavorites}
                isCustomerInFavorites={isCustomerInFavorites}
                formatRating={formatRating}
              />

              {/* Pricing Policy for FreeBarber */}
              {recipientRole === "freebarber" &&
                payload.store?.pricingType !== undefined &&
                payload.store?.pricingValue !== undefined && (
                  <View className="rounded-lg p-2 mb-2 mt-2" style={{ backgroundColor: isDark ? '#2a2c30' : '#f3f4f6' }}>
                    <Text className="text-[#9ca3af] text-xs">
                      {formatPricingPolicy(
                        payload.store.pricingType,
                        payload.store.pricingValue,
                      )}
                    </Text>
                  </View>
                )}
            </View>

            {/* Service Offerings */}
            {payload.serviceOfferings &&
              payload.serviceOfferings.length > 0 && (
                <View className="mb-2 mt-2">
                  <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">
                    {t("card.services")}:
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {payload.serviceOfferings.map((service: any) => (
                      <View
                        key={service.id}
                        className="rounded-lg px-2 py-1"
                        style={{ backgroundColor: isDark ? '#2a2c30' : '#f3f4f6' }}
                      >
                        <Text className="text-sm" style={{ color: colors.sectionHeaderText }}>
                          {service.serviceName} {t("card.currencySymbol")}
                          {Number(service.price).toFixed(0)}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}

            {/* Note Section */}
            {payload.note &&
              !(
                (recipientRole === "store" ||
                  userType === UserType.BarberStore) &&
                payload.storeSelectionType === StoreSelectionType.StoreSelection
              ) && (
                <View className="mb-2 mt-2">
                  <Text className="text-[#9ca3af] text-xs mb-1 font-semibold">
                    {t("common.note")}:
                  </Text>
                  <View className="rounded-lg px-2 py-2" style={{ backgroundColor: isDark ? '#2a2c30' : '#f3f4f6' }}>
                    <Text className="text-sm" style={{ color: colors.sectionHeaderText }}>{payload.note}</Text>
                  </View>
                </View>
              )}
          </View>
        )}

        {/* Status Display */}
        {showStatus && statusKind && (
          <View className="mt-3 pt-3 border-t" style={{ borderTopColor: colors.borderColor }}>
            <View
              className={`p-3 rounded-lg border ${STATUS_CONFIG[statusKind].bg} ${STATUS_CONFIG[statusKind].border}`}
            >
              <View className="flex-row items-center justify-center">
                <Icon
                  source={STATUS_CONFIG[statusKind].icon}
                  size={20}
                  color={STATUS_CONFIG[statusKind].color}
                />
                <Text
                  className={`text-xs text-center font-semibold ml-2 ${STATUS_CONFIG[statusKind].text}`}
                >
                  {t(`status.${statusKind}`)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Action Buttons */}
        {canShowButtons && (
          <View className="mt-3 pt-3 border-t" style={{ borderTopColor: colors.borderColor }}>
            {showOnlyRejectButton ? (
              // FreeBarber için sadece REDDET butonu
              <TouchableOpacity
                onPress={handleReject}
                disabled={isProcessing}
                className={`bg-red-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Icon source="close-circle" size={18} color="white" />
                    <Text className="text-white text-sm font-semibold">
                      {t("common.reject")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              // ONAY/RED butonları
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleReject}
                  disabled={isProcessing}
                  className={`flex-1 bg-red-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Icon source="close-circle" size={18} color="white" />
                      <Text className="text-white text-sm font-semibold">
                        {t("common.reject")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={isProcessing}
                  className={`flex-1 bg-green-600 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                >
                  {isProcessing ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Icon source="check-circle" size={18} color="white" />
                      <Text className="text-white text-sm font-semibold">
                        {t("common.approve")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Add Store Button (FreeBarber in StoreSelection flow) - KALDIRILDI
            FreeBarber dükkan eklemek için doğrudan Yakındaki Dükkanlar sayfasına gidip
            oradan randevu oluşturabilir. Bu buton gereksiz karmaşıklık yaratıyordu.
        */}
      </TouchableOpacity>
    );
  },
  areEqual,
);

NotificationItemOptimized.displayName = "NotificationItemOptimized";
