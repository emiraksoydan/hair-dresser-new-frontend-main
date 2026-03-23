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
} from "../../store/api";
import { FilterDrawer } from "../../components/common/filterdrawer";
import FormStoreUpdate from "../../components/store/formstoreupdate";
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
import { useTheme } from "../../hook/useTheme";

const Index = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  // Current user for filters
  const { data: currentUser } = useGetMeQuery();
  const currentUserId = currentUser?.data?.id;

  // Filtering
  const {
    criteria: filterCriteria,
    updateCriteria: updateFilterCriteria,
    clearFilters,
    hasActiveFilters,
    createFilterRequestDto,
  } = useBackendFilters();

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
    pollingInterval: 30_000,
    refetchOnMountOrArgChange: true,
  });
  const {
    freeBarbers,
    isLoading: isFreeLoading,
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

  const [isMapMode, setIsMapMode] = useState(false);
  const [selectedMapItem, setSelectedMapItem] = useState<FreeBarGetDto | null>(
    null,
  );

  // Bottom sheet hooks
  const mapDetailSheet = useBottomSheet({
    snapPoints: ["90%", "100%"],
    enablePanDownToClose: true,
  });
  const updateStoreSnapPoints = useMemo(
    () => (isMapMode ? ["75%", "100%"] : ["100%"]),
    [isMapMode],
  );
  const updateStoreSheet = useBottomSheet({
    snapPoints: updateStoreSnapPoints,
    enablePanDownToClose: isMapMode,
    enableOverDrag: isMapMode,
  });
  const ratingsSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
  });

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
      if (storesError || freeBarbersError || locationStatus === "denied") {
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
    storesError,
    freeBarbersError,
    locationStatus,
  ]);

  const [expandedStores, setExpandedStores] = useState(true);
  const [expandedFreeBarbers, setExpandedFreeBarbers] = useState(true);

  const [storeId, setStoreId] = useState<string>("");
  const [selectedRatingsTarget, setSelectedRatingsTarget] = useState<{
    targetId: string;
    targetName: string;
  } | null>(null);

  const screenWidth = Dimensions.get("window").width;

  const cardWidthStore = useMemo(
    () => (expandedStores ? screenWidth * 0.92 : screenWidth * 0.94),
    [expandedStores, screenWidth],
  );
  const cardWidthFreeBarber = useMemo(
    () => (expandedFreeBarbers ? screenWidth * 0.92 : screenWidth * 0.94),
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

  const { present: presentUpdateStore } = updateStoreSheet;
  const handlePressUpdateStore = useCallback(
    (store: BarberStoreMineDto) => {
      setStoreId(store.id);
      // Sheet'i açmak için küçük bir gecikme ekle
      setTimeout(() => {
        presentUpdateStore();
      }, 100);
    },
    [presentUpdateStore],
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

      return true;
    });
  }, [displayStores, searchQuery, filterCriteria.userType, filterCriteria.mainCategory, filterCriteria.minRating, filterCriteria.pricingType]);

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
      return true;
    });
  }, [displayFreeBarbers, searchQuery, filterCriteria.userType]);

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
      />
    ),
    [
      isList,
      expandedStores,
      cardWidthStore,
      handlePressUpdateStore,
      handlePressRatings,
      settingData,
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
    ],
  );

  // FlatList için tüm item'ları birleştir
  // Refresh sırasında verilerin iç içe binmemesi için loading state'ini kontrol ediyoruz
  const listData = useMemo(() => {
    const items: Array<{
      id: string;
      type:
      | "stores-header"
      | "stores-list"
      | "stores-empty"
      | "stores-loading"
      | "stores-content-horizontal"
      | "stores-error"
      | "freebarbers-header"
      | "freebarbers-list"
      | "freebarbers-empty"
      | "freebarbers-loading"
      | "freebarbers-content-horizontal"
      | "freebarbers-error";
      data?: any;
    }> = [];

    // Stores section (Kendi dükkanlarım) - filtre uygulanır
    const shouldShowStores =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "store";
    if (shouldShowStores) {
      items.push({ id: "stores-header", type: "stores-header" });
      if (isStoresLoading) {
        items.push({ id: "stores-loading", type: "stores-loading" });
      } else if (isStoresError && storesError) {
        items.push({ id: "stores-error", type: "stores-error" });
      } else {
        // Filtrelenmiş dükkanları kullan
        const storesToDisplay = filteredStores;
        const hasStoresToShow = storesToDisplay.length > 0;

        if (hasStoresToShow) {
          if (expandedStores) {
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

    // FreeBarbers section - kullanıcı türü filtresi "Serbest Berber" veya "Hepsi" ise göster
    const shouldShowFreeBarbers =
      filterCriteria.userType === "all" ||
      filterCriteria.userType === "freeBarber";
    if (shouldShowFreeBarbers) {
      items.push({ id: "freebarbers-header", type: "freebarbers-header" });
      if (isFreeBarbersLoading) {
        items.push({ id: "freebarbers-loading", type: "freebarbers-loading" });
      } else if (freeBarbersError) {
        items.push({ id: "freebarbers-error", type: "freebarbers-error" });
      } else {
        // Filtrelenmiş free barbers kullan
        const freeBarbersToDisplay = filteredFreeBarbers;
        const hasFreeBarbersToShow = freeBarbersToDisplay.length > 0;

        if (hasFreeBarbersToShow) {
          if (expandedFreeBarbers) {
            items.push({ id: "freebarbers-list", type: "freebarbers-list", data: freeBarbersToDisplay });
          } else {
            items.push({
              id: "freebarbers-content-horizontal",
              type: "freebarbers-content-horizontal",
              data: freeBarbersToDisplay,
            });
          }
        } else {
          items.push({ id: "freebarbers-empty", type: "freebarbers-empty" });
        }
      }
    }

    return items;
  }, [
    isStoresLoading,
    isFreeBarbersLoading,
    filteredStores,
    filteredFreeBarbers,
    expandedStores,
    expandedFreeBarbers,
    filterCriteria.userType,
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
        className={
          isMapMode
            ? "absolute top-0 left-0 right-0 z-10 px-4 pt-0 pb-2 bg-transparent"
            : ""
        }
      >
        <View className="flex flex-row items-center gap-2 mt-2">
          <View className="flex flex-1">
            <SearchBar
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              isList={isList}
              setIsList={setIsList}
              onFilterPress={() => setFilterDrawerVisible(true)}
            />
          </View>
        </View>
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
              return (
                <View className="flex flex-row justify-between items-center mt-4">
                  <Text className="font-century-gothic text-2xl" style={{ color: colors.sectionHeaderText }}>
                    {t("panel.myStores")}
                  </Text>
                  {hasStores && (
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
                <View style={{ minHeight: 300, maxHeight: 400 }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={storesError}
                    data={[]}
                    locationStatus={locationStatus}
                    fetchedOnce={true}
                    onRetry={refetchStores}
                  >
                    <View />
                  </UnifiedStateWrapper>
                </View>
              );
            }
            if (item.type === "stores-empty") {
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
                      empty: searchQuery || hasActiveFilters ? t("empty.noStoresFound") : t("empty.noStoresAdded"),
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
                  {item.data.map((store: BarberStoreMineDto) => (
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
                  {hasFreeBarbers && (
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
                <View style={{ minHeight: 300, maxHeight: 400 }}>
                  <UnifiedStateWrapper
                    loading={false}
                    error={freeBarbersError}
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
                      empty: searchQuery || hasActiveFilters ? t("empty.noResultsFound") : t("empty.noNearbyFreeBarbers"),
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
                    <View key={fb.id}>
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
      />

      <BottomSheetModal
        ref={updateStoreSheet.ref}
        backdropComponent={updateStoreSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        onChange={updateStoreSheet.handleChange}
        snapPoints={updateStoreSheet.snapPoints}
        enableOverDrag={updateStoreSheet.enableOverDrag}
        enablePanDownToClose={updateStoreSheet.enablePanDownToClose}
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
