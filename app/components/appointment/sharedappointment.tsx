import React, { useState, useCallback, useMemo } from "react";
import { View, TouchableOpacity, RefreshControl, ActivityIndicator, ScrollView, } from "react-native";
import { Text } from "../common/Text";
import { LegendList } from "@legendapp/list";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { StarRatingDisplay } from "react-native-star-rating-widget";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import {
  useGetAllAppointmentByFilterQuery, useCancelAppointmentMutation, useCompleteAppointmentMutation, useToggleFavoriteMutation,
  useDeleteAppointmentMutation, useDeleteAllAppointmentsMutation, useBlockUserMutation,
  useGetAllBlockedUserIdsQuery,
} from "../../store/api";
import { AppointmentStatus, AppointmentFilter, AppointmentGetDto, AppointmentRequester, } from "../../types/appointment";
import { useAuth } from "../../hook/useAuth";
import { BarberType, UserType, PricingType, ImageOwnerType } from "../../types";
import FilterChip from "../common/filter-chip";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { RatingBottomSheet } from "./ratingbottomsheet";
import { ComplaintBottomSheet } from "./ComplaintBottomSheet";
import { getAppointmentStatusColor, getAppointmentStatusText, } from "../../utils/appointment/appointment-helpers";
import { FavoriteHeartButton } from "../common/FavoriteHeartButton";
import { OwnerAvatar } from "../common/owneravatar";
import { SkeletonComponent } from "../common/skeleton";
import { UnifiedStateWrapper } from "../common/UnifiedStateManager";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { useLanguage } from "../../hook/useLanguage";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

export default function SharedAppointmentScreen() {
  const { t, currentLanguage } = useLanguage();
  const { userId, userType } = useAuth();
  const guard = useActionGuard();
  const insets = useSafeAreaInsets();
  const { alert, alertSuccess, alertError, confirm } = useAlert();
  const { colors, isDark } = useTheme();
  const [activeFilter, setActiveFilter] = useState<AppointmentFilter>(
    AppointmentFilter.Active,
  );
  const ratingSheet = useBottomSheet({
    enablePanDownToClose: true,
  });
  const [selectedRatingTarget, setSelectedRatingTarget] = useState<{
    appointmentId: string;
    targetId: string;
    targetName: string;
    targetType: "store" | "freeBarber" | "manuelBarber" | "customer";
    targetImage?: string;
  } | null>(null);

  // Complaint Sheet
  const complaintSheet = useBottomSheet({
    snapPoints: ["50%", "80%"],
    enablePanDownToClose: true,
  });
  const [selectedComplaintTarget, setSelectedComplaintTarget] = useState<{
    appointmentId: string;
    targetUserId: string;
    targetName: string;
    targetImage?: string;
  } | null>(null);

  // User Selection Sheet (birden fazla hedef olduğunda)
  const userSelectionSheet = useBottomSheet({
    snapPoints: ["40%"],
    enablePanDownToClose: true,
  });
  const [userSelectionData, setUserSelectionData] = useState<{
    appointmentId: string;
    targets: Array<{ userId: string; name: string; image?: string; type: string }>;
    actionType: "complaint" | "block";
  } | null>(null);

  // --- API ---
  const {
    data: appointments,
    isLoading,
    refetch,
    isFetching,
    error,
    isError,
  } = useGetAllAppointmentByFilterQuery(activeFilter);

  const filteredAppointments = useMemo(() => {
    const items = appointments ?? [];

    if (activeFilter === AppointmentFilter.Active) {
      return items.filter((item) => item.status === AppointmentStatus.Approved);
    }

    if (activeFilter === AppointmentFilter.Completed) {
      return items.filter(
        (item) => item.status === AppointmentStatus.Completed,
      );
    }

    if (activeFilter === AppointmentFilter.Cancelled) {
      return items.filter(
        (item) =>
          item.status === AppointmentStatus.Cancelled ||
          item.status === AppointmentStatus.Rejected ||
          item.status === AppointmentStatus.Unanswered,
      );
    }

    if (activeFilter === AppointmentFilter.Pending) {
      return items.filter((item) => item.status === AppointmentStatus.Pending);
    }

    return items;
  }, [appointments, activeFilter]);

  const [cancelAppointment, { isLoading: isCancelling }] =
    useCancelAppointmentMutation();
  const [completeAppointment, { isLoading: isCompleting }] =
    useCompleteAppointmentMutation();
  const [toggleFavorite, { isLoading: isTogglingFavorite }] =
    useToggleFavoriteMutation();
  const [deleteAppointment, { isLoading: isDeletingAppointment }] =
    useDeleteAppointmentMutation();
  const [deleteAllAppointments, { isLoading: isDeletingAllAppointments }] =
    useDeleteAllAppointmentsMutation();
  const [blockUser, { isLoading: isBlockingUser }] = useBlockUserMutation();

  const { data: blockedUserIds = [] } = useGetAllBlockedUserIdsQuery(undefined, {
    skip: !userId,
  });
  const blockedIdSet = useMemo(
    () => new Set(blockedUserIds.map(String)),
    [blockedUserIds],
  );

  const favoriteHeartDisabled = useCallback(
    (
      item: AppointmentGetDto,
      role: "customer" | "freeBarber" | "store",
    ) => {
      if (isTogglingFavorite) return true;
      let uid: string | undefined;
      if (role === "customer") uid = item.customerUserId;
      else if (role === "freeBarber") uid = item.freeBarberUserId;
      else uid = item.storeUserId;
      if (uid && userId && uid === userId) return true;
      if (uid && blockedIdSet.has(uid)) return true;
      return false;
    },
    [isTogglingFavorite, userId, blockedIdSet],
  );

  // --- Helper Functions ---
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

  // --- Zaman Kontrolü ---
  const isTimePassed = useCallback(
    (dateStr?: string | null, endTimeStr?: string | null) => {
      if (!dateStr || !endTimeStr) return false;
      try {
        const timePart =
          endTimeStr.length === 5 ? endTimeStr + ":00" : endTimeStr;
        const appointmentEnd = new Date(`${dateStr}T${timePart}`);
        const now = new Date();
        return now > appointmentEnd;
      } catch {
        return false;
      }
    },
    [],
  );

  // Rating yapılabilir mi kontrolü (randevu durumu)
  const canRate = useCallback((item: AppointmentGetDto) => {
    return (
      item.status === AppointmentStatus.Completed ||
      item.status === AppointmentStatus.Cancelled ||
      item.status === AppointmentStatus.Unanswered
    );
  }, []);

  // Belirli bir kişiye yorum yapılabilir mi kontrolü
  const canRateTarget = useCallback(
    (
      item: AppointmentGetDto,
      targetType: "store" | "freeBarber" | "manuelBarber" | "customer",
    ): boolean => {
      // Sadece Completed veya Cancelled randevularda yorum yapılabilir
      if (!canRate(item)) return false;

      // ManuelBarber bir kullanıcı tipi değil, sadece entity

      // Customer: Store, FreeBarber, ManuelBarber'a yorum yapabilir (randevuda varsa)
      if (userType === UserType.Customer) {
        if (targetType === "store" && item.barberStoreId) return true;
        if (targetType === "freeBarber" && item.freeBarberId) return true;
        if (targetType === "manuelBarber" && item.manuelBarberId) return true; // ManuelBarber'a rating yapılabilir
        return false;
      }

      // BarberStore: Customer, FreeBarber'a yorum yapabilir
      // Not: BarberStore manuel barber'a yorum yapamaz (manuel barber dükkanın kendi çalışanı)
      if (userType === UserType.BarberStore) {
        if (targetType === "customer" && item.customerUserId) return true;
        if (targetType === "freeBarber" && item.freeBarberId) return true;
        return false;
      }

      // FreeBarber: Customer, Store'a yorum yapabilir
      // Not: FreeBarber manuel barber'a yorum yapamaz (manuel barber dükkanın çalışanı, free barber ile direkt ilişkisi yok)
      if (userType === UserType.FreeBarber) {
        if (targetType === "customer" && item.customerUserId) return true;
        if (targetType === "store" && item.barberStoreId) return true;
        return false;
      }

      return false;
    },
    [userType, canRate],
  );

  // Rating bottom sheet aç
  const openRatingSheet = useCallback(
    (
      appointmentId: string,
      targetId: string,
      targetName: string,
      targetType: "store" | "freeBarber" | "manuelBarber" | "customer",
      targetImage?: string,
    ) => {
      setSelectedRatingTarget({
        appointmentId,
        targetId,
        targetName,
        targetType,
        targetImage,
      });
      // Sheet'i açmak için küçük bir gecikme ekle
      setTimeout(() => {
        ratingSheet.present();
      }, 100);
    },
    [ratingSheet],
  );

  // Complaint bottom sheet aç
  const openComplaintSheet = useCallback(
    (
      appointmentId: string,
      targetUserId: string,
      targetName: string,
      targetImage?: string,
    ) => {
      setSelectedComplaintTarget({
        appointmentId,
        targetUserId,
        targetName,
        targetImage,
      });
      setTimeout(() => {
        complaintSheet.present();
      }, 100);
    },
    [complaintSheet],
  );

  // Şikayet/engelleme yapılabilecek TÜM hedef kullanıcıları bul
  const getAllComplaintTargets = useCallback(
    (item: AppointmentGetDto): Array<{ userId: string; name: string; image?: string; type: string }> => {
      const targets: Array<{ userId: string; name: string; image?: string; type: string }> = [];

      // Customer: store ve freeBarber'a şikayet edebilir
      if (userType === UserType.Customer) {
        if (item.barberStoreId && item.storeUserId) {
          targets.push({
            userId: item.storeUserId,
            name: item.storeName || t("labels.storeDefaultName"),
            image: item.storeImage,
            type: t("appointment.labels.storeName")
          });
        }
        if (item.freeBarberId && item.freeBarberUserId) {
          targets.push({
            userId: item.freeBarberUserId,
            name: item.freeBarberName || t("labels.freeBarberDefaultName"),
            image: item.freeBarberImage,
            type: t("labels.freeBarberDefaultName")
          });
        }
      }
      // BarberStore: customer ve freeBarber'a şikayet edebilir
      if (userType === UserType.BarberStore) {
        if (item.customerUserId) {
          targets.push({
            userId: item.customerUserId,
            name: item.customerName || t("labels.customerDefaultName"),
            image: item.customerImage,
            type: t("appointment.labels.customer")
          });
        }
        if (item.freeBarberId && item.freeBarberUserId) {
          targets.push({
            userId: item.freeBarberUserId,
            name: item.freeBarberName || t("labels.freeBarberDefaultName"),
            image: item.freeBarberImage,
            type: t("labels.freeBarberDefaultName")
          });
        }
      }
      // FreeBarber: customer ve store'a şikayet edebilir
      if (userType === UserType.FreeBarber) {
        if (item.customerUserId) {
          targets.push({
            userId: item.customerUserId,
            name: item.customerName || t("labels.customerDefaultName"),
            image: item.customerImage,
            type: t("appointment.labels.customer")
          });
        }
        if (item.barberStoreId && item.storeUserId) {
          targets.push({
            userId: item.storeUserId,
            name: item.storeName || t("labels.storeDefaultName"),
            image: item.storeImage,
            type: t("appointment.labels.storeName")
          });
        }
      }
      return targets;
    },
    [userType, t],
  );

  // Kullanıcıyı engelle
  const handleBlockUser = useCallback(
    async (targetUserId: string, targetName: string) => {
      confirm(
        t("block.confirmTitle"),
        t("block.confirmMessage", { name: targetName }),
        () => guard(async () => {
          const blockResult = await blockUser({ blockedToUserId: targetUserId });
          if ("error" in blockResult) {
            const errorMessage =
              (blockResult.error as any)?.data?.message ||
              t("block.createError");
            alertError(t("common.error"), errorMessage);
            return;
          }
          alertSuccess(t("common.success"), t("block.createSuccess"));
        }),
        undefined,
        t("block.submit"),
        t("common.cancel"),
      );
    },
    [blockUser, t, confirm, alertError, alertSuccess, guard],
  );

  // Şikayet veya Engelleme işlemini başlat (tek veya çoklu hedef kontrolü)
  const handleComplaintOrBlockAction = useCallback(
    (item: AppointmentGetDto, actionType: "complaint" | "block") => {
      const targets = getAllComplaintTargets(item);
      if (targets.length === 0) return;

      if (targets.length === 1) {
        // Tek hedef varsa direkt işlem yap
        const target = targets[0];
        if (actionType === "complaint") {
          openComplaintSheet(item.id, target.userId, target.name, target.image);
        } else {
          handleBlockUser(target.userId, target.name);
        }
      } else {
        // Birden fazla hedef varsa seçim sheet'ini aç
        setUserSelectionData({
          appointmentId: item.id,
          targets,
          actionType,
        });
        setTimeout(() => {
          userSelectionSheet.present();
        }, 100);
      }
    },
    [getAllComplaintTargets, openComplaintSheet, handleBlockUser, userSelectionSheet],
  );

  // Kullanıcı seçimi yapıldığında
  const handleUserSelected = useCallback(
    (target: { userId: string; name: string; image?: string }) => {
      if (!userSelectionData) return;

      userSelectionSheet.dismiss();

      setTimeout(() => {
        if (userSelectionData.actionType === "complaint") {
          openComplaintSheet(userSelectionData.appointmentId, target.userId, target.name, target.image);
        } else {
          handleBlockUser(target.userId, target.name);
        }
        setUserSelectionData(null);
      }, 300);
    },
    [userSelectionData, userSelectionSheet, openComplaintSheet, handleBlockUser],
  );

  // Favori toggle
  const handleToggleFavorite = useCallback(
    (targetId: string, appointmentId?: string) => guard(async () => {
      const favoriteResult = await toggleFavorite({
        targetId,
        appointmentId: appointmentId || null,
      });
      if ("error" in favoriteResult) {
        const errorMessage =
          (favoriteResult.error as any)?.data?.message ||
          t("appointment.alerts.favoriteFailed");
        alertError(t("common.error"), errorMessage);
      }
    }),
    [toggleFavorite, t, alertError, guard],
  );

  // --- İşlemler ---
  const handleCancel = async (id: string) => {
    confirm(
      t("appointment.alerts.cancellationTitle"),
      t("appointment.alerts.confirmCancellation"),
      () => guard(async () => {
        const cancelResult = await cancelAppointment(id);
        if ("error" in cancelResult) {
          const errorMessage =
            (cancelResult.error as any)?.data?.message ||
            t("appointment.alerts.cancelFailed");
          alertError(t("common.error"), errorMessage);
          return;
        }
        alertSuccess(t("common.success"), t("appointment.alerts.cancelled"));
      }),
      undefined,
      t("appointment.actions.cancel"),
      t("appointment.alerts.cancel"),
    );
  };

  const handleComplete = async (id: string) => {
    confirm(
      t("appointment.alerts.completionTitle"),
      t("appointment.alerts.confirmCompletion"),
      () => guard(async () => {
        const completeResult = await completeAppointment(id);
        if ("error" in completeResult) {
          const errorMessage =
            (completeResult.error as any)?.data?.message ||
            t("appointment.alerts.completeFailed");
          alertError(t("common.error"), errorMessage);
          return;
        }
        alertSuccess(t("common.success"), t("appointment.alerts.completed"));
      }),
      undefined,
      t("appointment.actions.complete"),
      t("appointment.alerts.cancel"),
    );
  };

  const handleDelete = useCallback(
    async (appointmentId: string) => {
      confirm(
        t("appointment.alerts.deleteTitle"),
        t("appointment.alerts.confirmDelete"),
        () => guard(async () => {
          const deleteResult = await deleteAppointment(appointmentId);
          if ("error" in deleteResult) {
            const errorMessage =
              (deleteResult.error as any)?.data?.message ||
              t("appointment.alerts.deleteFailed");
            alertError(t("common.error"), errorMessage);
            return;
          }
          alertSuccess(t("common.success"), t("appointment.alerts.deleted"));
        }),
        undefined,
        t("appointment.actions.delete"),
        t("common.cancel"),
      );
    },
    [deleteAppointment, t, confirm, alertError, alertSuccess, guard],
  );

  const handleDeleteAll = useCallback(async () => {
    confirm(
      t("appointment.alerts.deleteAllTitle"),
      t("appointment.alerts.confirmDeleteAll"),
      () => guard(async () => {
        const deleteAllResult = await deleteAllAppointments();
        if ("error" in deleteAllResult) {
          const errorMessage =
            (deleteAllResult.error as any)?.data?.message ||
            t("appointment.alerts.deleteAllFailed");
          alertError(t("common.error"), errorMessage);
          return;
        }
        alertSuccess(
          t("common.success"),
          t("appointment.alerts.deletedAll"),
        );
      }),
      undefined,
      t("appointment.actions.delete"),
      t("common.cancel"),
    );
  }, [deleteAllAppointments, t, confirm, alertError, alertSuccess, guard]);

  // Rating Component - Ortalama rating ve kullanıcının rating'i göster
  const RatingDisplay = ({
    myRating,
    myComment,
    averageRating,
    canRateNow,
    onRatePress,
  }: {
    myRating?: number;
    myComment?: string;
    averageRating?: number;
    canRateNow: boolean;
    onRatePress: () => void;
  }) => {
    return (
      <View className="mt-3">
        {/* Ortalama Rating - Her zaman göster (eğer varsa) */}
        {averageRating !== undefined && averageRating !== null && (
          <View className="flex-row items-center mb-2">
            <Icon source="star" size={14} color="#fbbf24" />
            <Text className="text-[#fbbf24] text-xs  font-semibold ml-1">
              {formatRating(averageRating)}
            </Text>
            <Text className="text-[#6b7280] text-xs ml-1">
              ({t("appointment.labels.average")})
            </Text>
          </View>
        )}

        {/* Kullanıcının Rating'i - Eğer yapmışsa göster */}
        {myRating !== undefined && myRating !== null && myRating > 0 && (
          <View className="mb-2">
            <View className="flex-row items-center mb-2">
              <StarRatingDisplay
                rating={myRating}
                starSize={14}
                starStyle={{ marginHorizontal: 1 }}
              />
              <Text className="text-[#fbbf24] text-xs font-semibold ml-2">
                {formatRating(myRating)}
              </Text>
              <Text className="text-[#6b7280] text-xs ml-1">
                ({t("appointment.labels.yourComment")})
              </Text>
            </View>
            {myComment && (
              <View
                className="rounded-lg p-3 mt-1"
                style={{
                  backgroundColor: colors.cardBg3,
                  borderColor: colors.borderColor,
                  borderWidth: 1,
                }}
              >
                <Text
                  className="text-[#d1d5db] text-xs leading-4"
                  numberOfLines={3}
                  ellipsizeMode="tail"
                >
                  "{myComment}"
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Rating Yap Butonu - Eğer yapmamışsa ve yorum yapılabilir durumda ise göster */}
        {canRateNow &&
          (myRating === null || myRating === undefined || myRating === 0) && (
            <TouchableOpacity
              onPress={onRatePress}
              className="flex-row items-center justify-center rounded-lg px-3 py-2.5 mt-1"
              style={{
                backgroundColor: colors.cardBg3,
                borderColor: "rgba(255,185,0,0.3)",
                borderWidth: 1,
              }}
            >
              <Icon source="star-outline" size={16} color="#ffb900" />
              <Text className="text-[#ffb900] text-xs font-semibold ml-2">
                {t("appointment.labels.makeComment")}
              </Text>
            </TouchableOpacity>
          )}
      </View>
    );
  };

  // --- RENDER ITEM ---
  const renderItem = ({ item }: { item: AppointmentGetDto }) => {
    const hasSchedule =
      !!item.appointmentDate && !!item.startTime && !!item.endTime;
    const passed = hasSchedule
      ? isTimePassed(item.appointmentDate, item.endTime)
      : false;
    const isApproved = item.status === AppointmentStatus.Approved;
    const isUnanswered = item.status === AppointmentStatus.Unanswered;
    const isStoreCallWithoutSchedule =
      item.appointmentRequester === AppointmentRequester.Store && !hasSchedule;

    let showCompleteButton = false;
    let showCancelButton = false;
    let showDeleteButton = false;

    if (activeFilter === AppointmentFilter.Active) {
      // Active tab'ında Pending/Approved randevular görünür
      // Dükkan randevusunu dükkan tamamlar
      if (
        isApproved &&
        userType === UserType.BarberStore &&
        (passed || isStoreCallWithoutSchedule)
      ) {
        showCompleteButton = true;
      }
      // İsteğime Göre randevusunu free barber tamamlar (store yoksa veya CustomRequest ise)
      // Müşteri-free barber arasında isteğe göre randevu onaylandıysa free barber tamamlama hakkına sahip
      if (
        isApproved &&
        userType === UserType.FreeBarber &&
        !item.barberStoreId
      ) {
        showCompleteButton = true;
      }

      // Active tab'ında sadece Approved durumunda iptal butonu göster
      if (isApproved) {
        showCancelButton = true;
      }
    }

    // Pending tab'ında bekleyen randevuları iptal edebilirsin
    if (activeFilter === AppointmentFilter.Pending && item.status === AppointmentStatus.Pending) {
      showCancelButton = true;
    }

    // Delete butonu - Sadece Completed ve Cancelled tablarında gösterilir, Pending ve Approved durumunda gösterilmez
    if (
      (activeFilter === AppointmentFilter.Completed ||
        activeFilter === AppointmentFilter.Cancelled) &&
      item.status !== AppointmentStatus.Pending &&
      item.status !== AppointmentStatus.Approved
    ) {
      showDeleteButton = true;
    }

    // Tamamlanan/iptal durumlarında kart tasarımını iyileştir
    const isCompletedOrCancelled =
      activeFilter === AppointmentFilter.Completed ||
      activeFilter === AppointmentFilter.Cancelled;

    // Durum badge'i için
    const statusColor = getAppointmentStatusColor(item.status);
    const statusText = getAppointmentStatusText(item.status);
    const statusIconName =
      isApproved
        ? "check-circle"
        : item.status === AppointmentStatus.Pending
          ? "clock-outline"
          : isUnanswered
            ? "clock-alert"
            : item.status === AppointmentStatus.Rejected
              ? "close-circle"
              : item.status === AppointmentStatus.Cancelled
                ? "cancel"
                : item.status === AppointmentStatus.Completed
                  ? "check-all"
                  : "information";

    const participantCardStyle = {
      borderRadius: 12,
      padding: 11,
      backgroundColor: colors.cardBg2,
      borderWidth: 1,
      borderColor: colors.borderColor,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.14 : 0.04,
      shadowRadius: 6,
      elevation: 2,
    };
    const sectionLabelStyle = {
      color: isDark ? "#fb923c" : "#c2410c",
      fontFamily: "CenturyGothic-Bold",
      fontSize: 11,
      marginBottom: 2,
      letterSpacing: 0.15,
    };
    const metaLineStyle = {
      color: colors.textSecondary,
      fontFamily: "CenturyGothic",
      fontSize: 12,
    };
    const favoriteBtnWrap = {
      padding: 7,
      borderRadius: 999,
      backgroundColor: colors.cardBg3,
      borderWidth: 1,
      borderColor: colors.borderColor2,
    };
    const avatarRingWrap = {
      padding: 1.5,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: isDark ? "rgba(240, 94, 35, 0.4)" : "rgba(251, 146, 60, 0.45)",
      marginRight: 10,
    };
    const scheduleStripOuter = {
      borderRadius: 12,
      padding: 8,
      marginBottom: 8,
      backgroundColor: colors.cardBg2,
      borderWidth: 1,
      borderColor: colors.borderColor,
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    };
    const schedulePill = {
      flex: 1,
      flexDirection: "row" as const,
      alignItems: "center" as const,
      paddingVertical: 7,
      paddingHorizontal: 9,
      borderRadius: 10,
      backgroundColor: colors.cardBg3,
      borderWidth: 1,
      borderColor: colors.borderColor,
    };
    const dateLocale =
      currentLanguage === "tr"
        ? "tr-TR"
        : currentLanguage === "de"
          ? "de-DE"
          : currentLanguage === "ar"
            ? "ar-SA"
            : "en-US";

    return (
      <View
        className="rounded-2xl mb-3 overflow-hidden"
        style={{
          backgroundColor: colors.cardBg,
          borderColor: isCompletedOrCancelled ? colors.borderColor : "rgba(255, 185, 0, 0.32)",
          borderWidth: 1,
          borderRadius: 14,
          borderLeftWidth: 3,
          borderLeftColor: statusColor,
          shadowColor: statusColor,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: isDark ? 0.12 : isCompletedOrCancelled ? 0.04 : 0.08,
          shadowRadius: 8,
          elevation: 3,
        }}
      >
        <View className="p-3">
        {/* Durum Badge'i - Active, Pending tab'ında ve tamamlanan/iptal durumlarında göster */}
        {(activeFilter === AppointmentFilter.Active ||
          activeFilter === AppointmentFilter.Pending ||
          isCompletedOrCancelled) && (
            <View
              className="mb-2 pb-2"
              style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
            >
              <View
                className="flex-row items-center gap-2 justify-between"
                style={{
                  backgroundColor: isDark ? `${statusColor}24` : `${statusColor}14`,
                  borderRadius: 10,
                  paddingVertical: 8,
                  paddingHorizontal: 10,
                  borderWidth: 1,
                  borderColor: isDark ? `${statusColor}45` : `${statusColor}30`,
                }}
              >
                <View className="flex-row items-center gap-2 flex-1">
                  <Icon
                    source={statusIconName}
                    size={16}
                    color={statusColor}
                  />
                  <Text
                    className="text-sm font-semibold flex-shrink"
                    style={{ color: statusColor, fontFamily: "CenturyGothic-Bold" }}
                    numberOfLines={2}
                  >
                    {statusText}
                  </Text>
                  {/* Zaman geçmişse uyarı göster - Active tab'ında sadece Approved randevular var */}
                  {passed && isApproved && (
                    <View className="flex-row items-center ml-2">
                      <Icon source="alert-circle" size={14} color="#ffb900" />
                      <Text className="text-[#ffb900] text-xs ml-1">
                        {t("appointment.labels.timePassed")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}

        {item.startTime &&
          item.endTime &&
          item.appointmentDate && (
            <View style={scheduleStripOuter}>
              <View className="flex-row gap-2">
                <View style={schedulePill}>
                  <View
                    style={{
                      padding: 5,
                      borderRadius: 8,
                      backgroundColor: isDark ? "#f05e2318" : "#fff7ed",
                      marginRight: 7,
                    }}
                  >
                    <Icon source="calendar-month" size={16} color="#f05e23" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        color: isDark ? "#fb923c" : "#c2410c",
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 10,
                        marginBottom: 1,
                        letterSpacing: 0.2,
                      }}
                    >
                      {t("appointment.labels.scheduleDate")}
                    </Text>
                    <Text
                      style={{
                        color: colors.sectionHeaderText,
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 12,
                      }}
                      numberOfLines={2}
                    >
                      {new Date(item.appointmentDate).toLocaleDateString(
                        dateLocale,
                        {
                          weekday: "short",
                          day: "numeric",
                          month: "long",
                        },
                      )}
                    </Text>
                  </View>
                </View>
                <View style={schedulePill}>
                  <View
                    style={{
                      padding: 5,
                      borderRadius: 8,
                      backgroundColor: isDark ? "#f05e2318" : "#fff7ed",
                      marginRight: 7,
                    }}
                  >
                    <Icon source="clock-outline" size={16} color="#f05e23" />
                  </View>
                  <View className="flex-1">
                    <Text
                      style={{
                        color: isDark ? "#fb923c" : "#c2410c",
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 10,
                        marginBottom: 1,
                        letterSpacing: 0.2,
                      }}
                    >
                      {t("appointment.labels.scheduleTime")}
                    </Text>
                    <Text
                      style={{
                        color: colors.sectionHeaderText,
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 13,
                      }}
                      numberOfLines={1}
                    >
                      {item.startTime.substring(0, 5)} –{" "}
                      {item.endTime.substring(0, 5)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

        <View className="mb-3 gap-2">
          {/* Birincil aksiyonlar */}
          {(showCompleteButton || showCancelButton) && (
            <View className="flex-row gap-3 justify-end">
              {showCompleteButton && (
                <TouchableOpacity
                  onPress={() => handleComplete(item.id)}
                  disabled={isCompleting}
                  className="bg-green-600 flex-1 py-2.5 rounded-xl flex-row items-center justify-center"
                  style={{
                    shadowColor: "#15803d",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.35,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  {isCompleting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Icon source="check-all" size={16} color="white" />
                      <Text className="text-white text-sm font-semibold ml-2">
                        {t("appointment.actions.complete")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
              {showCancelButton && (
                <TouchableOpacity
                  onPress={() => handleCancel(item.id)}
                  disabled={isCancelling}
                  className="bg-red-600 flex-1 py-2.5 rounded-xl flex-row items-center justify-center"
                  style={{
                    borderWidth: 1,
                    borderColor: "rgba(127, 29, 29, 0.5)",
                    shadowColor: "#b91c1c",
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.3,
                    shadowRadius: 6,
                    elevation: 4,
                  }}
                >
                  {isCancelling ? (
                    <ActivityIndicator color="#ef4444" size="small" />
                  ) : (
                    <>
                      <Icon source="close-circle-outline" size={16} color="#fff" />
                      <Text className="text-white text-sm font-semibold ml-2">
                        {t("appointment.actions.cancel")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
          {/* İkincil aksiyonlar (Şikayet, Engelle, Sil) */}
          {((activeFilter === AppointmentFilter.Completed ||
            activeFilter === AppointmentFilter.Cancelled) &&
            getAllComplaintTargets(item).length > 0 || showDeleteButton) && (
            <View className="flex-row gap-3 justify-end">
              {(activeFilter === AppointmentFilter.Completed ||
                activeFilter === AppointmentFilter.Cancelled) &&
                getAllComplaintTargets(item).length > 0 && (
                  <>
                    <TouchableOpacity
                      onPress={() => handleComplaintOrBlockAction(item, "complaint")}
                      className="px-4 py-2 rounded-xl flex-row items-center justify-center"
                      style={{
                        backgroundColor: colors.cardBg3,
                        borderColor: "rgba(245,158,11,0.4)",
                        borderWidth: 1,
                      }}
                    >
                      <Icon source="alert-circle-outline" size={15} color="#f59e0b" />
                      <Text className="text-[#f59e0b] text-sm ml-2">
                        {t("complaint.title")}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleComplaintOrBlockAction(item, "block")}
                      disabled={isBlockingUser}
                      className={`px-4 py-2 rounded-xl flex-row items-center justify-center ${isBlockingUser ? "opacity-60" : ""}`}
                      style={{
                        backgroundColor: colors.cardBg3,
                        borderColor: "rgba(156,163,175,0.4)",
                        borderWidth: 1,
                      }}
                    >
                      {isBlockingUser ? (
                        <ActivityIndicator color="#9ca3af" size="small" />
                      ) : (
                        <>
                          <Icon source="block-helper" size={15} color="#9ca3af" />
                          <Text className="text-[#9ca3af] text-sm ml-2">
                            {t("block.submit")}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </>
                )}
              {showDeleteButton && (
                <TouchableOpacity
                  onPress={() => handleDelete(item.id)}
                  disabled={isDeletingAppointment}
                  className={`bg-red-500 border border-red-900/40 px-4 py-2 rounded-xl flex-row items-center justify-center ${isDeletingAppointment ? "opacity-60" : ""}`}
                >
                  {isDeletingAppointment ? (
                    <ActivityIndicator color="#ef4444" size="small" />
                  ) : (
                    <>
                      <Icon source="delete-outline" size={15} color="#fff" />
                      <Text className="text-white text-sm ml-2">
                        {t("appointment.actions.delete")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View className="mb-0">
          {userType === UserType.BarberStore && (
            <View className="gap-2.5">
              {item.customerUserId && (
                <View style={participantCardStyle}>
                  <View className="flex-row items-start mb-1">
                    <OwnerAvatar
                      wrapperStyle={avatarRingWrap}
                      ownerId={item.customerUserId}
                      ownerType={ImageOwnerType.User}
                      fallbackUrl={item.customerImage}
                      imageClassName="w-14 h-14 rounded-xl"
                      iconSource="account"
                      iconSize={24}
                      iconColor="#6b7280"
                    />
                    <View className="flex-1">
                      <Text style={sectionLabelStyle}>
                        {t("appointment.labels.customer")}
                      </Text>
                      <Text
                        className="mb-1"
                        style={{
                          color: colors.sectionHeaderText,
                          fontFamily: "CenturyGothic-Bold",
                          fontSize: 15,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.customerName}
                      </Text>
                      {item.customerNumber && (
                        <Text style={metaLineStyle}>
                          {t("card.customerNumber")}: {item.customerNumber}
                        </Text>
                      )}
                    </View>
                    <View className="mb-1">
                      <FavoriteHeartButton
                        active={!!item.isCustomerFavorite}
                        onPress={() =>
                          item.customerUserId &&
                          handleToggleFavorite(item.customerUserId, item.id)
                        }
                        disabled={favoriteHeartDisabled(item, "customer")}
                        style={favoriteBtnWrap}
                        size={20}
                      />
                    </View>
                  </View>
                  <RatingDisplay
                    myRating={item.myRatingForCustomer}
                    myComment={item.myCommentForCustomer}
                    averageRating={item.customerAverageRating}
                    canRateNow={canRateTarget(item, "customer")}
                    onRatePress={() =>
                      item.customerUserId &&
                      openRatingSheet(
                        item.id,
                        item.customerUserId,
                        item.customerName || t("labels.customerDefaultName"),
                        "customer",
                        item.customerImage,
                      )
                    }
                  />
                </View>
              )}
              <View style={participantCardStyle}>
                {item.freeBarberId ? (
                  <View>
                    <View className="flex-row items-start mb-1">
                      <OwnerAvatar
                        wrapperStyle={avatarRingWrap}
                        ownerId={item.freeBarberId}
                        ownerType={ImageOwnerType.FreeBarber}
                        fallbackUrl={item.freeBarberImage}
                        imageClassName="w-14 h-14 rounded-xl"
                        iconSource="account-supervisor"
                        iconSize={24}
                        iconColor="#6b7280"
                      />
                      <View className="flex-1">
                        <Text style={sectionLabelStyle}>
                          {t("appointment.labels.rentingBarber")}
                        </Text>
                        <Text
                          className="mb-1"
                          style={{
                            color: colors.sectionHeaderText,
                            fontFamily: "CenturyGothic-Bold",
                            fontSize: 15,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.freeBarberName ||
                            t("labels.freeBarberDefaultName")}
                        </Text>
                        {item.freeBarberNumber && (
                          <Text style={metaLineStyle}>
                            {t("card.freeBarberNumber")}: {item.freeBarberNumber}
                          </Text>
                        )}
                      </View>
                      <View className="mb-1">
                        <FavoriteHeartButton
                          active={!!item.isFreeBarberFavorite}
                          onPress={() =>
                            item.freeBarberId &&
                            handleToggleFavorite(item.freeBarberId, item.id)
                          }
                          disabled={favoriteHeartDisabled(item, "freeBarber")}
                          style={favoriteBtnWrap}
                          size={20}
                        />
                      </View>
                    </View>
                    <RatingDisplay
                      myRating={item.myRatingForFreeBarber}
                      myComment={item.myCommentForFreeBarber}
                      averageRating={item.freeBarberAverageRating}
                      canRateNow={canRateTarget(item, "freeBarber")}
                      onRatePress={() =>
                        item.freeBarberId &&
                        openRatingSheet(
                          item.id,
                          item.freeBarberId,
                          item.freeBarberName ||
                          t("labels.freeBarberDefaultName"),
                          "freeBarber",
                          item.freeBarberImage,
                        )
                      }
                    />
                  </View>
                ) : item.manuelBarberId ? (
                  <View>
                    <View className="flex-row items-start mb-1">
                      <OwnerAvatar
                        wrapperStyle={avatarRingWrap}
                        ownerId={item.manuelBarberId}
                        ownerType={ImageOwnerType.ManuelBarber}
                        fallbackUrl={item.manuelBarberImage}
                        imageClassName="w-14 h-14 rounded-xl"
                        iconSource="account"
                        iconSize={24}
                        iconColor="#6b7280"
                      />
                      <View className="flex-1">
                        <Text style={sectionLabelStyle}>
                          {t("appointment.labels.storeBarber")}
                        </Text>
                        <Text
                          className="mb-1"
                          style={{
                            color: colors.sectionHeaderText,
                            fontFamily: "CenturyGothic-Bold",
                            fontSize: 15,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.manuelBarberName}
                        </Text>
                      </View>
                    </View>
                    {/* Manuel barber için rating yapılabilir (sadece Customer) */}
                    <RatingDisplay
                      myRating={item.myRatingForManuelBarber}
                      myComment={item.myCommentForManuelBarber}
                      averageRating={item.manuelBarberAverageRating}
                      canRateNow={canRateTarget(item, "manuelBarber")}
                      onRatePress={() =>
                        item.manuelBarberId &&
                        openRatingSheet(
                          item.id,
                          item.manuelBarberId,
                          item.manuelBarberName || t("favorites.manuelBarber"),
                          "manuelBarber",
                          item.manuelBarberImage,
                        )
                      }
                    />
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <View
                      className="w-14 h-14 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: colors.cardBg3,
                        borderWidth: 1,
                        borderColor: isDark ? "rgba(240, 94, 35, 0.4)" : "rgba(251, 146, 60, 0.45)",
                        marginRight: 10,
                      }}
                    >
                      <Icon source="seat" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                    </View>
                    <View className="flex-1">
                      <Text
                        style={{
                          fontFamily: "CenturyGothic-Bold",
                          fontSize: 15,
                          color: colors.sectionHeaderText,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.chairName}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}

          {userType === UserType.FreeBarber && (
            <View className="gap-2.5">
              {item.barberStoreId && (
                <View style={participantCardStyle}>
                  <View className="flex-row items-start mb-1">
                    <OwnerAvatar
                      wrapperStyle={avatarRingWrap}
                      ownerId={item.barberStoreId}
                      ownerType={ImageOwnerType.Store}
                      fallbackUrl={item.storeImage}
                      imageClassName="w-14 h-14 rounded-xl"
                      iconSource="store"
                      iconSize={24}
                      iconColor="#6b7280"
                    />
                    <View className="flex-1">
                      <Text style={sectionLabelStyle}>
                        {t("appointment.labels.storeName")}
                      </Text>
                      <Text
                        className="mb-1"
                        style={{
                          color: colors.sectionHeaderText,
                          fontFamily: "CenturyGothic-Bold",
                          fontSize: 15,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.storeName}
                      </Text>
                      {item.storeType !== undefined && (
                        <Text style={[metaLineStyle, { opacity: 0.85 }]}>
                          {getBarberTypeName(item.storeType as BarberType)}
                        </Text>
                      )}
                      {item.storeOwnerNumber && (
                        <Text style={metaLineStyle}>
                          {t("card.storeOwnerNumber")}: {item.storeOwnerNumber}
                        </Text>
                      )}
                    </View>
                    <View className="mb-1">
                      <FavoriteHeartButton
                        active={!!item.isStoreFavorite}
                        onPress={() =>
                          item.barberStoreId &&
                          handleToggleFavorite(item.barberStoreId, item.id)
                        }
                        disabled={favoriteHeartDisabled(item, "store")}
                        style={favoriteBtnWrap}
                        size={20}
                      />
                    </View>
                  </View>
                  <RatingDisplay
                    myRating={item.myRatingForStore}
                    myComment={item.myCommentForStore}
                    averageRating={item.storeAverageRating}
                    canRateNow={canRateTarget(item, "store")}
                    onRatePress={() =>
                      item.barberStoreId &&
                      openRatingSheet(
                        item.id,
                        item.barberStoreId,
                        item.storeName || t("labels.storeDefaultName"),
                        "store",
                        item.storeImage,
                      )
                    }
                  />
                </View>
              )}
              {item.customerUserId && (
                <View style={participantCardStyle}>
                  <View className="flex-row items-start mb-1">
                    <OwnerAvatar
                      wrapperStyle={avatarRingWrap}
                      ownerId={item.customerUserId}
                      ownerType={ImageOwnerType.User}
                      fallbackUrl={item.customerImage}
                      imageClassName="w-14 h-14 rounded-xl"
                      iconSource="account"
                      iconSize={24}
                      iconColor="#6b7280"
                    />
                    <View className="flex-1">
                      <Text style={sectionLabelStyle}>
                        {t("card.customerOf")}
                      </Text>
                      <Text
                        className="mb-1"
                        style={{
                          color: colors.sectionHeaderText,
                          fontFamily: "CenturyGothic-Bold",
                          fontSize: 15,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.customerName || t("labels.customerDefaultName")}
                      </Text>
                      {item.customerNumber && (
                        <Text style={metaLineStyle}>
                          {t("card.customerNumber")}: {item.customerNumber}
                        </Text>
                      )}
                    </View>
                    <View className="mb-1">
                      <FavoriteHeartButton
                        active={!!item.isCustomerFavorite}
                        onPress={() =>
                          item.customerUserId &&
                          handleToggleFavorite(item.customerUserId, item.id)
                        }
                        disabled={favoriteHeartDisabled(item, "customer")}
                        style={favoriteBtnWrap}
                        size={20}
                      />
                    </View>
                  </View>
                  <RatingDisplay
                    myRating={item.myRatingForCustomer}
                    myComment={item.myCommentForCustomer}
                    averageRating={item.customerAverageRating}
                    canRateNow={canRateTarget(item, "customer")}
                    onRatePress={() =>
                      item.customerUserId &&
                      openRatingSheet(
                        item.id,
                        item.customerUserId,
                        item.customerName || t("labels.customerDefaultName"),
                        "customer",
                        item.customerImage,
                      )
                    }
                  />
                </View>
              )}
            </View>
          )}

          {userType === UserType.Customer && (
            <View className="gap-2.5">
              {item.barberStoreId && (
                <View style={participantCardStyle}>
                  <View className="flex-row items-start mb-1">
                    <OwnerAvatar
                      wrapperStyle={avatarRingWrap}
                      ownerId={item.barberStoreId}
                      ownerType={ImageOwnerType.Store}
                      fallbackUrl={item.storeImage}
                      imageClassName="w-14 h-14 rounded-xl"
                      iconSource="store"
                      iconSize={24}
                      iconColor="#6b7280"
                    />
                    <View className="flex-1">
                      <Text style={sectionLabelStyle}>
                        {t("appointment.labels.storeName")}
                      </Text>
                      <Text
                        className="mb-1"
                        style={{
                          color: colors.sectionHeaderText,
                          fontFamily: "CenturyGothic-Bold",
                          fontSize: 15,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.storeName}
                      </Text>
                      {item.storeType !== undefined && (
                        <Text style={[metaLineStyle, { opacity: 0.85 }]}>
                          {getBarberTypeName(item.storeType as BarberType)}
                        </Text>
                      )}
                      {item.storeOwnerNumber && (
                        <Text style={metaLineStyle}>
                          {t("card.storeOwnerNumber")}: {item.storeOwnerNumber}
                        </Text>
                      )}
                    </View>
                    <View className="mb-1">
                      <FavoriteHeartButton
                        active={!!item.isStoreFavorite}
                        onPress={() =>
                          item.barberStoreId &&
                          handleToggleFavorite(item.barberStoreId, item.id)
                        }
                        disabled={favoriteHeartDisabled(item, "store")}
                        style={favoriteBtnWrap}
                        size={20}
                      />
                    </View>
                  </View>
                  <RatingDisplay
                    myRating={item.myRatingForStore}
                    myComment={item.myCommentForStore}
                    averageRating={item.storeAverageRating}
                    canRateNow={canRateTarget(item, "store")}
                    onRatePress={() =>
                      item.barberStoreId &&
                      openRatingSheet(
                        item.id,
                        item.barberStoreId,
                        item.storeName || t("labels.storeDefaultName"),
                        "store",
                        item.storeImage,
                      )
                    }
                  />
                </View>
              )}

              <View style={participantCardStyle}>
                {item.freeBarberId ? (
                  <View>
                    <View className="flex-row items-start mb-1">
                      <OwnerAvatar
                        wrapperStyle={avatarRingWrap}
                        ownerId={item.freeBarberId}
                        ownerType={ImageOwnerType.FreeBarber}
                        fallbackUrl={item.freeBarberImage}
                        imageClassName="w-14 h-14 rounded-xl"
                        iconSource="account-supervisor"
                        iconSize={24}
                        iconColor="#6b7280"
                      />
                      <View className="flex-1">
                        <Text style={sectionLabelStyle}>
                          {t("appointment.labels.serviceProvider")}
                        </Text>
                        <Text
                          className="mb-1"
                          style={{
                            color: colors.sectionHeaderText,
                            fontFamily: "CenturyGothic-Bold",
                            fontSize: 15,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.freeBarberName ||
                            t("labels.freeBarberDefaultName")}
                        </Text>
                        <Text style={[metaLineStyle, { opacity: 0.85 }]}>
                          {t("labels.freeBarberDefaultName")}
                        </Text>
                        {item.freeBarberNumber && (
                          <Text style={metaLineStyle}>
                            {t("card.freeBarberNumber")}: {item.freeBarberNumber}
                          </Text>
                        )}
                      </View>
                      <View className="mb-1">
                        <FavoriteHeartButton
                          active={!!item.isFreeBarberFavorite}
                          onPress={() =>
                            item.freeBarberId &&
                            handleToggleFavorite(item.freeBarberId, item.id)
                          }
                          disabled={favoriteHeartDisabled(item, "freeBarber")}
                          style={favoriteBtnWrap}
                          size={20}
                        />
                      </View>
                    </View>
                    <RatingDisplay
                      myRating={item.myRatingForFreeBarber}
                      myComment={item.myCommentForFreeBarber}
                      averageRating={item.freeBarberAverageRating}
                      canRateNow={canRateTarget(item, "freeBarber")}
                      onRatePress={() =>
                        item.freeBarberId &&
                        openRatingSheet(
                          item.id,
                          item.freeBarberId,
                          item.freeBarberName ||
                          t("labels.freeBarberDefaultName"),
                          "freeBarber",
                          item.freeBarberImage,
                        )
                      }
                    />
                  </View>
                ) : item.manuelBarberId ? (
                  <View>
                    <View className="flex-row items-start mb-1">
                      <OwnerAvatar
                        wrapperStyle={avatarRingWrap}
                        ownerId={item.manuelBarberId}
                        ownerType={ImageOwnerType.ManuelBarber}
                        fallbackUrl={item.manuelBarberImage}
                        imageClassName="w-14 h-14 rounded-xl"
                        iconSource="account"
                        iconSize={24}
                        iconColor="#6b7280"
                      />
                      <View className="flex-1">
                        <Text style={sectionLabelStyle}>
                          {t("appointment.labels.serviceProvider")}
                        </Text>
                        <Text
                          className="mb-1"
                          style={{
                            color: colors.sectionHeaderText,
                            fontFamily: "CenturyGothic-Bold",
                            fontSize: 15,
                          }}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {item.manuelBarberName}
                        </Text>
                        <Text style={[metaLineStyle, { opacity: 0.85 }]}>
                          {t("appointment.labels.storeEmployee")}
                        </Text>
                      </View>
                    </View>
                    {/* Manuel barber için rating yapılabilir (sadece Customer) */}
                    <RatingDisplay
                      myRating={item.myRatingForManuelBarber}
                      myComment={item.myCommentForManuelBarber}
                      averageRating={item.manuelBarberAverageRating}
                      canRateNow={canRateTarget(item, "manuelBarber")}
                      onRatePress={() =>
                        item.manuelBarberId &&
                        openRatingSheet(
                          item.id,
                          item.manuelBarberId,
                          item.manuelBarberName || t("favorites.manuelBarber"),
                          "manuelBarber",
                          item.manuelBarberImage,
                        )
                      }
                    />
                  </View>
                ) : (
                  <View className="flex-row items-center">
                    <View
                      className="w-14 h-14 rounded-xl items-center justify-center"
                      style={{
                        backgroundColor: colors.cardBg3,
                        borderWidth: 1,
                        borderColor: isDark ? "rgba(240, 94, 35, 0.4)" : "rgba(251, 146, 60, 0.45)",
                        marginRight: 10,
                      }}
                    >
                      <Icon source="seat" size={24} color={isDark ? "#94a3b8" : "#64748b"} />
                    </View>
                    <View className="flex-1">
                      <Text
                        style={{
                          fontFamily: "CenturyGothic-Bold",
                          fontSize: 15,
                          color: colors.sectionHeaderText,
                        }}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {item.chairName}
                      </Text>
                    </View>
                  </View>
                )}
              </View>
            </View>
          )}
        </View>

        {/* Fiyatlandırma Bilgisi - Sadece FreeBarber ve Dükkan varsa göster */}
        {item.freeBarberId &&
          item.barberStoreId &&
          formatPricingPolicy(item.pricingType, item.pricingValue) && (
            <View
              className="rounded-xl p-2.5 mt-2 mb-2"
              style={{
                backgroundColor: colors.cardBg2,
                borderColor: colors.borderColor,
                borderWidth: 1,
                shadowOpacity: 0,
                elevation: 0,
              }}
            >
              <View className="flex-row items-center mb-1">
                <Icon source="cash" size={15} color="#f05e23" />
                <Text
                  style={{
                    color: isDark ? "#fb923c" : "#c2410c",
                    fontFamily: "CenturyGothic-Bold",
                    fontSize: 11,
                    marginLeft: 6,
                    letterSpacing: 0.2,
                  }}
                >
                  {t("card.pricing")}
                </Text>
              </View>
              <Text
                style={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic",
                  fontSize: 13,
                  lineHeight: 18,
                  marginLeft: 2,
                }}
              >
                {formatPricingPolicy(item.pricingType, item.pricingValue)}
              </Text>
            </View>
          )}

        {item.storeAddressDescription && (
          <View
            className="mt-2 mb-2 overflow-hidden"
            style={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: colors.borderColor,
              backgroundColor: colors.cardBg2,
              flexDirection: "row",
              shadowOpacity: 0,
              elevation: 0,
            }}
          >
            <View
              style={{
                width: 40,
                backgroundColor: isDark ? "rgba(240, 94, 35, 0.1)" : "#fff7ed",
                alignItems: "center",
                justifyContent: "center",
                borderRightWidth: 1,
                borderRightColor: colors.borderColor,
              }}
            >
              <Icon source="map-marker-radius" size={22} color="#f05e23" />
            </View>
            <View className="flex-1 py-2 pr-2.5 pl-2.5">
              <Text
                style={{
                  color: isDark ? "#fb923c" : "#c2410c",
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 10,
                  marginBottom: 3,
                  letterSpacing: 0.2,
                }}
              >
                {t("appointment.labels.address")}
              </Text>
              <Text
                style={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic",
                  fontSize: 13,
                  lineHeight: 19,
                }}
              >
                {item.storeAddressDescription}
              </Text>
            </View>
          </View>
        )}

        {/* Koltuk Adı - Sadece manuel berber veya free barber yoksa göster */}
        {item.chairName && !item.manuelBarberId && !item.freeBarberId && (
          <View className="mt-2 mb-3">
            <View
              className="flex-row items-center rounded-xl py-2.5 px-3"
              style={{
                backgroundColor: colors.cardBg3,
                borderWidth: 1,
                borderColor: colors.borderColor,
              }}
            >
              <Icon source="seat" size={16} color="#f05e23" />
              <Text
                style={{
                  ...sectionLabelStyle,
                  marginBottom: 0,
                  marginLeft: 8,
                }}
              >
                {t("appointment.labels.chair")}
              </Text>
              <Text
                style={{
                  marginLeft: 8,
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 13,
                  color: colors.sectionHeaderText,
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {item.chairName}
              </Text>
            </View>
          </View>
        )}

        {/* Hizmetler */}
        {item.services.length > 0 && (
          <View className="mt-2 mb-1.5">
            <View className="flex-row items-center mb-2">
              <Icon source="scissors-cutting" size={14} color="#f05e23" />
              <Text
                style={{
                  color: isDark ? "#fb923c" : "#c2410c",
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 11,
                  marginLeft: 6,
                  letterSpacing: 0.15,
                }}
              >
                {userType === UserType.Customer
                  ? t("appointment.labels.myServices")
                  : t("appointment.labels.services")}
              </Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View className="flex-row gap-2">
                {item.services.map((service) => (
                  <View
                    key={service.serviceId}
                    className="rounded-lg px-3 py-1.5 flex-row items-center gap-1.5"
                    style={{
                      backgroundColor: colors.cardBg3,
                      borderWidth: 1,
                      borderColor: colors.borderColor,
                    }}
                  >
                    <Text
                      style={{
                        color: colors.sectionHeaderText,
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 12,
                        maxWidth: 140,
                      }}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {service.serviceName}
                    </Text>
                    <Text
                      style={{
                        color: "#22c55e",
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 12,
                      }}
                    >
                      {Number(service.price).toFixed(0)} {t("card.currencySymbol")}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.panelBg }}>
      <View className="pt-2 pb-2">
        <View className="px-4 mb-2 flex-row gap-2">
          <FilterChip
            itemKey="pending"
            selected={activeFilter === AppointmentFilter.Pending}
            onPress={() => setActiveFilter(AppointmentFilter.Pending)}
            fontSize={10}
          >
            {t("appointment.filters.pending")}
          </FilterChip>
          <FilterChip
            itemKey="active"
            selected={activeFilter === AppointmentFilter.Active}
            onPress={() => setActiveFilter(AppointmentFilter.Active)}
            fontSize={10}
          >
            {t("appointment.filters.active")}
          </FilterChip>
          <FilterChip
            itemKey="completed"
            selected={activeFilter === AppointmentFilter.Completed}
            onPress={() => setActiveFilter(AppointmentFilter.Completed)}
            fontSize={10}
          >
            {t("appointment.filters.completed")}
          </FilterChip>
          <FilterChip
            itemKey="cancelled"
            selected={activeFilter === AppointmentFilter.Cancelled}
            onPress={() => setActiveFilter(AppointmentFilter.Cancelled)}
            fontSize={10}
          >
            {t("appointment.filters.cancelled")}
          </FilterChip>
        </View>
        {(activeFilter === AppointmentFilter.Completed ||
          activeFilter === AppointmentFilter.Cancelled) &&
          filteredAppointments &&
          filteredAppointments.length > 0 && (
            <View className="px-4 mb-2 flex-row justify-end">
              <TouchableOpacity
                onPress={handleDeleteAll}
                disabled={isDeletingAllAppointments}
                className={`bg-red-600 rounded-3xl px-3 py-2 flex-row items-center gap-1.5 ${isDeletingAllAppointments ? "opacity-60" : ""}`}
              >
                {isDeletingAllAppointments ? (
                  <ActivityIndicator size="small" color="white" />
                ) : (
                  <Icon source="delete-sweep" size={18} color="white" />
                )}
                <Text className="text-white font-semibold text-sm">
                  {t("appointment.actions.deleteAll")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
      </View>

      {isLoading ? (
        <View className="flex-1 pt-4 px-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonComponent key={i} />
          ))}
        </View>
      ) : isError || filteredAppointments.length === 0 ? (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ flexGrow: 1 }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor="#f05e23"
            />
          }
        >
          <UnifiedStateWrapper
            loading={isLoading}
            error={error}
            data={filteredAppointments}
            fetchedOnce={true}
            onRetry={refetch}
            customMessages={{
              empty: t("appointment.labels.noAppointmentsInCategory"),
            }}
            customAnimations={{
              empty: require("../../../assets/animations/calendar-empty.json"),
            }}
          >
            <View />
          </UnifiedStateWrapper>
        </ScrollView>
      ) : (
        <LegendList
          data={filteredAppointments}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          estimatedItemSize={250}
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingBottom: 100,
            paddingTop: 10,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isFetching && !isLoading}
              onRefresh={refetch}
              tintColor="#f05e23"
              progressViewOffset={0}
            />
          }
        />
      )}

      {/* Rating Bottom Sheet */}
      <BottomSheetModal
        ref={ratingSheet.ref}
        enableDynamicSizing
        enableContentPanningGesture={false}
        enablePanDownToClose={ratingSheet.enablePanDownToClose}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={ratingSheet.makeBackdrop()}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
        android_keyboardInputMode="adjustResize"
        onChange={(index) => {
          ratingSheet.handleChange(index);
          if (index < 0) {
            setSelectedRatingTarget(null);
          }
        }}
      >
        {selectedRatingTarget ? (
          <RatingBottomSheet
            appointmentId={selectedRatingTarget.appointmentId}
            targetId={selectedRatingTarget.targetId}
            targetName={selectedRatingTarget.targetName}
            targetType={selectedRatingTarget.targetType}
            targetImage={selectedRatingTarget.targetImage}
            onClose={() => {
              setSelectedRatingTarget(null);
              ratingSheet.dismiss();
            }}
          />
        ) : null}
      </BottomSheetModal>

      {/* Complaint Bottom Sheet */}
      <BottomSheetModal
        ref={complaintSheet.ref}
        snapPoints={complaintSheet.snapPoints}
        enablePanDownToClose={complaintSheet.enablePanDownToClose}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={complaintSheet.makeBackdrop()}
        onChange={(index) => {
          complaintSheet.handleChange(index);
          if (index < 0) {
            setSelectedComplaintTarget(null);
          }
        }}
      >
        <BottomSheetView className="h-full pt-2">
          {selectedComplaintTarget && (
            <ComplaintBottomSheet
              appointmentId={selectedComplaintTarget.appointmentId}
              targetUserId={selectedComplaintTarget.targetUserId}
              targetName={selectedComplaintTarget.targetName}
              targetImage={selectedComplaintTarget.targetImage}
              onClose={() => {
                setSelectedComplaintTarget(null);
                complaintSheet.dismiss();
              }}
            />
          )}
        </BottomSheetView>
      </BottomSheetModal>

      {/* User Selection Bottom Sheet - Birden fazla hedef olduğunda */}
      <BottomSheetModal
        ref={userSelectionSheet.ref}
        snapPoints={userSelectionSheet.snapPoints}
        enablePanDownToClose={userSelectionSheet.enablePanDownToClose}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={userSelectionSheet.makeBackdrop()}
        onChange={(index) => {
          userSelectionSheet.handleChange(index);
          if (index < 0) {
            setUserSelectionData(null);
          }
        }}
      >
        <BottomSheetView className="h-full pt-2 px-4">
          {userSelectionData && (
            <View>
              <Text className="text-lg font-bold mb-4 text-center" style={{ color: colors.sectionHeaderText }}>
                {userSelectionData.actionType === "complaint"
                  ? t("complaint.selectUser")
                  : t("block.selectUser")}
              </Text>
              {userSelectionData.targets.map((target, index) => (
                <TouchableOpacity
                  key={target.userId}
                  onPress={() => handleUserSelected(target)}
                  className={`flex-row items-center p-4 rounded-xl ${index < userSelectionData.targets.length - 1 ? "mb-3" : ""}`}
                  style={{ backgroundColor: colors.cardBg3 }}
                >
                  <OwnerAvatar
                    ownerId={target.userId}
                    ownerType={ImageOwnerType.User}
                    fallbackUrl={target.image}
                    imageClassName="w-12 h-12 rounded-full mr-3"
                    iconSource="account"
                    iconSize={24}
                    iconColor="#6b7280"
                  />
                  <View className="flex-1">
                    <Text className="text-sm font-semibold" style={{ color: colors.sectionHeaderText }}>
                      {target.name}
                    </Text>
                    <Text className="text-[#9ca3af] text-xs">
                      {target.type}
                    </Text>
                  </View>
                  <Icon source="chevron-right" size={20} color="#6b7280" />
                </TouchableOpacity>
              ))}
            </View>
          )}
        </BottomSheetView>
      </BottomSheetModal>
    </View>
  );
}
