import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Icon } from 'react-native-paper';
import { SocialStoryRingAvatar } from './SocialStoryRingAvatar';
import { useTheme } from '../../hook/useTheme';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

type Props = {
  avatarUrl?: string | null;
  ringColor: string;
  hasStories: boolean;
  size?: number;
  onViewStories: () => void;
  onAddStory: () => void;
};

/**
 * Kendi hikaye halkası: avatara tıklama = görüntüle (hikaye varsa),
 * sağ alttaki + = yeni hikaye ekle (her zaman).
 */
export const SocialOwnStoryRing: React.FC<Props> = ({
  avatarUrl,
  ringColor,
  hasStories,
  size = 52,
  onViewStories,
  onAddStory,
}) => {
  const { colors, isDark } = useTheme();
  const badgeSize = Math.max(18, Math.round(size * 0.32));

  return (
    <View style={{ width: size, height: size }}>
      <TouchableOpacity
        onPress={onViewStories}
        disabled={!hasStories}
        activeOpacity={hasStories ? 0.75 : 1}
        accessibilityRole="button"
        accessibilityLabel={hasStories ? 'view-own-story' : undefined}
        style={{ width: size, height: size }}
      >
        <SocialStoryRingAvatar
          avatarUrl={avatarUrl}
          size={size}
          ringColor={ringColor}
          showAddBadge={false}
        />
      </TouchableOpacity>

      <TouchableOpacity
        onPress={onAddStory}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        accessibilityRole="button"
        accessibilityLabel="add-story"
        className="absolute items-center justify-center rounded-full border-2"
        style={{
          width: badgeSize,
          height: badgeSize,
          bottom: -1,
          right: -1,
          backgroundColor: SOCIAL_ACCENT,
          borderColor: isDark ? colors.screenBg : '#ffffff',
          zIndex: 2,
        }}
      >
        <Icon source="plus" size={Math.round(badgeSize * 0.62)} color={SOCIAL_ACCENT_TEXT} />
      </TouchableOpacity>
    </View>
  );
};
