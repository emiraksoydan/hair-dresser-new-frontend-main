import React, { ReactElement } from "react";
import type { RefreshControlProps } from "react-native";
import Animated, {
  useAnimatedScrollHandler,
  useSharedValue,
} from "react-native-reanimated";
import { PerplexityListItem } from "../panel/PerplexityListItem";

type Props<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (info: { item: T; index: number }) => React.ReactNode;
  /** Height of each item along the scroll axis (used for animation interpolation). */
  itemStride: number;
  contentContainerStyle?: object;
  style?: object;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  ListHeaderComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListFooterComponent?: React.ComponentType<any> | React.ReactElement | null;
  ListEmptyComponent?: React.ComponentType<any> | React.ReactElement | null;
  initialNumToRender?: number;
  windowSize?: number;
};

/**
 * Vertical list with Perplexity-style scale + opacity + translateY animation.
 * Handles scroll tracking internally — no need to pass a scrollY SharedValue.
 *
 * Used across CustomerTabs, BarberStore, FreeBarber panels and Favorites.
 * @see PerplexityListItem for the animation details.
 */
export function PerplexityAnimatedList<T>({
  data,
  keyExtractor,
  renderItem,
  itemStride,
  contentContainerStyle,
  style,
  refreshControl,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  initialNumToRender,
  windowSize,
}: Props<T>): ReactElement {
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  return (
    <Animated.FlatList
      data={data as any}
      keyExtractor={keyExtractor as any}
      onScroll={onScroll}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }: { item: any; index: number }) => (
        <PerplexityListItem
          scrollPos={scrollY}
          itemStart={index * itemStride}
          itemLength={itemStride}
        >
          {renderItem({ item: item as T, index })}
        </PerplexityListItem>
      )}
      contentContainerStyle={contentContainerStyle}
      style={style}
      refreshControl={refreshControl}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      initialNumToRender={initialNumToRender}
      windowSize={windowSize}
    />
  );
}
