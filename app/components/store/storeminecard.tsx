// app/components/StoreCard.tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';

import { Text } from '../common/Text';
import { BarberStoreMineDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { useGetMeQuery } from '../../store/api';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { StatusBadge } from '../common/StatusBadge';
import { CardServicesPackagesSection } from '../common/CardServicesPackagesSection';
import { getBarberTypeLabel } from '../../utils/card-helpers';
import { useTheme } from '../../hook/useTheme';
import { PanelImageOverflowMenu } from '../panel/PanelImageOverflowMenu';

type Props = {
    store: BarberStoreMineDto;
    isList: boolean;
    expanded: boolean;
    cardWidthStore: number;
    onPressUpdate?: (store: BarberStoreMineDto) => void;
    onPressRatings?: (storeId: string, storeName: string) => void;
    showImageAnimation?: boolean;
    panelCompare?: { selected: boolean; onPress: () => void; hidden?: boolean };
    /** Profil «İşletmelerim» ekranı: başlık, rozet, puan vb. küçük; hizmet listesi aynı */
    profileCompact?: boolean;
};

const StoreMineCard: React.FC<Props> = ({ store, isList, expanded, cardWidthStore, onPressUpdate, onPressRatings, showImageAnimation = true, panelCompare, profileCompact = false }) => {
    const carouselWidth = Math.max(0, cardWidthStore - (profileCompact ? 16 : 20));
    const listImageH = profileCompact ? 296 : 320;
    const gridImageS = profileCompact ? 104 : 112;
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
            <View style={{ backgroundColor: colors.cardBg }} className={` ${!isList ? "pl-4 py-2 rounded-lg" : profileCompact ? "rounded-xl p-2.5" : "rounded-xl p-3"
                }`}>
                {!isList && (
                    <View className='flex-row justify-end px-2 pb-0'>
                        <StatusBadge
                            type={store.isOpenNow ? 'open' : 'closed'}
                            isList={false}
                            dense={profileCompact}
                        />
                    </View>
                )}
                <View className={isList ? '' : 'flex flex-row'}>
                    <View className="relative mr-2">
                        <CardImage
                            images={store.imageList}
                            onPress={handlePressCard}
                            isList={isList}
                            width={isList ? carouselWidth : gridImageS}
                            height={isList ? listImageH : gridImageS}
                            autoPlay={showImageAnimation}
                            className={!isList ? 'mr-2' : ''}
                        />
                        {isList && (
                            <PanelImageOverflowMenu
                                images={store.imageList}
                                panelCompare={panelCompare ?? undefined}
                                galleryTitle={store.storeName}
                                socialOwnerType={2}
                                socialOwnerId={store.id}
                            />
                        )}
                        {isList && (
                            <View className="absolute top-3 right-3 flex-row gap-2 z-10">
                                <StatusBadge
                                    type="barber-type"
                                    barberType={store.type}
                                    isList={true}
                                    dense={profileCompact}
                                />
                                <StatusBadge
                                    type={store.isOpenNow ? 'open' : 'closed'}
                                    isList={true}
                                    dense={profileCompact}
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
                                compact={profileCompact}
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
                                    compact={profileCompact}
                                />
                            )}
                        </View>

                        {!isList && (
                            <View
                                className="flex-row justify-between pr-2"
                                style={{ marginTop: profileCompact ? 2 : 0 }}
                            >
                                <Text style={{ color: colors.textSecondary }} className="text-sm font-century-gothic-sans-medium">{getBarberTypeLabel(store.type)}</Text>
                                <FavoriteButton
                                    isFavorite={isFavorite}
                                    favoriteCount={favoriteCount}
                                    isLoading={isLoading}
                                    favoriteDisabled={favoriteDisabled}
                                    onPress={toggleFavorite}
                                    variant="button"
                                    className="pb-1"
                                    compact={profileCompact}
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
                                compact={profileCompact}
                            />
                        </View>
                    </View>
                </View>
                <CardServicesPackagesSection
                    ownerId={store.id}
                    serviceOfferings={store.serviceOfferings || []}
                    expanded={expanded}
                    className={profileCompact ? 'mt-2' : 'mt-4'}
                />
            </View>
        </View>
    );
};

export const StoreMineCardComp = React.memo(
    StoreMineCard,
    (prev, next) => {
        const sameStore =
            prev.store.id === next.store.id &&
            prev.store.storeName === next.store.storeName &&
            prev.store.isOpenNow === next.store.isOpenNow &&
            prev.store.rating === next.store.rating &&
            prev.store.reviewCount === next.store.reviewCount &&
            prev.store.favoriteCount === next.store.favoriteCount &&
            prev.store.imageList === next.store.imageList &&
            prev.store.serviceOfferings === next.store.serviceOfferings;
        return (
            sameStore &&
            prev.isList === next.isList &&
            prev.expanded === next.expanded &&
            prev.cardWidthStore === next.cardWidthStore &&
            prev.showImageAnimation === next.showImageAnimation &&
            prev.panelCompare?.selected === next.panelCompare?.selected &&
            prev.panelCompare?.hidden === next.panelCompare?.hidden &&
            prev.panelCompare?.onPress === next.panelCompare?.onPress &&
            prev.profileCompact === next.profileCompact
        );
    }
);
