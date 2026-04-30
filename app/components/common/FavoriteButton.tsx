import { Icon } from "react-native-paper";
import React, { useCallback } from "react";
import { Pressable, View } from "react-native";

import Animated from "react-native-reanimated";
import { AnimatedCountText } from "./AnimatedCountText";
import { Text } from "./Text";
import { useTheme } from "../../hook/useTheme";
import { useFavoriteHeartPulse } from "./useFavoriteHeartPulse";
import { useLanguage } from "../../hook/useLanguage";

interface FavoriteButtonProps {
  isFavorite: boolean;
  favoriteCount: number;
  isLoading: boolean;
  onPress: () => void;
  variant?: "icon" | "button";
  size?: number;
  showCount?: boolean;
  className?: string;
  /** Engelli kullanıcı vb. */
  favoriteDisabled?: boolean;
  /** Profil kartları: kalp ve sayı biraz küçük */
  compact?: boolean;
}

/**
 * Favori butonu — kalp animasyonu useFavoriteHeartPulse ile; button varyantında tüm satır tıklanabilir.
 */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  favoriteCount,
  isLoading,
  onPress,
  variant = "icon",
  size,
  showCount = true,
  className = "",
  favoriteDisabled = false,
  compact = false,
}) => {
  const heartSize = size ?? (compact ? 22 : 25);
  const countFontSize = compact ? 13 : 14;
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { animatedStyle, bump } = useFavoriteHeartPulse();

  const disabled = isLoading || favoriteDisabled;

  const accessibilityLabel = isFavorite
    ? t("appointment.actions.removeFromFavorites")
    : t("appointment.actions.addToFavorites");

  const handleRowPress = useCallback(() => {
    if (disabled) return;
    bump(!isFavorite);
    onPress();
  }, [bump, disabled, onPress, isFavorite]);

  const heartIcon = (
    <Animated.View style={animatedStyle}>
      <Icon
        source={isFavorite ? "heart" : "heart-outline"}
        size={heartSize}
        color={isFavorite ? "#ef4444" : colors.textSecondary}
      />
    </Animated.View>
  );

  if (variant === "icon") {
    return (
      <Pressable
        onPress={handleRowPress}
        disabled={disabled}
        style={{ opacity: favoriteDisabled ? 0.45 : 1 }}
        className="flex-row items-center"
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled, selected: isFavorite }}
      >
        <View className="px-1" pointerEvents="none">
          {heartIcon}
        </View>
        {showCount && (
          <Text
            style={{ color: colors.sectionHeaderText, fontSize: countFontSize }}
            className={`font-century-gothic-sans-regular ${className}`}
          >
            (
            <AnimatedCountText
              value={favoriteCount}
              style={{ color: colors.sectionHeaderText, fontSize: countFontSize }}
              className={`font-century-gothic-sans-regular ${className}`}
            />
            )
          </Text>
        )}
      </Pressable>
    );
  }

  return (
    <Pressable
      onPress={handleRowPress}
      disabled={disabled}
      style={{ opacity: favoriteDisabled ? 0.45 : 1 }}
      className="flex-row items-center gap-1"
      hitSlop={4}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled, selected: isFavorite }}
    >
      <View pointerEvents="none">{heartIcon}</View>
      {showCount && (
        <Text
          style={{ color: colors.sectionHeaderText, fontSize: countFontSize }}
          className={`font-century-gothic-sans-regular ${className}`}
        >
          (
          <AnimatedCountText
            value={favoriteCount}
            style={{ color: colors.sectionHeaderText, fontSize: countFontSize }}
            className={`font-century-gothic-sans-regular ${className}`}
          />
          )
        </Text>
      )}
    </Pressable>
  );
};
