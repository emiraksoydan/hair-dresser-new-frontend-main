import {
  ActivityIndicator,
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
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useFullHeightBottomSheet } from "../../hook/useBottomSheet";
import SearchBar from "../../components/common/SearchBar";
import { SkeletonComponent } from "../../components/common/skeleton";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { MotiView } from "moti";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { FilterDrawer } from "../../components/common/FilterDrawer";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { StoreCardInner } from "../../components/store/StoreCard";
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
import { Marker } from "react-native-maps";
import { OsmMapView as MapView } from "../../components/common/OsmMapView";
import { safeCoord } from "../../utils/location/geo";
import StoreBookingContent from "../../components/store/StoreBooking";
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
import {
  isPanelConnectivityError,
  shouldShowDiscoveryConnectivityError,
} from "../../utils/panelDiscoveryErrors";
import { SavedFilterChips } from "../../components/common/savedfilterchips";
import { RatingsBottomSheet } from "../../components/rating/RatingsBottomSheet";
import { useBackendFilters } from "../../hook/useBackendFilters";
import { DEFAULT_DISTANCE_PRESET_ID } from "../../constants/filterDefaults";
import { PANEL_FLAT_LIST_PERF } from "../../constants/panelFlatListPerf";
import { useAuth } from "../../hook/useAuth";
import { UserType } from "../../types";
import { COLORS } from "../../constants/colors";
import { useActionGuard } from "../../hook/useActionGuard";
import { StoreMarker } from "../../components/common/StoreMarker";
import { DeferredRender } from "../../components/common/deferredrender";
import { isOtherUsersStore } from "../../utils/compare-eligibility";
import { PanelCollapsibleTop } from "../../components/panel/PanelCollapsibleTop";
import { useFabOverlayWhenSheetOpen, usePanelMoreFab } from "../../hook/usePanelMoreFab";
import { useDeferredSheetPresent } from "../../hook/useDeferredSheetPresent";
import { PerplexityListItem } from "../../components/panel/PerplexityListItem";
import { PerplexityHorizontalList } from "../../components/panel/PerplexityHorizontalList";
import { PanelEmptyCta } from "../../components/common/PanelEmptyCta";
import { useFreeBarberPanelSheet } from "../../context/FreeBarberPanelSheetContext";
const Index = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { t, currentLanguage } = useLanguage();
  const router = useSafeNavigation();
  const guard = useActionGuard();
  const freeBarberPanelSheet = useFreeBarberPanelSheet();
  const { userType } = useAuth();
  const isFreeBarber = userType === UserType.FreeBarber;

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
  const compareNavFiredRef = useRef(false);
  useEffect(() => {
    if (compareStoreIds.length === 2) {
      if (compareNavFiredRef.current) return;
      compareNavFiredRef.current = true;
      const [a, b] = compareStoreIds;
      setCompareStoreIds([]);
      router.push({ pathname: "/(screens)/compare/public-stores", params: { left: a, right: b } });
    } else {
      compareNavFiredRef.current = false;
    }
  }, [compareStoreIds, router]);
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

  // Free barber paneli varlığını her zaman kontrol et (lokasyon beklenmeden)
  const { data: freeBarber, refetch: refetchFreeBarber } =
    useGetFreeBarberMinePanelQuery(undefined);

  // Paneli olan kullanıcılar için store listesini getir
  const hasFreeBarberPanel = !!freeBarber?.id;

  // Panel yoksa store'ları hiç çekme
  const {
    stores,
    loading,
    retryInProgress: storeRetryInProgress,
    error: storeError,
    locationStatus,
    locationMessage,
    hasLocation,
    fetchedOnce,
    location,
    manualFetch,
    loadMore: loadMoreStores,
    hasMore: hasMoreStores,
    loadingMore: loadingMoreStores,
  } = useNearbyStores({
    enabled: hasFreeBarberPanel,
    filter: storeFilterDto,
    useFilteredEndpoint: true,
    persistKey: "freebarber-stores",
  });
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
      // Konum reddedildiyse yenileme yapma; hata olsa bile pull-to-refresh ile tekrar dene
      if (locationStatus === "denied") {
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
  const mapRef = useRef<any>(null);

  useEffect(() => {
    if (!isMapMode || !hasMoreStores || loadingMoreStores) return;

    const timeout = setTimeout(() => {
      void loadMoreStores();
    }, 120);

    return () => clearTimeout(timeout);
  }, [isMapMode, hasMoreStores, loadingMoreStores, loadMoreStores]);

  // Sekme odağında manualFetch kaldırıldı — skeleton flicker. Pull-to-refresh + arka plan yenileme hook'ta.

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
  const mapDetailSheet = useFullHeightBottomSheet({
    enablePanDownToClose: true,
  });
  const ratingsSheet = useFullHeightBottomSheet({
    enablePanDownToClose: true,
  });

  const anySheetOpen = mapDetailSheet.isOpen || ratingsSheet.isOpen;
  useFabOverlayWhenSheetOpen(anySheetOpen);

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

  const showStoresConnectivityError = shouldShowDiscoveryConnectivityError(
    storeError,
    { mode: "userGps", locationStatus },
  );
  const storeSoftErrorMessage =
    storeError && !isPanelConnectivityError(storeError)
      ? getErrorMessage(storeError)
      : undefined;

  const { present: presentRatings } = ratingsSheet;
  const { schedulePresent: scheduleRatingsPresent, cancelScheduledPresent: cancelRatingsPresent } =
    useDeferredSheetPresent(presentRatings);

  const dismissRatingsSheet = useCallback(() => {
    cancelRatingsPresent();
    setSelectedRatingsTarget(null);
    ratingsSheet.dismiss();
  }, [cancelRatingsPresent, ratingsSheet]);

  const handlePressRatings = useCallback(
    (targetId: string, targetName: string) => {
      setSelectedRatingsTarget({ targetId, targetName });
      scheduleRatingsPresent(100);
    },
    [scheduleRatingsPresent],
  );

  const handleViewMyPanelPress = useCallback(() => {
    router.push("/(screens)/profile/free-barber-panel");
  }, [router]);

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
        onPressAppointment={goStoreDetail}
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
    } else if (!fetchedOnce && isStoresLoading) {
      push({ id: "stores-loading", type: "stores-loading" }, H.loading);
    } else if (showStoresConnectivityError && filteredStores.length === 0) {
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
    showStoresConnectivityError,
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

  const mapInitialRegion = useMemo(() => {
    if (focusRegion) return focusRegion;

    const userCoord = safeCoord(location?.latitude, location?.longitude);
    if (userCoord) {
      return {
        latitude: userCoord.lat,
        longitude: userCoord.lon,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
    }

    const storeCandidate = filteredStores
      .map((s) => safeCoord(s.latitude, s.longitude))
      .find(Boolean);
    if (storeCandidate) {
      return {
        latitude: storeCandidate.lat,
        longitude: storeCandidate.lon,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04,
      };
    }

    return {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [focusRegion, location?.latitude, location?.longitude, filteredStores]);

  useEffect(() => {
    if (!isMapMode) return;
    const target = focusRegion
      ? focusRegion
      : (() => {
        const userCoord = safeCoord(location?.latitude, location?.longitude);
        if (!userCoord) return null;
        return {
          latitude: userCoord.lat,
          longitude: userCoord.lon,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        };
      })();
    if (!target) return;
    try {
      mapRef.current?.animateToRegion(target, 450);
    } catch {
      // ignore
    }
  }, [isMapMode, focusRegion, location?.latitude, location?.longitude]);

  const _renderItemRef = useRef<((args: { item: any }) => React.ReactElement | null) | null>(null);
  const renderListItem = useCallback(
    (args: { item: any }) => (_renderItemRef.current?.(args) ?? null) as React.ReactElement | null,
    [],
  );

  return (
    <View className="flex flex-1 px-3" style={{ backgroundColor: colors.screenBg, overflow: "hidden" }}>
      <View
        className={
          isMapMode
            ? "absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent"
            : ""
        }
      >
      <PanelCollapsibleTop
        expanded={panelTopExpanded}
        onToggle={() => setPanelTopExpanded((v) => !v)}
        collapsedHint={panelTopCollapsedHint}
      >
        <View style={{ backgroundColor: colors.cardBg, borderRadius: 14, borderWidth: 1.5, borderColor: colors.cardBg, overflow: "hidden" }}>
          <View style={{ paddingHorizontal: 10, paddingTop: 10 }}>
          <SearchBar
            transparent
            compact
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            isList={isList}
            setIsList={setIsList}
            onFilterPress={() => setFilterDrawerVisible(true)}
          />
          </View>
          {isFreeBarber && (
            <View style={{
              paddingHorizontal: 10,
              paddingTop: 6,
              paddingBottom: 10,
              borderTopWidth: StyleSheet.hairlineWidth,
              borderTopColor: colors.borderColor2,
            }}>
              <TouchableOpacity
                activeOpacity={0.75}
                onPress={handleViewMyPanelPress}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  backgroundColor: COLORS.PROFILE.NAVY,
                  borderRadius: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 10,
                  gap: 10,
                }}
              >
                <Icon source="view-dashboard-outline" size={20} color={COLORS.UI.ACCENT_GOLD} />
                <Text
                  numberOfLines={1}
                  style={{ flex: 1, fontSize: 13, color: '#fff', fontFamily: "CenturyGothic-Bold", letterSpacing: 0.4 }}
                >
                  {t("panel.viewMyPanel").toLocaleUpperCase(currentLanguage)}
                </Text>
                <Icon source="chevron-right" size={18} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          )}
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
      </View>

      {isMapMode && (
        <View className="absolute inset-0" style={{ zIndex: 5, elevation: 5 }}>
          <MapView
            ref={mapRef}
            style={{ flex: 1 }}
            userInterfaceStyle={isDark ? "dark" : "light"}
            initialRegion={mapInitialRegion}
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
          contentContainerStyle={{ paddingBottom: 80 + insets.bottom, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#f05e23"
            />
          }
          {...PANEL_FLAT_LIST_PERF}
          // Infinite-scroll: filtered endpoint'te offset ile bir sonraki sayfayı iste.
          // `hasMore=false` veya `loadingMore=true` iken loadMore kendi içinde no-op.
          onEndReached={hasMoreStores ? loadMoreStores : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            loadingMoreStores ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color="#f05e23" />
              </View>
            ) : null
          }
          renderItem={(_renderItemRef.current = ({ item }) => {
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
                    refetching={
                      showStoresConnectivityError &&
                      !!storeError &&
                      storeRetryInProgress
                    }
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
                      onPress={() => freeBarberPanelSheet?.openPanel?.(null)}
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
                        storeSoftErrorMessage ??
                        (searchQuery || hasActiveFilters
                          ? t("empty.noResultsFound")
                          : t("empty.noNearbyStores")),
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
                    onPressAppointment={goStoreDetail}
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
          }, renderListItem)}
        />
      </View>

      <FilterDrawer
        visible={filterDrawerVisible}
        onClose={() => setFilterDrawerVisible(false)}
        selectedDistancePreset={filterCriteria.distancePreset ?? DEFAULT_DISTANCE_PRESET_ID}
        onChangeDistancePreset={(preset) => updateFilterCriteria({ distancePreset: preset })}
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
        index={0}
        enableDynamicSizing={false}
        enablePanDownToClose={mapDetailSheet.enablePanDownToClose}
        handleComponent={() => null}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        backdropComponent={mapDetailSheet.makeBackdrop()}
      >
        <View style={{ flex: 1 }}>
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
                onSuccessClose={() => {
                  mapDetailSheet.dismiss();
                  setSelectedMapItem(null);
                }}
              />
            )}
          </DeferredRender>
        </View>
      </BottomSheetModal>

      {/* Yorumlar Bottom Sheet */}
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
        onDismiss={() => {
          cancelRatingsPresent();
          ratingsSheet.handleDismiss();
        }}
      >
        {selectedRatingsTarget ? (
          <RatingsBottomSheet
            targetId={selectedRatingsTarget.targetId}
            targetName={selectedRatingsTarget.targetName}
            onClose={dismissRatingsSheet}
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
