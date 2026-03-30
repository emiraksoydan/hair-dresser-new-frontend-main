import React, { ReactNode } from "react";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  /** Normalized scroll position: contentOffset / itemStride */
  scrollPos: SharedValue<number>;
  /** Normalized index of this item in the list (can be fractional for heterogeneous lists). */
  index: number;
  horizontal?: boolean;
  children: ReactNode;
};

export function PerplexityListItem({
  scrollPos,
  index,
  children,
}: Props) {
  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const opacity = interpolate(
      scrollPos.value,
      [index - 1, index, index + 1],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      scrollPos.value,
      [index - 1, index, index + 1],
      [0.92, 1, 0.92],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  }, [index]);

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
