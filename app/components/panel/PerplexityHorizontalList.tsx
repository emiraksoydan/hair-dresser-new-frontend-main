import React, { ReactElement } from "react";
import Animated, { useAnimatedScrollHandler, useSharedValue } from "react-native-reanimated";
import { PerplexityListItem } from "./PerplexityListItem";

type Props<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (info: { item: T; index: number }) => React.ReactNode;
  /** Same value as snapToInterval (card width + gap). */
  snapInterval: number;
  contentContainerStyle?: object;
  style?: object;
  minHeight?: number;
  /** Use when this list is nested inside a vertical ScrollView (e.g. booking day row). */
  nestedScrollEnabled?: boolean;
};

/**
 * Horizontal carousel with Perplexity-style scale/opacity vs scroll position.
 */
export function PerplexityHorizontalList<T>({
  data,
  keyExtractor,
  renderItem,
  snapInterval,
  contentContainerStyle,
  style,
  minHeight = 200,
  nestedScrollEnabled,
}: Props<T>): ReactElement {
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  return (
    <Animated.FlatList
      style={[{ minHeight }, style]}
      horizontal
      nestedScrollEnabled={nestedScrollEnabled}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => (
        <PerplexityListItem
          horizontal
          scrollPos={scrollX}
          itemStart={index * snapInterval}
          itemLength={snapInterval}
        >
          {renderItem({ item, index })}
        </PerplexityListItem>
      )}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator={false}
      decelerationRate="fast"
      snapToInterval={snapInterval}
      snapToAlignment="start"
      disableIntervalMomentum
      contentContainerStyle={contentContainerStyle}
    />
  );
}
