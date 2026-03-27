// app/components/StoreCard.tsx
import React, { useCallback } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { BarberStoreMineDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { useGetMeQuery } from '../../store/api';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { StatusBadge } from '../common/StatusBadge';
import { ServiceOfferingsList } from '../common/ServiceOfferingsList';
import { getBarberTypeLabel } from '../../utils/card-helpers';
import { useTheme } from '../../hook/useTheme';

type Props = {
    store: BarberStoreMineDto;
    isList: boolean;
    expanded: boolean;
    cardWidthStore: number;
    onPressUpdate?: (store: BarberStoreMineDto) => void;
    onPressRatings?: (storeId: string, storeName: string) => void;
    showImageAnimation?: boolean;
    panelCompare?: { selected: boolean; onPress: () => void; hidden?: boolean };
};

const StoreMineCard: React.FC<Props> = ({ store, isList, expanded, cardWidthStore, onPressUpdate, onPressRatings, showImageAnimation = true, panelCompare }) => {
    const carouselWidth = Math.max(0, cardWidthStore - 20);
    const { colors } = useTheme();
    const { data: me } = useGetMeQuery();
    const ownerUserId = me?.data?.id ?? null;

    const { isFavorite, favoriteCount, isLoading, favoriteDisabled, toggleFavorite } = useFavoriteToggle({
        targetId: store.id,
        targetType: FavoriteTargetType.Store,
        initialFavoriteCount: store.favoriteCount || 0,
        skipQuery: false,
        counterpartyUserId: ownerUserId,
    });

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(store);
    }, [onPressUpdate, store]);

    const handlePressRatings = useCallback(() => {
        onPressRatings?.(store.id, store.storeName);
    }, [onPressRatings, store.id, store.storeName]);

    return (
        <View
            style={{ width: cardWidthStore, overflow: 'hidden' }}
            className="mt-4"
        >
            <View style={{ backgroundColor: colors.cardBg }} className={` ${!isList ? "pl-4 py-2 rounded-lg" : "rounded-xl p-3"
                }`}>
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
                            height={isList ? 320 : 112}
                            autoPlay={showImageAnimation}
                            className={!isList ? 'mr-2' : ''}
                        />
                        {isList && panelCompare && !panelCompare.hidden && (
                            <TouchableOpacity
                                onPress={panelCompare.onPress}
                                className="absolute top-3 left-3 z-20"
                                hitSlop={8}
                                accessibilityRole="button"
                            >
                                <View
                                    style={{
                                        backgroundColor: panelCompare.selected ? '#ffb900' : 'rgba(15,23,42,0.78)',
                                        borderColor: '#ffb900',
                                        borderWidth: 1.5,
                                        borderRadius: 22,
                                        padding: 7,
                                    }}
                                >
                                    <Icon
                                        source={panelCompare.selected ? 'check' : 'compare-horizontal'}
                                        size={19}
                                        color={panelCompare.selected ? '#1f2937' : '#ffffff'}
                                    />
                                </View>
                            </TouchableOpacity>
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
                    </View>
                </View>
                <View className="rounded-xl pr-2  mt-4">
                    <ServiceOfferingsList
                        offerings={store.serviceOfferings || []}
                        layout="vertical"
                        previewCount={3}
                        showExpandButton={true}
                    />
                </View>
            </View>
        </View>
    );
};

export const StoreMineCardComp = React.memo(
    StoreMineCard,
    (prev, next) =>
        prev.store === next.store &&
        prev.isList === next.isList &&
        prev.expanded === next.expanded &&
        prev.cardWidthStore === next.cardWidthStore &&
        prev.showImageAnimation === next.showImageAnimation &&
        prev.panelCompare?.selected === next.panelCompare?.selected &&
        prev.panelCompare?.hidden === next.panelCompare?.hidden &&
        prev.panelCompare?.onPress === next.panelCompare?.onPress
);
