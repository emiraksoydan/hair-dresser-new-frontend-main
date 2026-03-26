import React, { useCallback } from "react";
import { Pressable, View } from "react-native";
import { Icon } from "react-native-paper";
import Animated from "react-native-reanimated";
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
}

/**
 * Favori butonu — kalp animasyonu useFavoriteHeartPulse ile; button varyantında tüm satır tıklanabilir.
 */
/**
 * Kendi panel / kendi işletme kartı: sayı alınan toplam favori, kalp ise "ben favoriledim mi" — karışıklığı önlemek için sadece istatistik (tıklanamaz).
 */
export const FavoriteReceivedStat: React.FC<{
  count: number;
  className?: string;
  variant?: "icon" | "button";
  size?: number;
}> = ({ count, className = "", variant = "icon", size = 25 }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const label = t("panel.favoritesReceived", { count });
  return (
    <View
      className={`flex-row items-center ${variant === "icon" ? "" : "gap-1"} ${className}`}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View className={variant === "icon" ? "px-1" : ""} pointerEvents="none">
        <Icon
          source="heart-outline"
          size={size}
          color={colors.textSecondary}
        />
      </View>
      <Text
        style={{ color: colors.sectionHeaderText }}
        className="font-century-gothic-sans-regular text-xs"
      >
        ({count})
      </Text>
    </View>
  );
};

export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  favoriteCount,
  isLoading,
  onPress,
  variant = "icon",
  size = 25,
  showCount = true,
  className = "",
  favoriteDisabled = false,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { animatedStyle, bump } = useFavoriteHeartPulse();

  const disabled = isLoading || favoriteDisabled;

  const accessibilityLabel = isFavorite
    ? t("appointment.actions.removeFromFavorites")
    : t("appointment.actions.addToFavorites");

  const handleRowPress = useCallback(() => {
    if (disabled) return;
    bump();
    onPress();
  }, [bump, disabled, onPress]);

  const heartIcon = (
    <Animated.View style={animatedStyle}>
      <Icon
        source={isFavorite ? "heart" : "heart-outline"}
        size={size}
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
            style={{ color: colors.sectionHeaderText }}
            className={`font-century-gothic-sans-regular text-xs ${className}`}
          >
            ({favoriteCount})
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
          style={{ color: colors.sectionHeaderText }}
          className={`font-century-gothic-sans-regular text-xs ${className}`}
        >
          ({favoriteCount})
        </Text>
      )}
    </Pressable>
  );
};
