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
  const textSize = isList ? 'text-sm' : 'text-xs';

  return (
    <View className={`${config.bgColor} px-2 py-0.5 rounded-xl flex-row items-center justify-center ${className}`}>
      {config.icon && (
        <Icon
          source={config.icon}
          color="white"
          size={isList ? 14 : 12}
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
