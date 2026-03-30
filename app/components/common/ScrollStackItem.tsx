import React, { ReactNode } from "react";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  /** Row index in the list. */
  index: number;
  /** Normalized scroll: contentOffset / itemStride */
  scroll: SharedValue<number>;
  /**
   * Vanish mode: items shrink + fade out as they scroll past the top of the screen
   * (like the Perplexity / social-feed style where consumed items disappear upward).
   */
  vanish?: boolean;
  children: ReactNode;
};

/**
 * Scroll-linked scale + opacity for list rows.
 *
 * Default mode: subtle focus-scale (center row slightly larger, neighbours softer).
 * Vanish mode:  items fade & shrink as they scroll off the top.
 *
 * Expects a normalized scroll value: contentOffset / itemStride.
 */
export function ScrollStackItem({
  index,
  scroll,
  vanish = false,
  children,
}: Props) {
  const style = useAnimatedStyle(() => {
    "worklet";
    const s = scroll.value;

    if (vanish) {
      const scale = interpolate(
        s,
        [-1, 0, index, index + 2],
        [1, 1, 1, 0],
        Extrapolation.CLAMP,
      );
      const opacity = interpolate(
        s,
        [-1, 0, index, index + 0.5],
        [1, 1, 1, 0],
        Extrapolation.CLAMP,
      );
      return { opacity, transform: [{ scale }] };
    }

    const opacity = interpolate(
      s,
      [index - 1, index, index + 1],
      [0.3, 1, 0.3],
      Extrapolation.CLAMP,
    );
    const scale = interpolate(
      s,
      [index - 1, index, index + 1],
      [0.92, 1, 0.92],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ scale }] };
  }, [index, vanish]);

  return <Animated.View style={style}>{children}</Animated.View>;
}
