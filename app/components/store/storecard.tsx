// app/components/StoreCard.tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';

import { Text } from '../common/Text';
import { BarberStoreGetDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { StatusBadge } from '../common/StatusBadge';
import { ServiceOfferingsList } from '../common/ServiceOfferingsList';
import { PricingInfo } from '../common/PricingInfo';
import { getBarberTypeLabel } from '../../utils/card-helpers';
import { useTheme } from '../../hook/useTheme';
import { PanelImageOverflowMenu } from '../panel/PanelImageOverflowMenu';

type Props = {
    store: BarberStoreGetDto;
    isList: boolean;
    expanded: boolean;
    cardWidthStore: number;
    isViewerFromFreeBr?: boolean;
    typeLabel?: string;
    typeLabelColor?: string;
    onPressUpdate?: (store: BarberStoreGetDto) => void;
    onPressRatings?: (storeId: string, storeName: string) => void;
    showImageAnimation?: boolean;
    /** Panel: karşılaştırma seçimi (sol üst) */
    panelCompare?: { selected: boolean; onPress: () => void; hidden?: boolean };
};

const StoreCard: React.FC<Props> = ({ store, isList, expanded, cardWidthStore, isViewerFromFreeBr = false, typeLabel, typeLabelColor = 'bg-blue-500', onPressUpdate, onPressRatings, showImageAnimation = true, panelCompare }) => {
    const { colors } = useTheme();
    const carouselWidth = Math.max(0, cardWidthStore - 20);
    const { isFavorite, favoriteCount, isLoading, favoriteDisabled, toggleFavorite } = useFavoriteToggle({
        targetId: store.id,
        targetType: FavoriteTargetType.Store,
        initialIsFavorite: store.isFavorited ?? false,
        initialFavoriteCount: store.favoriteCount || 0,
        skipQuery: true, // StoreCard uses isFavorited from props
        counterpartyUserId: store.barberStoreOwnerId ?? null,
    });

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(store);
    }, [onPressUpdate, store]);

    const handlePressRatings = useCallback(() => {
        onPressRatings?.(store.id, store.storeName);
    }, [onPressRatings, store.id, store.storeName]);

    return (
        <View
            style={{ width: cardWidthStore, borderRadius: 12 }}
            className="mt-4"
        >
            <View
                className={` ${!isList ? "pl-4 py-2 rounded-lg" : "rounded-xl p-3"}`}
                style={{ backgroundColor: colors.cardBg }}
            >
                {!isList && (
                    <View className='flex-row justify-end px-2 pb-0'>
                        <StatusBadge
                            type={store.isOpenNow ? 'open' : 'closed'}
                            isList={false}
                        />
                    </View>
                )}
                <View className={isList ? '' : 'flex flex-row'}>
                    <View className="relative mr-2">
                        <CardImage
                            images={store.imageList}
                            onPress={handlePressCard}
                            isList={isList}
                            width={isList ? carouselWidth : 112}
                            height={isList ? 250 : 112}
                            autoPlay={showImageAnimation}
                        />
                        {isList && (
                            <PanelImageOverflowMenu
                                images={store.imageList}
                                panelCompare={panelCompare ?? undefined}
                                galleryTitle={store.storeName}
                            />
                        )}
                        {isList && (
                            <View className="absolute top-3 right-3 flex-row gap-2 z-10">
                                <StatusBadge
                                    type="barber-type"
                                    barberType={store.type}
                                    isList={true}
                                />
                                <StatusBadge
                                    type={store.isOpenNow ? 'open' : 'closed'}
                                    isList={true}
                                />
                            </View>
                        )}
                    </View>
                    <View className="flex-1 flex-col gap-2" style={{ minWidth: 0, maxWidth: '100%' }}>
                        <View
                            className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'}`}
                            style={{ minWidth: 0, maxWidth: '100%' }}
                        >
                            <CardHeader
                                title={store.storeName}
                                isList={isList}
                                barberType={store.type}
                                className="flex-1"
                            />
                            {isList && (
                                <FavoriteButton
                                    isFavorite={isFavorite}
                                    favoriteCount={favoriteCount}
                                    isLoading={isLoading}
                                    favoriteDisabled={favoriteDisabled}
                                    onPress={toggleFavorite}
                                    variant="icon"
                                    className="pb-2"
                                />
                            )}
                        </View>

                        {!isList && (
                            <View className="flex-row justify-between pr-2">
                                <Text style={{ color: colors.textSecondary }} className='text-base'>{getBarberTypeLabel(store.type)}</Text>
                                <FavoriteButton
                                    isFavorite={isFavorite}
                                    favoriteCount={favoriteCount}
                                    isLoading={isLoading}
                                    favoriteDisabled={favoriteDisabled}
                                    onPress={toggleFavorite}
                                    variant="button"
                                    className="pb-1"
                                />
                            </View>
                        )}
                        <View
                            className="flex-row justify-between items-center"
                            style={{ minWidth: 0, maxWidth: '100%' }}
                        >
                            <RatingSection
                                rating={store.rating}
                                reviewCount={store.reviewCount}
                                onPressRatings={handlePressRatings}
                                className="flex-1"
                            />
                        </View>
                        {store.storeNo && (
                            <View className="flex-row items-center mt-1">
                                <Text style={{ color: colors.textSecondary, fontSize: 11, fontFamily: 'CenturyGothic' }}>
                                    {'#'}{store.storeNo}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
                <View className="rounded-xl pr-2  mt-4">
                    <ServiceOfferingsList
                        offerings={store.serviceOfferings || []}
                        layout="vertical"
                        previewCount={3}
                        showExpandButton={true}
                    />
                    {isViewerFromFreeBr && (
                        <PricingInfo

                            pricingType={store.pricingType}
                            pricingValue={store.pricingValue}
                        />
                    )}
                </View>
            </View>
        </View>
    );
};

export const StoreCardInner = React.memo(
    StoreCard,
    (prev, next) => {
        const sameStore =
            prev.store.id === next.store.id &&
            prev.store.storeName === next.store.storeName &&
            prev.store.type === next.store.type &&
            prev.store.isOpenNow === next.store.isOpenNow &&
            prev.store.rating === next.store.rating &&
            prev.store.reviewCount === next.store.reviewCount &&
            prev.store.favoriteCount === next.store.favoriteCount &&
            (prev.store.isFavorited ?? false) === (next.store.isFavorited ?? false) &&
            prev.store.imageList === next.store.imageList &&
            prev.store.serviceOfferings === next.store.serviceOfferings &&
            prev.store.pricingType === next.store.pricingType &&
            prev.store.pricingValue === next.store.pricingValue;

        const sameProps =
            (prev.isViewerFromFreeBr ?? false) === (next.isViewerFromFreeBr ?? false) &&
            prev.isList === next.isList &&
            prev.expanded === next.expanded &&
            prev.cardWidthStore === next.cardWidthStore &&
            prev.typeLabel === next.typeLabel &&
            prev.typeLabelColor === next.typeLabelColor &&
            prev.onPressUpdate === next.onPressUpdate &&
            prev.onPressRatings === next.onPressRatings &&
            prev.showImageAnimation === next.showImageAnimation &&
            prev.panelCompare?.selected === next.panelCompare?.selected &&
            prev.panelCompare?.hidden === next.panelCompare?.hidden &&
            prev.panelCompare?.onPress === next.panelCompare?.onPress;

        return sameStore && sameProps;
    }
);
