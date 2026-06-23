import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View } from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { Video, ResizeMode } from 'expo-av';
import { Icon } from 'react-native-paper';
import { RetryableImage } from '../common/RetryableImage';
import { CarouselPaginationDots } from '../common/CarouselPaginationDots';
import type { SocialPostMediaDto } from '../../types/social';

type Props = {
  media: SocialPostMediaDto[];
  width: number;
  height: number;
  isVisible?: boolean;
};

function isVideoItem(item: SocialPostMediaDto) {
  return (item.durationSec ?? 0) > 0 || !!item.mediaUrl?.match(/\.(mp4|mov|webm|m4v)/i);
}

function CarouselVideoSlide({
  item,
  width,
  height,
  active,
}: {
  item: SocialPostMediaDto;
  width: number;
  height: number;
  active: boolean;
}) {
  const ref = useRef<Video>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (active) ref.current.playAsync().catch(() => {});
    else ref.current.pauseAsync().catch(() => {});
  }, [active]);

  return (
    <View style={{ width, height, backgroundColor: '#000' }}>
      <Video
        ref={ref}
        source={{ uri: item.mediaUrl }}
        posterSource={item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined}
        usePoster={!!item.thumbnailUrl}
        style={{ width, height }}
        resizeMode={ResizeMode.COVER}
        isLooping
        isMuted
        shouldPlay={active}
      />
      <View
        pointerEvents="none"
        style={{ position: 'absolute', bottom: 10, right: 10, backgroundColor: 'rgba(0,0,0,0.45)', borderRadius: 14, padding: 4 }}
      >
        <Icon source="volume-off" size={16} color="#fff" />
      </View>
    </View>
  );
}

export const SocialPostMediaCarousel: React.FC<Props> = ({ media, width, height, isVisible = true }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const items = media ?? [];

  const renderItem = useCallback(
    ({ item, index }: { item: SocialPostMediaDto; index: number }) => {
      const slideActive = isVisible && index === activeIndex;
      if (isVideoItem(item)) {
        return <CarouselVideoSlide item={item} width={width} height={height} active={slideActive} />;
      }
      return (
        <RetryableImage
          uri={item.thumbnailUrl ?? item.mediaUrl}
          fallbackSource={require('../../../assets/icon.png')}
          style={{ width, height }}
          resizeMode="cover"
        />
      );
    },
    [width, height, isVisible, activeIndex],
  );

  if (items.length === 0) return null;

  if (items.length === 1) {
    return renderItem({ item: items[0], index: 0 });
  }

  return (
    <View style={{ width, height, overflow: 'hidden' }}>
      <Carousel
        loop={false}
        width={width}
        height={height}
        data={items}
        scrollAnimationDuration={380}
        onSnapToItem={setActiveIndex}
        renderItem={renderItem}
      />
      <CarouselPaginationDots count={items.length} activeIndex={activeIndex} />
    </View>
  );
};
