import React, { ReactElement } from "react";
import { FlatList, type RefreshControlProps } from "react-native";
import { PerplexityListItem } from "../panel/PerplexityListItem";

type Props<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (info: { item: T; index: number }) => React.ReactNode;
  /** Height of each item along the scroll axis (used for scroll normalization). */
  itemStride: number;
  /** contentContainerStyle.paddingTop ile aynı — satır anchor pikseli için. */
  contentPaddingTop?: number;
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
 * Dikey liste — animasyon yok.
 */
export function PerplexityAnimatedList<T>({
  data,
  keyExtractor,
  renderItem,
  itemStride: _itemStride,
  contentPaddingTop = 0,
  contentContainerStyle,
  style,
  refreshControl,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  initialNumToRender,
  windowSize,
}: Props<T>): ReactElement {
  return (
    <FlatList
      data={data as any}
      keyExtractor={keyExtractor as any}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      renderItem={({ item, index }: { item: any; index: number }) => (
        <PerplexityListItem>
          {renderItem({ item: item as T, index })}
        </PerplexityListItem>
      )}
      contentContainerStyle={[
        contentPaddingTop ? { paddingTop: contentPaddingTop } : {},
        contentContainerStyle,
      ]}
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
