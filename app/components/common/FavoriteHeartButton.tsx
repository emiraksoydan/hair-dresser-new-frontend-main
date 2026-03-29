import { Icon } from "react-native-paper";
import React, { useCallback } from "react";
import { Pressable, StyleProp, ViewStyle } from "react-native";

import Animated from "react-native-reanimated";
import { useLanguage } from "../../hook/useLanguage";
import { useFavoriteHeartPulse } from "./useFavoriteHeartPulse";

type FavoriteHeartButtonProps = {
  active: boolean;
  onPress: () => void;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  size?: number;
  activeColor?: string;
  inactiveColor?: string;
  accessibilityLabel?: string;
};

export const FavoriteHeartButton: React.FC<FavoriteHeartButtonProps> = ({
  active,
  onPress,
  disabled,
  style,
  size = 20,
  activeColor = "#ef4444",
  inactiveColor = "#6b7280",
  accessibilityLabel: accessibilityLabelProp,
}) => {
  const { t } = useLanguage();
  const { animatedStyle, bump } = useFavoriteHeartPulse();

  const accessibilityLabel =
    accessibilityLabelProp ??
    (active ? t("appointment.actions.removeFromFavorites") : t("appointment.actions.addToFavorites"));

  const handlePress = useCallback(() => {
    if (disabled) return;
    bump();
    onPress();
  }, [bump, disabled, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      disabled={disabled}
      style={style}
      hitSlop={8}
      accessible
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled, selected: active }}
    >
      <Animated.View style={animatedStyle} importantForAccessibility="no-hide-descendants">
        <Icon source={active ? "heart" : "heart-outline"} size={size} color={active ? activeColor : inactiveColor} />
      </Animated.View>
    </Pressable>
  );
};
