import { Icon } from "react-native-paper";
import { View, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "../common/Text";

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
import { useSafeNavigation } from "../../hook/useSafeNavigation";

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
  onCloseSheet?: () => void;
}

// Status tipi için yardımcı tip
type StatusKind =
  | "approved"
  | "rejected"
  | "cancelled"
  | "completed"
  | "unanswered"
  | null;

const STATUS_ICONS: Record<NonNullable<StatusKind>, string> = {
  approved: "check-circle",
  rejected: "close-circle",
  cancelled: "cancel",
  completed: "check-all",
  unanswered: "clock-alert",
};

/** Durum şeridi — native'de tailwind /xx opacity sınıfları zayıf kalabiliyor; dolgun arka plan + net kenarlık */
const getStatusBannerLook = (kind: NonNullable<StatusKind>, isDark: boolean) => {
  const opacity = isDark ? 0.28 : 0.18;
  const borderOp = isDark ? 0.65 : 0.5;
  const defs: Record<
    NonNullable<StatusKind>,
    { rgb: string; icon: string; label: string }
  > = {
    approved: { rgb: "16, 185, 129", icon: "#34d399", label: isDark ? "#a7f3d0" : "#065f46" },
    rejected: { rgb: "239, 68, 68", icon: "#f87171", label: isDark ? "#fecaca" : "#991b1b" },
    cancelled: { rgb: "249, 115, 22", icon: "#fb923c", label: isDark ? "#fed7aa" : "#9a3412" },
    completed: { rgb: "59, 130, 246", icon: "#60a5fa", label: isDark ? "#bfdbfe" : "#1e40af" },
    unanswered: { rgb: "234, 179, 8", icon: "#facc15", label: isDark ? "#fef08a" : "#854d0e" },
  };
  const d = defs[kind];
  return {
    backgroundColor: `rgba(${d.rgb}, ${opacity})`,
    borderColor: `rgba(${d.rgb}, ${borderOp})`,
    iconColor: d.icon,
    textColor: d.label,
    iconName: STATUS_ICONS[kind],
  };
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
    onCloseSheet,
  }) => {
    const { colors, isDark } = useTheme();
    const { isAuthenticated } = useAuth();
    const { t } = useLanguage();
    const router = useSafeNavigation();

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

    // Pending veya Approved randevuya ait bildirimlerde silme butonu gösterilmez
    const canDelete =
      !item.appointmentId ||
      (finalAppointmentStatus !== AppointmentStatus.Pending &&
        finalAppointmentStatus !== AppointmentStatus.Approved);

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

    const handleShowOnMap = React.useCallback(() => {
      const lat = payload?.store?.latitude;
      const lng = payload?.store?.longitude;
      if (!lat || !lng) return;
      onCloseSheet?.();
      setTimeout(() => {
        router.push({
          pathname: "/(freebarbertabs)/(panel)",
          params: { focusLat: String(lat), focusLng: String(lng) },
        });
      }, 220);
    }, [payload?.store?.latitude, payload?.store?.longitude, router, onCloseSheet]);

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

    const cardBg = unread
      ? isDark
        ? "rgba(26, 29, 36, 0.98)"
        : "#ffffff"
      : colors.screenBg;
    const cardBorder = unread
      ? isDark
        ? "rgba(240, 94, 35, 0.35)"
        : "rgba(240, 94, 35, 0.22)"
      : isDark
        ? "rgba(255,255,255,0.08)"
        : "rgba(15, 23, 42, 0.06)";

    // ========== RENDER ==========
    return (
      <TouchableOpacity
        onPress={handlePress}
        disabled={isAwaitingDecision}
        className="mb-3"
        style={{
          borderRadius: 20,
          borderWidth: 1,
          borderColor: cardBorder,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: unread ? 4 : 2 },
          shadowOpacity: isDark ? (unread ? 0.35 : 0.2) : unread ? 0.09 : 0.05,
          shadowRadius: unread ? 14 : 8,
          elevation: unread ? 5 : 2,
          overflow: "hidden",
          backgroundColor: cardBg,
        }}
        activeOpacity={0.72}
      >
        {unread && (
          <LinearGradient
            colors={
              isDark
                ? ["rgba(240, 94, 35, 0.14)", "rgba(240, 94, 35, 0)"]
                : ["rgba(240, 94, 35, 0.08)", "rgba(255,255,255,0)"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: 0,
              height: 72,
            }}
            pointerEvents="none"
          />
        )}
        <View
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            bottom: 0,
            width: unread ? 4 : 0,
            borderTopLeftRadius: 20,
            borderBottomLeftRadius: 20,
            backgroundColor: unread ? "#f05e23" : "transparent",
          }}
        />
        <View className="px-4 pt-4 pb-4">
        {/* Header */}
        <View className="flex-row items-center mb-2">
          {unread && (
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: "#f05e23",
                marginRight: 10,
                shadowColor: "#f05e23",
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.45,
                shadowRadius: 4,
                elevation: 2,
              }}
            />
          )}
          <Text
            className={`flex-1 text-base ${unread ? "font-bold" : "font-medium"}`}
            style={{ color: colors.sectionHeaderText }}
          >
            {getMessage(item.title)}
          </Text>
          <View className="flex-row items-center gap-2">
            {onDelete && canDelete && (
                <TouchableOpacity
                  onPress={handleDelete}
                  disabled={isDeleting}
                  className={`p-1 ${isDeleting ? "opacity-60" : ""}`}
                >
                  {isDeleting ? (
                    <ActivityIndicator size="small" color="#f87171" />
                  ) : (
                    <Icon source="delete-outline" size={18} color="#f87171" />
                  )}
                </TouchableOpacity>
              )}
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              {formatDate(item.createdAt)}
            </Text>
          </View>
        </View>

        {/* Payload Content */}
        {payload && (
          <View
            className="mt-2 pt-3 border-t"
            style={{
              borderTopColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.08)",
            }}
          >
            {/* Date and Time */}
            {payload.date && payload.startTime && payload.endTime && (
              <View
                style={[
                  contentStyles.scheduleStrip,
                  {
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.05)"
                      : "rgba(248, 250, 252, 0.95)",
                    borderColor: isDark
                      ? "rgba(255,255,255,0.07)"
                      : "rgba(203, 213, 225, 0.55)",
                  },
                ]}
              >
                <View style={contentStyles.scheduleItem}>
                  <View style={contentStyles.iconBubble}>
                    <Icon source="calendar" size={16} color="#d97706" />
                  </View>
                  <Text
                    style={[
                      contentStyles.scheduleText,
                      { color: colors.sectionHeaderText },
                    ]}
                  >
                    {formatDate(payload.date)}
                  </Text>
                </View>
                <View style={contentStyles.scheduleItem}>
                  <View style={contentStyles.iconBubble}>
                    <Icon source="clock-outline" size={16} color="#d97706" />
                  </View>
                  <Text
                    style={[
                      contentStyles.scheduleText,
                      { color: colors.sectionHeaderText },
                    ]}
                  >
                    {formatTime(payload.startTime)} – {formatTime(payload.endTime)}
                  </Text>
                </View>
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
                  <View
                    style={[
                      contentStyles.quoteBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(251, 191, 36, 0.1)"
                          : "rgba(254, 243, 199, 0.55)",
                        borderLeftColor: "#fbbf24",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        contentStyles.quoteText,
                        { color: colors.textSecondary },
                      ]}
                    >
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
                  <Text
                    style={[
                      contentStyles.sectionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("card.services")}
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {payload.serviceOfferings.map((service: any) => (
                      <View
                        key={service.id}
                        className="rounded-full px-3 py-1.5"
                        style={{
                          backgroundColor: isDark
                            ? "rgba(255,255,255,0.055)"
                            : "rgba(255, 251, 235, 0.65)",
                          borderWidth: 1,
                          borderColor: isDark
                            ? "rgba(253, 230, 138, 0.2)"
                            : "rgba(253, 224, 71, 0.35)",
                        }}
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

            {/* Service Packages */}
            {payload.packages && payload.packages.length > 0 && (
              <View className="mb-2 mt-2">
                <Text
                  style={[contentStyles.sectionLabel, { color: colors.textSecondary }]}
                >
                  Paketler
                </Text>
                <View style={{ gap: 6 }}>
                  {payload.packages.map((pkg: any) => (
                    <View
                      key={pkg.packageId}
                      className="px-3 py-2 rounded-xl"
                      style={{
                        backgroundColor: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.08)',
                        borderWidth: 1,
                        borderColor: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(167,139,250,0.2)',
                      }}
                    >
                      <View className="flex-row items-center justify-between">
                        <View className="flex-row items-center gap-1.5 flex-1 mr-2">
                          <Icon source="tag-multiple-outline" size={14} color="#a78bfa" />
                          <Text style={{ fontFamily: 'CenturyGothic-Bold', fontSize: 13, color: colors.sectionHeaderText, flex: 1 }} numberOfLines={1}>
                            {pkg.packageName}
                          </Text>
                        </View>
                        <Text style={{ fontFamily: 'CenturyGothic-Bold', fontSize: 13, color: '#a78bfa' }}>
                          {pkg.totalPrice} {t('card.currencySymbol')}
                        </Text>
                      </View>
                      {pkg.serviceNamesSnapshot && (
                        <Text style={{ fontFamily: 'CenturyGothic', fontSize: 11, color: colors.textSecondary, marginTop: 2, marginLeft: 20 }} numberOfLines={1}>
                          {pkg.serviceNamesSnapshot}
                        </Text>
                      )}
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
                  <Text
                    style={[
                      contentStyles.sectionLabel,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {t("common.note")}
                  </Text>
                  <View
                    style={[
                      contentStyles.noteBox,
                      {
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.045)"
                          : "rgba(241, 245, 249, 0.9)",
                        borderLeftColor: "#fcd34d",
                      },
                    ]}
                  >
                    <Text
                      style={[
                        contentStyles.noteBody,
                        { color: colors.sectionHeaderText },
                      ]}
                    >
                      {payload.note}
                    </Text>
                  </View>
                </View>
              )}
            {/* Haritada Göster butonu (FreeBarber - dükkan konumu var ise) */}
            {recipientRole === "freebarber" &&
              payload?.store &&
              payload.store.latitude != null &&
              payload.store.longitude != null && (
                <TouchableOpacity
                  onPress={handleShowOnMap}
                  className="mt-2 rounded-xl py-3 items-center justify-center flex-row gap-2"
                  style={{
                    backgroundColor: isDark ? "rgba(56,189,248,0.12)" : "rgba(224,242,254,0.7)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(56,189,248,0.35)" : "rgba(14,165,233,0.28)",
                  }}
                >
                  <Icon source="map-marker-outline" size={18} color={isDark ? "#7dd3fc" : "#0284c7"} />
                  <Text
                    className="text-sm font-semibold"
                    style={{ color: isDark ? "#bae6fd" : "#0369a1", fontFamily: "CenturyGothic-Bold" }}
                  >
                    Haritada Göster
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        )}

        {/* Status Display */}
        {showStatus && statusKind && (() => {
          const st = getStatusBannerLook(statusKind, isDark);
          return (
            <View
              className="mt-3 pt-3 border-t"
              style={{
                borderTopColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.08)",
              }}
            >
              <View
                style={{
                  paddingVertical: 14,
                  paddingHorizontal: 16,
                  borderRadius: 14,
                  backgroundColor: st.backgroundColor,
                  borderWidth: 1,
                  borderColor: st.borderColor,
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Icon source={st.iconName} size={22} color={st.iconColor} />
                  <Text
                    style={{
                      fontSize: 13,
                      textAlign: "center",
                      fontFamily: "CenturyGothic-Bold",
                      marginLeft: 10,
                      color: st.textColor,
                    }}
                  >
                    {t(`status.${statusKind}`)}
                  </Text>
                </View>
                {statusKind === "cancelled" &&
                  payload?.cancellationReason?.trim() && (
                    <Text
                      style={{
                        marginTop: 12,
                        fontSize: 13,
                        lineHeight: 19,
                        fontFamily: "CenturyGothic",
                        color: st.textColor,
                        textAlign: "center",
                        opacity: 0.92,
                      }}
                    >
                      {t("appointment.labels.cancellationReason")}:{" "}
                      {payload.cancellationReason.trim()}
                    </Text>
                  )}
              </View>
            </View>
          );
        })()}

        {/* Action Buttons */}
        {canShowButtons && (
          <View className="mt-3 pt-3 border-t" style={{ borderTopColor: colors.borderColor }}>
            {showOnlyRejectButton ? (
              <TouchableOpacity
                onPress={handleReject}
                disabled={isProcessing}
                className={`rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                style={{
                  backgroundColor: isDark ? "rgba(248,113,113,0.14)" : "rgba(254,202,202,0.55)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(248,113,113,0.38)" : "rgba(220,38,38,0.22)",
                }}
              >
                {isProcessing ? (
                  <ActivityIndicator color={isDark ? "#fca5a5" : "#dc2626"} size="small" />
                ) : (
                  <View className="flex-row items-center gap-2">
                    <Icon source="close-circle-outline" size={18} color={isDark ? "#fca5a5" : "#b91c1c"} />
                    <Text
                      className="text-sm font-semibold"
                      style={{ color: isDark ? "#fecaca" : "#991b1b", fontFamily: "CenturyGothic-Bold" }}
                    >
                      {t("common.reject")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            ) : (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={handleReject}
                  disabled={isProcessing}
                  className={`flex-1 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                  style={{
                    backgroundColor: isDark ? "rgba(248,113,113,0.14)" : "rgba(254,202,202,0.55)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(248,113,113,0.38)" : "rgba(220,38,38,0.22)",
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={isDark ? "#fca5a5" : "#dc2626"} size="small" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Icon source="close-circle-outline" size={18} color={isDark ? "#fca5a5" : "#b91c1c"} />
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: isDark ? "#fecaca" : "#991b1b", fontFamily: "CenturyGothic-Bold" }}
                      >
                        {t("common.reject")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleApprove}
                  disabled={isProcessing}
                  className={`flex-1 rounded-xl py-3 items-center justify-center ${isProcessing ? "opacity-60" : ""}`}
                  style={{
                    backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(187,247,208,0.65)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(34,197,94,0.38)" : "rgba(22,163,74,0.28)",
                  }}
                >
                  {isProcessing ? (
                    <ActivityIndicator color={isDark ? "#86efac" : "#15803d"} size="small" />
                  ) : (
                    <View className="flex-row items-center gap-2">
                      <Icon source="check-circle-outline" size={18} color={isDark ? "#86efac" : "#15803d"} />
                      <Text
                        className="text-sm font-semibold"
                        style={{ color: isDark ? "#bbf7d0" : "#166534", fontFamily: "CenturyGothic-Bold" }}
                      >
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
        </View>
      </TouchableOpacity>
    );
  },
  areEqual,
);

const contentStyles = StyleSheet.create({
  scheduleStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  scheduleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconBubble: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: "rgba(253, 224, 71, 0.28)",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleText: {
    fontSize: 14,
    fontFamily: "CenturyGothic-Bold",
  },
  sectionLabel: {
    fontSize: 10,
    fontFamily: "CenturyGothic-Bold",
    letterSpacing: 0.7,
    textTransform: "uppercase",
    marginBottom: 8,
    marginTop: 4,
  },
  quoteBox: {
    marginTop: 10,
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderLeftWidth: 3,
  },
  quoteText: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: "CenturyGothic",
  },
  noteBox: {
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderLeftWidth: 3,
  },
  noteBody: {
    fontSize: 14,
    lineHeight: 21,
    fontFamily: "CenturyGothic",
  },
});

NotificationItemOptimized.displayName = "NotificationItemOptimized";
