import React, { ReactElement } from "react";
import { FlatList, View } from "react-native";

type Props<T> = {
  data: T[];
  keyExtractor: (item: T, index: number) => string;
  renderItem: (info: { item: T; index: number }) => React.ReactNode;
  contentContainerStyle?: object;
  style?: object;
  minHeight?: number;
  /** Use when this list is nested inside a vertical ScrollView (e.g. booking day row). */
  nestedScrollEnabled?: boolean;
  itemSpacing?: number;
};

/**
 * Yatay liste — kart hizalı snap yok, normal kaydırma.
 */
export function PerplexityHorizontalList<T>({
  data,
  keyExtractor,
  renderItem,
  contentContainerStyle,
  style,
  minHeight = 200,
  nestedScrollEnabled,
  itemSpacing = 12,
}: Props<T>): ReactElement {
  return (
    <FlatList
      style={[{ minHeight }, style]}
      horizontal
      nestedScrollEnabled={nestedScrollEnabled}
      data={data}
      keyExtractor={keyExtractor}
      renderItem={({ item, index }) => <>{renderItem({ item, index })}</>}
      ItemSeparatorComponent={() => <FlatListSeparator width={itemSpacing} />}
      scrollEventThrottle={16}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={contentContainerStyle}
    />
  );
}

function FlatListSeparator({ width }: { width: number }) {
  return <View style={{ width }} />;
}
