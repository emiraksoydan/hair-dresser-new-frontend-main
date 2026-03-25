import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  Dimensions,
  FlatList,
  RefreshControl,
  TouchableOpacity,
  View,
} from "react-native";
import { Text } from "../../components/common/Text";
import MapView from "react-native-maps";
import { IconButton } from "react-native-paper";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import SearchBar from "../../components/common/searchbar";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { useBottomSheet } from "../../hook/useBottomSheet";
import MotiViewExpand from "../../components/common/motiviewexpand";
import { toggleExpand } from "../../utils/common/expand-toggle";
import { BarberStoreGetDto, FreeBarGetDto } from "../../types";
import { useGetSettingQuery, useGetMeQuery, useGetSavedFiltersQuery, useCreateSavedFilterMutation, useDeleteSavedFilterMutation, useUpdateSavedFilterMutation } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { getErrorMessage, getMessage } from "../../utils/errorHandler";
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
import { useNearbyStores } from "../../hook/useNearByStore";
import { useNearbyFreeBarber } from "../../hook/useNearByFreeBarber";
import { useBackendFilters } from "../../hook/useBackendFilters";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useActionGuard } from "../../hook/useActionGuard";

const { width: screenWidth } = Dimensions.get("window");

const Index = () => {
  const { colors, isDark } = useTheme();
  const dispatch = useAppDispatch();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const guard = useActionGuard();

  // Current user for favorites filter
  const { data: currentUser } = useGetMeQuery();
  const currentUserId = currentUser?.data?.id;

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
    loading: storesLoading,
    error: storesError,
    locationStatus: storesLocationStatus,
    hasLocation: storesHasLocation,
    location: storesLocation,
    fetchedOnce: storesFetchedOnce,
    manualFetch: manualFetchStores,
  } = useNearbyStores({
    enabled: true,
    filter: filterDto,
    useFilteredEndpoint: true, // Her zaman filtered endpoint kullan
  });

  const {
    freeBarbers,
    loading: freeBarbersLoading,
    error: freeBarbersError,
    locationStatus: freeBarbersLocationStatus,
    hasLocation: freeBarbersHasLocation,
    location: freeBarbersLocation,
    fetchedOnce: freeBarbersFetchedOnce,
    manualFetch: manualFetchFreeBarbers,
  } = useNearbyFreeBarber({
    enabled: true,
    filter: filterDto,
    useFilteredEndpoint: true, // Her zaman filtered endpoint kullan
  });

  const { data: settingData } = useGetSettingQuery();

  // UI State
  const [searchQuery, setSearchQuery] = useState("");
  const [isList, setIsList] = useState(true);
  const [isMapMode, setIsMapMode] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState<
    BarberStoreGetDto | FreeBarGetDto | null
  >(null);

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
    snapPoints: ["90%", "100%"],
    enablePanDownToClose: true,
  });

  const ratingsSheet = useBottomSheet({
    snapPoints: ["60%", "90%"],
    enablePanDownToClose: true,
  });

  // Section expansion states
  const [expandedStores, setExpandedStores] = useState(true);
  const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);

  // Unified location status and loading
  const isLoading = storesLoading || freeBarbersLoading;
  const hasError = storesError || freeBarbersError;
  const fetchedOnce = storesFetchedOnce || freeBarbersFetchedOnce;
  const hasLocation = storesHasLocation || freeBarbersHasLocation;
  const locationStatus = storesLocationStatus || freeBarbersLocationStatus;

  // Refresh handler
  const onRefresh = useCallback(async () => {
    if (isRefreshingRef.current) return;

    // CRITICAL FIX: Set refreshing state BEFORE early returns
    // This prevents loading indicator from getting stuck
    setRefreshing(true);

    try {
      // Early return if error or location denied, but still hide indicator
      if (hasError || locationStatus === "denied") {
        return;
      }

      isRefreshingRef.current = true;
      await Promise.all([manualFetchStores(), manualFetchFreeBarbers()]);
    } finally {
      setRefreshing(false);
      isRefreshingRef.current = false;
    }
  }, [manualFetchStores, manualFetchFreeBarbers, hasError, locationStatus]);

  // Navigation handlers
  const goStoreDetail = useCallback(
    (store: BarberStoreGetDto) => {
      router.push({
        pathname: "/store/[storeId]",
        params: { storeId: store.id },
      });
    },
    [router],
  );

  const goFreeBarberDetail = useCallback(
    (freeBarber: FreeBarGetDto) => {
      router.push({
        pathname: "/freebarber/[freeBarberId]",
        params: { freeBarberId: (freeBarber as any).id },
      });
    },
    [router],
  );

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

  // Card dimensions
  const cardWidthStore = useMemo(
    () => (expandedStores ? screenWidth * 0.92 : screenWidth * 0.94),
    [expandedStores],
  );
  const cardWidthFreeBarber = useMemo(
    () => (expandedFreeBarbers ? screenWidth * 0.92 : screenWidth * 0.94),
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
    return {
      latitude: 41.0082,
      longitude: 28.9784,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    };
  }, [filteredStores]);

  // Render store item
  const renderStoreItem = useCallback(
    ({ item }: { item: BarberStoreGetDto }) => (
      <StoreCardInner
        store={item}
        isList={isList}
        expanded={expandedStores}
        cardWidthStore={cardWidthStore}
        onPressUpdate={goStoreDetail}
        onPressRatings={handlePressRatings}
        showImageAnimation={settingData?.data?.showImageAnimation ?? true}
      />
    ),
    [
      isList,
      expandedStores,
      cardWidthStore,
      goStoreDetail,
      handlePressRatings,
      settingData,
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
        onPressUpdate={goFreeBarberDetail}
        onPressRatings={handlePressRatings}
        showImageAnimation={settingData?.data?.showImageAnimation ?? true}
      />
    ),
    [
      isList,
      expandedFreeBarbers,
      cardWidthFreeBarber,
      goFreeBarberDetail,
      handlePressRatings,
      settingData,
    ],
  );

  // List data for FlatList
  const listData = useMemo(() => {
    const items: Array<{
      id: string;
      type:
      | "stores-header"
      | "stores-list"
      | "stores-empty"
      | "stores-loading"
      | "stores-error"
      | "stores-content-horizontal"
      | "freebarbers-header"
      | "freebarbers-list"
      | "freebarbers-empty"
      | "freebarbers-loading"
      | "freebarbers-error"
      | "freebarbers-content-horizontal";
      data?: any;
    }> = [];

    const shouldShowStores =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "store";
    const shouldShowFreeBarbers =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";

    if (shouldShowStores) {
      items.push({ id: "stores-header", type: "stores-header" });
      if (!storesFetchedOnce || (storesLoading && filteredStores.length === 0)) {
        items.push({ id: "stores-loading", type: "stores-loading" });
      } else if (storesError) {
        items.push({ id: "stores-error", type: "stores-error" });
      } else if (filteredStores.length > 0) {
        if (expandedStores) {
          items.push({ id: "stores-list", type: "stores-list", data: filteredStores });
        } else {
          items.push({
            id: "stores-content-horizontal",
            type: "stores-content-horizontal",
            data: filteredStores,
          });
        }
      } else {
        items.push({ id: "stores-empty", type: "stores-empty" });
      }
    }

    if (shouldShowFreeBarbers) {
      items.push({ id: "freebarbers-header", type: "freebarbers-header" });
      if (!freeBarbersFetchedOnce || (freeBarbersLoading && filteredFreeBarbers.length === 0)) {
        items.push({ id: "freebarbers-loading", type: "freebarbers-loading" });
      } else if (freeBarbersError) {
        items.push({ id: "freebarbers-error", type: "freebarbers-error" });
      } else if (filteredFreeBarbers.length > 0) {
        if (expandedFreeBarbers) {
          items.push({ id: "freebarbers-list", type: "freebarbers-list", data: filteredFreeBarbers });
        } else {
          items.push({
            id: "freebarbers-content-horizontal",
            type: "freebarbers-content-horizontal",
            data: filteredFreeBarbers,
          });
        }
      } else {
        items.push({ id: "freebarbers-empty", type: "freebarbers-empty" });
      }
    }

    return items;
  }, [
    filterCriteria.userType,
    storesLoading,
    storesFetchedOnce,
    storesError,
    filteredStores,
    expandedStores,
    freeBarbersLoading,
    freeBarbersFetchedOnce,
    freeBarbersError,
    filteredFreeBarbers,
    expandedFreeBarbers,
  ]);

  return (
    <View className="flex flex-1 pl-4 pr-2" style={{ backgroundColor: colors.screenBg }}>
      <View
        className={
          isMapMode
            ? "absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent"
            : ""
        }
      >
        <View style={{ marginTop: 8, backgroundColor: colors.cardBg, borderRadius: 12, borderWidth: 1.5, borderColor: colors.cardBg }}>
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
      </View>

      {isMapMode && (
        <View className="absolute inset-0" style={{ zIndex: 5, elevation: 5 }}>
          <MapView
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
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
          removeClippedSubviews={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#c2a523"
            />
          }
          renderItem={({ item }) => {
            if (item.type === "stores-header") {
              return (
                <View className="flex flex-row justify-between items-center mt-4">
                  <Text className="font-century-gothic text-2xl" style={{ color: colors.sectionHeaderText }}>
                    {t("panel.nearbyStores")}
                  </Text>
                  {filteredStores.length > 0 && (
                    <MotiViewExpand
                      expanded={expandedStores}
                      onPress={() =>
                        toggleExpand(expandedStores, setExpandedStores)
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
                    error={storesError}
                    data={[]}
                    locationStatus={storesLocationStatus}
                    fetchedOnce={true}
                    onRetry={manualFetchStores}
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
                      empty: t("empty.noNearbyStores"),
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
                      {renderStoreItem({ item: store })}
                    </View>
                  ))}
                </View>
              );
            }

            if (item.type === "stores-content-horizontal") {
              return (
                <View style={{ minHeight: 200 }}>
                  <FlatList
                    data={item.data}
                    keyExtractor={(store) => store.id}
                    renderItem={renderStoreItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12, paddingTop: 8 }}
                  />
                </View>
              );
            }

            if (item.type === "freebarbers-header") {
              return (
                <View className="flex flex-row justify-between items-center mt-12">
                  <Text className="font-century-gothic text-2xl" style={{ color: colors.sectionHeaderText }}>
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
                      empty: t("empty.noNearbyFreeBarbers"),
                    }}
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }

            if (item.type === "freebarbers-list") {
              return (
                <View>
                  {item.data.map((fb: FreeBarGetDto) => (
                    <View key={(fb as any).id}>
                      {renderFreeBarberItem({ item: fb })}
                    </View>
                  ))}
                </View>
              );
            }

            if (item.type === "freebarbers-content-horizontal") {
              return (
                <View style={{ minHeight: 200 }}>
                  <FlatList
                    data={item.data}
                    keyExtractor={(fb: FreeBarGetDto) => (fb as any).id}
                    renderItem={renderFreeBarberItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 12, paddingTop: 8 }}
                  />
                </View>
              );
            }

            return null;
          }}
        />
      </View>

      {/* Map toggle button */}
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

      {/* Filter drawer */}
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

      {/* Map detail bottom sheet */}
      <BottomSheetModal
        ref={mapDetailSheet.ref}
        backdropComponent={mapDetailSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        snapPoints={mapDetailSheet.snapPoints}
        enablePanDownToClose={mapDetailSheet.enablePanDownToClose}
        onChange={mapDetailSheet.handleChange}
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
        </BottomSheetView>
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
