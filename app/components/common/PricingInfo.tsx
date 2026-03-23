import React from 'react';
import { View } from 'react-native';
import { Text } from './Text';
import { useLanguage } from '../../hook/useLanguage';
import { useTheme } from '../../hook/useTheme';

interface PricingInfoProps {
  pricingType: string | number;
  pricingValue: number;
  className?: string;
}

/**
 * Reusable pricing information component for stores
 */
export const PricingInfo: React.FC<PricingInfoProps> = ({
  pricingType,
  pricingValue,
  className = '',
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const getPricingText = () => {
    // Handle both string and enum number types
    let type: string;
    if (typeof pricingType === 'string') {
      type = pricingType.toLowerCase();
    } else {
      // Enum: 0 = Percent, 1 = Rent
      type = pricingType === 0 ? 'percent' : 'rent';
    }

    if (type === 'percent') {
      return t('card.pricingPercent', { value: pricingValue });
    } else if (type === 'rent') {
      return t('card.pricingRent', { value: pricingValue });
    }
    return '';
  };

  const text = getPricingText();
  if (!text) return null;

  return (
    <View style={{ backgroundColor: colors.cardBg2 }} className={`mt-2 px-3 py-2 rounded-lg ${className}`}>
      <Text style={{ color: colors.sectionHeaderText }} className='mr-1 text-sm'>
        {text}
      </Text>
    </View>
  );
};
