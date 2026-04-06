import {
  Dimensions,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/common/Text";
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useBottomSheet } from "../../hook/useBottomSheet";
import SearchBar from "../../components/common/searchbar";
import { SkeletonComponent } from "../../components/common/skeleton";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { MotiView } from "moti";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { FilterDrawer } from "../../components/common/filterdrawer";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
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
import { useLocalSearchParams } from "expo-router";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import MapView, { Marker } from "react-native-maps";
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
import { setStoreSwipeIds } from "../../store/bookingSwipeSlice";
import { showSnack } from "../../store/snackbarSlice";
import { getErrorMessage, getMessage } from "../../utils/errorHandler";
import { SavedFilterChips } from "../../components/common/savedfilterchips";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { useBackendFilters } from "../../hook/useBackendFilters";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSubscriptionGuard } from "../../hook/useSubscriptionGuard";
import { StoreMarker } from "../../components/common/storemarker";
import { DeferredRender } from "../../components/common/deferredrender";
import { isOtherUsersStore } from "../../utils/compare-eligibility";
import { PanelCollapsibleTop } from "../../components/panel/PanelCollapsibleTop";
import { usePanelMoreFab } from "../../hook/usePanelMoreFab";
import { getCompareStripBottom } from "../../components/layout/panelBottomOverlays";
import {
  compareStripCtaStyle,
  compareStripOuterStyle,
  useCompareMetrics,
} from "../../(screens)/compare/compareShared";
import { PerplexityListItem } from "../../components/panel/PerplexityListItem";
import { PerplexityHorizontalList } from "../../components/panel/PerplexityHorizontalList";
import { PanelEmptyCta } from "../../components/common/PanelEmptyCta";
import { useFreeBarberPanelSheet } from "../../context/FreeBarberPanelSheetContext";
import { MoreFabPanelContext } from "../../components/layout/MoreFabContext";

const Index = () => {
  const insets = useSafeAreaInsets();
  const compareStripBottom = useMemo(
    () => getCompareStripBottom(insets.bottom),
    [insets.bottom],
  );
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const cmpM = useCompareMetrics();
  const router = useSafeNavigation();
  const guard = useActionGuard();
  const { withSubscription } = useSubscriptionGuard();
  const freeBarberPanelSheet = useFreeBarberPanelSheet();
  const fabCtx = useContext(MoreFabPanelContext);

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

  // Free barber paneli varlığını her zaman kontrol et (lokasyon beklenmeden)
  const { data: freeBarber, refetch: refetchFreeBarber } =
    useGetFreeBarberMinePanelQuery(undefined);

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
  const panelTopCollapsedHint = t("panel.topSectionCollapsedHint");

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

  // Bildirimden gelen harita odak parametreleri
  const { focusLat, focusLng } = useLocalSearchParams<{ focusLat?: string; focusLng?: string }>();
  const focusRegion = useMemo(() => {
    const lat = parseFloat(focusLat ?? "");
    const lng = parseFloat(focusLng ?? "");
    if (!isNaN(lat) && !isNaN(lng)) {
      return { latitude: lat, longitude: lng, latitudeDelta: 0.01, longitudeDelta: 0.01 };
    }
    return null;
  }, [focusLat, focusLng]);

  const [isMapMode, setIsMapMode] = useState(false);
  const [selectedMapItem, setSelectedMapItem] =
    useState<BarberStoreGetDto | null>(null);

  // Bildirimden gelen focusRegion varsa harita moduna geç
  useEffect(() => {
    if (focusRegion) {
      setIsMapMode(true);
    }
  }, [focusRegion]);

  const panelMapFabItems = useMemo(
    () => [
      {
        id: "panel-map-toggle",
        icon: isMapMode ? "format-list-bulleted" : "map",
        label: isMapMode ? t("common.list") : t("common.searchOnMap"),
        onPress: () => setIsMapMode((m) => !m),
      },
    ],
    [isMapMode, t],
  );
  usePanelMoreFab(panelMapFabItems);

  // Bottom sheet hooks
  const mapDetailSheet = useBottomSheet({
    snapPoints: ["90%", "100%"],
    enablePanDownToClose: true,
  });
  const ratingsSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
  });

  const anySheetOpen = mapDetailSheet.isOpen || ratingsSheet.isOpen;
  useEffect(() => {
    fabCtx?.reportOverlayOpen(anySheetOpen);
    return () => { fabCtx?.reportOverlayOpen(false); };
  }, [anySheetOpen, fabCtx]);

  const [expandedStoreBarber, setExpandedStoreBarber] = useState(true);
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);
  const screenWidth = Dimensions.get("window").width;

  const cardWidthStores = useMemo(
    () => (expandedStoreBarber ? screenWidth * 0.935 : screenWidth * 0.955),
    [expandedStoreBarber, screenWidth],
  );

  // displayStores zaten yukarıda tanımlandı (hasFreeBarberPanel kontrolü ile)

  // Loading state'i direkt RTK Query'den geliyor
  const isStoresLoading = loading;

  const hasStoreBarbers = displayStores.length > 0;

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

  const handleViewMyPanelPress = useCallback(() => {
    withSubscription(() => {
      router.push("/(screens)/profile/free-barber-panel");
    });
  }, [router, withSubscription]);

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
      dispatch(setStoreSwipeIds(filteredStores.map((s) => s.id)));
      const params: Record<string, string> = {
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
    [router, effectiveAppointmentId, dispatch, filteredStores],
  );

  const renderItem = useCallback(
    ({ item }: { item: BarberStoreGetDto }) => (
      <StoreCardInner
        store={item}
        isList={isList}
        expanded={expandedStoreBarber}
        cardWidthStore={cardWidthStores}
        compactMeta
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

  // FlatList satırları (store kartları ayrı satır — dikey Perplexity animasyonu için)
  const listData = useMemo(() => {
    const H = {
      header: 52,
      loading: 130,
      error: 360,
      empty: 360,
      horizontalBlock: 220,
      storeRow: expandedStoreBarber ? (isList ? 300 : 270) : 200,
    };

    type Row =
      | {
        id: string;
        type: "stores-header";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "stores-loading";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "stores-error";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "stores-empty";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "store-row";
        data: BarberStoreGetDto;
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "stores-content-horizontal";
        data: BarberStoreGetDto[];
        _scrollStart: number;
        _scrollLen: number;
      };

    const rows: Row[] = [];
    let y = 0;
    const push = (partial: Record<string, unknown>, h: number) => {
      const r = {
        ...partial,
        _scrollStart: y,
        _scrollLen: h,
      } as Row;
      rows.push(r);
      y += h;
    };

    const shouldShowStores =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "store";
    if (!shouldShowStores) return rows;

    push({ id: "stores-header", type: "stores-header" }, H.header);

    // Panel yoksa lokasyon beklenmeden CTA'yı göster
    if (!hasFreeBarberPanel) {
      push({ id: "stores-empty", type: "stores-empty" }, H.empty);
    } else if (!fetchedOnce || (isStoresLoading && filteredStores.length === 0)) {
      push({ id: "stores-loading", type: "stores-loading" }, H.loading);
    } else if (storeError) {
      push({ id: "stores-error", type: "stores-error" }, H.error);
    } else {
      const storesToDisplay = filteredStores;
      if (storesToDisplay.length > 0) {
        if (expandedStoreBarber) {
          storesToDisplay.forEach((store) => {
            push(
              {
                id: `store-${store.id}`,
                type: "store-row",
                data: store,
              },
              H.storeRow,
            );
          });
        } else {
          push(
            {
              id: "stores-content-horizontal",
              type: "stores-content-horizontal",
              data: storesToDisplay,
            },
            H.horizontalBlock,
          );
        }
      } else {
        push({ id: "stores-empty", type: "stores-empty" }, H.empty);
      }
    }

    return rows;
  }, [
    isStoresLoading,
    storeError,
    filteredStores,
    expandedStoreBarber,
    filterCriteria.userType,
    fetchedOnce,
    isList,
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

  return (
    <View className="flex flex-1 pl-4 pr-2" style={{ backgroundColor: colors.screenBg }}>
      <PanelCollapsibleTop
        expanded={panelTopExpanded}
        onToggle={() => setPanelTopExpanded((v) => !v)}
        collapsedHint={panelTopCollapsedHint}
      >
        <View style={{ backgroundColor: colors.cardBg, borderRadius: 14, borderWidth: 1.5, borderColor: colors.cardBg, overflow: "hidden" }}>
          <SearchBar
            transparent
            compact
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isList={isList}
            setIsList={setIsList}
            onFilterPress={() => setFilterDrawerVisible(true)}
          />
          <TouchableOpacity
            activeOpacity={0.7}
            onPress={handleViewMyPanelPress}
            style={{
              flexDirection: "row",
              alignItems: "center",
              minHeight: 40,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.borderColor2,
            }}
          >
            <Text
              numberOfLines={2}
              style={{ flex: 1, fontSize: 13, lineHeight: 18, color: colors.textSecondary, fontFamily: "CenturyGothic-Bold" }}
            >
              {t("panel.viewMyPanel")}
            </Text>
            <Icon source="chevron-right" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
          {savedFilters.length > 0 && (
            <View
              style={{
                marginHorizontal: 8,
                marginBottom: 10,
                marginTop: 2,
                paddingHorizontal: 10,
                paddingTop: 10,
                paddingBottom: 10,
                borderRadius: 12,
                backgroundColor: colors.cardBg2,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: colors.borderColor2,
              }}
            >
              <SavedFilterChips savedFilters={savedFilters} activeFilterId={activeSavedFilterId} onLoad={(json, id) => loadFromSaved(json, id)} />
            </View>
          )}
        </View>
      </PanelCollapsibleTop>

      {isMapMode && (
        <View className="absolute inset-0" style={{ zIndex: 5, elevation: 5 }}>
          <MapView
            style={{ flex: 1 }}
            userInterfaceStyle={isDark ? "dark" : "light"}
            initialRegion={focusRegion ?? undefined}
          >
            {storeMarkers}
            {focusRegion && (
              <Marker
                coordinate={{ latitude: focusRegion.latitude, longitude: focusRegion.longitude }}
                pinColor="#f05e23"
              />
            )}
          </MapView>
        </View>
      )}
      <View style={{ flex: 1 }} pointerEvents={isMapMode ? 'none' : 'auto'}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom }}
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
            if (item.type === "stores-header") {
              return (
                <View className="flex flex-row justify-between items-center mt-4">
                  <Text className="font-century-gothic text-xl" style={{ color: colors.sectionHeaderText }}>
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
                      size={20}
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
              if (!hasFreeBarberPanel) {
                return (
                  <View className="mt-2 pr-2">
                    <PanelEmptyCta
                      title={t("empty.addPanelToSeeNearbyStores")}
                      subtitle={t("panel.emptyStateHintFreeBarber")}
                      buttonLabel={t("common.add")}
                      onPress={() =>
                        withSubscription(() =>
                          freeBarberPanelSheet?.openPanel?.(null),
                        )
                      }
                    />
                  </View>
                );
              }
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
                      empty:
                        searchQuery || hasActiveFilters
                          ? t("empty.noResultsFound")
                          : t("empty.noNearbyStores"),
                    }}
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "store-row") {
              return (
                <PerplexityListItem>
                  <StoreCardInner
                    store={item.data}
                    isList={isList}
                    expanded={expandedStoreBarber}
                    cardWidthStore={cardWidthStores}
                    compactMeta
                    isViewerFromFreeBr={true}
                    onPressUpdate={goStoreDetail}
                    onPressRatings={handlePressRatings}
                    showImageAnimation={
                      settingData?.data?.showImageAnimation ?? true
                    }
                    panelCompare={
                      isOtherUsersStore(item.data, currentUserId)
                        ? {
                          selected: compareStoreIds.includes(item.data.id),
                          onPress: () => toggleCompareStore(item.data.id),
                        }
                        : undefined
                    }
                  />
                </PerplexityListItem>
              );
            }
            if (item.type === "stores-content-horizontal") {
              return (
                <View style={{ minHeight: 200 }}>
                  <PerplexityHorizontalList
                    data={filteredStores}
                    keyExtractor={(store) => store.id}
                    contentContainerStyle={{
                      gap: 10,
                      paddingTop: 6,
                      paddingBottom: 6,
                      paddingHorizontal: 0,
                    }}
                    renderItem={({ item: store }) => renderItem({ item: store })}
                  />
                </View>
              );
            }
            return null;
          }}
        />
      </View>

      {compareStoreIds.length === 2 && (
        <View style={[{ zIndex: 30 }, compareStripOuterStyle(isDark, cmpM, compareStripBottom)]}>
          <TouchableOpacity
            onPress={() => {
              const [a, b] = compareStoreIds;
              setCompareStoreIds([]);
              router.push({
                pathname: "/(screens)/compare/public-stores",
                params: { left: a, right: b },
              });
            }}
            style={compareStripCtaStyle(cmpM)}
          >
            <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: cmpM.rowFont + 2, color: "#1f2937" }}>
              {t("compare.continue")}
            </Text>
          </TouchableOpacity>
        </View>
      )}

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
