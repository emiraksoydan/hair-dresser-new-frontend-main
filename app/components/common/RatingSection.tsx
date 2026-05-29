import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { StarRatingDisplay } from 'react-native-star-rating-widget';
import { Text } from './Text';
import { AnimatedCountText } from './AnimatedCountText';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';
import { getStarRatingScoreColor, getStarRatingWidgetProps } from '../../constants/colors';
import { ThemedStarIcon } from './ThemedStarIcon';

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
  const { colors, isDark } = useTheme();
  const starProps = getStarRatingWidgetProps(isDark);
  const scoreColor = getStarRatingScoreColor(isDark);
  const formattedRating = rating?.toFixed(1) || '0.0';
  const starSize = starSizeProp ?? (compact ? 18 : 22);
  const ratingFont = compact ? 16 : 19;
  const reviewFont = compact ? 13 : 16;
  const ratingLineHeight = compact ? 20 : 24;
  const reviewLineHeight = compact ? 18 : 22;

  return (
    <View className={`flex-row items-center gap-1 ${className}`}>
      <StarRatingDisplay
        rating={rating || 0}
        starSize={starSize}
        color={starProps.color}
        emptyColor={starProps.emptyColor}
        StarIconComponent={ThemedStarIcon}
        starStyle={{ marginHorizontal: 0 }}
      />
      <Text style={{ color: scoreColor, fontSize: ratingFont, lineHeight: ratingLineHeight, fontFamily: 'CenturyGothic-Bold' }} className="flex-1">
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
