import React from 'react';
import { View } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from './Text';
import { BarberType } from '../../types';
import { useTheme } from '../../hook/useTheme';

interface CardHeaderProps {
  title: string;
  isList: boolean;
  barberType?: BarberType;
  icon?: string;
  className?: string;
  /** Panel listelerinde başlık ve ikon biraz küçük */
  compact?: boolean;
  /** false: yan yana aksiyon (chip) için flex-1 kullanma; başlık doğal genişlikte kalır */
  fillRow?: boolean;
}

/**
 * Reusable card header component with title and icon
 */
export const CardHeader: React.FC<CardHeaderProps> = ({
  title,
  isList,
  barberType,
  icon,
  className = '',
  compact = false,
  fillRow = true,
}) => {
  const { colors } = useTheme();
  const titleSize = compact ? 19 : 23;
  const iconSize = compact ? 18 : 22;
  const titleLineHeight = compact ? 24 : 28;
  const getIcon = () => {
    if (icon) return icon;
    if (barberType === BarberType.MaleHairdresser) return 'face-man';
    if (barberType === BarberType.FemaleHairdresser) return 'face-woman';
    return 'account';
  };

  return (
    <View className={`flex-row ${fillRow ? 'flex-1' : ''} ${isList ? 'items-center' : ''} ${className}`}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ fontSize: titleSize, lineHeight: titleLineHeight, color: colors.sectionHeaderText }}
        className="font-century-gothic-sans-semibold flex-shrink"
      >
        {title}
      </Text>
      <View style={{ marginLeft: 4, paddingTop: compact ? 2 : 3 }}>
        <Icon source={getIcon()} size={iconSize} color={colors.textSecondary} />
      </View>
    </View>
  );
};
