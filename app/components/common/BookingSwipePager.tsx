import React, { useCallback, useMemo } from "react";
import { Dimensions, View } from "react-native";
import Carousel from "react-native-reanimated-carousel";

type BookingSwipePagerProps = {
  ids: string[];
  initialId: string;
  onCommittedIndex: (index: number, id: string) => void;
  children: (id: string) => React.ReactNode;
};

/**
 * Yatay kaydırmayla aynı liste sırasındaki randevu detayları arasında geçiş.
 * Tek öğe veya boş listede doğrudan children render edilir.
 */
export function BookingSwipePager({
  ids,
  initialId,
  onCommittedIndex,
  children,
}: BookingSwipePagerProps) {
  const { width, height } = useMemo(() => Dimensions.get("window"), []);
  const initialIndex = Math.max(0, ids.indexOf(initialId));

  const onSnap = useCallback(
    (index: number) => {
      const id = ids[index];
      if (id) onCommittedIndex(index, id);
    },
    [ids, onCommittedIndex],
  );

  if (ids.length <= 1) {
    return <View style={{ flex: 1 }}>{children(ids[0] ?? initialId)}</View>;
  }

  return (
    <Carousel
      width={width}
      height={height}
      loop={false}
      data={ids}
      defaultIndex={initialIndex}
      scrollAnimationDuration={380}
      windowSize={Math.min(5, ids.length + 2)}
      onConfigurePanGesture={(gesture) => {
        // failOffsetY küçük tutularak çapraz dokunuşlarda dikey scroll öncelik alır.
        gesture
          .activeOffsetX([-10, 10])
          .failOffsetY([-5, 5]);
      }}
      onSnapToItem={onSnap}
      renderItem={({ item }) => (
        <View style={{ width, height, flex: 1 }} key={item}>
          {children(item)}
        </View>
      )}
    />
  );
}
