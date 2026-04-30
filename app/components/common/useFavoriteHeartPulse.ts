import { useCallback } from "react";
import {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from "react-native-reanimated";

/**
 * Favori kalp micro-interaction:
 * - Ekleme: kısa wobble (rotate) + hafif “pop” (scale overshoot).
 * - Kaldırma: küçük çökme + hafif rebound (daha sakin, silme hissi).
 */
export function useFavoriteHeartPulse() {
  const scale = useSharedValue(1);
  const rotateDeg = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }, { rotate: `${rotateDeg.value}deg` }],
  }));

  const bump = useCallback(
    (adding: boolean) => {
      if (adding) {
        rotateDeg.value = withSequence(
          withTiming(-14, { duration: 65, easing: Easing.out(Easing.quad) }),
          withTiming(11, { duration: 75, easing: Easing.inOut(Easing.quad) }),
          withTiming(-4, { duration: 55, easing: Easing.inOut(Easing.quad) }),
          withTiming(0, { duration: 70, easing: Easing.out(Easing.quad) }),
        );
        scale.value = withSequence(
          withTiming(1.38, { duration: 95, easing: Easing.out(Easing.back(1.12)) }),
          withTiming(0.92, { duration: 85, easing: Easing.inOut(Easing.cubic) }),
          withTiming(1.04, { duration: 110, easing: Easing.out(Easing.quad) }),
          withTiming(1, { duration: 90, easing: Easing.out(Easing.quad) }),
        );
      } else {
        rotateDeg.value = withTiming(0, { duration: 140 });
        scale.value = withSequence(
          withTiming(0.78, { duration: 95, easing: Easing.in(Easing.cubic) }),
          withTiming(1.05, { duration: 130, easing: Easing.out(Easing.back(1.04)) }),
          withTiming(1, { duration: 100, easing: Easing.out(Easing.quad) }),
        );
      }
    },
    [scale, rotateDeg],
  );

  return { animatedStyle, bump };
}
