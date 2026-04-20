import React, { useCallback, useMemo, useRef, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
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
import { OsmMapView as MapView } from "../../components/common/OsmMapView";
import SearchBar from "../../components/common/searchbar";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { SkeletonComponent } from "../../components/common/skeleton";
import { FreeBarGetDto } from "../../types";
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
import { FreeBarberCardInner } from "../../components/freebarber/freebarbercard";
import FreeBarberBookingContent from "../../components/freebarber/freebarberbooking";
import { useNearbyStoresControl } from "../../hook/useNearByFreeBarberForStore";
import { safeCoord } from "../../utils/location/geo";
import { BarberMarker } from "../../components/freebarber/barbermarker";
import { RatingsBottomSheet } from "../../components/rating/ratingsbottomsheet";
import { useBackendFilters } from "../../hook/useBackendFilters";
import { DeferredRender } from "../../components/common/deferredrender";
import { useLanguage } from "../../hook/useLanguage";
import { UnifiedStateWrapper } from "../../components/common/UnifiedStateManager";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";
import { useSubscriptionGuard } from "../../hook/useSubscriptionGuard";
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
} from "../../(screens)/compare/compareShared";
import { PerplexityListItem } from "../../components/panel/PerplexityListItem";
import { PerplexityHorizontalList } from "../../components/panel/PerplexityHorizontalList";
import { PanelEmptyCta } from "../../components/common/PanelEmptyCta";
import { useBarberStoreSheet } from "../../context/BarberStoreSheetContext";

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
  const { withSubscription } = useSubscriptionGuard();
  const barberStoreSheet = useBarberStoreSheet();
  const isFocused = useIsFocused();

  // Current user for filters
  const { data: currentUser } = useGetMeQuery();
  const currentUserId = currentUser?.data?.id;

  const [compareFbIds, setCompareFbIds] = useState<string[]>([]);
  const toggleCompareFb = useCallback((id: string) => {
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
    // Sekme arka plandayken 30 sn'de bir istek atma (düşük RAM cihazlar)
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
    enabled: true,
    stores,
    hardRefreshMs: 15000,
    radiusKm: 10,
    filter: freeBarberFilterDto,
    currentUserId,
  });

  // Ayarlar
  const { data: settingData } = useGetSettingQuery();

  const panelTopCollapsedHint = t("panel.topSectionCollapsedHint");

  const [panelTopExpanded, setPanelTopExpanded] = useState(true);

  const [isMapMode, setIsMapMode] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(
    null,
  );

  const manualFetchRef = React.useRef(manualFetch);
  manualFetchRef.current = manualFetch;
  React.useEffect(() => {
    if (!isFocused || locationStatus !== "granted") return;
    manualFetchRef.current();
  }, [isFocused, locationStatus]);

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
  useFabOverlayWhenSheetOpen(anySheetOpen);

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
      await Promise.all([refetchStores(), manualFetch()]);
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [
    manualFetch,
    refetchStores,
    locationStatus,
  ]);

  const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);

  const screenWidth = Dimensions.get("window").width;

  const cardWidthFreeBarber = useMemo(
    () => (expandedFreeBarbers ? screenWidth * 0.935 : screenWidth * 0.955),
    [expandedFreeBarbers, screenWidth],
  );

  // RTK Query cache'i zaten data yönetimini yapıyor, previous state'lere gerek yok
  const displayStores = stores ?? [];
  const displayFreeBarbers = freeBarbers ?? [];

  // Loading state'leri direkt RTK Query'den geliyor
  const isFreeBarbersLoading = isFreeLoading;

  const hasFreeBarbers = displayFreeBarbers.length > 0;

  const showFreeBarbersConnectivityError = shouldShowDiscoveryConnectivityError(
    freeBarbersError,
    { mode: "storeAnchor", locationStatus },
  );
  const freeBarberSoftErrorMessage =
    freeBarbersError && !isPanelConnectivityError(freeBarbersError)
      ? getErrorMessage(freeBarbersError)
      : undefined;

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

  // Filter fonksiyonları - filters are applied instantly, no apply button needed
  const handleClearFilters = useCallback(() => {
    clearFilters();
  }, [clearFilters]);

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

  // Performance: manualFetch'i useCallback ile sarmalayarak gereksiz re-render'ları önle
  const handleManualFetch = useCallback(() => {
    manualFetch();
  }, [manualFetch]);

  const handleViewMyBusinessesPress = useCallback(() => {
    withSubscription(() => {
      router.push("/(screens)/profile/barber-store-businesses");
    });
  }, [router, withSubscription]);

  const renderFreeBarberItem = useCallback(
    ({ item }: { item: FreeBarGetDto }) => (
      <FreeBarberCardInner
        freeBarber={item}
        isList={isList}
        expanded={expandedFreeBarbers}
        cardWidthFreeBarber={cardWidthFreeBarber}
        compactMeta
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
      header: 52,
      loading: 130,
      error: 360,
      empty: 360,
      horizontalBlock: 220,
      fbRow: expandedFreeBarbers ? (isList ? 300 : 270) : 200,
    };

    type Row =
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

    const shouldShowFreeBarbers =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";
    if (!shouldShowFreeBarbers) return rows;

    push({ id: "freebarbers-header", type: "freebarbers-header" }, H.header);

    if (isFreeBarbersLoading) {
      push({ id: "freebarbers-loading", type: "freebarbers-loading" }, H.loading);
    } else if (showFreeBarbersConnectivityError) {
      push({ id: "freebarbers-error", type: "freebarbers-error" }, H.error);
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
            H.horizontalBlock,
          );
        }
      } else {
        push({ id: "freebarbers-empty", type: "freebarbers-empty" }, H.empty);
      }
    }

    return rows;
  }, [
    isFreeBarbersLoading,
    filteredFreeBarbers,
    expandedFreeBarbers,
    filterCriteria.userType,
    showFreeBarbersConnectivityError,
    isList,
  ]);

  const mapInitialRegion = useMemo(() => {
    const fbCandidate = displayFreeBarbers
      .map((b) => safeCoord((b as any).latitude, (b as any).longitude))
      .find(Boolean);
    if (fbCandidate) {
      return {
        latitude: fbCandidate.lat,
        longitude: fbCandidate.lon,
        latitudeDelta: 0.06,
        longitudeDelta: 0.06,
      };
    }
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
  }, [displayFreeBarbers, displayStores]);
  const freeBarberMarkers = useMemo(() => {
    return filteredFreeBarbers.map((barber) => (
      <BarberMarker
        key={(barber as any).id}
        barber={barber}
        onPress={handleMarkerPress}
      />
    ));
  }, [filteredFreeBarbers, handleMarkerPress]); // Sadece liste değişirse render et

  return (
    <View className="flex flex-1 pl-4 pr-2" style={{ backgroundColor: colors.screenBg }}>
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
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={handleViewMyBusinessesPress}
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
                {t("panel.viewMyBusinesses")}
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
      </View>

      {isMapMode && (
        <View className="absolute inset-0" style={{ zIndex: 5, elevation: 5 }}>
          <MapView
            style={{ flex: 1 }}
            userInterfaceStyle={isDark ? "dark" : "light"}
            initialRegion={mapInitialRegion}
          >
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
              tintColor="#f05e23"
            />
          }
          initialNumToRender={10}
          windowSize={21}
          renderItem={({ item }) => {
            if (item.type === "freebarbers-header") {
              return (
                <View className="flex flex-row justify-between items-center mt-4">
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
              if (stores.length === 0) {
                return (
                  <View className="mt-2 pr-2">
                    <PanelEmptyCta
                      title={t("empty.addStoreToSeeNearbyFreeBarbers")}
                      subtitle={t("panel.emptyStateHintStore")}
                      buttonLabel={t("navigation.addStore")}
                      onPress={() =>
                        withSubscription(() => barberStoreSheet?.openAddStore?.())
                      }
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
                    onRetry={manualFetch}
                    customMessages={{
                      empty:
                        freeBarberSoftErrorMessage ??
                        (searchQuery || hasActiveFilters
                          ? t("empty.noResultsFound")
                          : t("empty.noNearbyFreeBarbers")),
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
                    contentContainerStyle={{ gap: 10, paddingTop: 6, paddingBottom: 6, paddingHorizontal: 0 }}
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

      {compareFbIds.length === 2 && (
        <View style={[{ zIndex: 30 }, compareStripOuterStyle(isDark, cmpM, compareStripBottom)]}>
          <TouchableOpacity
            onPress={() => {
              const [a, b] = compareFbIds;
              setCompareFbIds([]);
              router.push({
                pathname: "/(screens)/compare/public-freebarbers",
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
                storeId={stores?.[0]?.id}
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
