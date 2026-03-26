import React from 'react';
import { View } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from './Text';
import { BarberType } from '../../types';
import { useLanguage } from '../../hook/useLanguage';

interface StatusBadgeProps {
  type: 'open' | 'closed' | 'available' | 'busy' | 'barber-type';
  barberType?: BarberType;
  isList?: boolean;
  className?: string;
  /** Küçük chip satırları (favori kartı foto üstü vb.) */
  compact?: boolean;
}

/**
 * Reusable status badge component
 * Supports store open/closed, free barber available/busy, and barber type badges
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  barberType,
  isList = false,
  className = '',
  compact = false,
}) => {
  const { t } = useLanguage();

  const getBadgeConfig = () => {
    switch (type) {
      case 'open':
        return {
          bgColor: 'bg-green-600',
          text: t('status.open'),
          icon: null,
        };
      case 'closed':
        return {
          bgColor: 'bg-red-600',
          text: t('status.closed'),
          icon: null,
        };
      case 'available':
        return {
          bgColor: 'bg-green-600',
          text: t('status.available'),
          icon: null,
        };
      case 'busy':
        return {
          bgColor: 'bg-red-600',
          text: t('status.busy'),
          icon: null,
        };
      case 'barber-type':
        if (barberType === BarberType.MaleHairdresser) {
          return {
            bgColor: 'bg-blue-500',
            text: isList ? t('barberType.maleHairdresser') : t('barberType.maleHairdresserShort'),
            icon: 'face-man' as const,
          };
        } else if (barberType === BarberType.FemaleHairdresser) {
          return {
            bgColor: 'bg-pink-500',
            text: isList ? t('barberType.femaleHairdresser') : t('barberType.femaleHairdresserShort'),
            icon: 'face-woman' as const,
          };
        } else if (barberType === BarberType.BeautySalon) {
          return {
            bgColor: 'bg-green-500',
            text: t('barberType.beautySalon'),
            icon: 'store' as const,
          };
        }
        return {
          bgColor: 'bg-gray-500',
          text: '',
          icon: null,
        };
      default:
        return {
          bgColor: 'bg-gray-500',
          text: '',
          icon: null,
        };
    }
  };

  const config = getBadgeConfig();
  const textSize = compact ? 'text-sm' : isList ? 'text-sm' : 'text-xs';
  const iconSize = compact ? 14 : isList ? 14 : 12;
  const chipPad = compact ? 'px-2.5 py-1' : 'px-2 py-0.5';

  return (
    <View className={`${config.bgColor} ${chipPad} rounded-xl flex-row items-center justify-center max-w-[48%] ${className}`}>
      {config.icon && (
        <Icon
          source={config.icon}
          color="white"
          size={iconSize}
        />
      )}
      {config.text && (
        <Text className={`text-white font-century-gothic-sans-medium ${textSize} ${config.icon ? 'ml-0.5' : ''}`}>
          {config.text}
        </Text>
      )}
    </View>
  );
};
