import React, { useEffect, useRef } from 'react';
import { View, TouchableOpacity, Image, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Video, ResizeMode } from 'expo-av';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import type { SocialPostDto } from '../../types/social';
import { SocialPostType } from '../../types/social';
import { formatSocialCount } from '../../utils/formatSocialCount';
import { isSocialReelType, isSocialVideoType, normalizeSocialPostType } from '../../utils/social/normalizeSocialPost';

type Props = {
  post: SocialPostDto;
  width: number;
  height: number;
  isDark: boolean;
  onPress: () => void;
};

function StatChip({ icon, value }: { icon: string; value: number }) {
  return (
    <View className="flex-row items-center gap-0.5">
      <Icon source={icon} size={11} color="#fff" />
      <Text className="text-[10px] font-semibold text-white">{formatSocialCount(value)}</Text>
    </View>
  );
}

export const SocialProfileGridTile: React.FC<Props> = ({ post, width, height, isDark, onPress }) => {
  const videoRef = useRef<Video>(null);
  const mediaItems = post?.media ?? [];
  const media = mediaItems[0];
  const mediaUrl = media?.mediaUrl;
  const thumbUrl = media?.thumbnailUrl ?? mediaUrl;
  const postType = normalizeSocialPostType(post.type);
  const isReel = isSocialReelType(postType);
  const isVideo = isSocialVideoType(postType);
  const playsVideo = (isReel || isVideo) && !!mediaUrl;

  useEffect(() => {
    if (!videoRef.current || !playsVideo) return;
    videoRef.current.playAsync().catch(() => {});
    return () => {
      videoRef.current?.pauseAsync().catch(() => {});
    };
  }, [playsVideo, mediaUrl]);

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.92}
      style={{
        width,
        height,
        backgroundColor: isDark ? '#1f2937' : '#e5e7eb',
        overflow: 'hidden',
      }}
    >
      {playsVideo ? (
        <Video
          ref={videoRef}
          source={{ uri: mediaUrl! }}
          style={{ width, height }}
          resizeMode={ResizeMode.COVER}
          isLooping
          isMuted
          shouldPlay
        />
      ) : thumbUrl ? (
        <Image source={{ uri: thumbUrl }} style={{ width, height }} resizeMode="cover" />
      ) : null}

      {post.isPinned ? (
        <View className="absolute top-1.5 left-1.5">
          <Icon source="pin" size={14} color="#fff" />
        </View>
      ) : null}

      {mediaItems.length > 1 && postType === SocialPostType.Carousel ? (
        <View className="absolute top-1.5 right-1.5">
          <Icon source="image-multiple-outline" size={14} color="#fff" />
        </View>
      ) : isReel || isVideo ? (
        <View className="absolute top-1.5 right-1.5">
          <Icon source={isReel ? 'play-box-outline' : 'play-circle-outline'} size={14} color="#fff" />
        </View>
      ) : null}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.82)']}
        style={styles.overlay}
        pointerEvents="none"
      >
        <View style={styles.statsRow}>
          <StatChip icon="eye-outline" value={post.viewCount ?? 0} />
          <StatChip icon="heart-outline" value={post.likeCount ?? 0} />
          <StatChip icon="comment-outline" value={post.commentCount ?? 0} />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    minHeight: 28,
    justifyContent: 'flex-end',
    paddingHorizontal: 6,
    paddingBottom: 4,
    paddingTop: 10,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
});
