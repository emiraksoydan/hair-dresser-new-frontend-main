import React, {
  useCallback,
  useMemo,
  useState,
  useRef,
  useEffect,
} from "react";
import {
  View,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  ScrollView,
  Dimensions,
  TextInput,
  Platform,
  Keyboard,
  useWindowDimensions,
  type KeyboardEvent,
} from "react-native";
import { ScrollView as GHScrollView } from "react-native-gesture-handler";
import { BottomSheetFlatList } from "@gorhom/bottom-sheet";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../common/Text";
import { useNavigation } from "@react-navigation/native";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useActionGuard } from "../../hook/useActionGuard";
import { Icon, IconButton } from "react-native-paper";
import {
  useGetFreeBarberForUsersQuery,
  useCreateCustomerToFreeBarberAppointmentMutation,
  useCallFreeBarberMutation,
  useGetSettingQuery,
  useGetMineStoresQuery,
  useGetServicePackagesByOwnerQuery,
} from "../../store/api";
import FilterChip from "../common/FilterChip";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { SkeletonComponent } from "../common/skeleton";
import { LottieViewComponent } from "../common/lottieview";
import { useAuth } from "../../hook/useAuth";
import { useAppDispatch } from "../../store/hook";
import { requestAppointmentListTab } from "../../store/appointmentUiSlice";
import { AppointmentFilter } from "../../types/appointment";
import { useLanguage } from "../../hook/useLanguage";
import {
  UserType,
  FreeBarGetDto,
  BarberStoreGetDto,
  BarberStoreMineDto,
  StoreSelectionType,
} from "../../types";
import { MESSAGES } from "../../constants/messages";
import { APPOINTMENT_CONSTANTS } from "../../constants/appointment";
import { useNearbyStores } from "../../hook/useNearByStore";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheet, useFullHeightBottomSheet } from "../../hook/useBottomSheet";
import { useFabOverlayWhenSheetOpen } from "../../hook/usePanelMoreFab";
import { useDeferredSheetPresent } from "../../hook/useDeferredSheetPresent";
import StoreBookingContent from "../store/StoreBooking";
import { StoreCardInner } from "../store/StoreCard";
import { EmptyState } from "../common/emptystateresult";
import { Marker } from "react-native-maps";
import { OsmMapView as MapView } from "../common/OsmMapView";
import { safeCoord } from "../../utils/location/geo";
import { toggleExpand } from "../../utils/common/expand-toggle";
import MotiViewExpand from "../common/motiviewexpand";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { RatingsBottomSheet } from "../rating/RatingsBottomSheet";
import { ImageCarousel } from "../common/imagecarousel";
import { useCanPerformAction } from "../../hook/useCanPerformAction";
import { getErrorMessage } from "../../utils/errorHandler";
import {
  wouldServicePackagesOverlap,
  packageOverlapsAnySelectedService,
  serviceIsInsideSelectedPackages,
} from "../../utils/service-package-overlap";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";
import { COLORS, getTextOnGold, getAppointmentAccentLabelFg } from "../../constants/colors";

const GOLD = COLORS.UI.ACCENT_GOLD;

type FreeBarberBookingScrollHostProps = {
  isBottomSheet: boolean;
  isAddStoreMode: boolean;
  scrollPaddingBottom: number;
  children: React.ReactNode;
};

/** Sheet: BottomSheetFlatList (gorhom jest); tam ekran: ScrollView — gövde tek children. */
const FreeBarberBookingScrollHost = React.memo(
  ({
    isBottomSheet,
    isAddStoreMode,
    scrollPaddingBottom,
    children,
  }: FreeBarberBookingScrollHostProps) => {
    const flatData = useMemo(() => [{ id: "__fbBookingScroll__" }], []);
    if (!isBottomSheet) {
      return (
        <ScrollView
          nestedScrollEnabled
          keyboardShouldPersistTaps="handled"
          className={isAddStoreMode ? "p-4 gap-3" : undefined}
          contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
          stickyHeaderIndices={!isAddStoreMode ? [0] : undefined}
        >
          {children}
        </ScrollView>
      );
    }
    return (
      <BottomSheetFlatList<{ id: string }>
        data={flatData}
        keyExtractor={(item: { id: string }) => item.id}
        style={{ flex: 1 }}
        nestedScrollEnabled
        keyboardShouldPersistTaps="handled"
        className={isAddStoreMode ? "p-4 gap-3" : undefined}
        contentContainerStyle={{ paddingBottom: scrollPaddingBottom }}
        renderItem={() => <View collapsable={false}>{children}</View>}
      />
    );
  },
);

interface Props {
  barberId: string;
  isBottomSheet?: boolean;
  isBarberMode?: boolean;
  mode?: "add-store";
  appointmentId?: string;
  storeId?: string;
  onStoreSelected?: (storeId: string) => void; // Dükkan seçildiğinde çağrılacak callback
  onSuccessClose?: () => void;
  disableHeaderImageSwipe?: boolean;
}

const FreeBarberBookingContent = ({
  barberId,
  isBottomSheet = false,
  isBarberMode = false,
  onStoreSelected,
  mode,
  appointmentId,
  storeId,
  onSuccessClose,
  disableHeaderImageSwipe = false,
}: Props) => {
  const router = useSafeNavigation();
  const navigation = useNavigation();
  const guard = useActionGuard();
  const insets = useSafeAreaInsets();
  // Mod (harita ↔ liste) geçişinde scroll position reset için ref.
  /** RNGH FlatList: Android’de yatay dükkan şeridi ile dikey jest çakışmasını azaltır */
  const storesListRef = useRef<any>(null);

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
  const isAddStoreMode = mode === "add-store";
  const { data: freeBarberData, isLoading, error: freeBarberDataError, refetch: refetchFreeBarber } = useGetFreeBarberForUsersQuery(
    barberId,
    { skip: !barberId || isAddStoreMode },
  );
  const { data: settingData } = useGetSettingQuery();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
  const [selectedPackages, setSelectedPackages] = useState<string[]>([]);
  const { data: packagesData } = useGetServicePackagesByOwnerQuery(barberId, {
    skip: !barberId || isAddStoreMode,
  });
  const packages = packagesData ?? [];
  const packageSelected = selectedPackages.length > 0;
  const { userType: currentUserType } = useAuth();
  const { t } = useLanguage();
  const [storeSelectionType, setStoreSelectionType] =
    useState<StoreSelectionType | null>(null);
  // Not alani sadece StoreSelection senaryosunda kullanilir
  const [note, setNote] = useState<string>("");
  const [createCustomerToFreeBarberAppointment, { isLoading: isCreating }] =
    useCreateCustomerToFreeBarberAppointmentMutation();
  const [callFreeBarber, { isLoading: isCallingFreeBarber }] =
    useCallFreeBarberMutation();
  const freeBarberUserId = freeBarberData?.freeBarberUserId ?? null;

  // Dükkan seçimi için
  const {
    stores,
    loading: storesLoading,
    locationStatus,
    hasLocation,
    fetchedOnce,
    error: storesError,
  } = useNearbyStores(isAddStoreMode);

  // Store Owner's Stores (for calling free barber)
  const { data: myStores, isLoading: isLoadingMyStores } =
    useGetMineStoresQuery(undefined, {
      skip: currentUserType !== UserType.BarberStore,
    });

  const [selectedStoreId, setSelectedStoreId] = useState<string | null>(null);
  const [selectedMyStoreId, setSelectedMyStoreId] = useState<string | null>(
    null,
  );
  const [myStoreSearchQuery, setMyStoreSearchQuery] = useState("");
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const { height: windowHeight } = useWindowDimensions();
  /** Klavye açıkken dikey scroll alt boşluğu (not + gönder butonu görünsün). */
  const [keyboardBottomPad, setKeyboardBottomPad] = useState(0);
  useEffect(() => {
    const showEvt =
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvt =
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const onShow = (e: KeyboardEvent) => {
      setKeyboardBottomPad(Math.max(0, e.endCoordinates?.height ?? 0));
    };
    const onHide = () => setKeyboardBottomPad(0);
    const s = Keyboard.addListener(showEvt, onShow);
    const h = Keyboard.addListener(hideEvt, onHide);
    return () => {
      s.remove();
      h.remove();
    };
  }, []);
  const { alert, alertSuccess, alertError } = useAlert();
  const dispatch = useAppDispatch();
  const { colors, isDark } = useTheme();

  // Action kontrolü: Error veya location denied durumunda işlem yapılamaz
  const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
    (isAddStoreMode ? storesError : freeBarberDataError) || undefined,
    locationStatus,
    t("location.permissionDeniedSettings"),
  );

  // Dükkan seçimi + randevu sheet: % snap bazı cihazlarda kesik; pencere yüksekliği (px) kullan
  const fullWindowSnapPoints = useMemo(
    () => [Math.max(1, windowHeight)] as (string | number)[],
    [windowHeight],
  );
  const storeSelectionSheet = useBottomSheet({
    snapPoints: fullWindowSnapPoints,
    enablePanDownToClose: true,
    enableOverDrag: false,
  });
  const storeBookingSheet = useBottomSheet({
    snapPoints: fullWindowSnapPoints,
    enablePanDownToClose: true,
    enableOverDrag: false,
  });
  const ratingsSheet = useFullHeightBottomSheet({
    enablePanDownToClose: true,
  });
  const myStoreSelectionSheet = useBottomSheet({
    snapPoints: ["50%", "95%"],
    enablePanDownToClose: true,
  });
  useFabOverlayWhenSheetOpen(
    storeSelectionSheet.isOpen ||
      storeBookingSheet.isOpen ||
      ratingsSheet.isOpen ||
      myStoreSelectionSheet.isOpen,
  );
  const [expanded, setExpanded] = useState(true);

  const { present: presentStoreSelection } = storeSelectionSheet;
  const { schedulePresent: scheduleStoreSelectionPresent, cancelScheduledPresent: cancelStoreSelectionPresent } =
    useDeferredSheetPresent(presentStoreSelection);
  const { present: presentStoreBooking } = storeBookingSheet;
  const { schedulePresent: scheduleStoreBookingPresent, cancelScheduledPresent: cancelStoreBookingPresent } =
    useDeferredSheetPresent(presentStoreBooking);

  useEffect(() => {
    if (!isAddStoreMode) {
      cancelStoreSelectionPresent();
      return;
    }
    scheduleStoreSelectionPresent(150);
  }, [isAddStoreMode, scheduleStoreSelectionPresent, cancelStoreSelectionPresent]);

  const screenWidth = Dimensions.get("window").width;
  const cardWidthStore = useMemo(
    () => (expanded ? screenWidth * 0.935 : screenWidth * 0.955),
    [expanded, screenWidth],
  );
  const hasStores = (stores ?? []).length > 0;

  const selectedMineStore = useMemo(() => {
    if (!selectedMyStoreId || !myStores?.length) return null;
    return myStores.find((s) => s.id === selectedMyStoreId) ?? null;
  }, [selectedMyStoreId, myStores]);

  const selectedMineStoreName = selectedMineStore?.storeName ?? null;
  const requiresStoreSelection = (myStores?.length ?? 0) > 1;
  const canSendStoreCall =
    !!freeBarberData?.isAvailable &&
    !isCallingFreeBarber &&
    (!requiresStoreSelection || !!selectedMyStoreId);

  const filteredMyStores = useMemo(() => {
    const stores = myStores ?? [];
    const query = myStoreSearchQuery.trim().toLocaleLowerCase("tr-TR");
    if (!query) return stores;
    return stores.filter((store) => {
      const name = store.storeName?.toLocaleLowerCase("tr-TR") ?? "";
      const address = store.addressDescription?.toLocaleLowerCase("tr-TR") ?? "";
      return name.includes(query) || address.includes(query);
    });
  }, [myStores, myStoreSearchQuery]);

  // FreeBarber çağırma mantığı ayrı fonksiyon — hem buton hem sheet seçimi sonrası tetiklenir
  const doCallFreeBarber = useCallback(async (targetStoreId: string) => {
    const targetStore = myStores?.find((s) => s.id === targetStoreId);
    if (targetStore && !targetStore.isOpenNow) {
      alertError(t("common.error"), t("errors.storeNotOpen"));
      return;
    }
    if (!freeBarberData?.isAvailable) {
      alert(t("booking.warning"), t("booking.freebarberNotAvailable"), undefined, 'warning');
      return;
    }
    if (!freeBarberUserId) {
      alert(t("booking.warning"), t("booking.freebarberInfoNotFound"), undefined, 'warning');
      return;
    }
    const callResult = await callFreeBarber({ storeId: targetStoreId, freeBarberUserId } as any);
    if ("error" in callResult) {
      alertError(t("common.error"), getErrorMessage(callResult.error) || t("booking.callFailed"));
      return;
    }
    const result = callResult.data;
    if (result?.success) {
      dispatch(requestAppointmentListTab({ filter: AppointmentFilter.Pending }));
      onSuccessClose?.();
      alertSuccess(t("common.success"), t("booking.callSent"), [
        { text: t("common.ok"), onPress: closeAfterSuccess },
      ]);
    } else {
      alertError(t("common.error"), result?.message ?? t("booking.callFailed"));
    }
  }, [myStores, freeBarberData, freeBarberUserId, callFreeBarber, alert, alertError, alertSuccess, dispatch, t, closeAfterSuccess, onSuccessClose]);

  const toggleService = useCallback(
    (id: string) => {
      if (
        serviceIsInsideSelectedPackages(id, packages as any, selectedPackages)
      ) {
        alertError(t("common.error"), t("servicePackage.serviceInsidePackage"));
        return;
      }
      setSelectedServices((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    },
    [packages, selectedPackages, alertError, t],
  );

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

  const packagePriceTotal = useMemo(() => {
    return packages
      .filter((p: any) => selectedPackages.includes(p.id))
      .reduce((sum: number, p: any) => sum + Number(p.totalPrice ?? 0), 0);
  }, [packages, selectedPackages]);

  const totalPrice = useMemo(() => {
    const servicesTotal = (freeBarberData?.offerings ?? [])
      .filter((x) => selectedServices.includes(x.id))
      .reduce((sum, x) => sum + Number(x.price ?? 0), 0);
    return Number(
      (servicesTotal + packagePriceTotal).toFixed(
        APPOINTMENT_CONSTANTS.DECIMAL_PLACES,
      ),
    );
  }, [freeBarberData?.offerings, selectedServices, packagePriceTotal]);

  const goStoreDetail = useCallback(
    (store: BarberStoreGetDto) => {
      setSelectedStoreId(store.id);
      cancelStoreBookingPresent();
      storeSelectionSheet.dismiss();
      scheduleStoreBookingPresent(300);
    },
    [storeSelectionSheet, cancelStoreBookingPresent, scheduleStoreBookingPresent],
  );

  const handleMapItemPress = useCallback(
    (store: BarberStoreGetDto) => {
      setSelectedStoreId(store.id);
      cancelStoreBookingPresent();
      storeSelectionSheet.dismiss();
      scheduleStoreBookingPresent(300);
    },
    [storeSelectionSheet, cancelStoreBookingPresent, scheduleStoreBookingPresent],
  );

  const storeMarkers = useMemo(() => {
    if (!hasStores) return null;
    return stores.map((store) => {
      const c = safeCoord(store.latitude, store.longitude);
      if (!c) return null;

      const avatarUrl = store?.imageList?.[0]?.imageUrl;
      const bg =
        store.type == 0 ? "#2563eb" : store.type == 1 ? "#db2777" : "#16a34a";
      const iconName =
        store.type == 2 ? "store" : store.type == 0 ? "face-man" : "face-woman";

      return (
        <Marker
          key={`store-${store.id}`}
          coordinate={{ latitude: c.lat, longitude: c.lon }}
          title={store.storeName}
          description={store.addressDescription}
          tracksViewChanges={false}
          onPress={() => handleMapItemPress(store)}
        >
          <View
            className="items-center justify-center w-9 h-9 rounded-full"
            style={{
              elevation: 4,
              borderWidth: avatarUrl ? 0 : 1,
              borderColor: "white",
              backgroundColor: bg,
            }}
          >
            {avatarUrl ? (
              <Image
                source={{ uri: avatarUrl }}
                className="w-full h-full rounded-full"
                resizeMode="cover"
              />
            ) : (
              <Icon source={iconName} color="white" size={20} />
            )}
          </View>
        </Marker>
      );
    });
  }, [stores, hasStores, handleMapItemPress]);

  const handlePressRatings = useCallback(
    (targetId: string, targetName: string) => {
      setSelectedRatingsTarget({ targetId, targetName });
      ratingsSheet.present();
    },
    [ratingsSheet],
  );

  const renderStoreItem = useCallback(
    ({ item }: { item: BarberStoreGetDto }) => (
      <StoreCardInner
        store={item}
        isList={true}
        expanded={expanded}
        cardWidthStore={cardWidthStore}
        onPressUpdate={goStoreDetail}
        onPressRatings={handlePressRatings}
        showImageAnimation={settingData?.data?.showImageAnimation ?? true}
      />
    ),
    [expanded, cardWidthStore, goStoreDetail, handlePressRatings, settingData],
  );

  // Loading
  if (!isAddStoreMode && isLoading) {
    return (
      <View className="flex-1 pt-4">
        {Array.from({ length: 1 }).map((_, i) => (
          <SkeletonComponent key={i} />
        ))}
      </View>
    );
  }

  // No Data
  if (!isAddStoreMode && !freeBarberData) {
    return (
      <LottieViewComponent
        message={freeBarberDataError ? t("error.serviceUnavailable") : t("errors.barberNotFound")}
        onRetry={freeBarberDataError ? refetchFreeBarber : undefined}
      />
    );
  }

  const borderRadiusClass = "";
  const BookingHScroll =
    isBottomSheet && Platform.OS === "android" ? ScrollView : GHScrollView;
  const scrollPaddingBottom =
    (isBottomSheet ? 300 : 140) + insets.bottom + keyboardBottomPad;

  return (
    <View style={{ flex: 1, backgroundColor: colors.sheetBg }} className="w-full">
      {!isAddStoreMode && !isBottomSheet && (
        <TouchableOpacity
          onPress={handleBookingBack}
          accessibilityRole="button"
          accessibilityLabel={t("common.goBack")}
          hitSlop={{ top: 16, bottom: 16, left: 16, right: 16 }}
          style={{
            position: "absolute",
            top: insets.top + 8,
            left: 16,
            zIndex: 50,
            borderRadius: 40,
            padding: 12,
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        >
          <Icon source="chevron-left" size={26} color="white" />
        </TouchableOpacity>
      )}
      {isAddStoreMode && (
        <View className="px-4 pt-4 pb-2">
          {!isBottomSheet && (
            <TouchableOpacity
              onPress={handleBookingBack}
              accessibilityRole="button"
              accessibilityLabel={t("common.goBack")}
              hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
              className="flex-row items-center self-start mb-3 py-1.5 pr-3 rounded-xl"
              style={{ backgroundColor: colors.cardBg2, borderWidth: 1, borderColor: colors.borderColor }}
            >
              <Icon source="chevron-left" size={22} color={colors.sectionHeaderText} />
              <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", marginLeft: 2 }}>
                {t("common.goBack")}
              </Text>
            </TouchableOpacity>
          )}
          <View
            className="rounded-2xl p-4"
            style={{
              backgroundColor: colors.cardBg2,
              borderWidth: 1,
              borderColor: colors.borderColor,
            }}
          >
            <View className="flex-row items-center">
              <View
                className="w-10 h-10 rounded-xl items-center justify-center"
                style={{ backgroundColor: isDark ? "rgba(59,130,246,0.22)" : "rgba(59,130,246,0.14)" }}
              >
                <Icon source="store-search-outline" size={20} color="#3b82f6" />
              </View>
              <View className="ml-3 flex-1">
                <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-lg">
                  {t("booking.storeSelectionSheetTitle")}
                </Text>
                <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
                  Randevuyu tamamlamak için uygun bir dükkan belirleyin.
                </Text>
              </View>
            </View>
            <Text className="text-xs mt-3" style={{ color: colors.textSecondary }}>
              Liste görünümünden detayları görebilir, harita ile en yakın dükkanı hızlıca seçebilirsiniz.
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => storeSelectionSheet.present()}
            className="mt-3 py-3.5 flex-row justify-center gap-2 rounded-xl items-center bg-[#3b82f6]"
          >
            <Icon source="store" size={18} color="white" />
            <Text className="text-white font-century-gothic-bold text-base">
              {t("booking.storeSelectionButton")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FreeBarberBookingScrollHost
        isBottomSheet={!!isBottomSheet}
        isAddStoreMode={isAddStoreMode}
        scrollPaddingBottom={scrollPaddingBottom}
      >
          {!isAddStoreMode && (
          <View style={{ overflow: "hidden", backgroundColor: colors.sheetBg }}>
            <View className={`relative w-full h-[250px]`}>
              <ImageCarousel
                images={freeBarberData?.imageList ?? []}
                autoPlay={true}
                mode={"default"}
                height={250}
                borderRadiusClass={borderRadiusClass}
                enableSwipe={!disableHeaderImageSwipe}
              />
              {isBottomSheet && (
                <View style={{ position: "absolute", top: 8, left: 0, right: 0, alignItems: "center", zIndex: 30 }}>
                  <View style={{ width: 36, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.65)" }} />
                </View>
              )}
              <View
                className={`absolute bottom-0 left-0 right-0 px-4 pb-3 bg-black/50 ${borderRadiusClass} justify-end h-full`}
              >
                <View className="flex-row justify-between items-end">
                  <View className="flex-1 mr-2">
                    <Text
                      className="font-century-gothic-bold text-white shadow-md"
                      numberOfLines={1}
                      style={{ fontSize: isBottomSheet ? 22 : 26 }}
                    >
                      {freeBarberData?.fullName ?? t("labels.freeBarberDefaultName")}
                    </Text>
                    <View className="flex-row items-center gap-2 mt-1">
                      <Icon
                        size={18}
                        color={freeBarberData?.type === 0 ? "#60a5fa" : "#f472b6"}
                        source={
                          freeBarberData?.type === 0 ? "face-man" : "face-woman"
                        }
                      />
                      <Text
                        className="text-white font-century-gothic"
                        style={{ fontSize: 14 }}
                      >
                        - {getBarberTypeName(freeBarberData?.type!)}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-center gap-1 bg-black/30 px-2 py-1 rounded-lg">
                    <Icon size={18} color="#FFA500" source="star" />
                    <Text
                      className="font-century-gothic-bold text-white"
                      style={{ fontSize: 14 }}
                    >
                      {Number(freeBarberData?.rating ?? 0).toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        )}
        <View className={isAddStoreMode ? undefined : "p-4 gap-3"}>
          {currentUserType === UserType.BarberStore &&
            isBarberMode &&
            !isAddStoreMode && (
              <View className="gap-3 mt-4">
                <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-lg">
                  {t("booking.callFreeBarberTitle")}
                </Text>
                <Text className="text-sm" style={{ color: colors.textSecondary }}>
                  Tarih ve saat seçmeden çağrı gönderebilirsiniz.
                </Text>
                {myStores && myStores.length > 1 && (
                  <TouchableOpacity
                    onPress={() => {
                      setMyStoreSearchQuery("");
                      myStoreSelectionSheet.present();
                    }}
                    activeOpacity={0.85}
                    className="mt-2 rounded-xl px-3 py-2.5 border"
                    style={{
                      backgroundColor: colors.cardBg2,
                      borderColor: colors.borderColor,
                    }}
                  >
                    <Text
                      className="text-xs mb-0.5"
                      style={{ color: colors.textSecondary, fontFamily: "CenturyGothic" }}
                    >
                      {t("appointment.labels.storeName")}
                    </Text>
                    <View className="flex-row items-center justify-between gap-2">
                      <Text
                        className="text-sm flex-1"
                        numberOfLines={2}
                        style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold" }}
                      >
                        {selectedMineStoreName ?? t("booking.selectStoreFirst")}
                      </Text>
                      <Icon source="chevron-down" size={22} color={colors.sectionHeaderText} />
                    </View>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  disabled={!canSendStoreCall}
                  className={`py-4 flex-row justify-center gap-2 rounded-xl items-center`}
                  style={{
                    backgroundColor: canSendStoreCall ? GOLD : '#4b5563',
                    opacity: canSendStoreCall ? 1 : 0.7,
                  }}
                  onPress={() => guard(async () => {
                    try {
                      let targetStoreId = selectedMyStoreId || storeId;
                      if (!targetStoreId) {
                        if (!myStores || myStores.length === 0) {
                          alertError(t("common.error"), t("errors.storeNotFound"));
                          return;
                        }
                        if (myStores.length === 1) {
                          targetStoreId = myStores[0].id;
                        } else {
                          // Çoklu dükkan: önce seç, seçim sonrası otomatik çağrılır
                          setMyStoreSearchQuery("");
                          myStoreSelectionSheet.present();
                          return;
                        }
                      }
                      if (!targetStoreId) return;
                      await doCallFreeBarber(targetStoreId);
                    } catch (error: any) {
                      const errorMsg = getErrorMessage(error);
                      if (errorMsg) alertError(t("common.error"), errorMsg);
                    }
                  })}
                >
                  {isCallingFreeBarber ? (
                    <ActivityIndicator color={getTextOnGold(isDark)} />
                  ) : (
                    <>
                      <Icon
                        source="account-arrow-right"
                        size={20}
                        color={canSendStoreCall ? getTextOnGold(isDark) : "white"}
                      />
                      <Text className="font-century-gothic-bold text-base" style={{ color: canSendStoreCall ? getTextOnGold(isDark) : "white" }}>
                        {t("booking.sendCallRequest")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          {/* İsteğime Göre seçilmediyse normal hizmet seçimi göster */}
          {currentUserType === UserType.Customer &&
            !isBarberMode &&
            !isAddStoreMode &&
            !storeSelectionType && (
              <View className="gap-3 mt-4">
                <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-lg">
                  {t("booking.appointmentTypeTitle")}
                </Text>
                <TouchableOpacity
                  disabled={!freeBarberData?.isAvailable}
                  className={`py-4 flex-row justify-center gap-2 rounded-xl items-center`}
                  style={{ backgroundColor: !freeBarberData?.isAvailable ? '#4b5563' : GOLD, opacity: !freeBarberData?.isAvailable ? 0.7 : 1 }}
                  onPress={() => {
                    if (!freeBarberData?.isAvailable) {
                      alert(
                        t("booking.warning"),
                        t("booking.freebarberNotAvailable"),
                        undefined,
                        'warning'
                      );
                      return;
                    }
                    setStoreSelectionType(StoreSelectionType.CustomRequest);
                  }}
                >
                  <Icon source="lightbulb-on" size={20} color={!freeBarberData?.isAvailable ? "white" : getTextOnGold(isDark)} />
                  <Text className="font-century-gothic-bold text-base" style={{ color: !freeBarberData?.isAvailable ? "white" : getTextOnGold(isDark) }}>
                    {t("booking.customRequestOption")}
                  </Text>
                </TouchableOpacity>
                <Text className="text-xs -mt-1 px-1" style={{ color: colors.textSecondary }}>
                  Hizmetleri seçip kendi lokasyonunuza göre hızlı randevu talebi oluşturursunuz.
                </Text>
                <TouchableOpacity
                  disabled={!freeBarberData?.isAvailable}
                  className={`py-4 flex-row justify-center gap-2 rounded-xl items-center`}
                  style={{
                    backgroundColor: !freeBarberData?.isAvailable ? '#4b5563' : GOLD,
                    opacity: !freeBarberData?.isAvailable ? 0.7 : 1,
                  }}
                  onPress={() => {
                    if (!freeBarberData?.isAvailable) {
                      alert(
                        t("booking.warning"),
                        t("booking.freebarberNotAvailable"),
                        undefined,
                        'warning'
                      );
                      return;
                    }
                    setStoreSelectionType(StoreSelectionType.StoreSelection);
                  }}
                >
                  <Icon source="store" size={20} color={!freeBarberData?.isAvailable ? "white" : getTextOnGold(isDark)} />
                  <Text className="font-century-gothic-bold text-base" style={{ color: !freeBarberData?.isAvailable ? "white" : getTextOnGold(isDark) }}>
                    {t("booking.storeSelectionOption")}
                  </Text>
                </TouchableOpacity>
                <Text className="text-xs -mt-1 px-1" style={{ color: colors.textSecondary }}>
                  Berber size uygun dükkanı sonra seçsin istiyorsanız bu modu kullanın ve not bırakın.
                </Text>
              </View>
            )}

          {/* İsteğime Göre Form */}
          {currentUserType === UserType.Customer &&
            !isBarberMode &&
            !isAddStoreMode &&
            storeSelectionType === StoreSelectionType.CustomRequest && (
              <View className="gap-4 mt-4">
                <View className="flex-row justify-between items-center">
                  <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-lg">
                    {t("booking.appointmentDetailsTitle")}
                  </Text>
                  <TouchableOpacity onPress={() => setStoreSelectionType(null)}>
                    <Icon source="close" size={20} color={colors.sectionHeaderText} />
                  </TouchableOpacity>
                </View>

                {/* Paket Seçimi */}
                {packages.length > 0 && (
                  <View>
                    <View className="flex-row items-center justify-between mb-3">
                      <View className="flex-row items-center gap-2">
                        <Icon source="tag-multiple-outline" size={18} color="#a78bfa" />
                        <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-base">
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
                                  color={isSelected ? "#a78bfa" : "#6b7280"}
                                />
                                <Text className="font-century-gothic-bold text-sm flex-1" style={{ color: isSelected ? '#a78bfa' : colors.sectionHeaderText }} numberOfLines={1}>
                                  {item.packageName}
                                </Text>
                              </View>
                              <Text className="font-century-gothic-bold text-sm" style={{ color: isSelected ? '#a78bfa' : colors.textSecondary }}>
                                {item.totalPrice} {t("card.currencySymbol")}
                              </Text>
                            </View>
                            {(item.items ?? []).length > 0 && (
                              <View className="flex-row flex-wrap gap-1 mt-2 ml-7">
                                {(item.items as any[]).slice(0, 4).map((si: any) => (
                                  <View key={si.serviceOfferingId} className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isSelected ? (isDark ? 'rgba(167,139,250,0.2)' : 'rgba(167,139,250,0.12)') : (isDark ? '#1e293b' : '#f1f5f9') }}>
                                    <Text className="text-xs" style={{ color: isSelected ? '#c4b5fd' : colors.textSecondary }}>{si.serviceName}</Text>
                                  </View>
                                ))}
                                {(item.items ?? []).length > 4 && (
                                  <View className="px-2 py-0.5 rounded-full" style={{ backgroundColor: isDark ? '#1e293b' : '#f1f5f9' }}>
                                    <Text className="text-xs" style={{ color: colors.textSecondary }}>+{(item.items ?? []).length - 4}</Text>
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

                {/* Hizmetler (Seçilebilir - Dikey Liste) */}
                <View>
                  <View className="flex-row items-center justify-between mb-3">
                    <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-base">
                      {t("common.services")}
                    </Text>
                    <View style={{ backgroundColor: colors.cardBg2 }} className="px-3 py-1.5 rounded-lg">
                        <Text className="font-century-gothic-bold text-base" style={{ color: getAppointmentAccentLabelFg(isDark) }}>
                          {totalPrice} {t("card.currencySymbol")}
                        </Text>
                      </View>
                  </View>
                  <FlatList
                    data={freeBarberData?.offerings ?? []}
                    keyExtractor={(item) => item.id}
                    scrollEnabled={false}
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
                          onPress={() => toggleService(item.id)}
                          activeOpacity={isDisabled ? 1 : 0.7}
                          style={[
                            isSelected ? { backgroundColor: isDark ? 'rgba(250, 204, 21,0.2)' : 'rgba(250, 204, 21,0.1)', borderColor: GOLD, borderWidth: 1.5 } : { backgroundColor: colors.cardBg2, borderColor: colors.borderColor, borderWidth: 1 },
                            { borderRadius: 12 },
                            isDisabled && { opacity: 0.45 },
                          ]}
                          className={`flex-row items-center justify-between px-4 py-3`}
                        >
                          <View className="flex-row items-center flex-1 mr-2">
                            <Icon
                              source={isSelected ? "check-circle" : "circle-outline"}
                              size={22}
                              color={isSelected ? getTextOnGold(isDark) : "#6b7280"}
                            />
                            <Text
                              className="ml-3 text-sm flex-1"
                              style={{ color: isSelected ? (isDark ? '#e2e8f0' : '#166534') : colors.sectionHeaderText }}
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
                </View>

                {/* Bilgilendirme Mesajlari */}
                <View
                  className="bg-blue-900/30 border border-blue-700/50 rounded-xl p-4 gap-2"
                  style={{ display: "none" }}
                >
                  <View className="flex-row items-start gap-2">
                    <Icon source="information" size={20} color="#60a5fa" />
                    <View className="flex-1">
                      <Text className="text-blue-300 font-century-gothic text-sm">
                        İstek gönderip free barber ile mesajlaşmaya
                        başlayabilirsiniz.
                      </Text>
                    </View>
                  </View>
                  <View className="flex-row items-start gap-2 mt-1">
                    <Icon
                      source="clock-alert-outline"
                      size={20}
                      color="#fbbf24"
                    />
                    <View className="flex-1">
                      <Text className="text-yellow-300 font-century-gothic text-sm">
                        5 dakika içinde cevap gelmezse randevu cevapsıza düşecek
                        ve yeni randevu arayabilirsiniz.
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Randevu Gönder Butonu */}
                <TouchableOpacity
                  disabled={isCreating}
                  className={`py-4 flex-row justify-center gap-2 rounded-2xl items-center ${isCreating ? "bg-[#4b5563]" : ""}`}
                  style={isCreating ? { opacity: 0.7 } : { backgroundColor: GOLD, opacity: 1 }}
                  onPress={() => guard(async () => {
                    try {
                      // Error veya location denied kontrolü
                      if (!checkCanPerformAction()) {
                        return;
                      }

                      if (selectedServices.length === 0 && selectedPackages.length === 0) {
                        alert(
                          t("booking.warning"),
                          t("booking.atLeastOneServiceRequired"),
                          undefined,
                          'warning'
                        );
                        return;
                      }

                      const locationResult = await getCurrentLocationSafe();
                      if (!locationResult.ok) {
                        alertError(
                          t("common.error"),
                          t("booking.locationNotAvailable"),
                        );
                        return;
                      }

                      if (!freeBarberUserId) {
                        alert(
                          t("booking.warning"),
                          t("booking.freebarberInfoNotFound"),
                          undefined,
                          'warning'
                        );
                        return;
                      }

                      const payload = {
                        freeBarberUserId: freeBarberUserId,
                        storeSelectionType: StoreSelectionType.CustomRequest,
                        requestLatitude: locationResult.lat,
                        requestLongitude: locationResult.lon,
                        serviceOfferingIds: selectedServices,
                        packageIds: selectedPackages,
                      } as any;

                      const createResult =
                        await createCustomerToFreeBarberAppointment(payload);

                      if ("error" in createResult) {
                        const errorMessage = getErrorMessage(
                          createResult.error,
                        );
                        alertError(
                          t("common.error"),
                          errorMessage || t("booking.appointmentCreationFailed"),
                        );
                        return;
                      }

                      dispatch(requestAppointmentListTab({ filter: AppointmentFilter.Pending }));
                      onSuccessClose?.();
                      alertSuccess(
                        t("common.success"),
                        t("booking.appointmentRequestSent"),
                        [{ text: t("common.ok"), onPress: closeAfterSuccess }],
                      );
                    } catch (error: any) {
                      const errorMsg = getErrorMessage(error);
                      if (errorMsg) {
                        alertError(t("common.error"), errorMsg);
                      }
                    }
                  })}
                >
                  {isCreating ? (
                    <ActivityIndicator color={getTextOnGold(isDark)} />
                  ) : (
                    <>
                      <Icon source="send" size={20} color={getTextOnGold(isDark)} />
                      <Text className="font-century-gothic-bold text-base" style={{ color: getTextOnGold(isDark) }}>
                        {t("booking.sendAppointmentRequest")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          {currentUserType === UserType.Customer &&
            !isBarberMode &&
            !isAddStoreMode &&
            storeSelectionType === StoreSelectionType.StoreSelection && (
              <View className="gap-4 mt-4">
                <View className="flex-row justify-between items-center">
                  <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-lg">
                    {t("booking.appointmentDetailsTitle")}
                  </Text>
                  <TouchableOpacity onPress={() => setStoreSelectionType(null)}>
                    <Icon source="close" size={20} color={colors.sectionHeaderText} />
                  </TouchableOpacity>
                </View>

                <View
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: colors.cardBg2,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                  }}
                >
                  <View className="flex-row items-center justify-between mb-2">
                    <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic text-base">
                      {t("booking.barberServicesTitle")}
                    </Text>
                    <View className="px-2 py-1 rounded-md" style={{ backgroundColor: isDark ? "#1f2937" : "#e2e8f0" }}>
                      <Text style={{ color: colors.textSecondary }} className="text-xs">
                        {(freeBarberData?.offerings ?? []).length}
                      </Text>
                    </View>
                  </View>
                  <BookingHScroll
                    horizontal
                    nestedScrollEnabled
                    keyboardShouldPersistTaps="handled"
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
                  >
                    {(freeBarberData?.offerings ?? []).map((item) => (
                      <View
                        key={item.id}
                        style={{
                          backgroundColor: isDark ? "#0f172a" : "#f1f5f9",
                          borderWidth: 1,
                          borderColor: colors.borderColor,
                          borderRadius: 12,
                        }}
                      >
                        <FilterChip
                          itemKey={item.id}
                          selected={false}
                          isDisabled
                          className="rounded-xl px-4 py-2 bg-transparent"
                        >
                          <Text style={{ color: colors.sectionHeaderText, fontSize: 14 }}>
                            {item.serviceName}
                          </Text>
                        </FilterChip>
                      </View>
                    ))}
                  </BookingHScroll>
                </View>

                <View
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: colors.cardBg2,
                    borderWidth: 1,
                    borderColor: colors.borderColor,
                  }}
                >
                  <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic mb-2">
                    {t("booking.appointmentNoteTitle")}
                  </Text>
                  <Text className="text-xs mb-2" style={{ color: colors.textSecondary }}>
                    {t("booking.appointmentNoteStoreSelectionHint")}
                  </Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={t("booking.appointmentNotePlaceholder")}
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    style={{
                      textAlignVertical: "top",
                      minHeight: 80,
                      fontFamily: Platform.OS === "ios" ? "CenturyGothic" : "CenturyGothic",
                      backgroundColor: colors.cardBg2,
                      color: colors.sectionHeaderText,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  />
                </View>

                <View className="mt-1">
                  <TouchableOpacity
                    disabled={isCreating}
                    className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${isCreating ? "bg-[#4b5563]" : ""}`}
                    style={isCreating ? { opacity: 0.7 } : { backgroundColor: GOLD, opacity: 1 }}
                    onPress={() => guard(async () => {
                    try {
                      // Error veya location denied kontrolü
                      if (!checkCanPerformAction()) {
                        return;
                      }

                      const trimmedNote = note.trim();
                      if (!trimmedNote) {
                        alert(
                          t("booking.warning"),
                          t("booking.appointmentNoteRequired"),
                          undefined,
                          'warning'
                        );
                        return;
                      }

                      const locationResult = await getCurrentLocationSafe();
                      if (!locationResult.ok) {
                        alertError(
                          t("location.locationRequired"),
                          locationResult.message ??
                          t("location.locationInfoNotAvailable"),
                        );
                        return;
                      }

                      if (!freeBarberUserId) {
                        alert(
                          t("booking.warning"),
                          t("booking.freebarberInfoNotFound"),
                          undefined,
                          'warning'
                        );
                        return;
                      }

                      const payload = {
                        freeBarberUserId: freeBarberUserId,
                        storeSelectionType: StoreSelectionType.StoreSelection,
                        requestLatitude: locationResult.lat,
                        requestLongitude: locationResult.lon,
                        note: trimmedNote,
                      } as any;

                      const createResult =
                        await createCustomerToFreeBarberAppointment(payload);

                      if ("error" in createResult) {
                        const errorMessage = getErrorMessage(
                          createResult.error,
                        );
                        alertError(
                          t("common.error"),
                          errorMessage || t("booking.appointmentCreationFailed"),
                        );
                        return;
                      }

                      dispatch(requestAppointmentListTab({ filter: AppointmentFilter.Pending }));
                      onSuccessClose?.();
                      alertSuccess(
                        t("common.success"),
                        t("booking.appointmentRequestSentSimple"),
                        [{ text: t("common.ok"), onPress: closeAfterSuccess }],
                      );
                    } catch (error: any) {
                      const errorMsg = getErrorMessage(error);
                      if (errorMsg) {
                        alertError(t("common.error"), errorMsg);
                      }
                    }
                    })}
                  >
                    {isCreating ? (
                      <ActivityIndicator color={getTextOnGold(isDark)} />
                    ) : (
                      <>
                        <Icon source="send" size={20} color={getTextOnGold(isDark)} />
                        <Text className="font-century-gothic-bold text-base" style={{ color: getTextOnGold(isDark) }}>
                          {t("booking.sendAppointmentRequest")}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
        </View>
      </FreeBarberBookingScrollHost>

      {/* Dükkan Seçimi Bottom Sheet - Customer Panel Yapısı */}
      {isAddStoreMode && (
        <BottomSheetModal
          ref={storeSelectionSheet.ref}
          index={0}
          enableDynamicSizing={false}
          snapPoints={storeSelectionSheet.snapPoints}
          enableOverDrag={storeSelectionSheet.enableOverDrag}
          enablePanDownToClose={storeSelectionSheet.enablePanDownToClose}
          handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
          backgroundStyle={{ backgroundColor: colors.sheetBg }}
          backdropComponent={storeSelectionSheet.makeBackdrop()}
          onChange={(index) => {
            storeSelectionSheet.handleChange(index);
            if (index < 0) {
              cancelStoreBookingPresent();
              setSelectedStoreId(null);
            }
          }}
        >
          <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
            <View style={{ flex: 1, backgroundColor: colors.sheetBg }} className="pl-4 pr-2">
              <View style={{ borderBottomColor: colors.borderColor }} className="flex-row justify-between items-center px-4 py-3 border-b">
                <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-xl">
                  {t("booking.storeSelectionSheetTitle")}
                </Text>
                <IconButton
                  icon="close"
                  iconColor={colors.sectionHeaderText}
                  size={24}
                  onPress={() => {
                    cancelStoreBookingPresent();
                    storeSelectionSheet.dismiss();
                  }}
                />
              </View>
              <View className="px-4 py-2 gap-3">
                <Text style={{ color: colors.textSecondary }} className="text-sm">
                  {t("booking.storeSelectionSheetSubtitle")}
                </Text>
                {/* Randevu Notu */}
                <View style={isAddStoreMode ? { display: "none" } : undefined}>
                  <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic mb-2">
                    {t("common.note")}
                  </Text>
                  <TextInput
                    value={note}
                    onChangeText={setNote}
                    placeholder={t("booking.appointmentNotePlaceholderAlt")}
                    placeholderTextColor="#9ca3af"
                    multiline
                    numberOfLines={3}
                    style={{
                      textAlignVertical: "top",
                      minHeight: 80,
                      fontFamily: Platform.OS === "ios" ? "CenturyGothic" : "CenturyGothic",
                      backgroundColor: colors.cardBg2,
                      color: colors.sectionHeaderText,
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingVertical: 12,
                    }}
                  />
                </View>
              </View>

              {isMapMode ? (
                <View className="flex-1">
                  <MapView
                    style={{ flex: 1 }}
                    userInterfaceStyle="dark"
                    showsUserLocation={true}
                  >
                    {storeMarkers}
                  </MapView>
                  <TouchableOpacity
                    onPress={() => setIsMapMode(false)}
                    className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                    style={{ elevation: 8 }}
                  >
                    <IconButton
                      icon="format-list-bulleted"
                      iconColor="#f05e23"
                      size={28}
                      style={{ margin: 0 }}
                    />
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View className="flex flex-row justify-between items-center mt-4 px-4">
                    <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic text-xl">
                      {t("booking.storeListSectionTitle")}
                    </Text>
                    {hasStores && (
                      <MotiViewExpand
                        expanded={expanded}
                        onPress={() => toggleExpand(expanded, setExpanded)}
                      />
                    )}
                  </View>

                  {storesLoading ? (
                    <View className="flex-1 pt-4 px-4">
                      {Array.from({ length: 2 }).map((_, i) => (
                        <SkeletonComponent key={i} />
                      ))}
                    </View>
                  ) : (
                    <View style={{ flex: 1, minHeight: 1 }}>
                      <BottomSheetFlatList<BarberStoreGetDto>
                        ref={storesListRef}
                        key={`storesList-${expanded ? "v" : "h"}`}
                        data={stores}
                        keyExtractor={(item: BarberStoreGetDto) => item.id}
                        renderItem={renderStoreItem}
                        horizontal={!expanded}
                        nestedScrollEnabled
                        keyboardShouldPersistTaps="handled"
                        showsHorizontalScrollIndicator={false}
                        directionalLockEnabled={Platform.OS === "ios"}
                        contentContainerStyle={{
                          gap: 12,
                          paddingTop: hasStores ? 8 : 0,
                          paddingHorizontal: 16,
                          paddingBottom: expanded ? insets.bottom + 160 : 8,
                        }}
                        ListEmptyComponent={
                          <EmptyState
                            loading={storesLoading}
                            locationStatus={locationStatus}
                            hasLocation={hasLocation}
                            fetchedOnce={fetchedOnce}
                            hasData={hasStores}
                            noResultText={t("booking.storeSelectionEmpty")}
                          />
                        }
                      />
                    </View>
                  )}

                  <TouchableOpacity
                    onPress={() => setIsMapMode(true)}
                    className="absolute right-4 bottom-6 w-14 h-14 bg-[#38393b] rounded-full items-center justify-center z-20 shadow-lg border border-[#47494e]"
                    style={{ elevation: 8 }}
                  >
                    <IconButton
                      icon="map"
                      iconColor="#f05e23"
                      size={28}
                      style={{ margin: 0 }}
                    />
                  </TouchableOpacity>
                </>
              )}
            </View>
          </BottomSheetView>
        </BottomSheetModal>
      )}

      {isAddStoreMode && selectedStoreId && (
        <BottomSheetModal
          ref={storeBookingSheet.ref}
          index={0}
          enableDynamicSizing={false}
          snapPoints={storeBookingSheet.snapPoints}
          backgroundStyle={{ backgroundColor: colors.sheetBg }}
          enablePanDownToClose={storeBookingSheet.enablePanDownToClose}
          enableOverDrag={storeBookingSheet.enableOverDrag}
          onChange={storeBookingSheet.handleChange}
          onDismiss={() => {
            cancelStoreBookingPresent();
            storeBookingSheet.handleDismiss();
          }}
        >
          <BottomSheetView className="flex-1">
            <StoreBookingContent
              storeId={selectedStoreId}
              isBottomSheet={true}
              isFreeBarber={true}
              mode="add-store"
              appointmentId={appointmentId}
            />
          </BottomSheetView>
        </BottomSheetModal>
      )}

      {currentUserType === UserType.BarberStore && isBarberMode && !isAddStoreMode && (
        <BottomSheetModal
          ref={myStoreSelectionSheet.ref}
          stackBehavior="push"
          index={0}
          snapPoints={myStoreSelectionSheet.snapPoints}
          enableDynamicSizing={false}
          enablePanDownToClose={myStoreSelectionSheet.enablePanDownToClose}
          handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
          backgroundStyle={{ backgroundColor: colors.sheetBg }}
          backdropComponent={myStoreSelectionSheet.makeBackdrop()}
          onChange={(idx) => {
            myStoreSelectionSheet.handleChange(idx);
          }}
        >
          <BottomSheetView style={{ flex: 1, paddingHorizontal: 16, paddingBottom: 12 }}>
            <Text
              className="text-lg mb-1"
              style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold" }}
            >
              {t("navigation.shops")}
            </Text>
            <Text className="text-sm mb-3" style={{ color: colors.textSecondary }}>
              {t("booking.selectStoreFirst")}
            </Text>
            <View
              className="mb-3 rounded-xl border flex-row items-center px-3"
              style={{ backgroundColor: colors.cardBg2, borderColor: colors.borderColor }}
            >
              <Icon source="magnify" size={20} color={colors.textSecondary} />
              <TextInput
                value={myStoreSearchQuery}
                onChangeText={setMyStoreSearchQuery}
                placeholder={t("common.searchPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                style={{
                  flex: 1,
                  height: 44,
                  paddingHorizontal: 10,
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic",
                }}
              />
              {myStoreSearchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setMyStoreSearchQuery("")} hitSlop={10}>
                  <Icon source="close" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
            {isLoadingMyStores ? (
              <SkeletonComponent />
            ) : (
              <BottomSheetFlatList<BarberStoreMineDto>
                data={filteredMyStores}
                keyExtractor={(s: BarberStoreMineDto) => s.id}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{ paddingBottom: 24 }}
                ListEmptyComponent={
                  <View className="items-center py-8">
                    <Icon source="store-search-outline" size={28} color={colors.textSecondary} />
                    <Text className="mt-2 text-sm" style={{ color: colors.textSecondary }}>
                      {t("common.noSearchResults")}
                    </Text>
                  </View>
                }
                renderItem={({ item }: { item: BarberStoreMineDto }) => (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedMyStoreId(item.id);
                      myStoreSelectionSheet.dismiss();
                    }}
                    className="rounded-xl px-3 py-3 mb-2 border"
                    style={{
                      backgroundColor: colors.cardBg2,
                      borderColor: selectedMyStoreId === item.id ? "#3b82f6" : colors.borderColor,
                      borderWidth: selectedMyStoreId === item.id ? 2 : 1,
                    }}
                  >
                    <View className="flex-row items-center justify-between">
                      <Text
                        className="text-base flex-1 mr-2"
                        style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold" }}
                        numberOfLines={2}
                      >
                        {item.storeName}
                      </Text>
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{
                          backgroundColor: item.isOpenNow
                            ? "rgba(34,197,94,0.15)"
                            : "rgba(239,68,68,0.15)",
                        }}
                      >
                        <Text
                          className="text-xs"
                          style={{
                            color: item.isOpenNow ? "#22c55e" : "#ef4444",
                            fontFamily: "CenturyGothic-Bold",
                          }}
                        >
                          {item.isOpenNow ? t("status.open") : t("status.closed")}
                        </Text>
                      </View>
                    </View>
                    {item.addressDescription ? (
                      <Text
                        className="text-xs mt-1"
                        style={{ color: colors.textSecondary }}
                        numberOfLines={2}
                      >
                        {item.addressDescription}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                )}
              />
            )}
          </BottomSheetView>
        </BottomSheetModal>
      )}

      <BottomSheetModal
        ref={ratingsSheet.ref}
        snapPoints={ratingsSheet.snapPoints}
        index={0}
        enableDynamicSizing={false}
        enableContentPanningGesture={true}
        enablePanDownToClose={ratingsSheet.enablePanDownToClose}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={ratingsSheet.makeBackdrop()}
        onChange={(index) => {
          ratingsSheet.handleChange(index);
          if (index < 0) {
            setSelectedRatingsTarget(null);
          }
        }}
      >
        {selectedRatingsTarget ? (
          <RatingsBottomSheet
            targetId={selectedRatingsTarget.targetId}
            targetName={selectedRatingsTarget.targetName}
            onClose={() => {
              setSelectedRatingsTarget(null);
              ratingsSheet.dismiss();
            }}
          />
        ) : (
          <View className="flex-1 pt-4">
            <SkeletonComponent />
          </View>
        )}
      </BottomSheetModal>
    </View>
  );
};

export default FreeBarberBookingContent;
