// app/components/customer/customercard.tsx
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { Text } from '../common/Text';
import { UserFavoriteDto, FavoriteTargetType } from '../../types';
import { useFavoriteToggle } from '../../hook/useFavoriteToggle';
import { FavoriteButton } from '../common/FavoriteButton';
import { RatingSection } from '../common/RatingSection';
import { CardImage } from '../common/CardImage';
import { CardHeader } from '../common/CardHeader';
import { TypeLabel } from '../common/TypeLabel';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

type Props = {
    customer: UserFavoriteDto;
    isList: boolean;
    expanded: boolean;
    cardWidth: number;
    typeLabel?: string;
    typeLabelColor?: string;
    onPressUpdate?: (customer: UserFavoriteDto) => void;
    onPressRatings?: (targetId: string, targetName: string) => void;
};

const CustomerCard: React.FC<Props> = ({
    customer,
    isList,
    expanded,
    cardWidth,
    typeLabel,
    typeLabelColor = 'bg-purple-500',
    onPressUpdate,
    onPressRatings
}) => {
    const customerName = `${customer.firstName} ${customer.lastName}`;
    const { t } = useLanguage();
    const { colors } = useTheme();
    const { isFavorite, favoriteCount, isLoading, favoriteDisabled, toggleFavorite } = useFavoriteToggle({
        targetId: customer.id,
        targetType: FavoriteTargetType.Customer,
        initialIsFavorite: false,
        initialFavoriteCount: customer.favoriteCount || 0,
        counterpartyUserId: customer.id,
    });

    const handlePressCard = useCallback(() => {
        onPressUpdate?.(customer);
    }, [onPressUpdate, customer]);

    const handlePressRatings = useCallback(() => {
        onPressRatings?.(customer.id, customerName);
    }, [onPressRatings, customer.id, customerName]);

    return (
        <View
            className={`${!expanded ? 'mt-0' : 'mt-4'} ${!isList ? 'pl-4 py-2 rounded-lg' : 'pl-0'}`}
            style={{ width: cardWidth, overflow: 'hidden', ...(!isList ? { backgroundColor: colors.cardBg } : {}) }}
        >
            <View className={`${!isList ? 'flex flex-row ' : ''}`}>
                <View
                    className={`relative ${isList ? "mb-2" : "mr-3"}`}
                >
                    <CardImage
                        singleImageUrl={customer.imageUrl}
                        onPress={handlePressCard}
                        isList={isList}
                        width={isList ? cardWidth : 112}
                        height={isList ? 320 : 112}
                    />
                    {isList && typeLabel && (
                        <View className='absolute top-2 right-[3] z-10 gap-2 justify-end flex-row items-center'>
                            <TypeLabel label={typeLabel} color={typeLabelColor} />
                        </View>
                    )}
                </View>
                <View className={`flex-1 flex-col ${isList ? 'gap-3' : 'gap-2'}`}>
                    <View
                        className={`flex-row justify-between ${!isList ? 'items-start' : 'items-center'}`}
                    >
                        <CardHeader
                            title={customerName}
                            isList={isList}
                            icon="account"
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
                            <Text className="text-sm text-gray-500 font-century-gothic-sans-medium">{t('card.customer')}</Text>
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
                        style={{
                            // Liste (favoriler): isim/kalp ile puan/yorum arasında nefes payı — negatif margin sıkıştırıyordu
                            marginTop: isList ? 4 : -5,
                        }}
                    >
                        <RatingSection
                            rating={customer.rating || 0}
                            reviewCount={customer.reviewCount || 0}
                            onPressRatings={handlePressRatings}
                            showReviewsLink={!!onPressRatings}
                        />
                    </View>
                </View>
            </View>
        </View>
    );
};

export const CustomerCardInner = React.memo(CustomerCard, (prev, next) => {
    const sameCustomer =
        prev.customer.id === next.customer.id &&
        prev.customer.firstName === next.customer.firstName &&
        prev.customer.lastName === next.customer.lastName &&
        prev.customer.rating === next.customer.rating &&
        prev.customer.reviewCount === next.customer.reviewCount &&
        prev.customer.favoriteCount === next.customer.favoriteCount &&
        (prev.customer.isFavorited ?? false) === (next.customer.isFavorited ?? false) &&
        prev.customer.imageUrl === next.customer.imageUrl;

    const sameProps =
        prev.isList === next.isList &&
        prev.expanded === next.expanded &&
        prev.cardWidth === next.cardWidth &&
        prev.typeLabel === next.typeLabel &&
        prev.typeLabelColor === next.typeLabelColor &&
        prev.onPressUpdate === next.onPressUpdate &&
        prev.onPressRatings === next.onPressRatings;

    return sameCustomer && sameProps;
});

export default CustomerCard;
