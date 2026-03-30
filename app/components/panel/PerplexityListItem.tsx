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
    /** d=0 satır görünür alanın üstüne (veya yatayda sola) hizalandığında → tam ölçek, merkez ofseti yok */
    const d = p - start;
    /** Tam hizalı / snap sonrası küçük kaymalarda opaklık 1 kalsın; sadece gerçekten uzaklaşınca animasyon */
    const far = L;
    const restIdeal = Math.min(Math.max(L * 0.22, 28), 100);
    const rest = Math.min(restIdeal, far * 0.45);
    const inputRange = [-far, -rest, rest, far];
    const scale = interpolate(
      d,
      inputRange,
      horizontal ? [0.9, 1, 1, 0.9] : [0.94, 1, 1, 0.94],
      Extrapolation.CLAMP,
    );
    const opacity = interpolate(
      d,
      inputRange,
      horizontal ? [0.45, 1, 1, 0.45] : [0.55, 1, 1, 0.55],
      Extrapolation.CLAMP,
    );
    const rot = interpolate(
      d,
      inputRange,
      horizontal ? [-4.5, 0, 0, 4.5] : [4.5, 0, 0, -4.5],
      Extrapolation.CLAMP,
    );
    if (horizontal) {
      return {
        opacity,
        transform: [
          { perspective: 960 },
          { rotateY: `${rot}deg` },
          { scale },
        ],
      };
    }
    return {
      opacity,
      transform: [
        { perspective: 1000 },
        { rotateX: `${rot}deg` },
        { scale },
      ],
    };
  }, [itemStart, itemLength, horizontal]);

  return <Animated.View style={animatedStyle}>{children}</Animated.View>;
}
