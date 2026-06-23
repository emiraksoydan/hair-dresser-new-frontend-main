import React from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, TouchableOpacity, Image } from 'react-native';
import { Icon } from 'react-native-paper';

import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useGetSocialPostQuery, useGetSocialProfileQuery } from '../../store/api';
import type { SocialSharePayload } from '../../utils/social/socialShareMessage';

type Props = {
  payload: SocialSharePayload;
  visibleLine?: string | null;
  isMe: boolean;
};

export const SocialShareBubble: React.FC<Props> = ({ payload, visibleLine, isMe }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();

  const { data: post } = useGetSocialPostQuery(payload.id, {
    skip: payload.kind !== 'post',
  });
  const { data: profile } = useGetSocialProfileQuery(payload.id, {
    skip: payload.kind !== 'profile',
  });

  const thumb =
    payload.kind === 'post'
      ? post?.media[0]?.thumbnailUrl ?? post?.media[0]?.mediaUrl
      : profile?.avatarUrl;

  const title =
    payload.kind === 'post'
      ? `@${post?.profile.username ?? '...'}`
      : `@${profile?.username ?? '...'}`;

  const subtitle =
    payload.kind === 'post'
      ? (post?.caption?.slice(0, 80) ?? t('social.viewPost'))
      : (profile?.bio?.slice(0, 80) ?? t('social.viewProfile'));

  const onPress = () => {
    if (payload.kind === 'post' && post) {
      router.push({
        pathname: '/(screens)/social/profile-view',
        params: { profileId: post.profileId },
      } as any);
      return;
    }
    if (payload.kind === 'profile' && profile) {
      router.push({
        pathname: '/(screens)/social/profile-view',
        params: { profileId: profile.id },
      } as any);
    }
  };

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress}>
      {!!visibleLine && (
        <Text
          style={{
            color: isMe ? 'rgba(255,255,255,0.92)' : colors.headerText,
            fontSize: 14,
            marginBottom: 8,
          }}
        >
          {visibleLine}
        </Text>
      )}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          minWidth: 200,
        }}
      >
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 8,
            backgroundColor: isMe ? 'rgba(255,255,255,0.15)' : colors.cardBg2,
            overflow: 'hidden',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {thumb ? (
            <Image source={{ uri: thumb }} style={{ width: 56, height: 56 }} resizeMode="cover" />
          ) : (
            <Icon source="image-outline" size={24} color={isMe ? '#fff' : colors.textSecondary} />
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text
            numberOfLines={1}
            style={{
              fontWeight: '700',
              fontSize: 13,
              color: isMe ? '#fff' : colors.headerText,
            }}
          >
            {title}
          </Text>
          <Text
            numberOfLines={2}
            style={{
              marginTop: 2,
              fontSize: 12,
              color: isMe ? 'rgba(255,255,255,0.75)' : colors.textSecondary,
            }}
          >
            {subtitle}
          </Text>
        </View>
        <Icon source="chevron-right" size={20} color={isMe ? 'rgba(255,255,255,0.7)' : colors.textSecondary} />
      </View>
    </TouchableOpacity>
  );
};
