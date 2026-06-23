// app/components/StoreCard.tsx
import React, { useCallback, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';

import { Text } from '../common/Text';
import { BarberStoreGetDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { ENTITY_NUMBER } from '../../constants/entityDisplay';
import { StatusBadge } from '../common/StatusBadge';
import { PricingInfo } from '../common/PricingInfo';
import { getBarberTypeLabel } from '../../utils/card-helpers';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { PanelImageOverflowMenu } from '../panel/PanelImageOverflowMenu';
import { CardServicesPackagesSection } from '../common/CardServicesPackagesSection';
import { Icon } from 'react-native-paper';
import { COLORS } from '../../constants/colors';

type Props = {
    store: BarberStoreGetDto;
    isList: boolean;
    expanded: boolean;
    cardWidthStore: number;
    isViewerFromFreeBr?: boolean;
    typeLabel?: string;
    typeLabelColor?: string;
    onPressUpdate?: (store: BarberStoreGetDto) => void;
    onPressAppointment?: (store: BarberStoreGetDto) => void;
    onPressRatings?: (storeId: string, storeName: string) => void;
    showImageAnimation?: boolean;
    /** Panel: karşılaştırma seçimi (sol üst) */
    panelCompare?: { selected: boolean; onPress: () => void; hidden?: boolean };
    /** Panel keşif listeleri: hizmetler aynı, üst meta (isim, puan vb.) daha küçük */
    compactMeta?: boolean;
};

const StoreCard: React.FC<Props> = ({ store, isList, expanded, cardWidthStore, isViewerFromFreeBr = false, typeLabel, typeLabelColor = 'bg-blue-500', onPressUpdate, onPressAppointment, onPressRatings, showImageAnimation = true, panelCompare, compactMeta = false }) => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
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

    const handlePressAppointment = useCallback(() => {
        if (onPressAppointment) {
            onPressAppointment(store);
            return;
        }
        handlePressCard();
    }, [onPressAppointment, store, handlePressCard]);

    const handlePressRatings = useCallback(() => {
        onPressRatings?.(store.id, store.storeName);
    }, [onPressRatings, store.id, store.storeName]);

    return (
        <View
            style={{
                width: cardWidthStore,
                marginBottom: expanded ? 12 : 4,
                marginTop: expanded ? 16 : 4,
            }}
        >
            <View
                style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    borderWidth: 1,
                    borderColor: colors.borderColor2,
                }}
            >
                <View
                    className={` ${!isList ? "pl-4 py-2 rounded-lg" : "rounded-xl px-3 pt-3 pb-4"}`}
                    style={{ backgroundColor: colors.cardBg }}
                >
                    {!isList && (
                        <View className='flex-row justify-end px-2 pb-0'>
                            <TouchableOpacity
                                onPress={handlePressAppointment}
                                activeOpacity={0.8}
                                className="rounded-full px-2 py-0.5 mr-1"
                                style={{ backgroundColor: COLORS.UI.ACCENT_GOLD }}
                            >
                                <Text className="font-century-gothic-sans-semibold text-sm" style={{ color: COLORS.UI.TEXT_ON_GOLD }}>
                                    {t("card.bookAppointment")}
                                </Text>
                            </TouchableOpacity>
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
                                    socialOwnerType={2}
                                    socialOwnerId={store.id}
                                />
                            )}
                            {isList && (
                                <View
                                    className="absolute top-2 left-2 right-2 z-10 flex-row flex-wrap justify-end items-center gap-2"
                                    pointerEvents="box-none"
                                >
                                    <TouchableOpacity
                                        onPress={handlePressAppointment}
                                        activeOpacity={0.8}
                                        className="rounded-full px-2.5 py-1 self-start max-w-full"
                                        style={{ backgroundColor: COLORS.UI.ACCENT_GOLD }}
                                    >
                                        <Text
                                            className="font-century-gothic-sans-semibold text-sm"
                                            numberOfLines={1}
                                            ellipsizeMode="tail"
                                            style={{ color: COLORS.UI.TEXT_ON_GOLD, maxWidth: 130 }}
                                        >
                                            {t("card.bookAppointment")}
                                        </Text>
                                    </TouchableOpacity>
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
                        <View
                            className={`flex-1 flex-col ${isList ? 'gap-2' : 'gap-1'}`}
                            style={{ minWidth: 0, maxWidth: '100%', marginTop: isList ? 8 : 0 }}
                        >
                            <View
                                className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'}`}
                                style={{ minWidth: 0, maxWidth: '100%' }}
                            >
                                <CardHeader
                                    title={store.storeName}
                                    isList={isList}
                                    barberType={store.type}
                                    className="flex-1"
                                    compact={compactMeta}
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
                                    <Text style={{ color: colors.textSecondary }} className="text-sm font-century-gothic-sans-medium">{getBarberTypeLabel(store.type)}</Text>
                                    <FavoriteButton
                                        isFavorite={isFavorite}
                                        favoriteCount={favoriteCount}
                                        isLoading={isLoading}
                                        favoriteDisabled={favoriteDisabled}
                                        onPress={toggleFavorite}
                                        variant="button"
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
                                    compact={compactMeta}
                                />
                            </View>
                            {store.storeNo && (
                                <View className="flex-row items-center">
                                    <Text style={{ color: colors.textSecondary, fontSize: compactMeta ? ENTITY_NUMBER.cardCompact : ENTITY_NUMBER.cardNormal, fontFamily: 'CenturyGothic' }}>
                                        {t('card.storeNo')}{': #'}{store.storeNo}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </View>
                    <CardServicesPackagesSection
                        ownerId={store.id}
                        serviceOfferings={store.serviceOfferings || []}
                        expanded={expanded}
                        className={compactMeta ? 'mt-2' : 'mt-4'}
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
            (prev.compactMeta ?? false) === (next.compactMeta ?? false) &&
            (prev.isViewerFromFreeBr ?? false) === (next.isViewerFromFreeBr ?? false) &&
            prev.isList === next.isList &&
            prev.expanded === next.expanded &&
            prev.cardWidthStore === next.cardWidthStore &&
            prev.typeLabel === next.typeLabel &&
            prev.typeLabelColor === next.typeLabelColor &&
            prev.onPressUpdate === next.onPressUpdate &&
            prev.onPressAppointment === next.onPressAppointment &&
            prev.onPressRatings === next.onPressRatings &&
            prev.showImageAnimation === next.showImageAnimation &&
            prev.panelCompare?.selected === next.panelCompare?.selected &&
            prev.panelCompare?.hidden === next.panelCompare?.hidden &&
            prev.panelCompare?.onPress === next.panelCompare?.onPress;

        return sameStore && sameProps;
    }
);
