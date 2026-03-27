import {
  Dimensions,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/common/Text";
import React, { useCallback, useMemo, useRef, useState } from "react";
import { useBottomSheet } from "../../hook/useBottomSheet";
import SearchBar from "../../components/common/searchbar";
import { SkeletonComponent } from "../../components/common/skeleton";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { FilterDrawer } from "../../components/common/filterdrawer";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { FormFreeBarberOperation } from "../../components/freebarber/formfreebarberoper";
import { StoreCardInner } from "../../components/store/storecard";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useNearbyStores } from "../../hook/useNearByStore";
import { UnifiedStateWrapper } from "../../components/common/UnifiedStateManager";
import {
  BarberStoreGetDto,
  AppointmentStatus,
  StoreSelectionType,
} from "../../types";
import { FreeBarberPanelSection } from "../../components/freebarber/freebarberpanelsection";
import { useLocalSearchParams } from "expo-router";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { Icon, IconButton } from "react-native-paper";
import MapView from "react-native-maps";
import { safeCoord } from "../../utils/location/geo";
import StoreBookingContent from "../../components/store/storebooking";
import {
  useGetAllCategoriesQuery,
  useGetFreeBarberMinePanelQuery,
  useGetAllNotificationsQuery,
  useGetSettingQuery,
  useGetMeQuery,
  useGetSavedFiltersQuery,
  useCreateSavedFilterMutation,
  useDeleteSavedFilterMutation,
  useUpdateSavedFilterMutation,
} from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { getErrorMessage, getMessage } from "../../utils/errorHandler";
import { SavedFilterChips } from "../../components/common/savedfilterchips";
import { useTrackFreeBarberLocation } from "../../hook/useTrackFreeBarberLocation";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { useBackendFilters } from "../../hook/useBackendFilters";
import { useActionGuard } from "../../hook/useActionGuard";
import { StoreMarker } from "../../components/common/storemarker";
import { FreeBarberMarker } from "../../components/freebarber/freebarbermarker";
import { DeferredRender } from "../../components/common/deferredrender";
import { CrudSkeletonComponent } from "../../components/common/crudskeleton";
import { isOtherUsersStore } from "../../utils/compare-eligibility";
import { PanelCollapsibleTop } from "../../components/panel/PanelCollapsibleTop";
import { useFreeBarberPanelEarningsPreview } from "../../hook/usePanelEarningsPreview";
import { AnimatedMoneyText } from "../../components/common/AnimatedMoneyText";

const PANEL_CURRENCY = "₺";

const Index = () => {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const guard = useActionGuard();

  const { data: notifications = [], refetch: refetchNotifications } =
    useGetAllNotificationsQuery();
  const activeStoreSelectionAppointment = useMemo(() => {
    for (const notification of notifications) {
      if (!notification.payloadJson || notification.payloadJson === "{}")
        continue;

      try {
        const payload = JSON.parse(notification.payloadJson);
        let expiresAt: Date | null = null;
        if (payload?.pendingExpiresAt) {
          let dateStr = payload.pendingExpiresAt;
          if (
            typeof dateStr === "string" &&
            !dateStr.endsWith("Z") &&
            !dateStr.includes("+")
          ) {
            dateStr += "Z";
          }
          expiresAt = new Date(dateStr);
        } else if (notification.createdAt) {
          let createdStr = notification.createdAt;
          if (
            typeof createdStr === "string" &&
            !createdStr.endsWith("Z") &&
            !createdStr.includes("+")
          ) {
            createdStr += "Z";
          }
          const createdAt = new Date(createdStr);
          expiresAt = new Date(createdAt.getTime() + 30 * 60 * 1000);
        }
        const isExpired = expiresAt
          ? new Date().getTime() > expiresAt.getTime()
          : false;

        // StoreSelection randevusu mu ve henüz dükkan seçilmemiş mi?
        if (
          payload.storeSelectionType === StoreSelectionType.StoreSelection &&
          payload.status === AppointmentStatus.Pending &&
          !payload.store &&
          notification.appointmentId &&
          !isExpired
        ) {
          return {
            id: notification.appointmentId,
            payload: payload,
          };
        }
      } catch {
        continue;
      }
    }
    return null;
  }, [notifications]);

  // URL'den gelen mode veya otomatik algılanan randevu varsa add-store modu
  const effectiveAppointmentId = activeStoreSelectionAppointment?.id;

  const { data: allCategories = [] } = useGetAllCategoriesQuery();
  const categoryNameById = useMemo(() => {
    const map = new Map<string, string>();
    (allCategories ?? []).forEach((c: any) => {
      if (c?.id && c?.name) map.set(String(c.id), String(c.name));
    });
    return map;
  }, [allCategories]);

  // Filtering
  const {
    criteria: filterCriteria,
    updateCriteria: updateFilterCriteria,
    clearFilters,
    loadFromSaved,
    activeSavedFilterId,
    hasActiveFilters,
    createFilterRequestDto,
  } = useBackendFilters(); // Varsayılan olarak tüm filtreler "all" (Hepsi) seçili

  // Kayıtlı filtreler
  const { data: savedFiltersData } = useGetSavedFiltersQuery();
  const savedFilters = savedFiltersData?.data ?? [];
  const [createSavedFilter] = useCreateSavedFilterMutation();
  const [deleteSavedFilter] = useDeleteSavedFilterMutation();
  const [updateSavedFilter] = useUpdateSavedFilterMutation();

  // Free barber paneli için current user ID (favoriler için)
  const { data: currentUser } = useGetMeQuery();
  const currentUserId = currentUser?.data?.id;

  const [compareStoreIds, setCompareStoreIds] = useState<string[]>([]);
  const toggleCompareStore = useCallback((storeId: string) => {
    setCompareStoreIds((prev) => {
      if (prev.includes(storeId)) return prev.filter((x) => x !== storeId);
      if (prev.length < 2) return [...prev, storeId];
      return [prev[1], storeId];
    });
  }, []);

  // Create filter DTO for backend - includes all filter criteria
  const storeFilterDto = useMemo(() => {
    return createFilterRequestDto(undefined, currentUserId, t);
  }, [createFilterRequestDto, currentUserId, t, filterCriteria]);

  // Önce location'ı al (useNearbyStores'dan)
  // Backend'de free barber panel kontrolü yapılıyor, frontend'de sadece enabled kontrolü yapıyoruz
  const {
    stores,
    loading,
    error: storeError,
    locationStatus,
    locationMessage,
    hasLocation,
    fetchedOnce,
    location,
    manualFetch,
  } = useNearbyStores({
    enabled: true,
    filter: storeFilterDto,
    useFilteredEndpoint: true, // Her zaman filtered endpoint kullan
  });

  // Free barber paneli yoksa nearby stores'u gösterme
  const {
    data: freeBarber,
    isLoading,
    isError,
    error,
    refetch: refetchFreeBarber,
  } = useGetFreeBarberMinePanelQuery(undefined, {
    skip: !hasLocation,
  });

  // Free barber paneli yoksa stores'u filtrele (backend'de zaten kontrol ediliyor ama ekstra güvenlik için)
  const hasFreeBarberPanel = !!freeBarber?.id;
  const displayStores = useMemo(() => {
    // Backend'de zaten kontrol ediliyor, ama frontend'de de ekstra kontrol
    if (!hasFreeBarberPanel) {
      return [];
    }
    return stores ?? [];
  }, [stores, hasFreeBarberPanel]);

  // Ayarlar
  const { data: settingData } = useGetSettingQuery();
  const priceAnim = settingData?.data?.showPriceAnimation ?? true;
  const panelEarningsPreview = useFreeBarberPanelEarningsPreview(hasFreeBarberPanel);
  const panelTopCollapsedHint = useMemo(() => {
    if (!panelEarningsPreview) return t("panel.topSectionCollapsedHint");
    const d = panelEarningsPreview.dailyEarnings ?? 0;
    const tot = panelEarningsPreview.totalEarnings ?? 0;
    return `${t("profile.dailyEarnings")}: ${d.toLocaleString("tr-TR")} ${PANEL_CURRENCY} · ${t("profile.totalEarnings")}: ${tot.toLocaleString("tr-TR")} ${PANEL_CURRENCY}`;
  }, [panelEarningsPreview, t]);

  const [panelTopExpanded, setPanelTopExpanded] = useState(true);

  const [searchQuery, setSearchQuery] = useState("");
  const [isList, setIsList] = useState(true);

  // Filter drawer state
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);
  const onRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    // CRITICAL FIX: Set refreshing state BEFORE early returns
    // This prevents loading indicator from getting stuck
    setRefreshing(true);

    try {
      // Early return if error or location denied, but still hide indicator
      if (storeError || locationStatus === "denied") {
        return;
      }

      isRefreshingRef.current = true;
      await Promise.all([
        manualFetch(),
        refetchFreeBarber(),
        refetchNotifications(),
      ]);
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [
    manualFetch,
    refetchFreeBarber,
    refetchNotifications,
    storeError,
    locationStatus,
  ]);

  const [isMapMode, setIsMapMode] = useState(false);
  const [selectedMapItem, setSelectedMapItem] =
    useState<BarberStoreGetDto | null>(null);

  // Bottom sheet hooks
  const mapDetailSheet = useBottomSheet({
    snapPoints: ["90%", "100%"],
    enablePanDownToClose: true,
  });
  const freeBarberPanelSnapPoints = useMemo(
    () => (isMapMode ? ["75%", "100%"] : ["100%"]),
    [isMapMode],
  );
  const freeBarberPanelSheet = useBottomSheet({
    snapPoints: freeBarberPanelSnapPoints,
    enablePanDownToClose: isMapMode,
    enableOverDrag: isMapMode,
  });
  const ratingsSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
  });

  const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);
  const [freeBarberId, setFreeBarberId] = useState<string | null>(null);

  const screenWidth = Dimensions.get("window").width;

  const cardWidthStores = useMemo(
    () => (expandedStoreBarber ? screenWidth * 0.92 : screenWidth * 0.94),
    [expandedStoreBarber, screenWidth],
  );

  // displayStores zaten yukarıda tanımlandı (hasFreeBarberPanel kontrolü ile)

  // Loading state'i direkt RTK Query'den geliyor
  const isStoresLoading = loading;

  const hasStoreBarbers = displayStores.length > 0;

  const { present: presentFreeBarberPanel } = freeBarberPanelSheet;
  const handleOpenPanel = useCallback(
    (id: string | null) => {
      setFreeBarberId(id);
      // Sheet'i açmak için küçük bir gecikme ekle
      setTimeout(() => {
        presentFreeBarberPanel();
      }, 100);
    },
    [presentFreeBarberPanel],
  );

  const { present: presentRatings } = ratingsSheet;
  const handlePressRatings = useCallback(
    (targetId: string, targetName: string) => {
      setSelectedRatingsTarget({ targetId, targetName });
      // Sheet'i açmak için küçük bir gecikme ekle
      setTimeout(() => {
        presentRatings();
      }, 100);
    },
    [presentRatings],
  );

  // Filter fonksiyonları - filters are applied instantly, no apply button needed
  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // API'den gelen filtrelenmiş veriyi kullan, yoksa normal veriyi göster
  // Filtrelenmiş store'ları hesapla (burada sadece kendi FreeBarber paneli için)
  const filteredStores = useMemo(() => {
    const shouldShowStores =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "store";
    if (!shouldShowStores) return [];

    return displayStores.filter((store) => {
      // Basic search
      if (
        searchQuery &&
        !store.storeName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Category filter
      if (filterCriteria.mainCategory && filterCriteria.mainCategory !== 'all') {
        const storeTypeName = store.type === 0 ? 'MaleHairdresser' : store.type === 1 ? 'FemaleHairdresser' : 'BeautySalon';
        if (storeTypeName !== filterCriteria.mainCategory) return false;
      }
      // Rating filter
      if (filterCriteria.minRating && filterCriteria.minRating > 0) {
        const storeRating = (store as any).averageRating ?? (store as any).rating ?? 0;
        if (storeRating < filterCriteria.minRating) return false;
      }
      // Status filter
      if (filterCriteria.status && filterCriteria.status !== 'all') {
        const isOpen = (store as any).isOpenNow ?? false;
        if (filterCriteria.status === 'available' && !isOpen) return false;
        if (filterCriteria.status === 'unavailable' && isOpen) return false;
      }
      return true;
    });
  }, [displayStores, searchQuery, filterCriteria.userType, filterCriteria.mainCategory, filterCriteria.minRating, filterCriteria.status]);

  const goStoreDetail = useCallback(
    (store: BarberStoreGetDto) => {
      const params: any = {
        storeId: store.id,
        mode: effectiveAppointmentId ? "add-store" : "free-barber",
      };

      if (effectiveAppointmentId) {
        params.appointmentId = effectiveAppointmentId;
      }

      router.push({
        pathname: "/store/[storeId]",
        params,
      });
    },
    [router, effectiveAppointmentId],
  );

  const renderItem = useCallback(
    ({ item }: { item: BarberStoreGetDto }) => (
      <StoreCardInner
        store={item}
        isList={isList}
        expanded={expandedStoreBarber}
        cardWidthStore={cardWidthStores}
        isViewerFromFreeBr={true}
        onPressUpdate={goStoreDetail}
        onPressRatings={handlePressRatings}
        showImageAnimation={settingData?.data?.showImageAnimation ?? true}
        panelCompare={
          isOtherUsersStore(item, currentUserId)
            ? {
                selected: compareStoreIds.includes(item.id),
                onPress: () => toggleCompareStore(item.id),
              }
            : undefined
        }
      />
    ),
    [
      isList,
      expandedStoreBarber,
      cardWidthStores,
      goStoreDetail,
      handlePressRatings,
      settingData,
      currentUserId,
      compareStoreIds,
      toggleCompareStore,
    ],
  );

  // FlatList için tüm item'ları birleştir
  // Refresh sırasında verilerin iç içe binmemesi için loading state'ini kontrol ediyoruz
  const listData = useMemo(() => {
    const items: Array<{
      id: string;
      type:
      | "freebarber-section"
      | "stores-header"
      | "stores-list"
      | "stores-empty"
      | "stores-loading"
      | "stores-error"
      | "stores-content-horizontal";
      data?: any;
    }> = [];

    // FreeBarbers section (Kendi panelim) - filtre uygulanır
    const shouldShowMyPanel =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";
    if (hasFreeBarberPanel && shouldShowMyPanel) {
      items.push({ id: "freebarber-section", type: "freebarber-section" });
    }

    // Stores section - kullanıcı türü filtresi "Dükkan" veya "Hepsi" ise göster
    const shouldShowStores =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "store";
    if (shouldShowStores) {
      items.push({ id: "stores-header", type: "stores-header" });
      // İlk yüklemede skeleton göster (fetchedOnce false ise veya loading true ise)
      if (!fetchedOnce || (isStoresLoading && filteredStores.length === 0)) {
        items.push({ id: "stores-loading", type: "stores-loading" });
      } else if (storeError) {
        items.push({ id: "stores-error", type: "stores-error" });
      } else {
        // Filtrelenmiş store'ları kullan
        const storesToDisplay = filteredStores;
        const hasStoresToShow = storesToDisplay.length > 0;

        if (hasStoresToShow) {
          if (expandedStoreBarber) {
            items.push({ id: "stores-list", type: "stores-list", data: storesToDisplay });
          } else {
            items.push({
              id: "stores-content-horizontal",
              type: "stores-content-horizontal",
              data: storesToDisplay,
            });
          }
        } else {
          items.push({ id: "stores-empty", type: "stores-empty" });
        }
      }
    }

    return items;
  }, [
    isStoresLoading,
    storeError,
    filteredStores,
    expandedStoreBarber,
    filterCriteria.userType,
    settingData,
    fetchedOnce,
    hasFreeBarberPanel,
  ]);

  const { present: presentMapDetail } = mapDetailSheet;
  const handleMarkerPress = useCallback(
    (item: BarberStoreGetDto) => {
      setSelectedMapItem(item);
      presentMapDetail();
    },
    [presentMapDetail],
  );

  const storeMarkers = useMemo(() => {
    if (!hasStoreBarbers) return null;
    return filteredStores.map((store) => {
      const c = safeCoord(store.latitude, store.longitude);
      if (!c) return null;

      return (
        <StoreMarker
          key={store.id}
          storeId={store.id}
          coordinate={{ latitude: c.lat, longitude: c.lon }}
          title={store.storeName}
          description={store.addressDescription}
          imageUrl={store?.imageList?.[0]?.imageUrl}
          storeType={store.type}
          onPress={() => handleMarkerPress(store)}
        />
      );
    });
  }, [filteredStores, hasStoreBarbers, handleMarkerPress]);

  const myPanelMarker = useMemo(() => {
    // Filtre kontrolü - "store" seçiliyse kendi marker'ı gizle
    const shouldShowMyMarker =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";
    if (!shouldShowMyMarker) return null;

    const c = safeCoord(freeBarber?.latitude, freeBarber?.longitude);
    if (!c) return null;

    return (
      <FreeBarberMarker
        key={freeBarber?.id}
        barberId={freeBarber?.id!}
        coordinate={{ latitude: c.lat, longitude: c.lon }}
        title={freeBarber?.fullName || ""}
        imageUrl={freeBarber?.imageList?.[0]?.imageUrl}
        barberType={freeBarber?.type || 0}
        onPress={() => handleOpenPanel(freeBarber?.id!)}
      />
    );
  }, [freeBarber, handleOpenPanel, filterCriteria.userType]);

  const { isTracking, isUpdating } = useTrackFreeBarberLocation(
    true,
    freeBarber?.id ?? null,
  );

  return (
    <View className="flex flex-1 pl-4 pr-2" style={{ backgroundColor: colors.screenBg }}>
      <PanelCollapsibleTop
        expanded={panelTopExpanded}
        onToggle={() => setPanelTopExpanded((v) => !v)}
        collapsedHint={panelTopCollapsedHint}
      >
        <View style={{ backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cardBg }}>
          <SearchBar
            transparent
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isList={isList}
            setIsList={setIsList}
            onFilterPress={() => setFilterDrawerVisible(true)}
          />
          {savedFilters.length > 0 && (
            <View style={{ paddingHorizontal: 10, paddingBottom: 8 }}>
              <SavedFilterChips savedFilters={savedFilters} activeFilterId={activeSavedFilterId} onLoad={(json, id) => loadFromSaved(json, id)} />
            </View>
          )}
        </View>
        {hasFreeBarberPanel && (
          <TouchableOpacity
            onPress={() => router.push("/(screens)/profile/shop-insights")}
            activeOpacity={0.85}
            className="mt-3 mb-1 rounded-2xl p-3"
            style={{ backgroundColor: isDark ? "rgba(13,148,136,0.24)" : "rgba(13,148,136,0.12)", borderColor: "#0d9488", borderWidth: 1 }}
          >
            <View className="flex-row items-center justify-between">
              <View className="flex-1 pr-2">
                <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 14 }}>
                  {t("profile.panelEarningsTitle")}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
                  {t("profile.panelEarningsSubtitle")}
                </Text>
                {panelEarningsPreview != null && (
                  <View style={{ marginTop: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{t("profile.dailyEarnings")}</Text>
                      <AnimatedMoneyText
                        value={panelEarningsPreview.dailyEarnings ?? 0}
                        suffix={PANEL_CURRENCY}
                        style={{ color: "#0d9488", fontFamily: "CenturyGothic-Bold", fontSize: 13 }}
                        enabled={priceAnim}
                      />
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "baseline", gap: 4 }}>
                      <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{t("profile.totalEarnings")}</Text>
                      <AnimatedMoneyText
                        value={panelEarningsPreview.totalEarnings ?? 0}
                        suffix={PANEL_CURRENCY}
                        style={{ color: "#3b82f6", fontFamily: "CenturyGothic-Bold", fontSize: 13 }}
                        enabled={priceAnim}
                      />
                    </View>
                  </View>
                )}
              </View>
              <IconButton icon="finance" iconColor="#ffb900" size={24} />
            </View>
          </TouchableOpacity>
        )}
      </PanelCollapsibleTop>

      {isMapMode && (
        <View className="absolute inset-0" style={{ zIndex: 5, elevation: 5 }}>
          <MapView style={{ flex: 1 }} userInterfaceStyle={isDark ? "dark" : "light"}>
            {storeMarkers}
            {myPanelMarker}
          </MapView>
        </View>
      )}
      <View style={{ flex: 1 }} pointerEvents={isMapMode ? 'none' : 'auto'}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f05e23"
            />
          }
          // Performance optimizations - removeClippedSubviews kaldırıldı (overlap sorununa neden oluyordu)
          maxToRenderPerBatch={5}
          updateCellsBatchingPeriod={100}
          initialNumToRender={5}
          windowSize={3}
          renderItem={({ item }) => {
            if (item.type === "freebarber-section") {
              return (
                <FreeBarberPanelSection
                  isList={isList}
                  locationStatus={locationStatus}
                  locationMessage={locationMessage}
                  onOpenPanel={handleOpenPanel}
                  onPressRatings={handlePressRatings}
                  screenWidth={screenWidth}
                  freeBarber={freeBarber}
                  isLoading={isLoading}
                  isError={isError}
                  error={error}
                  isUpdating={isUpdating}
                  isTracking={isTracking}
                  searchQuery={searchQuery}
                  categoryNameById={categoryNameById}
                  showImageAnimation={
                    settingData?.data?.showImageAnimation ?? true
                  }
                  onRetry={refetchFreeBarber}
                />
              );
            }
            if (item.type === "stores-header") {
              return (
                <View className="flex flex-row justify-between items-center mt-4">
                  <Text className="font-century-gothic text-2xl" style={{ color: colors.sectionHeaderText }}>
                    {t("panel.nearbyStores")}
                  </Text>
                  {hasStoreBarbers && (
                    <MotiViewExpand
                      expanded={expandedStoreBarber}
                      onPress={() =>
                        toggleExpand(
                          expandedStoreBarber,
                          setExpandedStoreBarber,
                        )
                      }
                    />
                  )}
                </View>
              );
            }
            if (item.type === "stores-loading") {
              return (
                <View className="pt-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <SkeletonComponent key={i} />
                  ))}
                </View>
              );
            }
            if (item.type === "stores-error") {
              // Hata durumu - servise ulaşılamadı mesajı göster
              return (
                <View className="mt-2" style={{ minHeight: 300, maxHeight: 400, overflow: 'hidden' }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={storeError}
                    data={[]}
                    locationStatus={locationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetch}
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "stores-empty") {
              // Veri yok durumu - uygun boş mesaj göster
              return (
                <View className="mt-2" style={{ minHeight: 350, maxHeight: 400, overflow: 'hidden' }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={undefined}
                    data={[]}
                    locationStatus={locationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetch}
                    customMessages={{
                      empty: !hasFreeBarberPanel
                        ? t("empty.addPanelToSeeNearbyStores")
                        : searchQuery || hasActiveFilters
                          ? t("empty.noResultsFound")
                          : t("empty.noNearbyStores"),
                    }}
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "stores-list") {
              return (
                <View>
                  {item.data.map((store: BarberStoreGetDto) => (
                    <View key={store.id}>
                      <StoreCardInner
                        store={store}
                        isList={isList}
                        expanded={expandedStoreBarber}
                        cardWidthStore={cardWidthStores}
                        isViewerFromFreeBr={true}
                        onPressUpdate={goStoreDetail}
                        onPressRatings={handlePressRatings}
                        showImageAnimation={
                          settingData?.data?.showImageAnimation ?? true
                        }
                        panelCompare={
                          isOtherUsersStore(store, currentUserId)
                            ? {
                                selected: compareStoreIds.includes(store.id),
                                onPress: () => toggleCompareStore(store.id),
                              }
                            : undefined
                        }
                      />
                    </View>
                  ))}
                </View>
              );
            }
            if (item.type === "stores-content-horizontal") {
              return (
                <View style={{ minHeight: 200 }}>
                  <FlatList
                    data={filteredStores}
                    keyExtractor={(store) => store.id}
                    renderItem={renderItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{
                      gap: 12,
                      paddingTop: 8,
                      paddingBottom: 8,
                    }}
                  />
                </View>
              );
            }
            return null;
          }}
        />
      </View>

      {compareStoreIds.length === 2 && (
        <View
          className="absolute left-4 right-4 z-30 px-3 py-3 rounded-2xl"
          style={{ bottom: 88, backgroundColor: isDark ? "#1a1a2e" : "#ffffff", borderWidth: 1, borderColor: "#ffb90055", elevation: 10 }}
        >
          <TouchableOpacity
            onPress={() => {
              const [a, b] = compareStoreIds;
              setCompareStoreIds([]);
              router.push({
                pathname: "/(screens)/compare/public-stores",
                params: { left: a, right: b },
              });
            }}
            className="items-center py-2 rounded-xl"
            style={{ backgroundColor: "#ffb900" }}
          >
            <Text className="font-century-gothic-bold text-base" style={{ color: "#1f2937" }}>
              {t("compare.continue")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        onPress={() => setIsMapMode(!isMapMode)}
        className="absolute right-0 bottom-6 rounded-full rounded-r-none items-center justify-center z-20 shadow-lg px-2 py-1 flex-row gap-0"
        style={{ backgroundColor: colors.mapToggleBg, borderColor: colors.mapToggleBorder, borderWidth: 1, elevation: 8 }}
      >
        <IconButton
          icon={isMapMode ? "format-list-bulleted" : "map"}
          iconColor="#ffb900"
          size={24}
          style={{ margin: 0 }}
        />
        <Text className="font-semibold text-sm" style={{ color: colors.sectionHeaderText }}>
          {isMapMode ? t("common.list") : t("common.searchOnMap")}
        </Text>
      </TouchableOpacity>

      <FilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        selectedUserType={filterCriteria.userType || "all"}
        onChangeUserType={(value) => updateFilterCriteria({ userType: value })}
        showUserTypeFilter={true}
        selectedMainCategory={filterCriteria.mainCategory || "all"}
        onChangeMainCategory={(value) =>
          updateFilterCriteria({
            mainCategory: value === "all" ? undefined : value,
          })
        }
        selectedMainHeadings={filterCriteria.mainHeadings || []}
        onChangeMainHeadings={(value) =>
          updateFilterCriteria({ mainHeadings: value })
        }
        selectedSubHeadings={filterCriteria.subHeadings || []}
        onChangeSubHeadings={(value) =>
          updateFilterCriteria({ subHeadings: value })
        }
        selectedServices={filterCriteria.serviceIds || []}
        onChangeServices={(value) =>
          updateFilterCriteria({ serviceIds: value })
        }
        priceSort={filterCriteria.priceSort || "none"}
        onChangePriceSort={(value) =>
          updateFilterCriteria({ priceSort: value })
        }
        minPrice={filterCriteria.minPrice || ""}
        maxPrice={filterCriteria.maxPrice || ""}
        onChangeMinPrice={(value) => updateFilterCriteria({ minPrice: value })}
        onChangeMaxPrice={(value) => updateFilterCriteria({ maxPrice: value })}
        selectedPricingType={filterCriteria.pricingType || "all"}
        onChangePricingType={(value) =>
          updateFilterCriteria({ pricingType: value })
        }
        showPricingType={true}
        statusFilter={(filterCriteria.status || "all") as "all" | "available" | "unavailable"}
        onChangeStatus={(value) =>
          updateFilterCriteria({ status: value as "all" | "available" | "unavailable" })
        }
        selectedRating={filterCriteria.minRating || 0}
        onChangeRating={(value) => updateFilterCriteria({ minRating: value })}
        showFavoritesOnly={filterCriteria.favoritesOnly || false}
        onChangeFavoritesOnly={(value) =>
          updateFilterCriteria({ favoritesOnly: value })
        }
        onClearFilters={handleClearFilters}
        savedFilters={savedFilters}
        activeSavedFilterId={activeSavedFilterId}
        hasActiveFilters={hasActiveFilters}
        currentFilterCriteriaJson={JSON.stringify(filterCriteria)}
        onLoadSavedFilter={(json) => loadFromSaved(json)}
        onDeleteSavedFilter={(filterId) => guard(async () => {
          try {
            const res = await deleteSavedFilter(filterId).unwrap();
            dispatch(showSnack({ message: getMessage(res.message) || '' }));
          } catch (e) {
            dispatch(showSnack({ message: getErrorMessage(e), isError: true }));
          }
        })}
        onSaveCurrentFilter={(name) => guard(async () => {
          try {
            const res = await createSavedFilter({ name, filterCriteriaJson: JSON.stringify(filterCriteria) }).unwrap();
            dispatch(showSnack({ message: getMessage(res.message) || '' }));
          } catch (e) {
            dispatch(showSnack({ message: getErrorMessage(e), isError: true }));
          }
        })}
        onUpdateSavedFilter={(filterId, name, criteriaJson) => guard(async () => {
          try {
            const res = await updateSavedFilter({ id: filterId, name, filterCriteriaJson: criteriaJson }).unwrap();
            dispatch(showSnack({ message: getMessage(res.message) || '' }));
          } catch (e) {
            dispatch(showSnack({ message: getErrorMessage(e), isError: true }));
          }
        })}
      />

      <BottomSheetModal
        ref={freeBarberPanelSheet.ref}
        backdropComponent={freeBarberPanelSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        onChange={freeBarberPanelSheet.handleChange}
        snapPoints={freeBarberPanelSheet.snapPoints}
        enableOverDrag={freeBarberPanelSheet.enableOverDrag}
        enablePanDownToClose={freeBarberPanelSheet.enablePanDownToClose}
      >
        <BottomSheetView className="h-full pt-2">
          <DeferredRender
            active={freeBarberPanelSheet.isOpen}
            placeholder={
              <View className="flex-1 pt-4">
                <CrudSkeletonComponent />
              </View>
            }
          >
            <FormFreeBarberOperation
              freeBarberId={freeBarberId}
              enabled={freeBarberPanelSheet.isOpen}
              onClose={() => {
                freeBarberPanelSheet.dismiss();
              }}
              error={error}
              locationStatus={locationStatus}
            />
          </DeferredRender>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={mapDetailSheet.ref}
        onChange={mapDetailSheet.handleChange}
        snapPoints={mapDetailSheet.snapPoints}
        enablePanDownToClose={mapDetailSheet.enablePanDownToClose}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={mapDetailSheet.makeBackdrop()}
      >
        <BottomSheetView style={{ flex: 1, padding: 0, margin: 0 }}>
          <DeferredRender
            active={mapDetailSheet.isOpen && !!selectedMapItem}
            placeholder={
              <View className="flex-1 pt-4">
                <SkeletonComponent />
              </View>
            }
          >
            {selectedMapItem && (
              <StoreBookingContent
                storeId={(selectedMapItem as any).id}
                isBottomSheet={true}
                isFreeBarber={true}
                mode={effectiveAppointmentId ? "add-store" : undefined}
                appointmentId={effectiveAppointmentId}
              />
            )}
          </DeferredRender>
        </BottomSheetView>
      </BottomSheetModal>

      {/* Yorumlar Bottom Sheet */}
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

export default Index;
