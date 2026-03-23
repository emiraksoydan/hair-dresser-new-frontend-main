import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon, IconButton } from 'react-native-paper';
import { Text } from './Text';
import { useTheme } from '../../hook/useTheme';

interface FavoriteButtonProps {
  isFavorite: boolean;
  favoriteCount: number;
  isLoading: boolean;
  onPress: () => void;
  variant?: 'icon' | 'button';
  size?: number;
  showCount?: boolean;
  className?: string;
}

/**
 * Reusable favorite button component
 * Supports both icon-only and button variants
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  favoriteCount,
  isLoading,
  onPress,
  variant = 'icon',
  size = 25,
  showCount = true,
  className = '',
}) => {
  const { colors } = useTheme();
  if (variant === 'icon') {
    return (
      <View className="flex-row items-center">
        <IconButton
          size={size}
          iconColor={isFavorite ? "red" : "gray"}
          icon={isFavorite ? "heart" : "heart-outline"}
          onPress={onPress}
          disabled={isLoading}
        />
        {showCount && (
          <Text style={{ color: colors.sectionHeaderText }} className={`font-century-gothic-sans-regular text-xs ${className}`}>
            ({favoriteCount})
          </Text>
        )}
      </View>
    );
  }

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isLoading}
      className="flex-row items-center gap-1"
    >
      <Icon
        size={size}
        color={isFavorite ? "red" : colors.textSecondary}
        source={isFavorite ? "heart" : "heart-outline"}
      />
      {showCount && (
        <Text style={{ color: colors.sectionHeaderText }} className={`font-century-gothic-sans-regular text-xs ${className}`}>
          ({favoriteCount})
        </Text>
      )}
    </TouchableOpacity>
  );
};
