import React from 'react';
import { View, TouchableOpacity, Image, ActivityIndicator, Dimensions } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { SocialStoryRingAvatar } from './SocialStoryRingAvatar';
import type { SocialProfileDto } from '../../types/social';

const SCREEN_W = Dimensions.get('window').width;
export const SOCIAL_PROFILE_COVER_H = Math.round(SCREEN_W * 0.42);
export const SOCIAL_PROFILE_AVATAR = 96;
const AVATAR_RING_PAD = 4;

type Props = {
  profile: SocialProfileDto;
  uploadingCover?: boolean;
  uploadingAvatar?: boolean;
  onPickCover: () => void;
  onPickAvatar: () => void;
};

export function SocialProfileCoverHeader({
  profile,
  uploadingCover,
  uploadingAvatar,
  onPickCover,
  onPickAvatar,
}: Props) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const avatarOuter = SOCIAL_PROFILE_AVATAR + AVATAR_RING_PAD * 2;

  const avatarInner = profile.hasActiveStory ? (
    <SocialStoryRingAvatar
      avatarUrl={profile.avatarUrl}
      size={avatarOuter}
      ringColor={SOCIAL_ACCENT}
    />
  ) : (
    <View
      style={{
        width: avatarOuter,
        height: avatarOuter,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <View
        style={{
          width: SOCIAL_PROFILE_AVATAR,
          height: SOCIAL_PROFILE_AVATAR,
          borderRadius: SOCIAL_PROFILE_AVATAR / 2,
          overflow: 'hidden',
          backgroundColor: isDark ? '#374151' : '#e5e7eb',
          borderWidth: 3,
          borderColor: colors.screenBg,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {profile.avatarUrl ? (
          <Image
            source={{ uri: profile.avatarUrl }}
            style={{ width: SOCIAL_PROFILE_AVATAR, height: SOCIAL_PROFILE_AVATAR }}
          />
        ) : (
          <Icon source="account" size={44} color={colors.headerText} />
        )}
        {uploadingAvatar ? (
          <View className="absolute inset-0 items-center justify-center bg-black/35">
            <ActivityIndicator color="#fff" size="small" />
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={{ marginBottom: SOCIAL_PROFILE_AVATAR / 2 + 8 }}>
      <TouchableOpacity
        onPress={onPickCover}
        disabled={uploadingCover}
        activeOpacity={0.92}
        style={{
          width: SCREEN_W,
          height: SOCIAL_PROFILE_COVER_H,
          backgroundColor: isDark ? '#1f2937' : '#d1d5db',
        }}
      >
        {profile.coverUrl ? (
          <Image source={{ uri: profile.coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
        ) : (
          <View className="flex-1 items-center justify-center">
            <Icon source="image-plus" size={30} color={colors.textSecondary} />
            <Text className="text-xs mt-1.5" style={{ color: colors.textSecondary }}>
              {t('social.addCoverPhoto')}
            </Text>
          </View>
        )}
        {uploadingCover ? (
          <View className="absolute inset-0 items-center justify-center bg-black/35">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
      </TouchableOpacity>

      <View
        pointerEvents="box-none"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: -(SOCIAL_PROFILE_AVATAR / 2),
          alignItems: 'center',
        }}
      >
        <View style={{ position: 'relative' }}>
          {avatarInner}
          <TouchableOpacity
            onPress={onPickAvatar}
            disabled={uploadingAvatar}
            style={{
              position: 'absolute',
              right: 2,
              bottom: 2,
              width: 28,
              height: 28,
              borderRadius: 14,
              backgroundColor: SOCIAL_ACCENT,
              borderWidth: 2,
              borderColor: colors.screenBg,
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 2,
            }}
            hitSlop={6}
          >
            <Icon source="camera" size={14} color={SOCIAL_ACCENT_TEXT} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
