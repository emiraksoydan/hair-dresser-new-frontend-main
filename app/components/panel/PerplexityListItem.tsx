import React, { ReactNode } from "react";
import Animated, {
  Extrapolation,
  SharedValue,
  interpolate,
  useAnimatedStyle,
} from "react-native-reanimated";

type Props = {
  scrollPos: SharedValue<number>;
  /** Scroll offset where this item starts (left for horizontal, top for vertical). */
  itemStart: number;
  /** Width or height of the item along the scroll axis (used for interpolation band). */
  itemLength: number;
  /** Row is in a horizontal carousel (translateX instead of translateY). */
  horizontal?: boolean;
  children: ReactNode;
};

/**
 * Perplexity-style list item: scale + opacity + slight axis shift vs scroll.
 * @see https://www.animatereactnative.com/post/perplexity-vertical-list-animation-reanimated
 */
export function PerplexityListItem({
  scrollPos,
  itemStart,
  itemLength,
  horizontal = false,
  children,
}: Props) {
  const animatedStyle = useAnimatedStyle(() => {
    "worklet";
    const p = scrollPos.value;
    const start = itemStart;
    const L = Math.max(itemLength, 1);
    const inputRange = [start - L, start, start + L];
    const scale = interpolate(
      p,
      inputRange,
      [0.86, 1, 0.86],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      p,
      inputRange,
      [0.42, 1, 0.42],
      Extrapolation.CLAMP,
    );
    const shift = interpolate(
      p,
      inputRange,
      horizontal ? [10, 0, -10] : [12, 0, -12],
      Extrapolation.CLAMP,
    );
    return {
      opacity,
      transform: horizontal
        ? [{ translateX: shift }, { scale }]
        : [{ translateY: shift }, { scale }],
    };
  });

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
