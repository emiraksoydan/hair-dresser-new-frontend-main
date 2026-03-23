import React, { useState, useMemo } from 'react';
import { View, Dimensions, FlatList } from 'react-native';
import { Text } from '../common/Text';
import MotiViewExpand from '../../components/common/motiviewexpand';
import { SkeletonComponent } from '../../components/common/skeleton';
import { EmptyState } from '../../components/common/emptystateresult';
import { LottieViewComponent } from '../../components/common/lottieview';
import { StoreCardInner } from '../../components/store/storecard';
import { FreeBarberCardInner } from '../../components/freebarber/freebarbercard';
import { getErrorMessage } from '../../utils/errorHandler';
import { useLanguage } from '../../hook/useLanguage';

export const SectionHeader = ({ title, expanded, onToggle }: any) => (
    <View className="flex flex-row justify-between items-center mt-4">
        <Text className="font-century-gothic-sans-regular text-xl text-white">{title}</Text>
        <MotiViewExpand expanded={expanded} onPress={onToggle} />
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

export const StoresSection = React.memo(({ stores, loading, hasLocation, locationStatus, fetchedOnce, isList, onPressStore, onPressRatings, searchQuery, appliedFilters, error, showImageAnimation = true, onRetry }: any) => {
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(true);
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = expanded ? screenWidth * 0.92 : screenWidth * 0.94;

    // Network/Server error durumu - öncelikli göster
    if (error) {
        const errorMessage = getErrorMessage(error);

        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <LottieViewComponent
                    animationSource={require('../../../assets/animations/error.json')}
                    message={errorMessage}
                    onRetry={onRetry}
                />
            </View>
        );
    }

    // Location permission denied durumu - error animasyonu göster
    if (locationStatus === "denied") {
        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <LottieViewComponent
                    animationSource={require('../../../assets/animations/Location.json')}
                    message="Konum izni verilmedi. Lütfen ayarlardan konum iznini açın."
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
            <SectionHeader title="İşletmeler" expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            {expanded ? (
                <View style={{ paddingTop: 8 }}>
                    {stores.map((s: any) => (
                        <StoreCardInner key={s.id} store={s} isList={isList} expanded={expanded} cardWidthStore={cardWidth} onPressUpdate={onPressStore} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={stores}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <StoreCardInner store={item} isList={isList} expanded={false} cardWidthStore={cardWidth} onPressUpdate={onPressStore} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                    )}
                    contentContainerStyle={{ paddingTop: 8 }}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    nestedScrollEnabled
                    initialNumToRender={3}
                    maxToRenderPerBatch={5}
                    windowSize={7}
                    removeClippedSubviews={true}
                />
            )}
        </View>
    );
});

export const FreeBarbersSection = React.memo(({ freeBarbers, loading, hasLocation, locationStatus, fetchedOnce, isList, onPressFreeBarber, onPressRatings, searchQuery, appliedFilters, error, showImageAnimation = true, onRetry }: any) => {
    const { t } = useLanguage();
    const [expanded, setExpanded] = useState(false);
    const screenWidth = Dimensions.get('window').width;
    const cardWidth = expanded ? screenWidth * 0.92 : screenWidth * 0.94;

    // Network/Server error durumu - öncelikli göster
    if (error) {
        const errorMessage = getErrorMessage(error);

        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <LottieViewComponent
                    animationSource={require('../../../assets/animations/error.json')}
                    message={errorMessage}
                    onRetry={onRetry}
                />
            </View>
        );
    }

    // Location permission denied durumu - error animasyonu göster
    if (locationStatus === "denied") {
        return (
            <View style={{ minHeight: 200, maxHeight: 400 }}>
                <LottieViewComponent
                    animationSource={require('../../../assets/animations/Location.json')}
                    message={t('location.permissionDeniedSettings')}
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
            <SectionHeader title="Serbest Berberler" expanded={expanded} onToggle={() => setExpanded(!expanded)} />
            {expanded ? (
                <View style={{ paddingTop: 8 }}>
                    {freeBarbers.map((fb: any) => (
                        <FreeBarberCardInner key={fb.id} freeBarber={fb} isList={isList} expanded={expanded} cardWidthFreeBarber={cardWidth} onPressUpdate={onPressFreeBarber} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                    ))}
                </View>
            ) : (
                <FlatList
                    data={freeBarbers}
                    keyExtractor={(item) => (item as any).id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    renderItem={({ item }) => (
                        <FreeBarberCardInner freeBarber={item} isList={isList} expanded={false} cardWidthFreeBarber={cardWidth} onPressUpdate={onPressFreeBarber} onPressRatings={onPressRatings} showImageAnimation={showImageAnimation} />
                    )}
                    contentContainerStyle={{ paddingTop: 8 }}
                    ItemSeparatorComponent={() => <View style={{ width: 12 }} />}
                    nestedScrollEnabled
                    initialNumToRender={3}
                    maxToRenderPerBatch={5}
                    windowSize={7}
                    removeClippedSubviews={true}
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
