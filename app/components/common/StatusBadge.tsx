import { Icon } from "react-native-paper";
import React from 'react';
import { View } from 'react-native';

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
  /** Profil panel / işletmelerim kartı: liste modunda chip bir kademe daha küçük */
  dense?: boolean;
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
  dense = false,
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
            text: t('barberType.maleHairdresser'),
            icon: 'face-man' as const,
          };
        } else if (barberType === BarberType.FemaleHairdresser) {
          return {
            bgColor: 'bg-pink-500',
            text: t('barberType.femaleHairdresser'),
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
  const denseList = dense && isList;
  const textSize = compact ? 'text-sm' : denseList ? 'text-xs' : isList ? 'text-sm' : 'text-xs';
  const iconSize = compact ? 14 : denseList ? 12 : isList ? 14 : 12;
  const chipPad = compact ? 'px-2.5 py-1' : denseList ? 'px-1.5 py-0.5' : 'px-2 py-0.5';

  /** Sadece compact: dar alan; liste/panel kartlarında metin kısaltılmaz, satır kırılır */
  const limitHeight = compact;

  const widthClass = compact ? 'max-w-[48%]' : '';

  return (
    <View
      className={`${config.bgColor} ${chipPad} rounded-xl flex-row items-center justify-center ${widthClass} ${className}`}
      style={limitHeight ? { maxHeight: 30, overflow: 'hidden' } : undefined}
    >
      {config.icon && (
        <Icon
          source={config.icon}
          color="white"
          size={iconSize}
        />
      )}
      {config.text && (
        <Text
          numberOfLines={limitHeight ? 1 : undefined}
          ellipsizeMode={limitHeight ? 'tail' : undefined}
          className={`text-white font-century-gothic-sans-medium ${textSize} ${config.icon ? 'ml-0.5' : ''}`}
        >
          {config.text}
        </Text>
      )}
    </View>
  );
};
