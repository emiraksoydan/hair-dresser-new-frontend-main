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
} from "react-native";
import { BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Text } from "../common/Text";
import { useRouter } from "expo-router";
import { Icon, IconButton } from "react-native-paper";
import {
  useGetFreeBarberForUsersQuery,
  useCreateCustomerToFreeBarberAppointmentMutation,
  useCallFreeBarberMutation,
  useGetSettingQuery,
  useGetMineStoresQuery,
} from "../../store/api";
import FilterChip from "../common/filter-chip";
import { getBarberTypeName } from "../../utils/store/barber-type";
import { SkeletonComponent } from "../common/skeleton";
import { LottieViewComponent } from "../common/lottieview";
import { useAuth } from "../../hook/useAuth";
import { useLanguage } from "../../hook/useLanguage";
import {
  UserType,
  FreeBarGetDto,
  BarberStoreGetDto,
  StoreSelectionType,
} from "../../types";
import { MESSAGES } from "../../constants/messages";
import { APPOINTMENT_CONSTANTS } from "../../constants/appointment";
import { useNearbyStores } from "../../hook/useNearByStore";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import StoreBookingContent from "../store/storebooking";
import { StoreCardInner } from "../store/storecard";
import { EmptyState } from "../common/emptystateresult";
import MapView, { Marker } from "react-native-maps";
import { safeCoord } from "../../utils/location/geo";
import { toggleExpand } from "../../utils/common/expand-toggle";
import MotiViewExpand from "../common/motiviewexpand";
import { getCurrentLocationSafe } from "../../utils/location/location-helper";
import { RatingsBottomSheet } from "../rating/ratingsbottomsheet";
import { ImageCarousel } from "../common/imagecarousel";
import { useCanPerformAction } from "../../hook/useCanPerformAction";
import { getErrorMessage } from "../../utils/errorHandler";
import { useAlert } from "../../hook/useAlert";
import { useTheme } from "../../hook/useTheme";

interface Props {
  barberId: string;
  isBottomSheet?: boolean;
  isBarberMode?: boolean;
  mode?: "add-store";
  appointmentId?: string;
  storeId?: string;
  onStoreSelected?: (storeId: string) => void; // Dükkan seçildiğinde çağrılacak callback
}

const FreeBarberBookingContent = ({
  barberId,
  isBottomSheet = false,
  isBarberMode = false,
  onStoreSelected,
  mode,
  appointmentId,
  storeId,
}: Props) => {
  const router = useRouter();
  const isAddStoreMode = mode === "add-store";
  const { data: freeBarberData, isLoading } = useGetFreeBarberForUsersQuery(
    barberId,
    { skip: !barberId || isAddStoreMode },
  );
  const { data: settingData } = useGetSettingQuery();
  const [selectedServices, setSelectedServices] = useState<string[]>([]);
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
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);
  const [isMapMode, setIsMapMode] = useState(false);
  const { alert, alertSuccess, alertError } = useAlert();
  const { colors, isDark } = useTheme();

  // Action kontrolü: Error veya location denied durumunda işlem yapılamaz
  const { error: freeBarberDataError } = useGetFreeBarberForUsersQuery(
    barberId,
    { skip: !barberId || isAddStoreMode },
  );
  const { checkAndAlert: checkCanPerformAction } = useCanPerformAction(
    (isAddStoreMode ? storesError : freeBarberDataError) || undefined,
    locationStatus,
    "Bu işlemi gerçekleştirmek için konum izni gereklidir. Lütfen ayarlardan konum iznini açın.",
  );

  // Bottom sheet hooks - snapPoints dinamik olacak
  const storeSelectionSnapPoints = useMemo(
    () => (isMapMode ? ["75%", "100%"] : ["100%"]),
    [isMapMode],
  );
  const storeSelectionSheet = useBottomSheet({
    snapPoints: storeSelectionSnapPoints,
    enablePanDownToClose: isMapMode,
    enableOverDrag: isMapMode,
  });
  const storeBookingSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: true,
  });
  const ratingsSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
  });
  const myStoreSelectionSheet = useBottomSheet({
    snapPoints: ["50%"],
    enablePanDownToClose: true,
  });
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (!isAddStoreMode) return;
    const timer = setTimeout(() => {
      storeSelectionSheet.present();
    }, 150);
    return () => clearTimeout(timer);
  }, [isAddStoreMode, storeSelectionSheet]);

  const screenWidth = Dimensions.get("window").width;
  const cardWidthStore = useMemo(
    () => (expanded ? screenWidth * 0.92 : screenWidth * 0.94),
    [expanded, screenWidth],
  );
  const hasStores = (stores ?? []).length > 0;

  const toggleService = useCallback((id: string) => {
    setSelectedServices((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }, []);

  const totalPrice = useMemo(() => {
    const servicesTotal = (freeBarberData?.offerings ?? [])
      .filter((x) => selectedServices.includes(x.id))
      .reduce((sum, x) => sum + Number(x.price ?? 0), 0);
    return Number(servicesTotal.toFixed(APPOINTMENT_CONSTANTS.DECIMAL_PLACES));
  }, [freeBarberData?.offerings, selectedServices]);

  const goStoreDetail = useCallback(
    (store: BarberStoreGetDto) => {
      setSelectedStoreId(store.id);
      storeSelectionSheet.dismiss();
      setTimeout(() => {
        storeBookingSheet.present();
      }, 300);
    },
    [storeSelectionSheet, storeBookingSheet],
  );

  const handleMapItemPress = useCallback(
    (store: BarberStoreGetDto) => {
      setSelectedStoreId(store.id);
      storeSelectionSheet.dismiss();
      setTimeout(() => {
        storeBookingSheet.present();
      }, 300);
    },
    [storeSelectionSheet, storeBookingSheet],
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
    return <LottieViewComponent message={t("errors.barberNotFound")} />;
  }

  const borderRadiusClass = isBottomSheet ? "rounded-t-sm" : "";
  const ScrollContainer = isBottomSheet ? BottomSheetScrollView : ScrollView;

  return (
    <View style={{ flex: 1, backgroundColor: colors.sheetBg }} className="w-full">
      {!isAddStoreMode && (
        <View className={`relative w-full h-[250px]`}>
          <ImageCarousel
            images={freeBarberData?.imageList ?? []}
            autoPlay={true}
            mode={"default"}
            height={250}
            borderRadiusClass={borderRadiusClass}
          />
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
                  {freeBarberData?.fullName ?? "Serbest Berber"}
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
                <Icon size={16} color="#FFA500" source="star" />
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
      )}
      {isAddStoreMode && (
        <View className="px-4 pt-4 pb-2">
          <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-lg">
            Dükkan Seçin
          </Text>
          <Text className="text-gray-400 text-sm mt-1">
            Randevu için uygun işletmeyi seçin.
          </Text>
          <TouchableOpacity
            onPress={() => storeSelectionSheet.present()}
            className="mt-4 py-3 flex-row justify-center gap-2 rounded-xl items-center bg-[#3b82f6]"
          >
            <Icon source="store" size={18} color="white" />
            <Text className="text-white font-century-gothic-bold text-base">
              Dükkan Listesi
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <ScrollContainer nestedScrollEnabled className="p-4 gap-3" contentContainerStyle={{ paddingBottom: 140 }}>
        {currentUserType === UserType.BarberStore &&
          isBarberMode &&
          !isAddStoreMode && (
            <View className="gap-3 mt-4">
              <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-lg">
                Serbest Berber Çağır
              </Text>
              <Text className="text-sm" style={{ color: colors.textSecondary }}>
                Tarih ve saat seçmeden çağrı gönderebilirsiniz.
              </Text>
              <TouchableOpacity
                disabled={isCallingFreeBarber || !freeBarberData?.isAvailable}
                className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${!freeBarberData?.isAvailable || isCallingFreeBarber ? "bg-[#4b5563]" : "bg-[#3b82f6]"}`}
                style={{
                  opacity:
                    !freeBarberData?.isAvailable || isCallingFreeBarber
                      ? 0.7
                      : 1,
                }}
                onPress={async () => {
                  try {
                    // Eğer dışarıdan storeId geldiyse onu kullan, yoksa kullanıcının dükkanlarını kontrol et
                    let targetStoreId = storeId || selectedMyStoreId;

                    if (!targetStoreId) {
                      if (!myStores || myStores.length === 0) {
                        alertError(
                          t("common.error"),
                          t("errors.storeNotFound"),
                        );
                        return;
                      }

                      if (myStores.length === 1) {
                        targetStoreId = myStores[0].id;
                      } else {
                        // Show selection UI
                        myStoreSelectionSheet.present();
                        return;
                      }
                    }

                    if (!targetStoreId) return;

                    if (!freeBarberData?.isAvailable) {
                      alert(
                        t("booking.warning"),
                        t("booking.freebarberNotAvailable"),
                        undefined,
                        'warning'
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
                      storeId: targetStoreId,
                      freeBarberUserId: freeBarberUserId,
                    } as any;

                    const callResult = await callFreeBarber(payload);

                    if ("error" in callResult) {
                      const errorMessage = getErrorMessage(
                        callResult.error,
                      );
                      alertError(
                        t("common.error"),
                        errorMessage || t("booking.callFailed"),
                      );
                      return;
                    }
                    const result = callResult.data;
                    if (result?.success) {
                      alertSuccess(t("common.success"), t("booking.callSent"), [
                        { text: t("common.ok"), onPress: () => router.back() },
                      ]);
                    } else {
                      alertError(
                        t("common.error"),
                        result?.message ?? t("booking.callFailed"),
                      );
                    }

                    // handleCallFreeBarberRequest();
                  } catch (error: any) {
                    const errorMsg = getErrorMessage(error);
                    if (errorMsg) {
                      alertError(t("common.error"), errorMsg);
                    }
                  }
                }}
              >
                {isCallingFreeBarber ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon
                      source="account-arrow-right"
                      size={20}
                      color="white"
                    />
                    <Text className="text-white font-century-gothic-bold text-base">
                      Çağrı Gönder
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
                Randevu Tipi Seçin
              </Text>
              <TouchableOpacity
                disabled={!freeBarberData?.isAvailable}
                className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${!freeBarberData?.isAvailable ? "bg-[#4b5563]" : "bg-[#3b82f6]"}`}
                style={{ opacity: !freeBarberData?.isAvailable ? 0.7 : 1 }}
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
                <Icon source="lightbulb-on" size={20} color="white" />
                <Text className="text-white font-century-gothic-bold text-base">
                  İsteğime Göre
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={!freeBarberData?.isAvailable}
                className={`py-4 flex-row justify-center gap-2 rounded-xl items-center`}
                style={{
                  backgroundColor: !freeBarberData?.isAvailable ? '#4b5563' : '#fea60e',
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
                <Icon source="store" size={20} color="white" />
                <Text className="text-white font-century-gothic-bold text-base">
                  Dükkan Seç
                </Text>
              </TouchableOpacity>
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
                  Randevu Detayları
                </Text>
                <TouchableOpacity onPress={() => setStoreSelectionType(null)}>
                  <Icon source="close" size={20} color={colors.sectionHeaderText} />
                </TouchableOpacity>
              </View>

              {/* Hizmetler (Seçilebilir - Dikey Liste) */}
              <View>
                <View className="flex-row items-center justify-between mb-3">
                  <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-base">
                    {t("common.services")}
                  </Text>
                  <View style={{ backgroundColor: colors.cardBg2 }} className="px-3 py-1.5 rounded-lg">
                    <Text className="font-century-gothic-bold text-base" style={{ color: '#FFB900' }}>
                      {totalPrice} {t("card.currencySymbol")}
                    </Text>
                  </View>
                </View>
                <FlatList
                  data={freeBarberData?.offerings ?? []}
                  keyExtractor={(item) => item.id}
                  scrollEnabled={false}
                  contentContainerStyle={{ gap: 8 }}
                  renderItem={({ item }) => {
                    const isSelected = selectedServices.includes(item.id);
                    return (
                      <TouchableOpacity
                        onPress={() => toggleService(item.id)}
                        activeOpacity={0.7}
                        style={isSelected ? { backgroundColor: isDark ? 'rgba(254,166,14,0.2)' : 'rgba(254,166,14,0.1)', borderColor: '#fea60e', borderWidth: 1.5 } : { backgroundColor: colors.cardBg2, borderColor: colors.borderColor, borderWidth: 1 }}
                        className={`flex-row items-center justify-between px-4 py-3 rounded-xl`}
                      >
                        <View className="flex-row items-center flex-1 mr-2">
                          <Icon
                            source={isSelected ? "check-circle" : "circle-outline"}
                            size={22}
                            color={isSelected ? "#fea60e" : "#6b7280"}
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
                          style={{ color: isSelected ? "#fea60e" : colors.textSecondary }}
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
                style={isCreating ? { opacity: 0.7 } : { backgroundColor: '#fea60e', opacity: 1, elevation: 6, shadowColor: '#fea60e', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.3, shadowRadius: 6 }}
                onPress={async () => {
                  try {
                    // Error veya location denied kontrolü
                    if (!checkCanPerformAction()) {
                      return;
                    }

                    if (selectedServices.length === 0) {
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
                      serviceOfferingIds: selectedServices, // ✅ Sadece ID'leri gönder
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

                    alertSuccess(
                      t("common.success"),
                      t("booking.appointmentRequestSent"),
                      [{ text: t("common.ok"), onPress: () => router.back() }],
                    );
                  } catch (error: any) {
                    const errorMsg = getErrorMessage(error);
                    if (errorMsg) {
                      alertError(t("common.error"), errorMsg);
                    }
                  }
                }}
              >
                {isCreating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon source="send" size={20} color="white" />
                    <Text className="text-white font-century-gothic-bold text-base">
                      Randevu Talebi Gönder
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
                  Randevu Detayları
                </Text>
                <TouchableOpacity onPress={() => setStoreSelectionType(null)}>
                  <Icon source="close" size={20} color={colors.sectionHeaderText} />
                </TouchableOpacity>
              </View>

              <View>
                <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic text-base mb-2">
                  Berberin Hizmetleri
                </Text>
                <FlatList
                  data={freeBarberData?.offerings ?? []}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: 10, paddingHorizontal: 4 }}
                  renderItem={({ item }) => (
                    <FilterChip
                      itemKey={item.id}
                      selected={false}
                      isDisabled
                      className="rounded-xl px-4 py-2 bg-gray-800"
                    >
                      <Text style={{ color: "#d1d5db", fontSize: 14 }}>
                        {item.serviceName}
                      </Text>
                    </FilterChip>
                  )}
                />
              </View>

              <View>
                <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic mb-2">
                  Randevu Notu
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

              <TouchableOpacity
                disabled={isCreating}
                className={`py-4 flex-row justify-center gap-2 rounded-xl items-center ${isCreating ? "bg-[#4b5563]" : ""}`}
                style={isCreating ? { opacity: 0.7 } : { backgroundColor: '#fea60e', opacity: 1 }}
                onPress={async () => {
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

                    alertSuccess(
                      t("common.success"),
                      t("booking.appointmentRequestSentSimple"),
                      [{ text: t("common.ok"), onPress: () => router.back() }],
                    );
                  } catch (error: any) {
                    const errorMsg = getErrorMessage(error);
                    if (errorMsg) {
                      alertError(t("common.error"), errorMsg);
                    }
                  }
                }}
              >
                {isCreating ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <>
                    <Icon source="send" size={20} color="white" />
                    <Text className="text-white font-century-gothic-bold text-base">
                      Randevu Talebi Gönder
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
      </ScrollContainer>

      {/* Dükkan Seçimi Bottom Sheet - Customer Panel Yapısı */}
      {isAddStoreMode && (
        <BottomSheetModal
          ref={storeSelectionSheet.ref}
          index={0}
          snapPoints={storeSelectionSheet.snapPoints}
          enableOverDrag={storeSelectionSheet.enableOverDrag}
          enablePanDownToClose={storeSelectionSheet.enablePanDownToClose}
          handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
          backgroundStyle={{ backgroundColor: colors.sheetBg }}
          backdropComponent={storeSelectionSheet.makeBackdrop()}
          onChange={(index) => {
            storeSelectionSheet.handleChange(index);
            if (index < 0) {
              setSelectedStoreId(null);
            }
          }}
        >
          <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
            <View style={{ flex: 1, backgroundColor: colors.sheetBg }} className="pl-4 pr-2">
              <View style={{ borderBottomColor: colors.borderColor }} className="flex-row justify-between items-center px-4 py-3 border-b">
                <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic-bold text-xl">
                  Dükkan Seçin
                </Text>
                <IconButton
                  icon="close"
                  iconColor={colors.sectionHeaderText}
                  size={24}
                  onPress={() => {
                    storeSelectionSheet.dismiss();
                  }}
                />
              </View>
              <View className="px-4 py-2 gap-3">
                <Text className="text-gray-400 text-sm">
                  Serbest berber randevusu için bir dükkan seçmeniz
                  gerekmektedir.
                </Text>
                {/* Randevu Notu */}
                <View style={isAddStoreMode ? { display: "none" } : undefined}>
                  <Text style={{ color: colors.sectionHeaderText }} className="font-century-gothic mb-2">
                    Randevu Notu
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
                      İşletmeler
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
                    <FlatList
                      key="storesList"
                      data={stores}
                      keyExtractor={(item) => item.id}
                      renderItem={renderStoreItem}
                      horizontal={!expanded}
                      nestedScrollEnabled
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{
                        gap: 12,
                        paddingTop: hasStores ? 8 : 0,
                        paddingHorizontal: 16,
                      }}
                      ListEmptyComponent={
                        <EmptyState
                          loading={storesLoading}
                          locationStatus={locationStatus}
                          hasLocation={hasLocation}
                          fetchedOnce={fetchedOnce}
                          hasData={hasStores}
                          noResultText="Yakininda su an listelenecek isletme bulunamadi"
                        />
                      }
                    />
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
          snapPoints={storeBookingSheet.snapPoints}
          backgroundStyle={{ backgroundColor: colors.sheetBg }}
          enablePanDownToClose={storeBookingSheet.enablePanDownToClose}
          onChange={storeBookingSheet.handleChange}
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

      <BottomSheetModal
        ref={ratingsSheet.ref}
        snapPoints={ratingsSheet.snapPoints}
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
