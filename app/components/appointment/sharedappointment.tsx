import { Icon } from "react-native-paper";
import React, { useState, useCallback, useMemo, useEffect, useRef, useContext } from "react";
import {
  View,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  ScrollView,
  Pressable,
  StyleSheet,
  BackHandler,
  Platform,
  Dimensions,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Keyboard,
} from "react-native";
import { MotiView } from "moti";
import { Text } from "../common/Text";
import { LegendList } from "@legendapp/list";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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
import { useFabOverlayWhenSheetOpen } from "../../hook/usePanelMoreFab";
import { useDeferredSheetPresent } from "../../hook/useDeferredSheetPresent";
import { MoreFabPanelContext } from "../layout/MoreFabContext";

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

  // Randevu card aksiyonları menüsü (dots-vertical) — tam ekran overlay + MotiView animasyon, kart yüksekliğini değiştirmez
  const [openCardMenuId, setOpenCardMenuId] = useState<string | null>(null);
  const [cancelModalAppointmentId, setCancelModalAppointmentId] = useState<string | null>(null);
  const [cancelReasonDraft, setCancelReasonDraft] = useState("");
  /** Menü konumu köke göre; yatayda ekran içinde kalacak şekilde clamp */
  const [cardMenuLayout, setCardMenuLayout] = useState<{
    top: number;
    left: number;
    width: number;
  } | null>(null);
  const cardMenuDotRefs = useRef<Record<string, View | null>>({});
  const cardMenuRootRef = useRef<View | null>(null);

  const anySheetOpen = ratingSheet.isOpen || complaintSheet.isOpen || userSelectionSheet.isOpen;
  useFabOverlayWhenSheetOpen(anySheetOpen);
  const fabCtx = useContext(MoreFabPanelContext);

  const { schedulePresent: scheduleRatingPresent, cancelScheduledPresent: cancelRatingPresent } =
    useDeferredSheetPresent(ratingSheet.present);
  const { schedulePresent: scheduleComplaintPresent, cancelScheduledPresent: cancelComplaintPresent } =
    useDeferredSheetPresent(complaintSheet.present);
  const { schedulePresent: scheduleUserSelectionPresent, cancelScheduledPresent: cancelUserSelectionPresent } =
    useDeferredSheetPresent(userSelectionSheet.present);

  const afterUserSelectionChainRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clearAfterUserSelectionChain = useCallback(() => {
    if (afterUserSelectionChainRef.current != null) {
      clearTimeout(afterUserSelectionChainRef.current);
      afterUserSelectionChainRef.current = null;
    }
  }, []);
  useEffect(() => () => clearAfterUserSelectionChain(), [clearAfterUserSelectionChain]);

  // --- API ---
  const {
    data: appointments,
    isLoading,
    refetch,
    error,
    isError,
  } = useGetAllAppointmentByFilterQuery(activeFilter);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await refetch();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [refetch]);

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
      scheduleRatingPresent(100);
    },
    [scheduleRatingPresent],
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
      scheduleComplaintPresent(100);
    },
    [scheduleComplaintPresent],
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
        scheduleUserSelectionPresent(100);
      }
    },
    [getAllComplaintTargets, openComplaintSheet, handleBlockUser, scheduleUserSelectionPresent],
  );

  // Kullanıcı seçimi yapıldığında
  const handleUserSelected = useCallback(
    (target: { userId: string; name: string; image?: string }) => {
      if (!userSelectionData) return;

      const snapshot = userSelectionData;
      clearAfterUserSelectionChain();
      cancelComplaintPresent();
      userSelectionSheet.dismiss();

      afterUserSelectionChainRef.current = setTimeout(() => {
        afterUserSelectionChainRef.current = null;
        if (snapshot.actionType === "complaint") {
          openComplaintSheet(snapshot.appointmentId, target.userId, target.name, target.image);
        } else {
          handleBlockUser(target.userId, target.name);
        }
        setUserSelectionData(null);
      }, 300);
    },
    [userSelectionData, userSelectionSheet, openComplaintSheet, handleBlockUser, clearAfterUserSelectionChain, cancelComplaintPresent],
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
  const handleCancel = useCallback((id: string) => {
    setCancelReasonDraft("");
    setCancelModalAppointmentId(id);
  }, []);

  const closeCancelModal = useCallback(() => {
    if (isCancelling) return;
    Keyboard.dismiss();
    setCancelModalAppointmentId(null);
    setCancelReasonDraft("");
  }, [isCancelling]);

  const submitCancel = useCallback(() => {
    const id = cancelModalAppointmentId;
    if (!id) return;
    const trimmed = cancelReasonDraft.trim();
    void guard(async () => {
      const cancelResult = await cancelAppointment({
        appointmentId: id,
        cancellationReason: trimmed.length > 0 ? trimmed : undefined,
      });
      if ("error" in cancelResult) {
        const errorMessage =
          (cancelResult.error as any)?.data?.message ||
          t("appointment.alerts.cancelFailed");
        alertError(t("common.error"), errorMessage);
        return;
      }
      Keyboard.dismiss();
      setCancelModalAppointmentId(null);
      setCancelReasonDraft("");
      alertSuccess(t("common.success"), t("appointment.alerts.cancelled"));
    });
  }, [
    cancelModalAppointmentId,
    cancelReasonDraft,
    cancelAppointment,
    guard,
    t,
    alertError,
    alertSuccess,
  ]);

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

  const openCardMenuAppointment = useMemo(
    () =>
      openCardMenuId
        ? filteredAppointments.find((a) => a.id === openCardMenuId) ?? null
        : null,
    [openCardMenuId, filteredAppointments],
  );

  const cardMenuFlags = useMemo(() => {
    const item = openCardMenuAppointment;
    if (!item) return { showDelete: false, showComplaintBlock: false };
    let showDeleteButton = false;
    if (
      (activeFilter === AppointmentFilter.Completed ||
        activeFilter === AppointmentFilter.Cancelled) &&
      item.status !== AppointmentStatus.Pending &&
      item.status !== AppointmentStatus.Approved
    ) {
      showDeleteButton = true;
    }
    const showComplaintBlock =
      (activeFilter === AppointmentFilter.Completed ||
        activeFilter === AppointmentFilter.Cancelled) &&
      getAllComplaintTargets(item).length > 0;
    return { showDelete: showDeleteButton, showComplaintBlock };
  }, [openCardMenuAppointment, activeFilter, getAllComplaintTargets]);

  const closeCardMenu = useCallback(() => {
    setOpenCardMenuId(null);
    setCardMenuLayout(null);
  }, []);

  const handleOpenCardMenu = useCallback(
    (item: AppointmentGetDto) => {
      if (openCardMenuId === item.id) {
        closeCardMenu();
        return;
      }
      const tryPlace = (attempt: number) => {
        const dotRef = cardMenuDotRefs.current[item.id];
        const rootRef = cardMenuRootRef.current;
        if (!dotRef) return;
        if (!rootRef) {
          if (attempt < 4) setTimeout(() => tryPlace(attempt + 1), 24);
          return;
        }
        dotRef.measureInWindow((ax, ay, aw, ah) => {
          const h = ah || 28;
          rootRef.measureInWindow((rx, ry, rw, _rh) => {
            const sw = Dimensions.get("window").width;
            const pad = 10;
            const menuW = Math.min(190, Math.max(148, rw - pad * 2));
            const dotRight = ax + aw;
            let menuLeftWin = dotRight - menuW;
            menuLeftWin = Math.max(pad, Math.min(menuLeftWin, sw - pad - menuW));
            setCardMenuLayout({
              top: ay - ry + h + 4,
              left: menuLeftWin - rx,
              width: menuW,
            });
            setOpenCardMenuId(item.id);
          });
        });
      };
      requestAnimationFrame(() => tryPlace(0));
    },
    [openCardMenuId, closeCardMenu],
  );

  useEffect(() => {
    if (!openCardMenuId) return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      closeCardMenu();
      return true;
    });
    return () => sub.remove();
  }, [openCardMenuId, closeCardMenu]);

  // Header'a "tümünü sil" butonu ekle/kaldır (filteredAppointments ve handleDeleteAll tanımlandıktan sonra)
  const showHeaderDeleteAction =
    (activeFilter === AppointmentFilter.Completed || activeFilter === AppointmentFilter.Cancelled) &&
    (filteredAppointments?.length ?? 0) > 0;
  useEffect(() => {
    if (showHeaderDeleteAction) {
      fabCtx?.setHeaderDeleteAction({ onPress: handleDeleteAll, loading: isDeletingAllAppointments });
    } else {
      fabCtx?.setHeaderDeleteAction(null);
    }
    return () => { fabCtx?.setHeaderDeleteAction(null); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showHeaderDeleteAction, isDeletingAllAppointments]);

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
  const renderItem = ({
    item,
    index,
  }: {
    item: AppointmentGetDto;
    index: number;
  }) => {
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
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: isDark ? 0.08 : 0.03,
      shadowRadius: 4,
      elevation: 1,
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
      paddingVertical: 6,
      paddingHorizontal: 8,
      marginBottom: 4,
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
              borderColor: isCompletedOrCancelled ? colors.borderColor : "rgba(255, 185, 0, 0.22)",
              borderWidth: 1,
              borderRadius: 14,
              borderLeftWidth: 2,
              borderLeftColor: statusColor,
              shadowColor: statusColor,
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: isDark ? 0.07 : isCompletedOrCancelled ? 0.025 : 0.05,
              shadowRadius: 6,
              elevation: 2,
            }}
          >
            <View className="pt-2 px-3 pb-3">
              <View style={{ marginBottom: 2 }}>
                {(activeFilter === AppointmentFilter.Active ||
                  activeFilter === AppointmentFilter.Pending ||
                  isCompletedOrCancelled) && (
                    <View
                      className="mb-1 pb-1"
                      style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
                    >
                      <View
                        className="flex-row items-center gap-2 justify-between"
                        style={{
                          backgroundColor: isDark ? `${statusColor}18` : `${statusColor}10`,
                          borderRadius: 10,
                          paddingVertical: 7,
                          paddingHorizontal: 10,
                          borderWidth: 1,
                          borderColor: isDark ? `${statusColor}32` : `${statusColor}22`,
                        }}
                      >
                        <View className="flex-row items-center gap-2 flex-1 flex-wrap">
                          <Icon source={statusIconName} size={16} color={statusColor} />
                          <Text
                            className="text-sm font-semibold flex-shrink"
                            style={{ color: statusColor, fontFamily: "CenturyGothic-Bold" }}
                            numberOfLines={2}
                          >
                            {statusText}
                          </Text>
                          {passed && isApproved && (
                            <View className="flex-row items-center">
                              <Icon source="alert-circle" size={14} color="#ffb900" />
                              <Text className="text-[#ffb900] text-xs ml-1">
                                {t("appointment.labels.timePassed")}
                              </Text>
                            </View>
                          )}
                        </View>
                        {/* Dots menu button — only shown when card has actions */}
                        {(showDeleteButton || ((activeFilter === AppointmentFilter.Completed || activeFilter === AppointmentFilter.Cancelled) && getAllComplaintTargets(item).length > 0)) && (
                          <View ref={(r) => { cardMenuDotRefs.current[item.id] = r; }} collapsable={false}>
                            <TouchableOpacity
                              onPress={() => handleOpenCardMenu(item)}
                              hitSlop={8}
                              style={{
                                width: 30,
                                height: 30,
                                borderRadius: 15,
                                alignItems: "center",
                                justifyContent: "center",
                                backgroundColor: openCardMenuId === item.id
                                  ? (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.06)")
                                  : "transparent",
                              }}
                            >
                              <Icon source="dots-vertical" size={18} color={statusColor} />
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    </View>
                  )}

                {item.status === AppointmentStatus.Cancelled &&
                  item.cancellationReason?.trim() && (
                    <View style={{ marginTop: 8, marginBottom: 6 }}>
                      <Text style={sectionLabelStyle}>
                        {t("appointment.labels.cancellationReason")}
                      </Text>
                      <Text style={[metaLineStyle, { marginTop: 4 }]}>
                        {item.cancellationReason.trim()}
                      </Text>
                    </View>
                  )}

                {item.startTime && item.endTime && item.appointmentDate && (
                  <View className="flex-row gap-2" style={{ marginBottom: 0, marginTop: 2 }}>
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
                      <View className="flex-1" style={{ minWidth: 0 }}>
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
                          {new Date(item.appointmentDate).toLocaleDateString(dateLocale, {
                            weekday: "short",
                            day: "numeric",
                            month: "short",
                          })}
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
                      <View className="flex-1" style={{ minWidth: 0 }}>
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
                          {item.startTime.substring(0, 5)} – {item.endTime.substring(0, 5)}
                        </Text>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              <View className="mb-1 gap-1.5" style={{ marginTop: 8 }}>
                {/* Birincil aksiyonlar */}
                {(showCompleteButton || showCancelButton) && (
                  <View className="flex-row gap-3 justify-end">
                    {showCompleteButton && (
                      <TouchableOpacity
                        onPress={() => handleComplete(item.id)}
                        disabled={isCompleting}
                        className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center"
                        style={{
                          backgroundColor: isDark ? "rgba(34,197,94,0.14)" : "rgba(187,247,208,0.65)",
                          borderWidth: 1,
                          borderColor: isDark ? "rgba(34,197,94,0.38)" : "rgba(22,163,74,0.28)",
                        }}
                      >
                        {isCompleting ? (
                          <ActivityIndicator color={isDark ? "#86efac" : "#15803d"} size="small" />
                        ) : (
                          <>
                            <Icon source="check-all" size={16} color={isDark ? "#86efac" : "#15803d"} />
                            <Text
                              className="text-sm font-semibold ml-2"
                              style={{ color: isDark ? "#bbf7d0" : "#166534", fontFamily: "CenturyGothic-Bold" }}
                            >
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
                        className="flex-1 py-2.5 rounded-xl flex-row items-center justify-center"
                        style={{
                          backgroundColor: isDark ? "rgba(248,113,113,0.14)" : "rgba(254,202,202,0.55)",
                          borderWidth: 1,
                          borderColor: isDark ? "rgba(248,113,113,0.38)" : "rgba(220,38,38,0.22)",
                        }}
                      >
                        {isCancelling ? (
                          <ActivityIndicator color={isDark ? "#fca5a5" : "#dc2626"} size="small" />
                        ) : (
                          <>
                            <Icon source="close-circle-outline" size={16} color={isDark ? "#fca5a5" : "#b91c1c"} />
                            <Text
                              className="text-sm font-semibold ml-2"
                              style={{ color: isDark ? "#fecaca" : "#991b1b", fontFamily: "CenturyGothic-Bold" }}
                            >
                              {t("appointment.actions.cancel")}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View className="mb-0" style={{ marginTop: 8 }}>
                {userType === UserType.BarberStore && (
                  <View className="gap-3">
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
                      ) : (item.chairId || item.chairName) ? (
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
                              {item.chairName || t("appointment.labels.chair")}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                    </View>
                  </View>
                )}

                {userType === UserType.FreeBarber && (
                  <View className="gap-3">
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
                            {item.storeNo && (
                              <Text style={metaLineStyle}>
                                {'#'}{item.storeNo}
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
                  <View className="gap-3">
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
                            {item.storeNo && (
                              <Text style={metaLineStyle}>
                                {'#'}{item.storeNo}
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
                      ) : (item.chairId || item.chairName) ? (
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
                              {item.chairName || t("appointment.labels.chair")}
                            </Text>
                          </View>
                        </View>
                      ) : null}
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

              {/* Paketler */}
              {item.packages && item.packages.length > 0 && (
                <View className="mt-2 mb-1.5">
                  <View className="flex-row items-center mb-2">
                    <Icon source="tag-multiple-outline" size={14} color="#a78bfa" />
                    <Text
                      style={{
                        color: isDark ? "#c4b5fd" : "#7c3aed",
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 11,
                        marginLeft: 6,
                        letterSpacing: 0.15,
                      }}
                    >
                      Paketler
                    </Text>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    <View className="flex-row gap-2">
                      {item.packages.map((pkg) => (
                        <View
                          key={pkg.packageId}
                          className="rounded-lg px-3 py-2 gap-0.5"
                          style={{
                            backgroundColor: isDark ? 'rgba(167,139,250,0.1)' : 'rgba(167,139,250,0.08)',
                            borderWidth: 1,
                            borderColor: isDark ? 'rgba(167,139,250,0.3)' : 'rgba(167,139,250,0.25)',
                            maxWidth: 200,
                          }}
                        >
                          <View className="flex-row items-center gap-1.5">
                            <Text
                              style={{
                                color: '#a78bfa',
                                fontFamily: "CenturyGothic-Bold",
                                fontSize: 12,
                                maxWidth: 120,
                              }}
                              numberOfLines={1}
                            >
                              {pkg.packageName}
                            </Text>
                            <Text
                              style={{
                                color: isDark ? '#c4b5fd' : '#7c3aed',
                                fontFamily: "CenturyGothic-Bold",
                                fontSize: 12,
                              }}
                            >
                              {Number(pkg.totalPrice).toFixed(0)} {t("card.currencySymbol")}
                            </Text>
                          </View>
                          {pkg.serviceNamesSnapshot && (
                            <Text
                              style={{
                                color: colors.textSecondary,
                                fontFamily: "CenturyGothic",
                                fontSize: 10,
                              }}
                              numberOfLines={1}
                            >
                              {pkg.serviceNamesSnapshot}
                            </Text>
                          )}
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
    <View
      ref={cardMenuRootRef}
      collapsable={false}
      style={{ flex: 1, backgroundColor: colors.screenBg }}
    >
      <View
        style={{
          paddingTop: 8,
          paddingBottom: 8,
          backgroundColor: colors.screenBg,
          borderBottomColor: colors.borderColor,
          borderBottomWidth: 0,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 3 },
          shadowRadius: 6,
          shadowOpacity: 0,
          elevation: 0,
          zIndex: 10,
        }}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 0, gap: 8, alignItems: "center" }}
        >
          <FilterChip
            itemKey="pending"
            selected={activeFilter === AppointmentFilter.Pending}
            onPress={() => setActiveFilter(AppointmentFilter.Pending)}
            fontSize={12}
            className="rounded-3xl border-[1.5px] px-3 py-2 flex-row"
          >
            {t("appointment.filters.pending")}
          </FilterChip>
          <FilterChip
            itemKey="active"
            selected={activeFilter === AppointmentFilter.Active}
            onPress={() => setActiveFilter(AppointmentFilter.Active)}
            fontSize={12}
            className="rounded-3xl border-[1.5px] px-3 py-2 flex-row"
          >
            {t("appointment.filters.active")}
          </FilterChip>
          <FilterChip
            itemKey="completed"
            selected={activeFilter === AppointmentFilter.Completed}
            onPress={() => setActiveFilter(AppointmentFilter.Completed)}
            fontSize={12}
            className="rounded-3xl border-[1.5px] px-3 py-2 flex-row"
          >
            {t("appointment.filters.completed")}
          </FilterChip>
          <FilterChip
            itemKey="cancelled"
            selected={activeFilter === AppointmentFilter.Cancelled}
            onPress={() => setActiveFilter(AppointmentFilter.Cancelled)}
            fontSize={12}
            className="rounded-3xl border-[1.5px] px-3 py-2 flex-row"
          >
            {t("appointment.filters.cancelled")}
          </FilterChip>
        </ScrollView>
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
              refreshing={isPullRefreshing}
              onRefresh={handleRefresh}
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
        <View style={{ flex: 1 }}>
          <LegendList
            style={{ flex: 1 }}
            data={filteredAppointments}
            keyExtractor={((item: AppointmentGetDto) => item.id) as any}
            renderItem={renderItem as any}
            extraData={openCardMenuId}
            estimatedItemSize={292}
            scrollEventThrottle={16}
            contentContainerStyle={{
              paddingHorizontal: 16,
              paddingBottom: 100,
              paddingTop: 10,
            }}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={handleRefresh}
                tintColor="#f05e23"
                progressViewOffset={0}
              />
            }
          />
        </View>
      )}

      <Modal
        visible={cancelModalAppointmentId !== null}
        transparent
        animationType="fade"
        onRequestClose={closeCancelModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <View style={{ flex: 1, justifyContent: "center" }}>
            <Pressable
              style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.45)" }]}
              onPress={closeCancelModal}
            />
            <View
              style={{
                marginHorizontal: 20,
                borderRadius: 16,
                padding: 18,
                backgroundColor: colors.cardBg,
                borderWidth: 1,
                borderColor: colors.borderColor,
              }}
            >
            <Text
              style={{
                fontFamily: "CenturyGothic-Bold",
                fontSize: 17,
                color: colors.sectionHeaderText,
                marginBottom: 8,
              }}
            >
              {t("appointment.alerts.cancellationTitle")}
            </Text>
            <Text style={{ fontSize: 14, color: colors.textSecondary, marginBottom: 12 }}>
              {t("appointment.alerts.confirmCancellation")}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary, marginBottom: 6 }}>
              {t("appointment.alerts.cancellationReasonOptional")}
            </Text>
            <TextInput
              value={cancelReasonDraft}
              onChangeText={setCancelReasonDraft}
              placeholder={t("appointment.alerts.cancellationReasonPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              multiline
              maxLength={500}
              editable={!isCancelling}
              style={{
                minHeight: 88,
                maxHeight: 140,
                textAlignVertical: "top",
                padding: 12,
                borderRadius: 12,
                borderWidth: 1,
                borderColor: colors.borderColor,
                backgroundColor: colors.cardBg2,
                color: colors.sectionHeaderText,
                fontFamily: "CenturyGothic",
                fontSize: 14,
              }}
            />
            <View className="flex-row gap-2 mt-4">
              <TouchableOpacity
                onPress={closeCancelModal}
                disabled={isCancelling}
                className="flex-1 rounded-xl py-3 items-center"
                style={{
                  borderWidth: 1,
                  borderColor: colors.borderColor,
                  opacity: isCancelling ? 0.6 : 1,
                }}
              >
                <Text style={{ color: colors.textSecondary, fontFamily: "CenturyGothic-Bold" }}>
                  {t("appointment.alerts.cancel")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={submitCancel}
                disabled={isCancelling}
                className="flex-1 rounded-xl py-3 items-center"
                style={{
                  backgroundColor: "#f05e23",
                  opacity: isCancelling ? 0.7 : 1,
                }}
              >
                {isCancelling ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={{ color: "#fff", fontFamily: "CenturyGothic-Bold" }}>
                    {t("appointment.actions.cancel")}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

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
        onDismiss={() => {
          cancelRatingPresent();
          ratingSheet.handleDismiss();
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
              cancelRatingPresent();
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
        onDismiss={() => {
          cancelComplaintPresent();
          complaintSheet.handleDismiss();
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
                cancelComplaintPresent();
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
        onDismiss={() => {
          cancelUserSelectionPresent();
          clearAfterUserSelectionChain();
          userSelectionSheet.handleDismiss();
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

      {openCardMenuId && cardMenuLayout && openCardMenuAppointment ? (
        <View
          pointerEvents="box-none"
          style={[
            StyleSheet.absoluteFillObject,
            {
              zIndex: 9999,
              elevation: Platform.OS === "android" ? 24 : 0,
            },
          ]}
        >
          <Pressable
            style={[StyleSheet.absoluteFillObject, { backgroundColor: "rgba(0,0,0,0.06)" }]}
            onPress={closeCardMenu}
          />
          <MotiView
            key={openCardMenuId ?? "menu"}
            from={{ opacity: 0, scale: 0.94, translateY: -4 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 180 }}
            style={{
              position: "absolute",
              top: cardMenuLayout.top,
              left: cardMenuLayout.left,
              width: cardMenuLayout.width,
              borderRadius: 10,
              overflow: "hidden",
              backgroundColor: isDark
                ? "rgba(255, 255, 255, 0.94)"
                : "rgba(255, 255, 255, 0.98)",
              borderWidth: 1,
              borderColor: isDark ? "rgba(255, 185, 0, 0.35)" : "rgba(255, 185, 0, 0.42)",
              elevation: 8,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: isDark ? 0.16 : 0.1,
              shadowRadius: 8,
            }}
          >
            {cardMenuFlags.showComplaintBlock && (
              <>
                <TouchableOpacity
                  onPress={() => {
                    closeCardMenu();
                    handleComplaintOrBlockAction(openCardMenuAppointment, "complaint");
                  }}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    borderBottomWidth: 1,
                    borderBottomColor: isDark ? colors.borderColor : "rgba(255, 185, 0, 0.22)",
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(245, 158, 11, 0.14)", marginRight: 8, flexShrink: 0 }}>
                    <Icon source="alert-circle-outline" size={15} color="#d97706" />
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: "CenturyGothic-Bold", color: "#b45309" }} numberOfLines={1}>
                    {t("complaint.title")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    closeCardMenu();
                    handleComplaintOrBlockAction(openCardMenuAppointment, "block");
                  }}
                  disabled={isBlockingUser}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    paddingHorizontal: 11,
                    paddingVertical: 7,
                    opacity: isBlockingUser ? 0.6 : 1,
                    borderBottomWidth: cardMenuFlags.showDelete ? 1 : 0,
                    borderBottomColor: isDark ? colors.borderColor : "rgba(255, 185, 0, 0.22)",
                  }}
                  activeOpacity={0.7}
                >
                  <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(156, 163, 175, 0.14)", marginRight: 8, flexShrink: 0 }}>
                    {isBlockingUser ? (
                      <ActivityIndicator size="small" color="#9ca3af" />
                    ) : (
                      <Icon source="block-helper" size={15} color="#9ca3af" />
                    )}
                  </View>
                  <Text style={{ flex: 1, fontSize: 12, fontFamily: "CenturyGothic-Bold", color: "#b45309" }} numberOfLines={1}>
                    {t("block.submit")}
                  </Text>
                </TouchableOpacity>
              </>
            )}
            {cardMenuFlags.showDelete && (
              <TouchableOpacity
                onPress={() => {
                  closeCardMenu();
                  handleDelete(openCardMenuAppointment.id);
                }}
                disabled={isDeletingAppointment}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingHorizontal: 11,
                  paddingVertical: 7,
                  opacity: isDeletingAppointment ? 0.6 : 1,
                }}
                activeOpacity={0.7}
              >
                <View style={{ width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", backgroundColor: "rgba(239, 68, 68, 0.12)", marginRight: 8, flexShrink: 0 }}>
                  {isDeletingAppointment ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Icon source="delete-outline" size={15} color="#ef4444" />
                  )}
                </View>
                <Text style={{ flex: 1, fontSize: 12, fontFamily: "CenturyGothic-Bold", color: "#ef4444" }} numberOfLines={1}>
                  {t("appointment.actions.delete")}
                </Text>
              </TouchableOpacity>
            )}
          </MotiView>
        </View>
      ) : null}
    </View>
  );
}
