import React, { useState, useMemo } from 'react';
import { View, Dimensions, FlatList } from 'react-native';
import { PerplexityListItem } from './PerplexityListItem';
import { PerplexityHorizontalList } from './PerplexityHorizontalList';
import { Text } from '../common/Text';
import MotiViewExpand from '../../components/common/motiviewexpand';
import { SkeletonComponent } from '../../components/common/skeleton';
import { EmptyState } from '../../components/common/emptystateresult';
import { LottieViewComponent } from '../../components/common/lottieview';
import { UnifiedStateManager } from '../../components/common/UnifiedStateManager';
import { StoreCardInner } from '../../components/store/StoreCard';
import { FreeBarberCardInner } from '../../components/freebarber/FreeBarberCard';
import { getErrorMessage } from '../../utils/errorHandler';
import { shouldShowDiscoveryConnectivityError, type DiscoveryLocationMode } from '../../utils/panelDiscoveryErrors';
import { useLanguage } from '../../hook/useLanguage';
import { BarberStoreGetDto, FreeBarGetDto } from '../../types';
import { PANEL_FLAT_LIST_PERF } from '../../constants/panelFlatListPerf';

export const SectionHeader = ({ title, expanded, onToggle }: any) => (
    <View className="flex flex-row justify-between items-center mt-4">
        <Text className="font-century-gothic-sans-regular text-lg text-white">{title}</Text>
        <MotiViewExpand expanded={expanded} onPress={onToggle} size={20} />
    </View>
);

export const SkeletonList = ({ count }: { count: number }) => (
    <View className="pt-4">
        {Array.from({ length: count }).map((_, i) => (
            <SkeletonComponent key={i} />
        ))}
    </View>
);

export const EmptyStateFunc = ({ loading, hasData, hasLocation, locationStatus, fetchedOnce, message }: any) => (
    <View style={{ minHeight: 200, maxHeight: 400 }}>
        <EmptyState
            loading={loading}
            hasData={hasData}
            hasLocation={hasLocation}
            locationStatus={locationStatus}
            fetchedOnce={fetchedOnce}
            noResultText={message}
        />
    </View>
);


export const StoresSection = React.memo(({ stores, loading, hasLocation, locationStatus, fetchedOnce, isList, onPressStore, onPressRatings, searchQuery, appliedFilters, error, showImageAnimation = true, onRetry, discoveryLocationMode = 'userGps' as DiscoveryLocationMode }: any) => {
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(true);
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = expanded ? screenWidth * 0.935 : screenWidth * 0.955;

    const showServiceError = error && shouldShowDiscoveryConnectivityError(error, {
        mode: discoveryLocationMode,
        locationStatus,
    });

    // Network/Server error — panel keşif ile aynı kart + tekrar dene
    if (showServiceError) {
        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <UnifiedStateManager
                    error={error}
                    message={getErrorMessage(error)}
                    state="error"
                    onRetry={onRetry}
                    loading={false}
                    fetchedOnce={true}
                    hasData={stores.length > 0}
                />
            </View>
        );
    }

    if (locationStatus === "denied") {
        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <UnifiedStateManager
                    locationStatus="denied"
                    state="location-denied"
                    message={t('location.permissionDeniedSettings')}
                    onRetry={onRetry}
                    loading={false}
                    fetchedOnce={true}
                    hasData={stores.length > 0}
                />
            </View>
        );
    }

    if (loading && !stores.length) return <SkeletonList count={2} />;
    if (!stores.length) {
        // Filtre veya search aktif mi kontrol et
        const hasActiveFilters = appliedFilters && (
            appliedFilters.userType !== "Hepsi" ||
            appliedFilters.mainCategory !== "Hepsi" ||
            appliedFilters.services?.length > 0 ||
            appliedFilters.priceSort !== 'none' ||
            appliedFilters.minPrice !== '' ||
            appliedFilters.maxPrice !== '' ||
            appliedFilters.pricingType !== 'Hepsi' ||
            appliedFilters.availability !== 'all' ||
            appliedFilters.rating > 0 ||
            appliedFilters.favoritesOnly
        );

        const isFiltering = searchQuery || hasActiveFilters;

        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                {isFiltering ? (
                    <LottieViewComponent
                        animationSource={require('../../../assets/animations/empty.json')}
                        message={t('empty.noStoresFound')}
                    />
                ) : (
                    <EmptyStateFunc
                        loading={loading}
                        hasData={stores.length > 0}
                        hasLocation={hasLocation}
                        locationStatus={locationStatus}
                        fetchedOnce={fetchedOnce}
                        message={t('empty.storeNotFound')}
                    />
                )}
            </View>
        );
    }

    return (
        <View>
            <SectionHeader title={t('navigation.businesses')} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            {expanded ? (
                <FlatList
                    data={stores}
                    keyExtractor={(s: any) => s.id}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    {...PANEL_FLAT_LIST_PERF}
                    renderItem={({ item: s }: { item: any; index: number }) => (
                        <PerplexityListItem>
                            <StoreCardInner store={s} isList={isList} expanded={expanded} cardWidthStore={cardWidth} compactMeta onPressUpdate={onPressStore} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                        </PerplexityListItem>
                    )}
                    contentContainerStyle={{ paddingTop: 8 }}
                />
            ) : (
                <PerplexityHorizontalList<BarberStoreGetDto>
                    data={stores as BarberStoreGetDto[]}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingTop: 8, gap: 12, paddingHorizontal: 10 }}
                    nestedScrollEnabled
                    renderItem={({ item }) => (
                        <StoreCardInner store={item} isList={isList} expanded={false} cardWidthStore={cardWidth} compactMeta onPressUpdate={onPressStore} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                    )}
                />
            )}
        </View>
    );
});

export const FreeBarbersSection = React.memo(({ freeBarbers, loading, hasLocation, locationStatus, fetchedOnce, isList, onPressFreeBarber, onPressRatings, searchQuery, appliedFilters, error, showImageAnimation = true, onRetry, discoveryLocationMode = 'userGps' as DiscoveryLocationMode }: any) => {
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(false);
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = expanded ? screenWidth * 0.935 : screenWidth * 0.955;

    const showServiceError = error && shouldShowDiscoveryConnectivityError(error, {
        mode: discoveryLocationMode,
        locationStatus,
    });

    if (showServiceError) {
        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <UnifiedStateManager
                    error={error}
                    message={getErrorMessage(error)}
                    state="error"
                    onRetry={onRetry}
                    loading={false}
                    fetchedOnce={true}
                    hasData={freeBarbers.length > 0}
                />
            </View>
        );
    }

    if (locationStatus === "denied") {
        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <UnifiedStateManager
                    locationStatus="denied"
                    state="location-denied"
                    message={t('location.permissionDeniedSettings')}
                    onRetry={onRetry}
                    loading={false}
                    fetchedOnce={true}
                    hasData={freeBarbers.length > 0}
                />
            </View>
        );
    }

    if (loading && !freeBarbers.length) return <SkeletonList count={2} />;
    if (!freeBarbers.length) {
        // Filtre veya search aktif mi kontrol et
        const hasActiveFilters = appliedFilters && (
            appliedFilters.userType !== "Hepsi" ||
            appliedFilters.mainCategory !== "Hepsi" ||
            appliedFilters.services?.length > 0 ||
            appliedFilters.priceSort !== 'none' ||
            appliedFilters.minPrice !== '' ||
            appliedFilters.maxPrice !== '' ||
            appliedFilters.pricingType !== 'Hepsi' ||
            appliedFilters.availability !== 'all' ||
            appliedFilters.rating > 0 ||
            appliedFilters.favoritesOnly
        );

        const isFiltering = searchQuery || hasActiveFilters;

        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                {isFiltering ? (
                    <LottieViewComponent
                        animationSource={require('../../../assets/animations/empty.json')}
                        message={t('empty.noFreeBarbersFound')}
                    />
                ) : (
                    <EmptyStateFunc
                        loading={loading}
                        hasData={freeBarbers.length > 0}
                        hasLocation={hasLocation}
                        locationStatus={locationStatus}
                        fetchedOnce={fetchedOnce}
                        message={t('empty.freeBarberNotFound')}
                    />
                )}
            </View>
        );
    }

    return (
        <View>
            <SectionHeader title={t('navigation.freeBarbers')} expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            {expanded ? (
                <FlatList
                    data={freeBarbers}
                    keyExtractor={(fb: any) => fb.id}
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    {...PANEL_FLAT_LIST_PERF}
                    renderItem={({ item: fb }: { item: any; index: number }) => (
                        <PerplexityListItem>
                            <FreeBarberCardInner freeBarber={fb} isList={isList} expanded={expanded} cardWidthFreeBarber={cardWidth} compactMeta onPressUpdate={onPressFreeBarber} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                        </PerplexityListItem>
                    )}
                    contentContainerStyle={{ paddingTop: 8 }}
                />
            ) : (
                <PerplexityHorizontalList<FreeBarGetDto>
                    data={freeBarbers as FreeBarGetDto[]}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingTop: 8, gap: 12, paddingHorizontal: 10 }}
                    nestedScrollEnabled
                    renderItem={({ item }) => (
                        <FreeBarberCardInner freeBarber={item} isList={isList} expanded={false} cardWidthFreeBarber={cardWidth} compactMeta onPressUpdate={onPressFreeBarber} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                    )}
                />
            )}
        </View>
    );
});

export default {
    StoresSection,
    FreeBarbersSection,
    SectionHeader,
    SkeletonList,
    EmptyStateFunc
};
