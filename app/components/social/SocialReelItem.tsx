import React, { useCallback, useEffect, useRef, useState } from 'react';

import { useSafeNavigation } from '../../hook/useSafeNavigation';

import { View, Dimensions, TouchableOpacity, Pressable } from 'react-native';

import { Video, ResizeMode } from 'expo-av';



import { Icon } from 'react-native-paper';

import { Text } from '../common/Text';

import { SocialMentionText } from './SocialMentionText';

import { SocialPostAuthorRow } from './SocialPostAuthorRow';

import { useLanguage } from '../../hook/useLanguage';

import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';

import type { SocialPostDto } from '../../types/social';

import { SOCIAL_ACCENT } from '../../constants/socialTheme';

import { formatSocialCount } from '../../utils/formatSocialCount';

import { resolveSocialPostAuthorProfile } from '../../utils/social/resolveSocialPostAuthorProfile';
import { isPostManagedByActiveProfile } from '../../utils/social/socialActiveProfileScope';



const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get('window');



type Props = {

  post: SocialPostDto;

  isActive: boolean;

  height?: number;

  onToggleLike?: () => void;

  onToggleSave?: () => void;

  onOpenComments?: () => void;

  onOpenShare?: () => void;

  liking?: boolean;

  saving?: boolean;

};



export const SocialReelItem: React.FC<Props> = React.memo(({

  post,

  isActive,

  height = SCREEN_H,

  onToggleLike,

  onToggleSave,

  onOpenComments,

  onOpenShare,

  liking,

  saving,

}) => {

  const router = useSafeNavigation();

  const { t } = useLanguage();

  const { activeProfile } = useActiveSocialProfile();

  const videoRef = useRef<Video>(null);

  const [paused, setPaused] = useState(false);

  const mediaUrl = post.media[0]?.mediaUrl;

  const authorProfile = resolveSocialPostAuthorProfile(post, activeProfile);
  const showOwnBadge = isPostManagedByActiveProfile(post, activeProfile?.id);



  const openProfile = useCallback(() => {

    router.push({

      pathname: '/(screens)/social/profile-view',

      params: { profileId: post.profileId },

    } as any);

  }, [router, post.profileId]);



  useEffect(() => {

    if (!videoRef.current) return;

    if (isActive && !paused) videoRef.current.playAsync().catch(() => {});

    else videoRef.current.pauseAsync().catch(() => {});

  }, [isActive, paused]);



  if (!mediaUrl) {

    return <View style={{ height, width: SCREEN_W, backgroundColor: '#000' }} />;

  }



  return (

    <Pressable

      style={{ height, width: SCREEN_W, backgroundColor: '#000' }}

      onPress={() => setPaused((p) => !p)}

    >

      <Video

        ref={videoRef}

        source={{ uri: mediaUrl }}

        style={{ width: SCREEN_W, height }}

        resizeMode={ResizeMode.COVER}

        isLooping

        shouldPlay={isActive && !paused}

        isMuted={false}

      />



      {paused && (

        <View

          style={{

            position: 'absolute',

            top: 0,

            left: 0,

            right: 0,

            bottom: 0,

            alignItems: 'center',

            justifyContent: 'center',

          }}

          pointerEvents="none"

        >

          <Icon source="play-circle-outline" size={72} color="rgba(255,255,255,0.85)" />

        </View>

      )}



      <View style={{ position: 'absolute', right: 12, bottom: 120, alignItems: 'center', gap: 20 }}>

        <TouchableOpacity onPress={onToggleLike} disabled={liking} style={{ alignItems: 'center' }}>

          <Icon

            source={post.isLiked ? 'thumb-up' : 'thumb-up-outline'}

            size={32}

            color={post.isLiked ? SOCIAL_ACCENT : '#fff'}

          />

          <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{formatSocialCount(post.likeCount)}</Text>

        </TouchableOpacity>

        <TouchableOpacity onPress={onOpenComments} style={{ alignItems: 'center' }}>

          <Icon source="comment-outline" size={30} color="#fff" />

          <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{formatSocialCount(post.commentCount)}</Text>

        </TouchableOpacity>

        {onToggleSave && (

          <TouchableOpacity onPress={onToggleSave} disabled={saving} style={{ alignItems: 'center' }} accessibilityLabel={t('social.savePost')}>

            <Icon

              source={post.isSaved ? 'bookmark' : 'bookmark-outline'}

              size={28}

              color={post.isSaved ? SOCIAL_ACCENT : '#fff'}

            />

          </TouchableOpacity>

        )}

        <TouchableOpacity onPress={onOpenShare} style={{ alignItems: 'center' }} accessibilityLabel={t('social.shareToChat')}>

          <Icon source="share-variant-outline" size={28} color="#fff" />

        </TouchableOpacity>

        <View style={{ alignItems: 'center' }}>

          <Icon source="eye-outline" size={28} color="#fff" />

          <Text style={{ color: '#fff', fontSize: 12, marginTop: 4 }}>{formatSocialCount(post.viewCount)}</Text>

        </View>

      </View>



      <View style={{ position: 'absolute', left: 14, right: 88, bottom: 48 }}>

        <SocialPostAuthorRow profile={authorProfile} variant="overlay" onPress={openProfile} showAvatar={false} showOwnBadge={showOwnBadge} />

        {!!post.caption && (

          <SocialMentionText

            text={post.caption}

            style={{ color: 'rgba(255,255,255,0.92)', fontSize: 14, marginTop: 6 }}

            mentionStyle={{ color: SOCIAL_ACCENT }}

            numberOfLines={3}

          />

        )}

      </View>

    </Pressable>

  );

});



SocialReelItem.displayName = 'SocialReelItem';

