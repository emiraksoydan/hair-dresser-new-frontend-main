import { useCallback } from "react";
import { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";

const POP = { damping: 12, stiffness: 420, mass: 0.28 } as const;
const SETTLE = { damping: 16, stiffness: 520, mass: 0.3 } as const;

export function useFavoriteHeartPulse() {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const bump = useCallback(() => {
    scale.value = withSpring(1.3, POP, (finished) => {
      if (finished) {
        scale.value = withSpring(1, SETTLE);
      }
    });
  }, [scale]);

  return { animatedStyle, bump };
}
