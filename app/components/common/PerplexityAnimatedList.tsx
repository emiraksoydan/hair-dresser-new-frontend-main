import React, { ReactElement } from "react";
import { FlatList, type RefreshControlProps } from "react-native";
import { PerplexityListItem } from "../panel/PerplexityListItem";
import { PANEL_FLAT_LIST_PERF } from "../../constants/panelFlatListPerf";

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
  maxToRenderPerBatch?: number;
  updateCellsBatchingPeriod?: number;
  windowSize?: number;
  onEndReached?: (() => void) | null;
  onEndReachedThreshold?: number;
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
  initialNumToRender = PANEL_FLAT_LIST_PERF.initialNumToRender,
  maxToRenderPerBatch = PANEL_FLAT_LIST_PERF.maxToRenderPerBatch,
  updateCellsBatchingPeriod = PANEL_FLAT_LIST_PERF.updateCellsBatchingPeriod,
  windowSize = PANEL_FLAT_LIST_PERF.windowSize,
  onEndReached,
  onEndReachedThreshold,
}: Props<T>): ReactElement {
  return (
    <FlatList
      data={data as any}
      keyExtractor={keyExtractor as any}
      scrollEventThrottle={16}
      showsVerticalScrollIndicator={false}
      removeClippedSubviews={PANEL_FLAT_LIST_PERF.removeClippedSubviews}
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
      maxToRenderPerBatch={maxToRenderPerBatch}
      updateCellsBatchingPeriod={updateCellsBatchingPeriod}
      windowSize={windowSize}
      onEndReached={onEndReached ?? undefined}
      onEndReachedThreshold={onEndReachedThreshold}
    />
  );
}
