import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Icon } from 'react-native-paper';
import type { SocialPostDto } from '../../types/social';
import { SocialPostType } from '../../types/social';
import { DISCOVER_COL_WIDTH } from '../../utils/social/socialDiscoverGrid';

type Props = {
  post: SocialPostDto;
  height: number;
  shouldPlay: boolean;
  onPress: () => void;
};

export const SocialDiscoverGridTile: React.FC<Props> = React.memo(({ post, height, shouldPlay, onPress }) => {
  const videoRef = useRef<Video>(null);
  const media = post.media[0];
  const mediaUrl = media?.mediaUrl;
  const thumbUrl = media?.thumbnailUrl ?? mediaUrl;
  const isReel = post.type === SocialPostType.Reel;
  const isVideo = post.type === SocialPostType.Video;
  const isCarousel = post.type === SocialPostType.Carousel;
  const playsVideo = isReel || isVideo;

  useEffect(() => {
    if (!videoRef.current || !playsVideo) return;
    if (shouldPlay) {
      videoRef.current.playAsync().catch(() => {});
    } else {
      videoRef.current.pauseAsync().catch(() => {});
    }
  }, [shouldPlay, playsVideo]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{ width: DISCOVER_COL_WIDTH, height }}
      className="overflow-hidden bg-black"
    >
      {playsVideo && mediaUrl ? (
        <Video
          ref={videoRef}
          source={{ uri: mediaUrl }}
          style={{ width: DISCOVER_COL_WIDTH, height }}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted
          shouldPlay={shouldPlay}
        />
      ) : thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={{ width: DISCOVER_COL_WIDTH, height }} resizeMode="cover" />
      ) : (
        <View className="flex-1 items-center justify-center bg-neutral-800">
          <Icon source="image-outline" size={28} color="#9ca3af" />
        </View>
      )}

      {isCarousel && (
        <View className="absolute top-1.5 right-1.5">
          <Icon source="image-multiple" size={16} color="#fff" />
        </View>
      )}
      {isReel && (
        <View className="absolute top-1.5 right-1.5">
          <Icon source="play-box-outline" size={16} color="#fff" />
        </View>
      )}
      {isVideo && !isReel && (
        <View className="absolute top-1.5 right-1.5">
          <Icon source="play-circle-outline" size={16} color="#fff" />
        </View>
      )}
    </TouchableOpacity>
  );
});

SocialDiscoverGridTile.displayName = 'SocialDiscoverGridTile';
