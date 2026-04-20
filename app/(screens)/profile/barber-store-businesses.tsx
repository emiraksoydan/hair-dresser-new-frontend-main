import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/common/Text";
import { IconButton } from "react-native-paper";
import { OsmMapView as MapView } from "../../components/common/OsmMapView";
import SearchBar from "../../components/common/searchbar";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { SkeletonComponent } from "../../components/common/skeleton";
import { BarberStoreMineDto, FreeBarGetDto } from "../../types";
import {
  useGetMineStoresQuery,
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
import {
  isPanelConnectivityError,
  shouldShowDiscoveryConnectivityError,
} from "../../utils/panelDiscoveryErrors";
import { SavedFilterChips } from "../../components/common/savedfilterchips";
import { FilterDrawer } from "../../components/common/filterdrawer";
import FormStoreUpdate from "../../components/store/formstoreupdate";
import FormStoreAdd from "../../components/store/formstoreadd";
import { StoreMineCardComp } from "../../components/store/storeminecard";
import { FreeBarberCardInner } from "../../components/freebarber/freebarbercard";
import FreeBarberBookingContent from "../../components/freebarber/freebarberbooking";
import { useNearbyStoresControl } from "../../hook/useNearByFreeBarberForStore";
import { safeCoord } from "../../utils/location/geo";
import { BarberMarker } from "../../components/freebarber/barbermarker";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { useBackendFilters } from "../../hook/useBackendFilters";
import { StoreMarker } from "../../components/common/storemarker";
import { DeferredRender } from "../../components/common/deferredrender";
import { CrudSkeletonComponent } from "../../components/common/crudskeleton";
import { useLanguage } from "../../hook/useLanguage";
import { UnifiedStateWrapper } from "../../components/common/UnifiedStateManager";
import { PanelEmptyCta } from "../../components/common/PanelEmptyCta";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { isOtherUsersFreeBarber } from "../../utils/compare-eligibility";
import { PanelCollapsibleTop } from "../../components/panel/PanelCollapsibleTop";
import { useFabOverlayWhenSheetOpen, usePanelMoreFab } from "../../hook/usePanelMoreFab";
import { useDeferredSheetPresent } from "../../hook/useDeferredSheetPresent";
import { getCompareStripBottom } from "../../components/layout/panelBottomOverlays";
import {
  compareStripCtaStyle,
  compareStripOuterStyle,
  useCompareMetrics,
} from "../compare/compareShared";
import { PerplexityListItem } from "../../components/panel/PerplexityListItem";
import { PerplexityHorizontalList } from "../../components/panel/PerplexityHorizontalList";

const Index = () => {
  const insets = useSafeAreaInsets();
  const compareStripBottom = useMemo(
    () => getCompareStripBottom(insets.bottom),
    [insets.bottom],
  );
  const { colors, isDark } = useTheme();
  const router = useSafeNavigation();
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const cmpM = useCompareMetrics();
  const guard = useActionGuard();
  const isFocused = useIsFocused();

  // Current user for filters
  const { data: currentUser } = useGetMeQuery();
  const currentUserId = currentUser?.data?.id;

  const [compareStoreIds, setCompareStoreIds] = useState<string[]>([]);
  const [compareFbIds, setCompareFbIds] = useState<string[]>([]);
  const toggleCompareStore = useCallback((storeId: string) => {
    setCompareFbIds([]);
    setCompareStoreIds((prev) => {
      if (prev.includes(storeId)) return prev.filter((x) => x !== storeId);
      if (prev.length < 2) return [...prev, storeId];
      return [prev[1], storeId];
    });
  }, []);
  const toggleCompareFb = useCallback((id: string) => {
    setCompareStoreIds([]);
    setCompareFbIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id];
    });
  }, []);

  // Filtering
  const {
    criteria: filterCriteria,
    updateCriteria: updateFilterCriteria,
    clearFilters,
    loadFromSaved,
    activeSavedFilterId,
    hasActiveFilters,
    createFilterRequestDto,
  } = useBackendFilters();

  // Kayıtlı filtreler
  const { data: savedFiltersData } = useGetSavedFiltersQuery();
  const savedFilters = savedFiltersData?.data ?? [];
  const [createSavedFilter] = useCreateSavedFilterMutation();
  const [deleteSavedFilter] = useDeleteSavedFilterMutation();
  const [updateSavedFilter] = useUpdateSavedFilterMutation();

  // Create filter DTO for backend
  const freeBarberFilterDto = useMemo(() => {
    return createFilterRequestDto(undefined, currentUserId, t);
  }, [createFilterRequestDto, currentUserId, t, filterCriteria]);

  const {
    data: stores = [],
    isLoading: storeLoading,
    refetch: refetchStores,
    error: storesError,
    isError: isStoresError,
  } = useGetMineStoresQuery(undefined, {
    pollingInterval: isFocused ? 30_000 : 0,
    refetchOnMountOrArgChange: true,
  });
  const {
    freeBarbers,
    isLoading: isFreeLoading,
    retryInProgress: freeBarbersRetryInProgress,
    hasLocation,
    locationStatus,
    location,
    error: freeBarbersError,
    manualFetch,
  } = useNearbyStoresControl({
    /** Bu ekran yalnızca kullanıcının kendi işletmeleri; yakındaki serbest berber keşfi yok */
    enabled: false,
    stores,
    hardRefreshMs: 15000,
    radiusKm: 10,
    filter: freeBarberFilterDto,
    currentUserId,
  });

  const [storesRetryBusy, setStoresRetryBusy] = useState(false);
  const onRetryStoresQuery = useCallback(async () => {
    setStoresRetryBusy(true);
    try {
      await refetchStores();
    } finally {
      setStoresRetryBusy(false);
    }
  }, [refetchStores]);

  // Ayarlar
  const { data: settingData } = useGetSettingQuery();

  const panelTopCollapsedHint = t("panel.topSectionCollapsedHint");

  const [panelTopExpanded, setPanelTopExpanded] = useState(true);

  const [isMapMode, setIsMapMode] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(
    null,
  );

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
  const addStoreSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: false,
    enableOverDrag: false,
    enableHandlePanningGesture: false,
    pressBehavior: "none",
  });
  const updateStoreSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: false,
    enableOverDrag: false,
    enableHandlePanningGesture: false,
    pressBehavior: "none",
  });
  const ratingsSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
  });

  const anyProfileSheetOpen =
    addStoreSheet.isOpen ||
    updateStoreSheet.isOpen ||
    mapDetailSheet.isOpen ||
    ratingsSheet.isOpen;
  useFabOverlayWhenSheetOpen(anyProfileSheetOpen);

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
      if (storesError) {
        return;
      }

      isRefreshingRef.current = true;
      await refetchStores();
      await manualFetch();
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [manualFetch, refetchStores, storesError]);

  const [expandedStores, setExpandedStores] = useState(true);
  const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);

  const [storeId, setStoreId] = useState<string>("");
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);

  const screenWidth = Dimensions.get("window").width;

  const cardWidthStore = useMemo(
    () => (expandedStores ? screenWidth * 0.935 : screenWidth * 0.955),
    [expandedStores, screenWidth],
  );
  const cardWidthFreeBarber = useMemo(
    () => (expandedFreeBarbers ? screenWidth * 0.935 : screenWidth * 0.955),
    [expandedFreeBarbers, screenWidth],
  );

  // RTK Query cache'i zaten data yönetimini yapıyor, previous state'lere gerek yok
  const displayStores = stores ?? [];
  const displayFreeBarbers = freeBarbers ?? [];

  // Loading state'leri direkt RTK Query'den geliyor
  const isStoresLoading = storeLoading;
  const isFreeBarbersLoading = isFreeLoading;

  const hasStores = displayStores.length > 0;
  const hasFreeBarbers = displayFreeBarbers.length > 0;

  const showStoresConnectivityError = shouldShowDiscoveryConnectivityError(
    storesError,
    { mode: "storeAnchor", locationStatus },
  );
  const showFreeBarbersConnectivityError = shouldShowDiscoveryConnectivityError(
    freeBarbersError,
    { mode: "storeAnchor", locationStatus },
  );
  const storesSoftErrorMessage =
    storesError && !isPanelConnectivityError(storesError)
      ? getErrorMessage(storesError)
      : undefined;

  const { present: presentUpdateStore } = updateStoreSheet;
  const { schedulePresent: scheduleUpdateStorePresent, cancelScheduledPresent: cancelUpdateStorePresent } =
    useDeferredSheetPresent(presentUpdateStore);

  const handlePressUpdateStore = useCallback(
    (store: BarberStoreMineDto) => {
      setStoreId(store.id);
      scheduleUpdateStorePresent(100);
    },
    [scheduleUpdateStorePresent],
  );

  const { present: presentMapDetail } = mapDetailSheet;
  const handleMarkerPress = useCallback(
    (item: FreeBarGetDto) => {
      setSelectedMapItem(item);
      presentMapDetail();
    },
    [presentMapDetail],
  );

  const { present: presentRatings } = ratingsSheet;
  const { schedulePresent: scheduleRatingsPresent, cancelScheduledPresent: cancelRatingsPresent } =
    useDeferredSheetPresent(presentRatings);

  const handlePressRatings = useCallback(
    (targetId: string, targetName: string) => {
      setSelectedRatingsTarget({ targetId, targetName });
      scheduleRatingsPresent(100);
    },
    [scheduleRatingsPresent],
  );

  // Filter fonksiyonları - filters are applied instantly, no apply button needed
  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Kendi dükkanlarını filtrele (client-side) - tüm filtreleri uygula
  const filteredStores = useMemo(() => {
    // userType filtresi - "freeBarber" seçiliyse kendi dükkanları gizlenir
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
      if (filterCriteria.mainCategory && filterCriteria.mainCategory !== "all") {
        // Store type'ı kontrol et (MaleHairdresser, FemaleHairdresser, BeautySalon)
        const storeTypeName = store.type === 0 ? "MaleHairdresser" : store.type === 1 ? "FemaleHairdresser" : "BeautySalon";
        if (storeTypeName !== filterCriteria.mainCategory) {
          return false;
        }
      }

      // Rating filter
      if (filterCriteria.minRating && filterCriteria.minRating > 0) {
        const storeRating = store.rating ?? 0;
        if (storeRating < filterCriteria.minRating) {
          return false;
        }
      }

      // Pricing type filter
      if (filterCriteria.pricingType && filterCriteria.pricingType !== "all") {
        // Backend'den string olarak geliyor: "Rent" veya "Percent"
        const storePricingType = store.pricingType?.toLowerCase();
        if (storePricingType !== filterCriteria.pricingType) {
          return false;
        }
      }

      // Status filter (isOpenNow) — field exists on BarberStoreMineDto
      if (filterCriteria.status && filterCriteria.status !== 'all') {
        const isOpen = store.isOpenNow ?? false;
        if (filterCriteria.status === 'available' && !isOpen) return false;
        if (filterCriteria.status === 'unavailable' && isOpen) return false;
      }

      // Price range filter — BarberStoreMineDto uses pricingValue, not minPrice
      if (filterCriteria.minPrice && filterCriteria.minPrice !== '') {
        const minPrice = parseFloat(filterCriteria.minPrice);
        const storePrice = store.pricingValue ?? 0;
        if (!isNaN(minPrice) && storePrice < minPrice) return false;
      }
      if (filterCriteria.maxPrice && filterCriteria.maxPrice !== '') {
        const maxPrice = parseFloat(filterCriteria.maxPrice);
        const storePrice = store.pricingValue ?? 0;
        if (!isNaN(maxPrice) && storePrice > maxPrice) return false;
      }

      return true;
    });
  }, [displayStores, searchQuery, filterCriteria.userType, filterCriteria.mainCategory, filterCriteria.minRating, filterCriteria.pricingType, filterCriteria.status, filterCriteria.minPrice, filterCriteria.maxPrice]);

  // API'den gelen filtrelenmiş veriyi kullan, yoksa normal veriyi göster
  const filteredFreeBarbers = useMemo(() => {
    const shouldShowFreeBarbers =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";
    if (!shouldShowFreeBarbers) return [];

    return displayFreeBarbers.filter((barber) => {
      // Basic search
      if (
        searchQuery &&
        !barber.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      // Rating filter
      if (filterCriteria.minRating && filterCriteria.minRating > 0) {
        const barberRating = (barber as any).rating ?? 0;
        if (barberRating < filterCriteria.minRating) return false;
      }
      // Status filter
      if (filterCriteria.status && filterCriteria.status !== 'all') {
        const isAvailable = (barber as any).isAvailable ?? false;
        if (filterCriteria.status === 'available' && !isAvailable) return false;
        if (filterCriteria.status === 'unavailable' && isAvailable) return false;
      }
      return true;
    });
  }, [displayFreeBarbers, searchQuery, filterCriteria.userType, filterCriteria.minRating, filterCriteria.status]);

  const renderStoreItem = useCallback(
    ({ item }: { item: BarberStoreMineDto }) => (
      <StoreMineCardComp
        store={item}
        isList={isList}
        expanded={expandedStores}
        cardWidthStore={cardWidthStore}
        onPressUpdate={handlePressUpdateStore}
        onPressRatings={handlePressRatings}
        showImageAnimation={settingData?.data?.showImageAnimation ?? true}
        profileCompact
        panelCompare={
          filteredStores.length >= 2
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
      expandedStores,
      cardWidthStore,
      handlePressUpdateStore,
      handlePressRatings,
      settingData,
      filteredStores.length,
      compareStoreIds,
      toggleCompareStore,
    ],
  );

  // Performance: manualFetch'i useCallback ile sarmalayarak gereksiz re-render'ları önle
  const handleManualFetch = useCallback(() => {
    manualFetch();
  }, [manualFetch]);

  const renderFreeBarberItem = useCallback(
    ({ item }: { item: FreeBarGetDto }) => (
      <FreeBarberCardInner
        freeBarber={item}
        isList={isList}
        expanded={expandedFreeBarbers}
        cardWidthFreeBarber={cardWidthFreeBarber}
        mode="barbershop"
        onPressRatings={handlePressRatings}
        onCallFreeBarber={handleManualFetch}
        storeId={stores?.length === 1 ? stores[0].id : undefined}
        showImageAnimation={settingData?.data?.showImageAnimation ?? true}
        panelCompare={
          isOtherUsersFreeBarber(item, currentUserId)
            ? {
              selected: compareFbIds.includes(item.id),
              onPress: () => toggleCompareFb(item.id),
            }
            : undefined
        }
      />
    ),
    [
      isList,
      expandedFreeBarbers,
      cardWidthFreeBarber,
      handlePressRatings,
      handleManualFetch,
      stores,
      settingData,
      currentUserId,
      compareFbIds,
      toggleCompareFb,
    ],
  );

  const listData = useMemo(() => {
    const H = {
      storesHeader: 52,
      storesLoading: 130,
      storesError: 360,
      storesEmpty: 400,
      storeRow: expandedStores ? (isList ? 300 : 270) : 200,
      storesHorizontal: 220,
      freebarbersHeader: 72,
      freebarbersLoading: 130,
      freebarbersError: 360,
      freebarbersEmpty: 360,
      fbRow: expandedFreeBarbers ? (isList ? 300 : 270) : 200,
      freebarbersHorizontal: 220,
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
        data: BarberStoreMineDto;
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "stores-content-horizontal";
        data: BarberStoreMineDto[];
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "freebarbers-header";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "freebarbers-loading";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "freebarbers-error";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "freebarbers-empty";
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "freebarber-row";
        data: FreeBarGetDto;
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "freebarbers-content-horizontal";
        data: FreeBarGetDto[];
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
    if (shouldShowStores) {
      push({ id: "stores-header", type: "stores-header" }, H.storesHeader);
      if (isStoresLoading) {
        push({ id: "stores-loading", type: "stores-loading" }, H.storesLoading);
      } else if (showStoresConnectivityError) {
        push({ id: "stores-error", type: "stores-error" }, H.storesError);
      } else {
        const storesToDisplay = filteredStores;
        if (storesToDisplay.length > 0) {
          if (expandedStores) {
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
              H.storesHorizontal,
            );
          }
        } else {
          push({ id: "stores-empty", type: "stores-empty" }, H.storesEmpty);
        }
      }
    }

    // Bu ekran yalnızca kullanıcının kendi işletmelerini gösterir; yakındaki berberler görünmez.

    return rows;
  }, [
    isStoresLoading,
    showStoresConnectivityError,
    filteredStores,
    expandedStores,
    filterCriteria.userType,
    isList,
  ]);

  const mapInitialRegion = useMemo(() => {
    const storeCandidate = displayStores
      .map((s) => safeCoord(s.latitude, s.longitude))
      .find(Boolean);

    if (storeCandidate) {
      return {
        latitude: storeCandidate.lat,
        longitude: storeCandidate.lon,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
    }
    return {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [displayStores]);
  const freeBarberMarkers = useMemo(() => {
    return filteredFreeBarbers.map((barber) => (
      <BarberMarker
        key={(barber as any).id}
        barber={barber}
        onPress={handleMarkerPress}
      />
    ));
  }, [filteredFreeBarbers, handleMarkerPress]); // Sadece liste değişirse render et

  const storeMarkers = useMemo(() => {
    if (filteredStores.length === 0) return null;
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
          onPress={() => handlePressUpdateStore(store)}
        />
      );
    });
  }, [filteredStores, handlePressUpdateStore]);

  return (
    <View className="flex flex-1 pl-4 pr-2" style={{ backgroundColor: colors.screenBg }}>
      <View
        style={{
          paddingTop: Math.max(insets.top - 4, 4),
          flexDirection: "row",
          alignItems: "center",
          zIndex: 40,
          elevation: 40,
        }}
      >
        <IconButton
          icon="arrow-left"
          iconColor="#ffb900"
          size={20}
          onPress={() => router.back()}
          accessibilityLabel={t("common.goBack")}
          style={{ margin: 0 }}
        />
        <Text style={{ color: colors.sectionHeaderText, fontFamily: 'CenturyGothic-Bold', fontSize: 17, marginLeft: 4, flex: 1 }}>
          {t("panel.myStores")}
        </Text>
      </View>
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
        </PanelCollapsibleTop>
      </View>

      {isMapMode && (
        <View className="absolute inset-0" style={{ zIndex: 5, elevation: 5 }}>
          <MapView
            style={{ flex: 1 }}
            userInterfaceStyle={isDark ? "dark" : "light"}
            initialRegion={mapInitialRegion}
          >
            {freeBarberMarkers}
            {storeMarkers}
          </MapView>
        </View>
      )}
      <View style={{ flex: 1 }} pointerEvents={isMapMode ? 'none' : 'auto'}>
        <FlatList
          data={listData}
          keyExtractor={(item) => item.id}
          scrollEventThrottle={16}
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
          initialNumToRender={10}
          windowSize={21}
          renderItem={({ item }) => {
            if (item.type === "stores-header") {
              if (!hasStores) return null;
              return (
                <View className="flex flex-row justify-end items-center mt-2">
                  <MotiViewExpand
                    expanded={expandedStores}
                    onPress={() =>
                      toggleExpand(expandedStores, setExpandedStores)
                    }
                    size={20}
                  />
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
                <View style={{ minHeight: 300, maxHeight: 400 }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={storesError}
                    data={[]}
                    locationStatus={locationStatus}
                    fetchedOnce={true}
                    onRetry={onRetryStoresQuery}
                    refetching={
                      showStoresConnectivityError &&
                      !!storesError &&
                      storesRetryBusy
                    }
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "stores-empty") {
              const showAddStoreCta =
                !hasStores && !searchQuery.trim() && !hasActiveFilters;
              if (showAddStoreCta) {
                return (
                  <View className="mt-2" style={{ minHeight: 300 }}>
                    <PanelEmptyCta
                      title={t("empty.noStoresAdded")}
                      subtitle={t("panel.emptyStateHintStore")}
                      buttonLabel={t("panel.openStorePanelToAdd")}
                      onPress={() => addStoreSheet.present()}
                    />
                  </View>
                );
              }
              return (
                <View className="mt-2" style={{ minHeight: 250, maxHeight: 400 }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={undefined}
                    data={[]}
                    locationStatus={locationStatus}
                    fetchedOnce={true}
                    onRetry={refetchStores}
                    customMessages={{
                      empty:
                        storesSoftErrorMessage ??
                        (searchQuery || hasActiveFilters
                          ? t("empty.noStoresFound")
                          : t("empty.noStoresAdded")),
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
                  {renderStoreItem({ item: item.data })}
                </PerplexityListItem>
              );
            }
            if (item.type === "stores-content-horizontal") {
              return (
                <View style={{ minHeight: 200 }}>
                  <PerplexityHorizontalList
                    data={filteredStores}
                    keyExtractor={(store) => store.id}
                    contentContainerStyle={{ gap: 12, paddingTop: 8 }}
                    renderItem={({ item: store }) =>
                      renderStoreItem({ item: store })
                    }
                  />
                </View>
              );
            }
            if (item.type === "freebarbers-header") {
              return (
                <View className="flex flex-row justify-between items-center mt-12">
                  <Text className="font-century-gothic text-xl" style={{ color: colors.sectionHeaderText }}>
                    {t("panel.nearbyFreeBarbers")}
                  </Text>
                  {hasFreeBarbers && (
                    <MotiViewExpand
                      expanded={expandedFreeBarbers}
                      onPress={() =>
                        toggleExpand(
                          expandedFreeBarbers,
                          setExpandedFreeBarbers,
                        )
                      }
                      size={20}
                    />
                  )}
                </View>
              );
            }
            if (item.type === "freebarbers-loading") {
              return (
                <View className="pt-4">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <SkeletonComponent key={i} />
                  ))}
                </View>
              );
            }
            if (item.type === "freebarbers-error") {
              // Hata durumu - servise ulaşılamadı mesajı göster
              return (
                <View style={{ minHeight: 300, maxHeight: 400 }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={freeBarbersError}
                    data={[]}
                    locationStatus={locationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetch}
                    refetching={
                      showFreeBarbersConnectivityError &&
                      !!freeBarbersError &&
                      freeBarbersRetryInProgress
                    }
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "freebarbers-empty") {
              // Veri yok durumu - uygun boş mesaj göster
              return (
                <View className="mt-2" style={{ minHeight: 250, maxHeight: 400 }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={undefined}
                    data={[]}
                    locationStatus={locationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetch}
                    customMessages={{
                      empty: !hasStores
                        ? t("empty.addStoreToSeeNearbyFreeBarbers")
                        : searchQuery || hasActiveFilters
                          ? t("empty.noResultsFound")
                          : t("empty.noNearbyFreeBarbers"),
                    }}
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "freebarber-row") {
              return (
                <PerplexityListItem>
                  {renderFreeBarberItem({ item: item.data })}
                </PerplexityListItem>
              );
            }
            if (item.type === "freebarbers-content-horizontal") {
              return (
                <View style={{ minHeight: 200 }}>
                  <PerplexityHorizontalList
                    data={filteredFreeBarbers}
                    keyExtractor={(fb: FreeBarGetDto) => (fb as any).id}
                    contentContainerStyle={{ gap: 12, paddingTop: 8 }}
                    renderItem={({ item: fb }) =>
                      renderFreeBarberItem({ item: fb })
                    }
                  />
                </View>
              );
            }
            return null;
          }}
        />
      </View>

      {(compareStoreIds.length === 2 || compareFbIds.length === 2) && (
        <View style={[{ zIndex: 30 }, compareStripOuterStyle(isDark, cmpM, compareStripBottom)]}>
          <TouchableOpacity
            onPress={() => {
              if (compareStoreIds.length === 2) {
                const [a, b] = compareStoreIds;
                setCompareStoreIds([]);
                router.push({
                  pathname: "/(screens)/compare/public-stores",
                  params: { left: a, right: b },
                });
              } else if (compareFbIds.length === 2) {
                const [a, b] = compareFbIds;
                setCompareFbIds([]);
                router.push({
                  pathname: "/(screens)/compare/public-freebarbers",
                  params: { left: a, right: b },
                });
              }
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
        ref={addStoreSheet.ref}
        backdropComponent={addStoreSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        onChange={addStoreSheet.handleChange}
        onDismiss={addStoreSheet.handleDismiss}
        snapPoints={addStoreSheet.snapPoints}
        enableOverDrag={addStoreSheet.enableOverDrag}
        enablePanDownToClose={addStoreSheet.enablePanDownToClose}
        enableHandlePanningGesture={addStoreSheet.enableHandlePanningGesture}
      >
        <BottomSheetView className="h-full pt-2">
          <DeferredRender
            active={addStoreSheet.isOpen}
            placeholder={<View className="flex-1 pt-4"><CrudSkeletonComponent /></View>}
          >
            <FormStoreAdd onClose={() => addStoreSheet.dismiss()} />
          </DeferredRender>
        </BottomSheetView>
      </BottomSheetModal>

      <BottomSheetModal
        ref={updateStoreSheet.ref}
        backdropComponent={updateStoreSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        onChange={updateStoreSheet.handleChange}
        onDismiss={() => {
          cancelUpdateStorePresent();
          updateStoreSheet.handleDismiss();
        }}
        snapPoints={updateStoreSheet.snapPoints}
        enableOverDrag={updateStoreSheet.enableOverDrag}
        enablePanDownToClose={updateStoreSheet.enablePanDownToClose}
        enableHandlePanningGesture={updateStoreSheet.enableHandlePanningGesture}
      >
        <BottomSheetView className="h-full pt-2">
          <DeferredRender
            active={updateStoreSheet.isOpen}
            placeholder={
              <View className="flex-1 pt-4">
                <CrudSkeletonComponent />
              </View>
            }
          >
            <FormStoreUpdate
              storeId={storeId}
              enabled={updateStoreSheet.isOpen}
              onClose={() => {
                cancelUpdateStorePresent();
                updateStoreSheet.dismiss();
              }}
              error={storesError || freeBarbersError}
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
        <BottomSheetView style={{ flex: 1, padding: 0, margin: 0, backgroundColor: colors.sheetBg }}>
          <DeferredRender
            active={mapDetailSheet.isOpen && !!selectedMapItem}
            placeholder={
              <View className="flex-1 pt-4">
                <SkeletonComponent />
              </View>
            }
          >
            {selectedMapItem && (
              <FreeBarberBookingContent
                barberId={(selectedMapItem as any).id}
                isBottomSheet={true}
                isBarberMode={true}
                storeId={storeId || stores?.[0]?.id}
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
        onDismiss={() => {
          cancelRatingsPresent();
          ratingsSheet.handleDismiss();
        }}
      >
        {selectedRatingsTarget ? (
          <RatingsBottomSheet
            targetId={selectedRatingsTarget.targetId}
            targetName={selectedRatingsTarget.targetName}
            onClose={() => {
              cancelRatingsPresent();
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
