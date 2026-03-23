import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { Text } from './Text';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

interface RatingSectionProps {
  rating: number;
  reviewCount: number;
  onPressRatings?: () => void;
  starSize?: number;
  showReviewsLink?: boolean;
  className?: string;
}

/**
 * Reusable rating display component with optional reviews link
 */
export const RatingSection: React.FC<RatingSectionProps> = ({
  rating,
  reviewCount,
  onPressRatings,
  starSize = 15,
  showReviewsLink = true,
  className = '',
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formattedRating = rating?.toFixed(1) || '0.0';

  return (
    <View className={`flex-row items-center gap-1 ${className}`}>
      <StarRatingDisplay
        rating={rating || 0}
        starSize={starSize}
        color="#ffb900"
        starStyle={{ marginHorizontal: 0 }}
      />
      <Text style={{ color: colors.sectionHeaderText }} className="flex-1">{formattedRating}</Text>
      {showReviewsLink && onPressRatings && (
        <TouchableOpacity
          onPress={onPressRatings}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: colors.textSecondary }} className="underline mr-1 mb-0 text-xs">
            {t('card.reviewsCount', { count: reviewCount || 0 })}
          </Text>
        </TouchableOpacity>
      )}
      {!showReviewsLink && (
        <Text style={{ color: colors.textSecondary }} className="text-xs">({reviewCount || 0})</Text>
      )}
    </View>
  );
};
