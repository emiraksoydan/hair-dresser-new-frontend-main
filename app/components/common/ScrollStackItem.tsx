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
  /**
   * Vanish mode: items shrink + fade out as they scroll past the top of the screen
   * (like the Perplexity / social-feed style where consumed items disappear upward).
   */
  vanish?: boolean;
  children: ReactNode;
};

/**
 * Scroll-linked scale + opacity (+ slight tilt on vertical axis) for list rows.
 *
 * Default mode: subtle focus-scale (center row slightly larger, neighbours softer).
 * Vanish mode:  items fade & shrink as they scroll off the top, giving a
 *               "consume and disappear" feed feel.
 *
 * @see https://www.animatereactnative.com — card stack / focus list patterns
 */
export function ScrollStackItem({
  index = 0,
  scroll,
  itemStride,
  scrollAnchor,
  bandLength,
  horizontal,
  vanish = false,
  children,
}: Props) {
  const style = useAnimatedStyle(() => {
    "worklet";
    const s = scroll.value;
    const L = Math.max(bandLength ?? itemStride, 1);
    const start = scrollAnchor !== undefined ? scrollAnchor : index * L;

    if (vanish) {
      // Vanish mode: item is full-size while in viewport, then shrinks + fades
      // as it scrolls past the top edge (s > start).
      //
      // scale inputRange : [-1,  0,  start,       start + L * 2]
      // scale outputRange: [ 1,  1,   1,             0          ]
      //
      // opacity is faster: fades out by start + L * 0.5
      const scaleInputRange = [-1, 0, start, start + L * 2];
      const scaleOutputRange = [1, 1, 1, 0];

      const opacityInputRange = [-1, 0, start, start + L * 0.5];
      const opacityOutputRange = [1, 1, 1, 0];

      const scale = interpolate(s, scaleInputRange, scaleOutputRange, Extrapolation.CLAMP);
      const opacity = interpolate(s, opacityInputRange, opacityOutputRange, Extrapolation.CLAMP);

      return { opacity, transform: [{ scale }] };
    }

    // Default subtle-stack mode
    const inputRange = [start - L, start, start + L];
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
  }, [index, itemStride, scrollAnchor, bandLength, horizontal, vanish]);

  return <Animated.View style={style}>{children}</Animated.View>;
}
