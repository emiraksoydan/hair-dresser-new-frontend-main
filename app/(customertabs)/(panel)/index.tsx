import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "../../components/common/Text";
import { OsmMapView as MapView } from "../../components/common/OsmMapView";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import SearchBar from "../../components/common/searchbar";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { BarberStoreGetDto, FreeBarGetDto } from "../../types";
import { useGetSettingQuery, useGetMeQuery, useGetSavedFiltersQuery, useCreateSavedFilterMutation, useDeleteSavedFilterMutation, useUpdateSavedFilterMutation } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { setFreeBarberSwipeIds, setStoreSwipeIds } from "../../store/bookingSwipeSlice";
import { showSnack } from "../../store/snackbarSlice";
import { getErrorMessage, getMessage } from "../../utils/errorHandler";
import {
  isPanelConnectivityError,
  shouldShowDiscoveryConnectivityError,
} from "../../utils/panelDiscoveryErrors";
import { FilterDrawer } from "../../components/common/filterdrawer";
import { SavedFilterChips } from "../../components/common/savedfilterchips";
import { StoreCardInner } from "../../components/store/storecard";
import StoreBookingContent from "../../components/store/storebooking";
import { FreeBarberCardInner } from "../../components/freebarber/freebarbercard";
import FreeBarberBookingContent from "../../components/freebarber/freebarberbooking";
import { safeCoord } from "../../utils/location/geo";
import { BarberMarker } from "../../components/freebarber/barbermarker";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { StoreMarker } from "../../components/common/storemarker";
import { DeferredRender } from "../../components/common/deferredrender";
import { SkeletonComponent } from "../../components/common/skeleton";
import { UnifiedStateWrapper } from "../../components/common/UnifiedStateManager";
import { useNearbyDiscovery } from "../../hook/useNearbyDiscovery";
import { useBackendFilters, wrapFilterCriteriaForSave } from "../../hook/useBackendFilters";
import { DEFAULT_DISTANCE_PRESET_ID } from "../../constants/filterDefaults";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { isOtherUsersFreeBarber, isOtherUsersStore } from "../../utils/compare-eligibility";
import { PanelCollapsibleTop } from "../../components/panel/PanelCollapsibleTop";
import { PerplexityHorizontalList } from "../../components/panel/PerplexityHorizontalList";
import { PerplexityListItem } from "../../components/panel/PerplexityListItem";
import { useFabOverlayWhenSheetOpen, usePanelMoreFab } from "../../hook/usePanelMoreFab";
const { width: screenWidth } = Dimensions.get("window");

const Index = () => {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const guard = useActionGuard();

  // Current user for favorites filter
  const { data: currentUser } = useGetMeQuery();
  const currentUserId = currentUser?.data?.id;

  const [compareStoreIds, setCompareStoreIds] = useState<string[]>([]);
  const [compareFbIds, setCompareFbIds] = useState<string[]>([]);
  const compareNavFiredRef = useRef(false);
  useEffect(() => {
    if (compareStoreIds.length === 2) {
      if (compareNavFiredRef.current) return;
      compareNavFiredRef.current = true;
      const [a, b] = compareStoreIds;
      setCompareStoreIds([]);
      router.push({ pathname: "/(screens)/compare/public-stores", params: { left: a, right: b } });
      return;
    }
    if (compareFbIds.length === 2) {
      if (compareNavFiredRef.current) return;
      compareNavFiredRef.current = true;
      const [a, b] = compareFbIds;
      setCompareFbIds([]);
      router.push({ pathname: "/(screens)/compare/public-freebarbers", params: { left: a, right: b } });
      return;
    }
    compareNavFiredRef.current = false;
  }, [compareStoreIds, compareFbIds, router]);
  const toggleCompareStore = useCallback((storeId: string) => {
    setCompareFbIds([]);
    setCompareStoreIds((prev) => {
      if (prev.includes(storeId)) return prev.filter((x) => x !== storeId);
      if (prev.length < 2) return [...prev, storeId];
      return [prev[1], storeId];
    });
  }, []);
  const toggleCompareFb = useCallback((fbId: string) => {
    setCompareStoreIds([]);
    setCompareFbIds((prev) => {
      if (prev.includes(fbId)) return prev.filter((x) => x !== fbId);
      if (prev.length < 2) return [...prev, fbId];
      return [prev[1], fbId];
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

  // Create filter DTO for backend - includes all filter criteria
  const filterDto = useMemo(() => {
    return createFilterRequestDto(undefined, currentUserId, t);
  }, [createFilterRequestDto, currentUserId, t, filterCriteria]);

  // Location and data hooks - always use filtered endpoint for consistent filtering
  const {
    stores,
    freeBarbers,
    loading: discoveryLoading,
    retryInProgress: discoveryRetryInProgress,
    error: discoveryError,
    locationStatus: discoveryLocationStatus,
    hasLocation: discoveryHasLocation,
    location: discoveryLocation,
    fetchedOnce: discoveryFetchedOnce,
    manualFetch: manualFetchDiscovery,
    loadMore: loadMoreDiscovery,
    hasMoreStores,
    hasMoreFreeBarbers,
    loadingMore: loadingMoreDiscovery,
  } = useNearbyDiscovery({
    enabled: true,
    filter: filterDto,
    useFilteredEndpoint: true,
    persistKey: "customer-discovery",
  });

  const handlePanelEndReached = useCallback(() => {
    if (hasMoreStores || hasMoreFreeBarbers) loadMoreDiscovery();
  }, [hasMoreStores, hasMoreFreeBarbers, loadMoreDiscovery]);
  const anyLoadingMore = loadingMoreDiscovery;
  const anyHasMore = hasMoreStores || hasMoreFreeBarbers;

  const storesLoading = discoveryLoading;
  const freeBarbersLoading = discoveryLoading;
  const storesRetryInProgress = discoveryRetryInProgress;
  const freeBarbersRetryInProgress = discoveryRetryInProgress;
  const storesError = discoveryError;
  const freeBarbersError = discoveryError;
  const storesLocationStatus = discoveryLocationStatus;
  const freeBarbersLocationStatus = discoveryLocationStatus;
  const storesHasLocation = discoveryHasLocation;
  const freeBarbersHasLocation = discoveryHasLocation;
  const storesLocation = discoveryLocation;
  const freeBarbersLocation = discoveryLocation;
  const storesFetchedOnce = discoveryFetchedOnce;
  const freeBarbersFetchedOnce = discoveryFetchedOnce;
  const manualFetchStores = manualFetchDiscovery;
  const manualFetchFreeBarbers = manualFetchDiscovery;

  const { data: settingData } = useGetSettingQuery();

  const [panelTopExpanded, setPanelTopExpanded] = useState(true);

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [isList, setIsList] = useState(true);
  const [isMapMode, setIsMapMode] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState<
    BarberStoreGetDto | FreeBarGetDto | null
  >(null);
  const mapRef = useRef<any>(null);

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

  // Bottom Sheet States
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);

  // Refresh control
  const [refreshing, setRefreshing] = useState(false);
  const isRefreshingRef = useRef(false);

  // Filter drawer state
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false);

  // Bottom sheet hooks
  const mapDetailSheet = useBottomSheet({
    snapPoints: ["92%", "100%"],
    enablePanDownToClose: true,
    enableOverDrag: true,
  });

  const ratingsSheet = useBottomSheet({
    snapPoints: ["100%"],
    enablePanDownToClose: true,
  });

  useFabOverlayWhenSheetOpen(mapDetailSheet.isOpen || ratingsSheet.isOpen);

  // Section expansion states
  const [expandedStores, setExpandedStores] = useState(true);
  const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);

  const showStoresConnectivityError = shouldShowDiscoveryConnectivityError(
    storesError,
    { mode: "userGps", locationStatus: storesLocationStatus },
  );
  const showFreeBarbersConnectivityError = shouldShowDiscoveryConnectivityError(
    freeBarbersError,
    { mode: "userGps", locationStatus: freeBarbersLocationStatus },
  );
  const storesSoftErrorMessage =
    storesError && !isPanelConnectivityError(storesError)
      ? getErrorMessage(storesError)
      : undefined;
  const freeBarbersSoftErrorMessage =
    freeBarbersError && !isPanelConnectivityError(freeBarbersError)
      ? getErrorMessage(freeBarbersError)
      : undefined;

  // Unified location status and loading (tek Discovery isteği)
  const isLoading = discoveryLoading;
  const fetchedOnce = discoveryFetchedOnce;
  const hasLocation = discoveryHasLocation;
  const locationStatus = discoveryLocationStatus;

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
      await manualFetchDiscovery();
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [manualFetchDiscovery, locationStatus]);

  // Rating handler
  const handlePressRatings = useCallback(
    (targetId: string, targetName: string) => {
      setSelectedRatingsTarget({ targetId, targetName });
      ratingsSheet.present();
    },
    [ratingsSheet],
  );

  // Map handlers
  const handleMarkerPress = useCallback(
    (item: BarberStoreGetDto | FreeBarGetDto) => {
      setSelectedMapItem(item);
      mapDetailSheet.present();
    },
    [mapDetailSheet],
  );

  // Filter handlers - filters are applied instantly, no apply button needed
  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

  // Filtered data with search - using language-independent keys
  const filteredStores = useMemo(() => {
    const shouldShowStores =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "store";
    if (!shouldShowStores) return [];

    return (stores || []).filter((store) => {
      // Basic search
      if (
        searchQuery &&
        !store.storeName.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [stores, searchQuery, filterCriteria.userType]);

  const filteredFreeBarbers = useMemo(() => {
    const shouldShowFreeBarbers =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";
    if (!shouldShowFreeBarbers) return [];

    return (freeBarbers || []).filter((barber) => {
      if (
        searchQuery &&
        !barber.fullName?.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }, [freeBarbers, searchQuery, filterCriteria.userType]);

  // Navigation handlers (filtered list sırası — detayda yatay kaydırma ile aynı sıra)
  const goStoreDetail = useCallback(
    (store: BarberStoreGetDto) => {
      dispatch(setStoreSwipeIds(filteredStores.map((s) => s.id)));
      router.push({
        pathname: "/store/[storeId]",
        params: { storeId: store.id },
      });
    },
    [router, dispatch, filteredStores],
  );

  const goFreeBarberDetail = useCallback(
    (freeBarber: FreeBarGetDto) => {
      dispatch(
        setFreeBarberSwipeIds(
          filteredFreeBarbers.map((fb) => (fb as FreeBarGetDto & { id: string }).id),
        ),
      );
      router.push({
        pathname: "/freebarber/[freeBarberId]",
        params: { freeBarberId: (freeBarber as any).id },
      });
    },
    [router, dispatch, filteredFreeBarbers],
  );

  // Card dimensions
  const cardWidthStore = useMemo(
    () => (expandedStores ? screenWidth * 0.935 : screenWidth * 0.955),
    [expandedStores],
  );
  const cardWidthFreeBarber = useMemo(
    () => (expandedFreeBarbers ? screenWidth * 0.935 : screenWidth * 0.955),
    [expandedFreeBarbers],
  );

  // Map markers
  const storeMarkers = useMemo(() => {
    return filteredStores.map((store) => {
      const coords = safeCoord(store.latitude, store.longitude);
      if (!coords) return null;

      return (
        <StoreMarker
          key={store.id}
          storeId={store.id}
          coordinate={{ latitude: coords.lat, longitude: coords.lon }}
          title={store.storeName}
          description={store.addressDescription}
          imageUrl={store?.imageList?.[0]?.imageUrl}
          storeType={store.type}
          onPress={() => handleMarkerPress(store)}
        />
      );
    });
  }, [filteredStores, handleMarkerPress]);

  const freeBarberMarkers = useMemo(() => {
    return filteredFreeBarbers.map((barber) => {
      const coords = safeCoord(
        (barber as any).latitude,
        (barber as any).longitude,
      );
      if (!coords) return null;

      return (
        <BarberMarker
          key={(barber as any).id}
          barber={barber}
          onPress={handleMarkerPress}
        />
      );
    });
  }, [filteredFreeBarbers, handleMarkerPress]);

  // Map initial region
  const mapInitialRegion = useMemo(() => {
    const userCoord = safeCoord(discoveryLocation?.latitude, discoveryLocation?.longitude);
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
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
    }

    const freeBarberCandidate = filteredFreeBarbers
      .map((b) => safeCoord((b as any).latitude, (b as any).longitude))
      .find(Boolean);
    if (freeBarberCandidate) {
      return {
        latitude: freeBarberCandidate.lat,
        longitude: freeBarberCandidate.lon,
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
  }, [discoveryLocation?.latitude, discoveryLocation?.longitude, filteredStores, filteredFreeBarbers]);

  useEffect(() => {
    if (!isMapMode) return;
    const userCoord = safeCoord(discoveryLocation?.latitude, discoveryLocation?.longitude);
    if (!userCoord) return;
    try {
      mapRef.current?.animateToRegion(
        {
          latitude: userCoord.lat,
          longitude: userCoord.lon,
          latitudeDelta: 0.03,
          longitudeDelta: 0.03,
        },
        450,
      );
    } catch {
      // ignore
    }
  }, [isMapMode, discoveryLocation?.latitude, discoveryLocation?.longitude]);

  // Render store item
  const renderStoreItem = useCallback(
    ({ item }: { item: BarberStoreGetDto }) => (
      <StoreCardInner
        store={item}
        isList={isList}
        expanded={expandedStores}
        cardWidthStore={cardWidthStore}
        compactMeta
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
      expandedStores,
      cardWidthStore,
      goStoreDetail,
      handlePressRatings,
      settingData,
      currentUserId,
      compareStoreIds,
      toggleCompareStore,
    ],
  );

  // Render free barber item
  const renderFreeBarberItem = useCallback(
    ({ item }: { item: FreeBarGetDto }) => (
      <FreeBarberCardInner
        freeBarber={item}
        isList={isList}
        expanded={expandedFreeBarbers}
        cardWidthFreeBarber={cardWidthFreeBarber}
        compactMeta
        onPressUpdate={goFreeBarberDetail}
        onPressAppointment={goFreeBarberDetail}
        onPressRatings={handlePressRatings}
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
      goFreeBarberDetail,
      handlePressRatings,
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
      storesEmpty: 360,
      storeRow: expandedStores ? (isList ? 300 : 270) : 200,
      storesHorizontal: 166,
      freebarbersHeader: expandedStores ? 72 : 48,
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
        data: BarberStoreGetDto;
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "stores-vertical-carousel";
        data: BarberStoreGetDto[];
        _scrollStart: number;
        _scrollLen: number;
      }
      | {
        id: string;
        type: "stores-content-horizontal";
        data: BarberStoreGetDto[];
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
      if (!storesFetchedOnce && storesLoading) {
        push({ id: "stores-loading", type: "stores-loading" }, H.storesLoading);
      } else if (showStoresConnectivityError && filteredStores.length === 0) {
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

    const shouldShowFreeBarbers =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";
    if (shouldShowFreeBarbers) {
      push(
        { id: "freebarbers-header", type: "freebarbers-header" },
        H.freebarbersHeader,
      );
      if (!freeBarbersFetchedOnce && freeBarbersLoading) {
        push(
          { id: "freebarbers-loading", type: "freebarbers-loading" },
          H.freebarbersLoading,
        );
      } else if (showFreeBarbersConnectivityError && filteredFreeBarbers.length === 0) {
        push(
          { id: "freebarbers-error", type: "freebarbers-error" },
          H.freebarbersError,
        );
      } else {
        const freeBarbersToDisplay = filteredFreeBarbers;
        if (freeBarbersToDisplay.length > 0) {
          if (expandedFreeBarbers) {
            freeBarbersToDisplay.forEach((fb) => {
              push(
                {
                  id: `freebarber-${(fb as any).id}`,
                  type: "freebarber-row",
                  data: fb,
                },
                H.fbRow,
              );
            });
          } else {
            push(
              {
                id: "freebarbers-content-horizontal",
                type: "freebarbers-content-horizontal",
                data: freeBarbersToDisplay,
              },
              H.freebarbersHorizontal,
            );
          }
        } else {
          push(
            { id: "freebarbers-empty", type: "freebarbers-empty" },
            H.freebarbersEmpty,
          );
        }
      }
    }

    return rows;
  }, [
    filterCriteria.userType,
    storesLoading,
    storesFetchedOnce,
    showStoresConnectivityError,
    filteredStores,
    expandedStores,
    freeBarbersLoading,
    freeBarbersFetchedOnce,
    showFreeBarbersConnectivityError,
    filteredFreeBarbers,
    expandedFreeBarbers,
    isList,
  ]);

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
          collapsedHint={t("panel.topSectionCollapsedHint")}
        >
          <View style={{ backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cardBg }}>
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
            ref={mapRef}
            style={{ flex: 1 }}
            userInterfaceStyle={isDark ? "dark" : "light"}
            initialRegion={mapInitialRegion}
            showsUserLocation={true}
            showsMyLocationButton={true}
          >
            {storeMarkers}
            {freeBarberMarkers}
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
              tintColor="#c2a523"
            />
          }
          initialNumToRender={10}
          windowSize={21}
          // Infinite-scroll: stores + freebarbers iki ayrı sayfalı liste. Liste
          // sonuna yaklaşıldığında ikisi için de bir sonraki sayfa istenir.
          onEndReached={anyHasMore ? handlePanelEndReached : undefined}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            anyLoadingMore ? (
              <View style={{ paddingVertical: 16 }}>
                <ActivityIndicator size="small" color="#c2a523" />
              </View>
            ) : null
          }
          renderItem={({ item }) => {
            if (item.type === "stores-header") {
              return (
                <View className="flex flex-row justify-between items-center mt-4">
                  <Text className="font-century-gothic text-xl" style={{ color: colors.sectionHeaderText }}>
                    {t("panel.nearbyStores")}
                  </Text>
                  {filteredStores.length > 0 && (
                    <MotiViewExpand
                      expanded={expandedStores}
                      onPress={() =>
                        toggleExpand(expandedStores, setExpandedStores)
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
                    error={storesError}
                    data={[]}
                    locationStatus={storesLocationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetchStores}
                    refetching={
                      showStoresConnectivityError &&
                      !!storesError &&
                      storesRetryInProgress
                    }
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "stores-empty") {
              return (
                <View className="mt-2" style={{ minHeight: 250, maxHeight: 400, overflow: 'hidden' }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={undefined}
                    data={[]}
                    locationStatus={storesLocationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetchStores}
                    customMessages={{
                      empty:
                        storesSoftErrorMessage ?? t("empty.noNearbyStores"),
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
                <PerplexityHorizontalList
                  data={item.data}
                  keyExtractor={(store: BarberStoreGetDto) => store.id}
                  nestedScrollEnabled
                  contentContainerStyle={{ paddingTop: 0, paddingBottom: 8, paddingHorizontal: 10 }}
                  renderItem={({ item: store }) => renderStoreItem({ item: store })}
                />
              );
            }

            if (item.type === "freebarbers-header") {
              return (
                <View className={`flex flex-row justify-between items-center ${expandedStores ? "mt-3" : "mt-0"}`}>
                  <Text className="font-century-gothic text-xl" style={{ color: colors.sectionHeaderText }}>
                    {t("panel.nearbyFreeBarbers")}
                  </Text>
                  {filteredFreeBarbers.length > 0 && (
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
                <View className="mt-2" style={{ minHeight: 300, maxHeight: 400, overflow: 'hidden' }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={freeBarbersError}
                    data={[]}
                    locationStatus={freeBarbersLocationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetchFreeBarbers}
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
                <View className="mt-2" style={{ minHeight: 250, maxHeight: 400, overflow: 'hidden' }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={undefined}
                    data={[]}
                    locationStatus={freeBarbersLocationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetchFreeBarbers}
                    customMessages={{
                      empty:
                        freeBarbersSoftErrorMessage ??
                        t("empty.noNearbyFreeBarbers"),
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
                <PerplexityHorizontalList
                  data={item.data}
                  keyExtractor={(fb: FreeBarGetDto) => (fb as any).id}
                  nestedScrollEnabled
                  contentContainerStyle={{ paddingTop: 0, paddingBottom: 8, paddingHorizontal: 10 }}
                  renderItem={({ item: fb }) => renderFreeBarberItem({ item: fb })}
                />
              );
            }

            return null;
          }}
        />
      </View>

      {/* Filter drawer */}
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
        showPricingType={false}
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
        currentFilterCriteriaJson={wrapFilterCriteriaForSave(filterCriteria)}
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
            const res = await createSavedFilter({ name, filterCriteriaJson: wrapFilterCriteriaForSave(filterCriteria) }).unwrap();
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

      {/* Map detail bottom sheet */}
      <BottomSheetModal
        ref={mapDetailSheet.ref}
        backdropComponent={mapDetailSheet.makeBackdrop()}
        handleComponent={() => null}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        snapPoints={mapDetailSheet.snapPoints}
        enablePanDownToClose={mapDetailSheet.enablePanDownToClose}
        onChange={mapDetailSheet.handleChange}
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
              <>
                {"storeName" in selectedMapItem ? (
                  <StoreBookingContent
                    storeId={selectedMapItem.id}
                    isBottomSheet={true}
                    isCustomer={true}
                  />
                ) : (
                  <FreeBarberBookingContent
                    barberId={(selectedMapItem as any).id}
                    isBottomSheet={true}
                  />
                )}
              </>
            )}
          </DeferredRender>
        </View>
      </BottomSheetModal>

      {/* Ratings bottom sheet */}
      <BottomSheetModal
        ref={ratingsSheet.ref}
        backdropComponent={ratingsSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        snapPoints={ratingsSheet.snapPoints}
        enablePanDownToClose={ratingsSheet.enablePanDownToClose}
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
