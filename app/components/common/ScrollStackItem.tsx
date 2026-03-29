import React, { ReactNode } from "react";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  /** Row index when `scrollAnchor` is not used (homogeneous list). */
  index?: number;
  /** Vertical: scroll Y; horizontal: scroll X */
  scroll: SharedValue<number>;
  /** Item stride (width or height) for interpolation bands — match list estimated row size. */
  itemStride: number;
  /** When set (e.g. from measured list layout), interpolation centers on this offset instead of `index * stride`. */
  scrollAnchor?: number;
  /** Band length for interpolation; defaults to `itemStride`. */
  bandLength?: number;
  horizontal?: boolean;
  children: ReactNode;
};

/**
 * Scroll-linked scale + opacity (+ slight tilt on vertical axis) for list rows.
 * @see https://www.animatereactnative.com — card stack / focus list patterns
 */
export function ScrollStackItem({
  index = 0,
  scroll,
  itemStride,
  scrollAnchor,
  bandLength,
  horizontal,
  children,
}: Props) {
  const style = useAnimatedStyle(() => {
    "worklet";
    const s = scroll.value;
    const L = Math.max(bandLength ?? itemStride, 1);
    const start = scrollAnchor !== undefined ? scrollAnchor : index * L;
    const inputRange = [start - L, start, start + L];
    // Slightly subtle stack: focus row at 1.0, neighbors softer (reference-style card rail)
    const scale = interpolate(s, inputRange, [0.965, 1, 0.965], Extrapolation.CLAMP);
    const opacity = interpolate(s, inputRange, [0.8, 1, 0.8], Extrapolation.CLAMP);
    if (horizontal) {
      const rotY = interpolate(s, inputRange, [5.5, 0, -5.5], Extrapolation.CLAMP);
      return {
        opacity,
        transform: [{ perspective: 960 }, { rotateY: `${rotY}deg` }, { scale }],
      };
    }
    const rotX = interpolate(s, inputRange, [5, 0, -5], Extrapolation.CLAMP);
    return {
      opacity,
      transform: [{ perspective: 1000 }, { rotateX: `${rotX}deg` }, { scale }],
    };
  });

  return <Animated.View style={style}>{children}</Animated.View>;
}
