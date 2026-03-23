import React from 'react';
import { View } from 'react-native';
import { IconButton } from 'react-native-paper';
import { Text } from './Text';
import { BarberType } from '../../types';
import { useTheme } from '../../hook/useTheme';

interface CardHeaderProps {
  title: string;
  isList: boolean;
  barberType?: BarberType;
  icon?: string;
  className?: string;
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
}) => {
  const { colors } = useTheme();
  const getIcon = () => {
    if (icon) return icon;
    if (barberType === BarberType.MaleHairdresser) return 'face-man';
    if (barberType === BarberType.FemaleHairdresser) return 'face-woman';
    return 'account';
  };

  return (
    <View className={`flex-row flex-1 ${isList ? 'items-center' : ''} ${className}`}>
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{ fontSize: 20, color: colors.sectionHeaderText }}
        className="font-century-gothic-sans-semibold text-xl flex-shrink"
      >
        {title}
      </Text>
      <IconButton
        iconColor={colors.textSecondary}
        size={20}
        style={{
          marginTop: 0,
          paddingRight: 5,
          paddingTop: isList ? 5 : 0,
          paddingBottom: !isList ? 10 : 0,
          flexShrink: 1,
        }}
        icon={getIcon()}
      />
    </View>
  );
};
