import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSubscriptionGuard } from "../../hook/useSubscriptionGuard";
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import {
  FlatList,
  Image,
  ScrollView,
  StatusBar,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
  Platform,
} from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../common/Text";
import { ActivityIndicator, Icon } from "react-native-paper";
import { useLanguage } from "../../hook/useLanguage";
import {
  useGetAvailabilityRangeQuery,
  useGetStoreForUsersQuery,
  useGetWorkingHoursByTargetQuery,
  useCreateCustomerAppointmentMutation,
  useCreateFreeBarberAppointmentMutation,
  useCreateStoreAppointmentMutation,
  useAddStoreToAppointmentMutation,
  useGetServicePackagesByOwnerQuery,
} from "../../store/api";
import { APPOINTMENT_CONSTANTS } from "../../constants/appointment";
import {
  ChairSlotDto,
  UserType,
  PricingType,
  StoreSelectionType,
} from "../../types";
import { getBarberTypeName } from "../../utils/store/barber-type";
import FilterChip from "../common/FilterChip";
import {
  fmtDateOnly,
  build7Days,
  normalizeTime,
  addMinutesToHHmm,
  getDayInfo,
} from "../../utils/time/time-helper";
import { useAuth } from "../../hook/useAuth";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { requestAppointmentListTab } from "../../store/appointmentUiSlice";
import { AppointmentFilter } from "../../types/appointment";
import { getGlobalConnection } from "../../store/signalrSlice";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { useAppointmentBooking } from "../../hook/useAppointmentBooking";
import { useAppointmentPricing } from "../../hook/useAppointmentPricing";
import { getErrorMessage } from "../../utils/errorHandler";
import {
  wouldServicePackagesOverlap,
  packageOverlapsAnySelectedService,
  serviceIsInsideSelectedPackages,
} from "../../utils/service-package-overlap";
import { ImageCarousel } from "../common/imagecarousel";
import { useCanPerformAction } from "../../hook/useCanPerformAction";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { OwnerAvatar } from "../common/owneravatar";
import { ImageOwnerType } from "../../types";
import { COLORS, getTextOnGold, getAppointmentAccentLabelFg } from "../../constants/colors";

/** Randevu ekranı vurgu rengi — bottom tab / FAB ile aynı altın sarısı */
const GOLD = COLORS.UI.ACCENT_GOLD;

const toLocalIso = (dateStr: string, hhmm: string) =>
  `${dateStr}T${normalizeTime(hhmm)}:00`;
interface Props {
  storeId: string;
  isBottomSheet?: boolean;
  isFreeBarber?: boolean;
  isCustomer?: boolean;
  mode?: "add-store";
  appointmentId?: string;
  freeBarberUserId?: string; // Serbest berber randevusu için
  preselectedServices?: string[]; // Önceden seçilmiş hizmetler (serbest berber randevusu için)
  note?: string; // Randevu notu (Customer -> FreeBarber + Store senaryosu için)
  storeSelectionType?: StoreSelectionType; // StoreSelectionType (Dükkan Seç senaryosu için)
  onSuccessClose?: () => void;
  /** Liste kaydırmalı detay sayfasında üst görsel carousel ile jest çakışmasın */
  disableHeaderImageSwipe?: boolean;
}

const StoreBookingContent = ({
  storeId,
  isBottomSheet = false,
  isFreeBarber = false,
  isCustomer = false,
  freeBarberUserId,
  preselectedServices,
  note,
  storeSelectionType,
  mode,
  appointmentId,
  onSuccessClose,
  disableHeaderImageSwipe = false,
}: Props) => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  // store header info
  const { data: storeData } = useGetStoreForUsersQuery(storeId, {
    skip: !storeId,
  });
  const { data: workingHours } = useGetWorkingHoursByTargetQuery(storeId, {
    skip: !storeId,
  });
  const router = useSafeNavigation();
  const navigation = useNavigation();
  const guard = useActionGuard();
  const { withSubscription } = useSubscriptionGuard();
  const { t } = useLanguage();
  const { alert, alertSuccess, alertError } = useAlert();
  const dispatch = useAppDispatch();
  const isAddStoreMode = mode === "add-store";
  const [createCustomerAppointment, { isLoading: isCreatingCustomer }] =
    useCreateCustomerAppointmentMutation();
  const [createFreeBarberAppointment, { isLoading: isCreatingFreeBarber }] =
    useCreateFreeBarberAppointmentMutation();
  const [createStoreAppointment, { isLoading: isCreatingStore }] =
    useCreateStoreAppointmentMutation();
  const [addStoreToAppointment, { isLoading: isAddingStore }] =
    useAddStoreToAppointmentMutation();

  const { userType: currentUserType } = useAuth();
  const isSignalRConnected = useAppSelector((s) => s.signalr.isConnected);

  // Bu dükkanın koltuk/slot müsaitliği — tüm o dükkan randevu ekranındaki kullanıcılara anlık tazeleme
  useEffect(() => {
    if (!storeId || !isSignalRConnected) return;
    const join = async () => {
      const c = getGlobalConnection();
      if (c?.state === "Connected") {
        try {
          await c.invoke("JoinStoreAvailabilityGroup", storeId);
        } catch {
          /* ignore */
        }
      }
    };
    join();
    return () => {
      const c = getGlobalConnection();
      if (c?.state === "Connected") {
        c.invoke("LeaveStoreAvailabilityGroup", storeId).catch(() => {});
      }
    };
  }, [storeId, isSignalRConnected]);

  const handleBookingBack = useCallback(() => {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else if ((router as any).canGoBack?.()) {
      router.back();
    }
  }, [navigation, router]);
  const closeAfterSuccess = useCallback(() => {
    if (onSuccessClose) {
      onSuccessClose();
      return;
    }
    if ((router as any).canGoBack?.()) {
      router.back();
    }
  }, [onSuccessClose, router]);

  // FreeBarber seçimi artık koltuk seçiminde gösteriliyor (barberId koltuğa atanmışsa)

  // day selection (önümüzdeki 7 gün — müsaitlik batch ile tek istek)
  const days = useMemo(() => build7Days(), []);
  const rangeFromDate = useMemo(() => fmtDateOnly(days[0]), [days]);
  const rangeToDate = useMemo(() => fmtDateOnly(days[6]), [days]);
  const [selectedDateOnly, setSelectedDateOnly] = useState(() =>
    fmtDateOnly(days[0]),
  );

  const normalizeDow = (dow: number) => {
    if (dow === 7) return 0;
    return dow;
  };

  const closedByDow = useMemo(() => {
    const map = new Map<number, boolean>();
    (workingHours ?? []).forEach((w) => {
      const dow = normalizeDow(Number(w.dayOfWeek));
      map.set(dow, !!w.isClosed);
    });
    return map;
  }, [workingHours]);

  const isDayClosed = (d: Date) => {
    const jsDow = d.getDay();
    return closedByDow.get(jsDow) === true;
  };

  const {
    data: availabilityByDay,
    isFetching,
    isLoading,
    refetch,
    error: availabilityError,
  } = useGetAvailabilityRangeQuery(
    {
      storeId,
      fromDate: rangeFromDate,
      toDate: rangeToDate,
    },
    {
      skip: !storeId || !rangeFromDate || !rangeToDate,
    },
  );

  // Action kontrolü: Error durumunda işlem yapılamaz
  const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
    availabilityError,
    undefined, // Store booking'te location kontrolü zaten getCurrentLocationSafe ile yapılıyor
    undefined,
  );

  const chairs: ChairSlotDto[] = useMemo(() => {
    if (!availabilityByDay || !Array.isArray(availabilityByDay)) return [];
    const row = availabilityByDay.find((d) => d.date === selectedDateOnly);
    return row?.chairs ?? [];
  }, [availabilityByDay, selectedDateOnly]);

  // Use custom hooks for booking logic
  const {
    selectedChairId,
    setSelectedChairId,
    selectedSlotKeys,
    setSelectedSlotKeys,
    selectedServices,
    toggleService,
    selectedChair,
    onToggleSlot,
    startHHmm,
    endHHmm,
  } = useAppointmentBooking({ chairs, preselectedServices });

  // Paket seçimi state'i
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const { data: packagesData } = useGetServicePackagesByOwnerQuery(storeId, {
    skip: !storeId,
  });
  const packages = packagesData ?? [];
  const packageSelected = selectedPackages.length > 0;
  const serviceSelected = selectedServices.length > 0;

  const togglePackage = useCallback(
    (id: string) => {
      const pkg = (packages as any[]).find((p: any) => p.id === id);
      if (
        pkg &&
        selectedServices.length > 0 &&
        packageOverlapsAnySelectedService(pkg, selectedServices)
      ) {
        alertError(t("common.error"), t("servicePackage.overlapsSingleService"));
        return;
      }
      if (wouldServicePackagesOverlap(packages as any, selectedPackages, id)) {
        alertError(t("common.error"), t("servicePackage.overlapError"));
        return;
      }
      setSelectedPackages((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    },
    [packages, selectedPackages, selectedServices, alertError, t],
  );

  const toggleServiceWithDisjoint = useCallback(
    (id: string) => {
      if (
        serviceIsInsideSelectedPackages(
          id,
          packages as any,
          selectedPackages,
        )
      ) {
        alertError(t("common.error"), t("servicePackage.serviceInsidePackage"));
        return;
      }
      toggleService(id);
    },
    [packages, selectedPackages, toggleService, alertError, t],
  );

  const packagePriceTotal = useMemo(() => {
    return packages
      .filter((p: any) => selectedPackages.includes(p.id))
      .reduce((sum: number, p: any) => sum + Number(p.totalPrice ?? 0), 0);
  }, [packages, selectedPackages]);

  // Update selectedChairId when date changes
  useEffect(() => {
    if (chairs.length > 0) {
      const currentChairExists =
        selectedChairId && chairs.some((c) => c.chairId === selectedChairId);
      if (!currentChairExists) {
        setSelectedChairId(chairs[0].chairId);
      }
    } else {
      setSelectedChairId(null);
    }
  }, [chairs, selectedDateOnly, selectedChairId, setSelectedChairId]);

  const onChangeDay = useCallback(
    (key: string) => {
      setSelectedDateOnly(key);
      setSelectedSlotKeys([]);
    },
    [setSelectedSlotKeys],
  );

  // Use custom hook for pricing calculations
  const {
    pricingTypeKey,
    isHourlyFree,
    isPercentFree,
    totalPrice,
    servicePriceTotal,
    slotPriceTotal,
    pricingValue,
  } = useAppointmentPricing({
    pricingType: storeData?.pricingType,
    pricingValue: storeData?.pricingValue,
    serviceOfferings: storeData?.serviceOfferings,
    selectedServices,
    selectedSlotKeys,
    isFreeBarber: isFreeBarber || isAddStoreMode,
  });

  // Servis seçimi zorunlu olduğu durumlar:
  // 1. isAddStoreMode=true (FreeBarber dükkan ekliyor)
  // 2. isFreeBarber=true VE pricingType=percent (yüzdelik sistem, servis fiyatına göre hesaplanır)
  // 3. isCustomer=true (müşteri dükkandan randevu alıyor - her zaman servis seçmeli)
  //
  // Servis seçimi zorunlu OLMAYAN durumlar:
  // 1. isFreeBarber=true VE pricingType=rent (saatlik kiralama - isHourlyFree=true)
  const requireServices = useMemo(
    () => isAddStoreMode || isCustomer || (isFreeBarber && !isHourlyFree),
    [isAddStoreMode, isCustomer, isFreeBarber, isHourlyFree]
  );

  const canSubmit = useMemo(() => {
    const baseReady = !!selectedChairId && selectedSlotKeys.length > 0;
    return baseReady && (requireServices ? (selectedServices.length > 0 || selectedPackages.length > 0) : true);
  }, [
    selectedChairId,
    selectedSlotKeys.length,
    selectedServices.length,
    selectedPackages.length,
    requireServices,
  ]);

  /** Android + bottom sheet: iç içe RNGH yatay scroll, dikey ana kaydırıcı ile çakışıyordu. */
  const SheetHScroll =
    isBottomSheet && Platform.OS === "android" ? ScrollView : GHScrollView;
  const bookingSheetFlatData = useMemo(() => [{ id: "__storeBookingRoot__" }], []);
  const scrollPaddingBottom = (isBottomSheet ? 300 : 140) + insets.bottom;
  const submitLabel = useMemo(() => {
    if (appointmentId) return t("booking.addStoreButton");
    if (isAddStoreMode || isCustomer) return t("booking.sendAppointmentRequest");
    return t("card.bookAppointment");
  }, [appointmentId, isAddStoreMode, isCustomer, t]);

  /** ScrollView stickyHeaderIndices=[0] yalnızca native View çocuklarında çalışır; Fragment'e style basılıp hata veriyordu. */
  const bookingStickyHeader = (
      <View style={{ backgroundColor: colors.sheetBg }}>
        <View style={{ overflow: "hidden", backgroundColor: colors.sheetBg }}>
          <View className="relative">
            <ImageCarousel
              images={storeData?.imageList ?? []}
              mode={"default"}
              height={250}
              enableSwipe={!disableHeaderImageSwipe}
            />
            <View className="absolute top-0 left-0 right-0 bottom-0 bg-black opacity-50" />
            {isBottomSheet && (
              <View style={{ position: "absolute", top: 8, left: 0, right: 0, alignItems: "center", zIndex: 30 }}>
                <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.65)" }} />
              </View>
            )}
            <View className="absolute bottom-0 left-0 right-0 px-4 pb-3">
              <View className="flex-row justify-between items-start">
                <View className="flex-shrink flex-wrap gap-2 flex-row">
                  <Text
                    className="font-century-gothic text-white"
                    numberOfLines={1}
                    style={{ fontSize: 24 }}
                  >
                    {storeData?.storeName ?? t("form.defaultBusinessName")}
                  </Text>
                  <View className="flex-row items-center gap-2 mt-1">
                    <Icon
                      size={20}
                      color={storeData?.type === 0 ? "#60a5fa" : "#f472b6"}
                      source={storeData?.type === 0 ? "face-man" : "face-woman"}
                    />
                    <Text
                      className="text-white font-century-gothic"
                      style={{ fontSize: 15 }}
                    >
                      - {getBarberTypeName(storeData?.type!)}
                    </Text>
                  </View>
                </View>

                <View className="flex-row items-center mt-2 gap-1">
                  <Icon size={22} color="#FFA500" source="star" />
                  <Text
                    className="font-century-gothic text-white"
                    style={{ fontSize: 15 }}
                  >
                    {Number(storeData?.rating ?? 0).toFixed(1)}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center gap-2 mt-2">
                <Icon size={20} color="#FFA500" source="map-marker" />
                <Text
                  className="font-century-gothic flex-shrink text-white"
                  numberOfLines={1}
                  style={{ fontSize: 15 }}
                >
                  {storeData?.addressDescription ?? "Adres"}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </View>
  );

  const bookingScrollBody = (
      <View style={{ backgroundColor: colors.sheetBg }}>
        <View
          style={{
            backgroundColor: colors.sheetBg,
            paddingHorizontal: 16,
            paddingTop: 12,
            paddingBottom: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
          }}
        >
          <View className="flex-row justify-between items-center">
            <Text className="font-century-gothic text-xl" style={{ color: colors.sectionHeaderText }}>
              {isAddStoreMode ? t("booking.appointmentRequestDetailsTitle") : t("card.bookAppointment")}
            </Text>
          </View>

          {availabilityError ? (
            <View className="rounded-xl p-3 mt-3" style={{ backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "rgba(254,202,202,0.35)" }}>
              <Text className="text-sm font-century-gothic" style={{ color: "#b91c1c" }}>
                {getErrorMessage(availabilityError)}
              </Text>
              <TouchableOpacity onPress={() => refetch()} className="mt-2 self-start">
                <Text className="text-sm font-century-gothic-bold" style={{ color: "#3b82f6" }}>
                  {t("common.retry")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <SheetHScroll
            horizontal
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
            style={{ marginTop: availabilityError ? 10 : 12 }}
          >
            <View className="flex-row gap-2 items-center pb-1">
              {days.map((d) => {
                const key = fmtDateOnly(d);
                const active = key === selectedDateOnly;
                const disabled = isDayClosed(d);
                const info = getDayInfo(d);
                return (
                  <TouchableOpacity
                    key={key}
                    disabled={disabled}
                    onPress={() => onChangeDay(key)}
                    activeOpacity={0.7}
                    className="items-center rounded-2xl px-3.5 py-2.5 min-w-[76px]"
                    style={
                      disabled
                        ? { backgroundColor: isDark ? "#1a1a2e" : "#fef2f2", borderColor: "#ef4444", borderWidth: 1.5 }
                        : active
                          ? { backgroundColor: isDark ? "rgba(250, 204, 21,0.25)" : "rgba(250, 204, 21,0.15)", borderColor: GOLD, borderWidth: 1.5 }
                          : { backgroundColor: colors.cardBg2, borderColor: colors.borderColor, borderWidth: 1 }
                    }
                  >
                    <Text
                      className="text-xs font-century-gothic"
                      style={{ color: disabled ? "#ef4444" : active ? getTextOnGold(isDark) : colors.textSecondary }}
                    >
                      {info.isToday ? t("booking.today") : info.dayShort}
                    </Text>
                    <Text
                      className="text-2xl font-century-gothic-bold my-0.5"
                      style={{ color: disabled ? "#ef4444" : colors.sectionHeaderText }}
                    >
                      {info.dayNum}
                    </Text>
                    <Text
                      className="text-xs font-century-gothic"
                      style={{ color: disabled ? "#ef4444" : active ? getTextOnGold(isDark) : colors.textSecondary }}
                    >
                      {info.monthShort}
                    </Text>
                    <View className="mt-1">
                      <Icon
                        source="calendar-month"
                        size={14}
                        color={disabled ? "#ef4444" : active ? getTextOnGold(isDark) : "#60a5fa"}
                      />
                    </View>
                    {disabled && (
                      <View className="mt-1 bg-red-500 px-1.5 py-0.5 rounded">
                        <Text className="text-white text-[10px] font-semibold">{t("booking.weekGridClosed")}</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </SheetHScroll>
        </View>

      <View className="px-4 pt-3 z-0 gap-3">
          {(isAddStoreMode || isCustomer) && (
            <View
              style={{
                borderRadius: 14,
                borderWidth: 1,
                borderColor: isDark ? "rgba(59,130,246,0.3)" : "rgba(59,130,246,0.22)",
                backgroundColor: isDark ? "rgba(59,130,246,0.12)" : "rgba(219,234,254,0.6)",
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Icon source="information-outline" size={16} color="#3b82f6" />
                <Text
                  style={{
                    marginLeft: 6,
                    fontSize: 12,
                    color: colors.textSecondary,
                    fontFamily: "CenturyGothic",
                  }}
                >
                  {t("booking.requestSummaryHint")}
                </Text>
              </View>
            </View>
          )}
          {(isLoading || (isFetching && !availabilityByDay)) && (
            <View className="py-10">
              <ActivityIndicator />
            </View>
          )}
          {!isLoading && !isFetching && chairs.length === 0 ? (
            <View className="rounded-xl p-4 items-center" style={{ backgroundColor: colors.cardBg2 }}>
              <Icon source="seat-outline" size={28} color="#6b7280" />
              <Text className="text-gray-400 mt-2">
                Bu gün için koltuk/slot bulunamadı.
              </Text>
            </View>
          ) : chairs.length > 0 ? (
            <View>
              <Text className="text-sm font-century-gothic-bold mb-2 mt-2" style={{ color: colors.sectionHeaderText }}>
                {t("form.selectChair")}
              </Text>
              <SheetHScroll
                horizontal
                showsHorizontalScrollIndicator={false}
                nestedScrollEnabled
                keyboardShouldPersistTaps="handled"
              >
                <View className="flex-row gap-2">
                  {chairs.map((c) => {
                    const isSelected = c.chairId === selectedChairId;
                    const hasBarber = c.barberId != null && c.barberName != null;
                    const chairName = c.chairName ?? "Koltuk";
                    const barberName = c.barberName ?? "";
                    const rating =
                      c.barberRating != null
                        ? Number(c.barberRating).toFixed(1)
                        : null;

                    return (
                      <TouchableOpacity
                        key={c.chairId}
                        onPress={() => setSelectedChairId(c.chairId)}
                        activeOpacity={0.7}
                        className="items-center min-w-[110px] px-3 py-3 rounded-2xl"
                        style={
                          isSelected
                            ? { backgroundColor: isDark ? "rgba(250, 204, 21,0.25)" : "rgba(250, 204, 21,0.15)", borderColor: GOLD, borderWidth: 1.5 }
                            : { backgroundColor: colors.cardBg2, borderColor: colors.borderColor, borderWidth: 1 }
                        }
                      >
                        {hasBarber ? (
                          <OwnerAvatar
                            ownerId={c.barberId!}
                            ownerType={ImageOwnerType.ManuelBarber}
                            imageClassName="w-12 h-12 rounded-full"
                            iconSource="account"
                            wrapperStyle={{ marginBottom: 6, borderWidth: isSelected ? 2 : 1, borderColor: isSelected ? GOLD : "transparent", borderRadius: 9999 }}
                          />
                        ) : (
                          <View
                            className="rounded-full p-2 mb-1.5"
                            style={isSelected ? { backgroundColor: "rgba(250, 204, 21,0.2)" } : { backgroundColor: isDark ? "#334155" : "#e2e8f0" }}
                          >
                            <Icon source="seat" size={22} color={isSelected ? getTextOnGold(isDark) : "#94a3b8"} />
                          </View>
                        )}
                        <Text
                          className="font-century-gothic-bold text-sm"
                          style={{ color: isSelected ? getTextOnGold(isDark) : colors.sectionHeaderText }}
                          numberOfLines={1}
                        >
                          {chairName}
                        </Text>
                        {hasBarber && (
                          <Text
                            className="font-century-gothic text-xs mt-0.5"
                            style={{ color: isSelected ? getTextOnGold(isDark) : colors.textSecondary }}
                            numberOfLines={1}
                          >
                            {barberName}
                          </Text>
                        )}
                        {rating != null && (
                          <View className="flex-row items-center gap-1 mt-1">
                            <Icon
                              size={15}
                              source="star"
                              color={isSelected ? "#fde047" : "#FFA500"}
                            />
                            <Text className="text-sm" style={{ color: isSelected ? getTextOnGold(isDark) : (isDark ? "#d1d5db" : "#9ca3af") }}>
                              {rating}
                            </Text>
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </SheetHScroll>

              {selectedChair ? (() => {
                const availableCount = selectedChair.slots.filter(s => !s.isBooked && !s.isPast).length;
                const bookedCount = selectedChair.slots.filter(s => s.isBooked).length;
                return (
                  <View style={{ marginTop: 14 }}>
                    {/* Saat başlığı + istatistik */}
                    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Icon source="clock-time-four-outline" size={16} color={getAppointmentAccentLabelFg(isDark)} />
                        <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 14, color: colors.sectionHeaderText }}>
                          {t("form.selectTime")}
                        </Text>
                      </View>
                      <View style={{ flexDirection: "row", gap: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: isDark ? "rgba(52,211,153,0.12)" : "rgba(52,211,153,0.1)" }}>
                          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#34d399" }} />
                          <Text style={{ fontSize: 11, fontFamily: "CenturyGothic-Bold", color: "#34d399" }}>{availableCount}</Text>
                        </View>
                        {bookedCount > 0 && (
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "rgba(239,68,68,0.08)" }}>
                            <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#ef4444" }} />
                            <Text style={{ fontSize: 11, fontFamily: "CenturyGothic-Bold", color: "#ef4444" }}>{bookedCount}</Text>
                          </View>
                        )}
                      </View>
                    </View>

                    {/* Slot grid — 4 sütun */}
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 7 }}>
                      {selectedChair.slots.map((s) => {
                        const isBooked = s.isBooked;
                        const isPast = s.isPast;
                        const key = normalizeTime(s.start);
                        const isSelected = selectedSlotKeys.includes(key);
                        const isDisabled = isBooked || isPast;
                        const slotW = "22.5%";

                        return (
                          <TouchableOpacity
                            key={String(s.slotId)}
                            disabled={isDisabled}
                            onPress={() => onToggleSlot(s, isBooked, isPast)}
                            activeOpacity={0.75}
                            style={{
                              width: slotW,
                              borderRadius: 12,
                              overflow: "hidden",
                              borderWidth: isSelected ? 1.5 : 1,
                              borderColor: isBooked
                                ? "rgba(153,27,27,0.4)"
                                : isPast
                                  ? isDark ? "#1f2937" : "#e5e7eb"
                                  : isSelected
                                    ? GOLD
                                    : colors.borderColor,
                              backgroundColor: isBooked
                                ? isDark ? "rgba(127,29,29,0.3)" : "rgba(254,202,202,0.4)"
                                : isPast
                                  ? isDark ? "#111827" : "#f9fafb"
                                  : isSelected
                                    ? isDark ? "rgba(250, 204, 21,0.18)" : "rgba(250, 204, 21,0.12)"
                                    : colors.cardBg2,
                              opacity: isPast ? 0.45 : 1,
                            }}
                          >
                            {/* Colored top strip */}
                            <View style={{
                              height: 3,
                              backgroundColor: isBooked
                                ? "#ef4444"
                                : isPast
                                  ? isDark ? "#374151" : "#d1d5db"
                                  : isSelected
                                    ? GOLD
                                    : isDark ? "#1f2937" : "#e5e7eb",
                            }} />

                            <View style={{ paddingVertical: 8, paddingHorizontal: 4, alignItems: "center" }}>
                              <Text
                                style={{
                                  fontFamily: "CenturyGothic-Bold",
                                  fontSize: 14,
                                  color: isBooked || isPast
                                    ? isDark ? "#4b5563" : "#9ca3af"
                                    : isSelected ? getTextOnGold(isDark) : colors.sectionHeaderText,
                                }}
                              >
                                {normalizeTime(s.start)}
                              </Text>
                              <Text
                                style={{
                                  fontFamily: "CenturyGothic",
                                  fontSize: 10,
                                  marginTop: 1,
                                  color: isBooked || isPast
                                    ? isDark ? "#374151" : "#9ca3af"
                                    : isSelected ? getTextOnGold(isDark) : colors.textSecondary,
                                }}
                              >
                                {normalizeTime(s.end)}
                              </Text>
                              <View style={{ marginTop: 4, height: 14, justifyContent: "center" }}>
                                {isBooked ? (
                                  <Icon source="lock" size={11} color="#ef4444" />
                                ) : isPast ? (
                                  <Icon source="clock-remove-outline" size={11} color="#6b7280" />
                                ) : isSelected ? (
                                  <Icon source="check-circle" size={13} color={getTextOnGold(isDark)} />
                                ) : (
                                  <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: "#34d399" }} />
                                )}
                              </View>
                            </View>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Legend */}
                    <View style={{ flexDirection: "row", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
                      {[
                        { color: "#34d399", label: t("booking.weekGridFree") },
                        { color: GOLD, label: t("booking.selectedTime") },
                        { color: "#ef4444", label: t("booking.weekGridBooked") },
                        { color: isDark ? "#374151" : "#d1d5db", label: t("booking.weekGridPast") },
                      ].map((item) => (
                        <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                          <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: item.color }} />
                          <Text style={{ fontSize: 10, fontFamily: "CenturyGothic", color: colors.textSecondary }}>{item.label}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                );
              })() : (
                <View style={{ borderRadius: 14, padding: 20, alignItems: "center", marginTop: 10, backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor, borderStyle: "dashed" }}>
                  <Icon source="gesture-tap" size={28} color="#6b7280" />
                  <Text style={{ color: "#6b7280", marginTop: 8, fontFamily: "CenturyGothic", fontSize: 13 }}>{t("form.selectChairFirst")}</Text>
                </View>
              )}
            </View>
          ) : null}
          {!!startHHmm && !!endHHmm && (
            <View style={{
              borderRadius: 16,
              overflow: "hidden",
              borderWidth: 1,
              borderColor: isDark ? "rgba(250, 204, 21,0.3)" : "rgba(250, 204, 21,0.25)",
              backgroundColor: isDark ? "rgba(250, 204, 21,0.08)" : "rgba(250, 204, 21,0.06)",
            }}>
              {/* Gold top bar */}
              <View style={{ height: 3, backgroundColor: GOLD }} />
              <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 12 }}>
                {/* Left: time range */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: GOLD, alignItems: "center", justifyContent: "center" }}>
                    <Icon source="clock-check-outline" size={20} color={getTextOnGold(isDark)} />
                  </View>
                  <View>
                    <Text style={{ fontFamily: "CenturyGothic", fontSize: 11, color: colors.textSecondary }}>
                      {t("form.selectedTime")}
                    </Text>
                    <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 17, color: colors.sectionHeaderText, letterSpacing: 0.3 }}>
                      {startHHmm}
                      <Text style={{ color: getAppointmentAccentLabelFg(isDark) }}> → </Text>
                      {endHHmm}
                    </Text>
                  </View>
                </View>

                {/* Right: slots + price */}
                <View style={{ alignItems: "flex-end", gap: 4 }}>
                  <View style={{
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    borderRadius: 10,
                    backgroundColor: isDark ? "rgba(250, 204, 21,0.2)" : "rgba(250, 204, 21,0.15)",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 4,
                  }}>
                    <Icon source="timer-outline" size={13} color={getAppointmentAccentLabelFg(isDark)} />
                    <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 13, color: getAppointmentAccentLabelFg(isDark) }}>
                      {selectedSlotKeys.length} {t("form.hours")}
                    </Text>
                  </View>
                  {isHourlyFree && slotPriceTotal > 0 && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                      <Icon source="currency-try" size={13} color="#34d399" />
                      <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 13, color: "#34d399" }}>
                        {slotPriceTotal} {t("card.currencySymbol")}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          )}
          <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 12 }} />
          <View>
            {isFreeBarber && (
              <View className="px-3 py-2 rounded-lg mb-2" style={{ backgroundColor: colors.cardBg }}>
                <Text className="text-base font-century-gothic" style={{ color: colors.sectionHeaderText }}>
                  {storeData?.pricingType?.toLowerCase() === "percent"
                    ? `ℹ️ ${t("card.pricingPercent", { value: storeData?.pricingValue })}`
                    : storeData?.pricingType?.toLowerCase() === "rent"
                      ? `ℹ️ ${t("card.pricingRent", { value: storeData?.pricingValue })}`
                      : ""}
                </Text>
              </View>
            )}
            {(isAddStoreMode || isFreeBarber || isCustomer) && (
              <View>
                {/* Paket Seçimi */}
                {packages.length > 0 && (
                  <View style={{ marginBottom: 16 }}>
                    <View className="flex-row items-center justify-between mb-3 px-1">
                      <View className="flex-row items-center gap-2">
                        <Icon source="tag-multiple-outline" size={20} color="#a78bfa" />
                        <Text className="font-century-gothic-bold text-lg" style={{ color: colors.sectionHeaderText }}>
                          {t("servicePackage.bookingSectionTitle")}
                        </Text>
                      </View>
                      {packageSelected && (
                        <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: isDark ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.1)' }}>
                          <Text className="font-century-gothic-bold text-base" style={{ color: '#a78bfa' }}>
                            {packagePriceTotal} {t("card.currencySymbol")}
                          </Text>
                        </View>
                      )}
                    </View>
                    <FlatList
                      data={packages}
                      keyExtractor={(item: any) => item.id}
                      scrollEnabled={false}
                      nestedScrollEnabled
                      contentContainerStyle={{ gap: isBottomSheet ? 12 : 8 }}
                      renderItem={({ item }: { item: any }) => {
                        const isSelected = selectedPackages.includes(item.id);
                        const isDisabled =
                          !isSelected &&
                          packageOverlapsAnySelectedService(item, selectedServices);
                        return (
                          <TouchableOpacity
                            onPress={() => togglePackage(item.id)}
                            activeOpacity={isDisabled ? 1 : 0.7}
                            style={[
                              { borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12 },
                              isSelected
                                ? { backgroundColor: isDark ? 'rgba(167,139,250,0.18)' : 'rgba(167,139,250,0.1)', borderColor: '#a78bfa', borderWidth: 1.5 }
                                : { backgroundColor: colors.cardBg2, borderColor: colors.borderColor, borderWidth: 1 },
                              isDisabled && { opacity: 0.45 },
                            ]}
                          >
                            <View className="flex-row items-center justify-between">
                              <View className="flex-row items-center flex-1 mr-2 gap-2">
                                <Icon
                                  source={isSelected ? "check-circle" : "tag-multiple-outline"}
                                  size={20}
                                  color={isSelected ? "#a78bfa" : (isDark ? "#6b7280" : "#9ca3af")}
                                />
                                <Text
                                  className="font-century-gothic-bold text-sm flex-1"
                                  style={{ color: isSelected ? '#a78bfa' : colors.sectionHeaderText }}
                                  numberOfLines={1}
                                >
                                  {item.packageName}
                                </Text>
                              </View>
                              <Text
                                className="font-century-gothic-bold text-sm"
                                style={{ color: isSelected ? '#a78bfa' : colors.textSecondary }}
                              >
                                {item.totalPrice} {t("card.currencySymbol")}
                              </Text>
                            </View>
                            {(item.items ?? []).length > 0 && (
                              <View className="flex-row flex-wrap gap-1 mt-2 ml-7">
                                {(item.items as any[]).slice(0, 4).map((si: any) => (
                                  <View key={si.serviceOfferingId} className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isSelected ? (isDark ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.12)') : (isDark ? '#1e293b' : '#f1f5f9') }}>
                                    <Text className="text-xs" style={{ color: isSelected ? '#c4b5fd' : colors.textSecondary }}>
                                      {si.serviceName}
                                    </Text>
                                  </View>
                                ))}
                                {(item.items ?? []).length > 4 && (
                                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                                    <Text className="text-xs" style={{ color: colors.textSecondary }}>
                                      +{(item.items ?? []).length - 4}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            )}
                          </TouchableOpacity>
                        );
                      }}
                    />
                  </View>
                )}

                {/* Hizmet Seçimi */}
                <View className="flex-row items-center justify-between mb-3 mt-2 px-1">
                  <Text className="font-century-gothic-bold text-lg" style={{ color: colors.sectionHeaderText }}>
                    {t("common.services")}
                  </Text>
                  {serviceSelected && (
                    <View className="px-3 py-1.5 rounded-lg" style={{ backgroundColor: colors.cardBg2 }}>
                      <Text className="font-century-gothic-bold text-lg" style={{ color: getAppointmentAccentLabelFg(isDark) }}>
                        {servicePriceTotal} {t("card.currencySymbol")}
                      </Text>
                    </View>
                  )}
                </View>
                <FlatList
                  data={storeData?.serviceOfferings ?? []}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  nestedScrollEnabled
                  contentContainerStyle={{ gap: isBottomSheet ? 12 : 8 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedServices.includes(item.id);
                    const isDisabled =
                      !isSelected &&
                      serviceIsInsideSelectedPackages(
                        item.id,
                        packages as any,
                        selectedPackages,
                      );
                    return (
                      <TouchableOpacity
                        onPress={() =>
                          isDisabled ? undefined : toggleServiceWithDisjoint(item.id)
                        }
                        activeOpacity={isDisabled ? 1 : 0.7}
                        className="flex-row items-center justify-between px-4 py-3 rounded-xl"
                        style={[
                          isSelected ? { backgroundColor: isDark ? 'rgba(250, 204, 21,0.2)' : 'rgba(250, 204, 21,0.1)', borderColor: GOLD, borderWidth: 1.5 } : { backgroundColor: colors.cardBg2, borderColor: colors.borderColor, borderWidth: 1 },
                          isDisabled && { opacity: 0.45 },
                        ]}
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <Icon
                            source={isSelected ? "check-circle" : "circle-outline"}
                            size={22}
                            color={isSelected ? getTextOnGold(isDark) : (isDark ? "#6b7280" : "#9ca3af")}
                          />
                          <Text
                            className="ml-3 text-sm flex-1"
                            style={{ color: colors.sectionHeaderText }}
                            numberOfLines={1}
                          >
                            {item.serviceName}
                          </Text>
                        </View>
                        <Text
                          className="text-sm font-century-gothic-bold"
                          style={{ color: isSelected ? getTextOnGold(isDark) : colors.textSecondary }}
                        >
                          {item.price} {t("card.currencySymbol")}
                        </Text>
                      </TouchableOpacity>
                    );
                  }}
                />
                {requireServices && selectedServices.length === 0 && selectedPackages.length === 0 && (storeData?.serviceOfferings?.length ?? 0) > 0 && (
                  <View className="flex-row items-center gap-2 mt-2 px-1">
                    <Icon source="alert-circle-outline" size={16} color="#f87171" />
                    <Text className="text-sm" style={{ color: '#f87171' }}>
                      {t("booking.atLeastOneServiceRequired")}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          <TouchableOpacity
            disabled={
              !canSubmit ||
              isCreatingCustomer ||
              isCreatingFreeBarber ||
              isCreatingStore ||
              isAddingStore
            }
            className={`py-4 flex-row justify-center gap-2 rounded-2xl mt-2 items-center ${!canSubmit ? "bg-[#4b5563] opacity-60" : "opacity-100"}`}
            style={[
              { elevation: 0, shadowOpacity: 0 },
              canSubmit ? { backgroundColor: GOLD } : undefined,
            ]}
            onPress={() => withSubscription(() => guard(async () => {
              try {
                // Error kontrolü: Sunucu çalışmıyorsa işlem yapılamaz
                if (!checkCanPerformAction()) {
                  return;
                }

                if (!selectedChair || selectedSlotKeys.length === 0) return;

                // Duplicate request önleme: buton disabled yap
                if (
                  isCreatingCustomer ||
                  isCreatingFreeBarber ||
                  isCreatingStore ||
                  isAddingStore
                ) {
                  return;
                }

                // 1 saatlik ardışık slot kontrolü kaldırıldı - artık herhangi bir slot seçilebilir

                // Seçilen slotların hala müsait olduğunu kontrol et
                const sorted = [...selectedSlotKeys].sort();
                const start = sorted[0];
                const end = addMinutesToHHmm(
                  start,
                  sorted.length * APPOINTMENT_CONSTANTS.SLOT_DURATION_MINUTES,
                );

                // Güncel availability'yi kontrol et
                const currentChair = chairs.find(
                  (c) => c.chairId === selectedChair.chairId,
                );
                if (currentChair) {
                  const selectedSlots = sorted.map((key) => {
                    const slot = currentChair.slots.find(
                      (s) => normalizeTime(s.start) === key,
                    );
                    return slot;
                  });

                  const hasBookedSlot = selectedSlots.some(
                    (slot) => slot?.isBooked === true,
                  );
                  if (hasBookedSlot) {
                    alert(
                      t("booking.warning"),
                      t("booking.slotTakenByOther"),
                      undefined,
                      "warning",
                    );
                    // Availability'yi yenile
                    refetch();
                    return;
                  }
                }

                // TimeSpan format: "HH:mm:ss"
                const startTime = `${start}:00`;
                const endTime = `${end}:00`;

                if (appointmentId) {
                  if (!appointmentId) {
                    alertError(
                      t("common.error"),
                      t("booking.appointmentNotFound"),
                    );
                    return;
                  }

                  const addStorePayload = {
                    storeId: storeId,
                    chairId: selectedChair.chairId,
                    appointmentDate: selectedDateOnly,
                    startTime: startTime,
                    endTime: endTime,
                    serviceOfferingIds: selectedServices,
                    packageIds: selectedPackages,
                  };

                  const addStoreResult = await addStoreToAppointment({
                    appointmentId,
                    body: addStorePayload,
                  });

                  if ("error" in addStoreResult) {
                    alertError(
                      t("common.error"),
                      getErrorMessage(addStoreResult.error),
                    );
                    return;
                  }
                  const result = addStoreResult.data;
                  if (result?.success) {
                    dispatch(requestAppointmentListTab({ filter: AppointmentFilter.Pending }));
                    onSuccessClose?.();
                    alertSuccess(t("common.success"), t("booking.storeAdded"), [
                      { text: t("common.ok"), onPress: closeAfterSuccess },
                    ]);
                  } else {
                    alertError(
                      t("common.error"),
                      result?.message ?? t("common.operationFailed"),
                    );
                  }
                  return;
                }

                // Müşteri için konum al
                const isCustomerFlow =
                  isCustomer || currentUserType === UserType.Customer;
                let customerLat: number | null = null;
                let customerLon: number | null = null;
                if (isCustomerFlow) {
                  const locationResult = await getCurrentLocationSafe();
                  if (!locationResult.ok) {
                    alertError(
                      t("booking.locationRequired"),
                      locationResult.message ??
                      t("booking.locationPermissionRequired"),
                    );
                    return;
                  }
                  customerLat = locationResult.lat;
                  customerLon = locationResult.lon;
                }

                const appointmentData = {
                  storeId: storeId,
                  chairId: selectedChair.chairId,
                  appointmentDate: selectedDateOnly,
                  startTime: startTime,
                  endTime: endTime,
                  serviceOfferingIds: selectedServices,
                  packageIds: selectedPackages,
                  freeBarberUserId: isCustomerFlow
                    ? null
                    : freeBarberUserId || null,
                  requestLatitude: isCustomerFlow
                    ? customerLat
                    : (storeData?.latitude ?? null),
                  requestLongitude: isCustomerFlow
                    ? customerLon
                    : (storeData?.longitude ?? null),
                  note: note || null,
                  storeSelectionType: storeSelectionType || null,
                };

                let result;
                if (isCustomerFlow) {
                  const customerResult =
                    await createCustomerAppointment(appointmentData);
                  if ("error" in customerResult) {
                    throw customerResult.error;
                  }
                  result = customerResult.data;
                } else if (
                  isFreeBarber ||
                  currentUserType === UserType.FreeBarber
                ) {
                  const freeBarberResult =
                    await createFreeBarberAppointment(appointmentData);
                  if ("error" in freeBarberResult) {
                    throw freeBarberResult.error;
                  }
                  result = freeBarberResult.data;
                } else if (currentUserType === UserType.BarberStore) {
                  const storeResult =
                    await createStoreAppointment(appointmentData);
                  if ("error" in storeResult) {
                    throw storeResult.error;
                  }
                  result = storeResult.data;
                } else {
                  alertError(
                    t("common.error"),
                    t("booking.userTypeNotDetermined"),
                  );
                  return;
                }

                if (result?.success) {
                  dispatch(requestAppointmentListTab({ filter: AppointmentFilter.Pending }));
                  onSuccessClose?.();
                  alertSuccess(
                    t("common.success"),
                    t("booking.appointmentCreated"),
                    [{ text: t("common.ok"), onPress: closeAfterSuccess }],
                  );
                } else {
                  alertError(
                    t("common.error"),
                    result?.message ?? t("booking.appointmentCreationFailed"),
                  );
                }
              } catch (error: unknown) {
                const errorMessage = getErrorMessage(error);
                // Abort hatası veya boş mesaj durumunda alert gösterme
                if (errorMessage) {
                  alertError(t("common.error"), errorMessage);
                }
              }
            }))}
          >
            {isCreatingCustomer ||
              isCreatingFreeBarber ||
              isCreatingStore ||
              isAddingStore ? (
              <ActivityIndicator color={getTextOnGold(isDark)} />
            ) : (
              <Icon source="location-enter" size={18} color={canSubmit ? getTextOnGold(isDark) : "white"} />
            )}
            <Text className="font-century-gothic text-base" style={{ color: canSubmit ? getTextOnGold(isDark) : "white" }}>
              {submitLabel}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
  );

  if (!isBottomSheet) {
    return (
      <View style={{ flex: 1 }}>
        <TouchableOpacity
          onPress={handleBookingBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.goBack")}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 20,
            zIndex: 50,
            borderRadius: 40,
            padding: 12,
            backgroundColor: "rgba(0,0,0,0.4)",
          }}
        >
          <Icon source="chevron-left" size={25} color="white" />
        </TouchableOpacity>
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
          showsVerticalScrollIndicator={false}
          stickyHeaderIndices={[0]}
        >
          {bookingStickyHeader}
          {bookingScrollBody}
        </ScrollView>
      </View>
    );
  }

  return (
    <BottomSheetFlatList<{ id: string }>
      data={bookingSheetFlatData}
      keyExtractor={(item: { id: string }) => item.id}
      style={{ flex: 1 }}
      nestedScrollEnabled
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
      showsVerticalScrollIndicator={false}
      renderItem={() => (
        <View collapsable={false}>
          {bookingStickyHeader}
          {bookingScrollBody}
        </View>
      )}
    />
  );
};

export default StoreBookingContent;
