import React, { useEffect, useRef } from 'react';

import { View } from 'react-native';

import { Video, ResizeMode } from 'expo-av';

import { Icon } from 'react-native-paper';

import type { SocialPostDto } from '../../types/social';

import { SocialPostType } from '../../types/social';

import { SocialPostMediaCarousel } from './SocialPostMediaCarousel';



type Props = {

  post: SocialPostDto;

  width: number;

  height: number;

  isVisible?: boolean;

};



export const SocialFeedMedia: React.FC<Props> = React.memo(({ post, width, height, isVisible = false }) => {

  const videoRef = useRef<Video>(null);

  const isVideo = post.type === SocialPostType.Video || post.type === SocialPostType.Reel;

  const isCarousel = post.type === SocialPostType.Carousel || post.media.length > 1;

  const media = post.media[0];



  useEffect(() => {

    if (!isVideo || !videoRef.current) return;

    if (isVisible) videoRef.current.playAsync().catch(() => {});

    else videoRef.current.pauseAsync().catch(() => {});

  }, [isVisible, isVideo]);



  if (isCarousel) {

    return <SocialPostMediaCarousel media={post.media} width={width} height={height} isVisible={isVisible} />;

  }



  if (isVideo && media?.mediaUrl) {

    return (

      <View style={{ width, height, backgroundColor: '#000' }}>

        <Video

          ref={videoRef}

          source={{ uri: media.mediaUrl }}

          posterSource={media.thumbnailUrl ? { uri: media.thumbnailUrl } : undefined}

          usePoster={!!media.thumbnailUrl}

          style={{ width, height }}

          resizeMode={ResizeMode.COVER}

          isLooping

          isMuted

          shouldPlay={isVisible}

        />

        <View

          style={{

            position: 'absolute',

            bottom: 10,

            right: 10,

            backgroundColor: 'rgba(0,0,0,0.45)',

            borderRadius: 14,

            padding: 4,

          }}

          pointerEvents="none"

        >

          <Icon source="volume-off" size={18} color="#fff" />

        </View>

      </View>

    );

  }



  return (

    <SocialPostMediaCarousel media={post.media} width={width} height={height} isVisible={isVisible} />

  );

});



SocialFeedMedia.displayName = 'SocialFeedMedia';

