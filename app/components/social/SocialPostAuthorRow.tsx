import React from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import type { SocialProfileDto } from '../../types/social';
import { SocialProfileOwnerType } from '../../types/social';
import { socialProfileOwnerLabel } from '../../utils/social/socialProfileOwnerLabel';
import { normalizeSocialProfileOwnerType } from '../../utils/social/normalizeSocialProfile';
import {
  SOCIAL_PAIR_BLUE,
  SOCIAL_PAIR_ORANGE,
  SOCIAL_ACCENT,
  SOCIAL_ACCENT_TEXT,
} from '../../constants/socialTheme';

type Props = {
  profile: SocialProfileDto;
  showAvatar?: boolean;
  avatarSize?: number;
  onPress?: () => void;
  /** feed = default; overlay = white on dark media; story = hikaye izleyici (yüksek kontrast) */
  variant?: 'feed' | 'overlay' | 'story';
  rightSlot?: React.ReactNode;
  /** Relative time on meta row (type / code satırı), örn. hikaye izleyici */
  timeAgo?: string;
  /** Compact badge for own posts/reels */
  showOwnBadge?: boolean;
};

function ownerMeta(type: SocialProfileOwnerType | unknown, t: (k: string) => string) {
  switch (normalizeSocialProfileOwnerType(type)) {
    case SocialProfileOwnerType.FreeBarber:
      return { label: t('social.ownerFreeBarber'), icon: 'content-cut', color: SOCIAL_PAIR_ORANGE };
    case SocialProfileOwnerType.BarberStore:
      return { label: t('social.ownerStore'), icon: 'store-outline', color: SOCIAL_PAIR_BLUE };
    default:
      return { label: t('social.ownerCustomer'), icon: 'account-outline', color: '#6b7280' };
  }
}

const STORY_TEXT_SHADOW = {
  textShadowColor: 'rgba(0,0,0,0.85)',
  textShadowOffset: { width: 0, height: 1 },
  textShadowRadius: 4,
} as const;

export const SocialPostAuthorRow: React.FC<Props> = ({
  profile,
  showAvatar = true,
  avatarSize = 36,
  onPress,
  variant = 'feed',
  rightSlot,
  timeAgo,
  showOwnBadge = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const isStory = variant === 'story';
  const overlay = variant === 'overlay' || isStory;
  const meta = ownerMeta(profile.ownerType, t);
  const typeLabel = socialProfileOwnerLabel(profile.ownerType, t);
  const nameColor = overlay ? '#fff' : colors.headerText;
  const metaMuted = isStory ? '#fff' : overlay ? 'rgba(255,255,255,0.82)' : colors.textSecondary;
  const usernameSize = isStory ? 15 : 14;
  const metaSize = isStory ? 12 : 11;
  const shadowStyle = isStory ? STORY_TEXT_SHADOW : undefined;
  const storyPillBg = 'rgba(0,0,0,0.42)';

  const content = (
    <>
      {showAvatar ? (
        <View
          className="items-center justify-center overflow-hidden mr-2.5"
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: overlay ? 'rgba(255,255,255,0.18)' : isDark ? '#374151' : '#e5e7eb',
            borderWidth: isStory ? 2 : 0,
            borderColor: isStory ? 'rgba(255,255,255,0.85)' : undefined,
          }}
        >
          {profile.avatarUrl ? (
            <Image source={{ uri: profile.avatarUrl }} style={{ width: avatarSize, height: avatarSize }} />
          ) : (
            <Icon source="account" size={avatarSize * 0.52} color={nameColor} />
          )}
        </View>
      ) : null}
      <View className="flex-1 min-w-0">
        <View className="flex-row items-center flex-wrap gap-1.5">
          <Text
            style={{
              fontWeight: '700',
              fontSize: usernameSize,
              color: nameColor,
              ...shadowStyle,
            }}
            numberOfLines={1}
          >
            @{profile.username}
          </Text>
        </View>
        <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
          {isStory ? (
            <View
              className="flex-row items-center flex-wrap gap-1 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: storyPillBg }}
            >
              <Icon source={meta.icon} size={12} color="#fff" />
              <Text style={{ fontSize: metaSize, fontWeight: '700', color: '#fff', ...shadowStyle }}>{typeLabel}</Text>
              {profile.ownerNumber ? (
                <Text style={{ fontSize: metaSize, fontWeight: '800', color: '#fff', ...shadowStyle }} numberOfLines={1}>
                  #{profile.ownerNumber}
                </Text>
              ) : null}
              {timeAgo ? (
                <>
                  <Text style={{ fontSize: metaSize, fontWeight: '600', color: 'rgba(255,255,255,0.75)' }}>·</Text>
                  <Text style={{ fontSize: metaSize, fontWeight: '700', color: '#fff', ...shadowStyle }}>{timeAgo}</Text>
                </>
              ) : null}
            </View>
          ) : (
            <>
              <Icon source={meta.icon} size={11} color={overlay ? '#fff' : meta.color} />
              <Text
                style={{
                  fontSize: metaSize,
                  fontWeight: '600',
                  color: overlay ? 'rgba(255,255,255,0.88)' : meta.color,
                  ...shadowStyle,
                }}
              >
                {typeLabel}
              </Text>
              {profile.ownerNumber ? (
                <Text
                  style={{ fontSize: metaSize, fontWeight: '700', color: metaMuted, ...shadowStyle }}
                  numberOfLines={1}
                >
                  #{profile.ownerNumber}
                </Text>
              ) : null}
              {showOwnBadge ? (
                <View className="flex-row items-center gap-0.5 px-1.5 py-0.5 rounded" style={{ backgroundColor: SOCIAL_ACCENT }}>
                  <Icon source="account-check" size={10} color={SOCIAL_ACCENT_TEXT} />
                  <Text className="text-[10px] font-bold" style={{ color: SOCIAL_ACCENT_TEXT }}>
                    {t('social.ownContent')}
                  </Text>
                </View>
              ) : null}
              {timeAgo ? (
                <>
                  <Text style={{ fontSize: metaSize, fontWeight: '600', color: metaMuted, ...shadowStyle }}>·</Text>
                  <Text style={{ fontSize: metaSize, fontWeight: '600', color: metaMuted, ...shadowStyle }}>{timeAgo}</Text>
                </>
              ) : null}
            </>
          )}
          {rightSlot}
        </View>
      </View>
    </>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.8} className="flex-row items-start">
        {content}
      </TouchableOpacity>
    );
  }

  return <View className="flex-row items-start">{content}</View>;
};
