import { Icon } from "react-native-paper";
import React from 'react';
import { View } from 'react-native';

import { Text } from './Text';
import { BarberType } from '../../types';
import { useLanguage } from '../../hook/useLanguage';

interface StatusBadgeProps {
  type: 'open' | 'closed' | 'available' | 'busy' | 'barber-type';
  barberType?: BarberType;
  /** true → büyük (panel büyük foto modu), false → küçük (grid / favoriler) */
  isList?: boolean;
  className?: string;
  /** Geriye dönük uyumluluk için tutuldu, boyutu etkilemez */
  compact?: boolean;
  /** Geriye dönük uyumluluk için tutuldu, boyutu etkilemez */
  dense?: boolean;
}

/**
 * Reusable status badge component
 * isList=true  → panel büyük foto: text-sm, ikon 16, px-2.5 py-1 (çipler hizalı)
 * isList=false → grid / küçük kart: text-sm, ikon 14, px-2 py-0.5
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
        return { bgColor: 'bg-green-600', text: t('status.open'), icon: null };
      case 'closed':
        return { bgColor: 'bg-red-600', text: t('status.closed'), icon: null };
      case 'available':
        return { bgColor: 'bg-green-600', text: t('status.available'), icon: null };
      case 'busy':
        return { bgColor: 'bg-red-600', text: t('status.busy'), icon: null };
      case 'barber-type':
        if (barberType === BarberType.MaleHairdresser)
          return { bgColor: 'bg-blue-500', text: t('barberType.maleHairdresser'), icon: 'face-man' as const };
        if (barberType === BarberType.FemaleHairdresser)
          return { bgColor: 'bg-pink-500', text: t('barberType.femaleHairdresser'), icon: 'face-woman' as const };
        if (barberType === BarberType.BeautySalon)
          return { bgColor: 'bg-green-500', text: t('barberType.beautySalon'), icon: 'store' as const };
        return { bgColor: 'bg-gray-500', text: '', icon: null };
      default:
        return { bgColor: 'bg-gray-500', text: '', icon: null };
    }
  };

  const config = getBadgeConfig();
  const pad = isList ? 'px-2.5 py-1' : 'px-2 py-0.5';
  const textSize = 'text-sm';
  const iconSize = isList ? 16 : 14;

  return (
    <View className={`${config.bgColor} ${pad} rounded-xl flex-row items-center justify-center ${className}`}>
      {config.icon && <Icon source={config.icon} color="white" size={iconSize} />}
      {config.text && (
        <Text className={`text-white font-century-gothic-sans-medium ${textSize} ${config.icon ? 'ml-0.5' : ''}`}>
          {config.text}
        </Text>
      )}
    </View>
  );
};
