import React from 'react';
import { View } from 'react-native';
import { Icon } from 'react-native-paper';
import { RetryableImage } from '../common/RetryableImage';
import { useTheme } from '../../hook/useTheme';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

type Props = {
  avatarUrl?: string | null;
  size?: number;
  ringColor: string;
  showAddBadge?: boolean;
};

export const SocialStoryRingAvatar: React.FC<Props> = ({
  avatarUrl,
  size = 52,
  ringColor,
  showAddBadge = false,
}) => {
  const { colors, isDark } = useTheme();
  const inner = size - 8;
  const badgeSize = Math.max(18, Math.round(size * 0.32));

  return (
    <View className="relative" style={{ width: size, height: size }}>
      <View
        className="items-center justify-center rounded-full"
        style={{
          width: size,
          height: size,
          borderWidth: 2.5,
          borderColor: ringColor,
          padding: 2,
        }}
      >
        <View
          className="overflow-hidden rounded-full items-center justify-center"
          style={{
            width: inner,
            height: inner,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
          }}
        >
          {avatarUrl ? (
            <RetryableImage
              uri={avatarUrl}
              fallbackSource={require('../../../assets/icon.png')}
              style={{ width: inner, height: inner }}
              resizeMode="cover"
            />
          ) : (
            <Icon source="account" size={Math.round(inner * 0.45)} color={colors.headerText} />
          )}
        </View>
      </View>

      {showAddBadge ? (
        <View
          className="absolute items-center justify-center rounded-full border-2"
          style={{
            width: badgeSize,
            height: badgeSize,
            bottom: -1,
            right: -1,
            backgroundColor: SOCIAL_ACCENT,
            borderColor: isDark ? colors.screenBg : '#ffffff',
          }}
        >
          <Icon source="plus" size={Math.round(badgeSize * 0.62)} color={SOCIAL_ACCENT_TEXT} />
        </View>
      ) : null}
    </View>
  );
};
