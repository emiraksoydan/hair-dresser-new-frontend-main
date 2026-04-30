import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { Text } from './Text';
import { AnimatedCountText } from './AnimatedCountText';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

interface RatingSectionProps {
  rating: number;
  reviewCount: number;
  onPressRatings?: () => void;
  starSize?: number;
  showReviewsLink?: boolean;
  className?: string;
  /** Panel kartlarında yıldız ve metin küçük */
  compact?: boolean;
}

/**
 * Reusable rating display component with optional reviews link
 */
export const RatingSection: React.FC<RatingSectionProps> = ({
  rating,
  reviewCount,
  onPressRatings,
  starSize: starSizeProp,
  showReviewsLink = true,
  className = '',
  compact = false,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();
  const formattedRating = rating?.toFixed(1) || '0.0';
  const starSize = starSizeProp ?? (compact ? 15 : 19);
  const ratingFont = compact ? 14 : 17;
  const reviewFont = compact ? 12 : 15;
  const ratingLineHeight = compact ? 18 : 22;
  const reviewLineHeight = compact ? 16 : 20;

  return (
    <View className={`flex-row items-center gap-1 ${className}`}>
      <StarRatingDisplay
        rating={rating || 0}
        starSize={starSize}
        color="#FACC15"
        starStyle={{ marginHorizontal: 0 }}
      />
      <Text style={{ color: colors.sectionHeaderText, fontSize: ratingFont, lineHeight: ratingLineHeight, fontFamily: 'CenturyGothic-Bold' }} className="flex-1">
        {formattedRating}
      </Text>
      {showReviewsLink && onPressRatings && (
        <TouchableOpacity
          onPress={onPressRatings}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={{ color: colors.textSecondary, fontSize: reviewFont, lineHeight: reviewLineHeight }} className="underline mr-1">
            {t('card.reviews')}{' '}
            (
            <AnimatedCountText
              value={reviewCount || 0}
              style={{ color: colors.textSecondary, fontSize: reviewFont, lineHeight: reviewLineHeight }}
              className="underline"
            />
            )
          </Text>
        </TouchableOpacity>
      )}
      {!showReviewsLink && (
        <Text style={{ color: colors.textSecondary, fontSize: reviewFont, lineHeight: reviewLineHeight }}>
          (
          <AnimatedCountText
            value={reviewCount || 0}
            style={{ color: colors.textSecondary, fontSize: reviewFont, lineHeight: reviewLineHeight }}
          />
          )
        </Text>
      )}
    </View>
  );
};
