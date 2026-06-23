import React from 'react';
import { View, Image, type StyleProp, type ViewStyle } from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Icon } from 'react-native-paper';

type SocialLocalMediaThumbProps = {
  uri: string;
  isVideo: boolean;
  width: number;
  height: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
  showPlayBadge?: boolean;
  videoShouldPlay?: boolean;
  resizeMode?: 'cover' | 'contain';
};

export function SocialLocalMediaThumb({
  uri,
  isVideo,
  width,
  height,
  borderRadius = 0,
  style,
  showPlayBadge = true,
  videoShouldPlay = false,
  resizeMode = 'cover',
}: SocialLocalMediaThumbProps) {
  const videoResize = resizeMode === 'contain' ? ResizeMode.CONTAIN : ResizeMode.COVER;

  return (
    <View
      style={[
        {
          width,
          height,
          borderRadius,
          overflow: 'hidden',
          backgroundColor: '#111827',
        },
        style,
      ]}
    >
      {isVideo ? (
        <Video
          source={{ uri }}
          style={{ width, height }}
          resizeMode={videoResize}
          isLooping
          isMuted
          shouldPlay={videoShouldPlay}
        />
      ) : (
        <Image source={{ uri }} style={{ width, height }} resizeMode={resizeMode} />
      )}
      {isVideo && showPlayBadge ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            bottom: 4,
            left: 4,
            backgroundColor: 'rgba(0,0,0,0.55)',
            borderRadius: 4,
            paddingHorizontal: 4,
            paddingVertical: 1,
          }}
        >
          <Icon source="play" size={12} color="#fff" />
        </View>
      ) : null}
    </View>
  );
}
