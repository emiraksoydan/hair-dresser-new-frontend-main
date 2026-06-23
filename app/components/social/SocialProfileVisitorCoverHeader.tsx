import React from 'react';
import { View, Image } from 'react-native';
import { useTheme } from '../../hook/useTheme';
import type { SocialProfileDto } from '../../types/social';
import { SOCIAL_PROFILE_COVER_H } from './SocialProfileCoverHeader';

type Props = {
  profile: SocialProfileDto;
};

/** Read-only cover for visiting another user's profile (avatar shown in profile body only). */
export function SocialProfileVisitorCoverHeader({ profile }: Props) {
  const { isDark } = useTheme();

  if (!profile.coverUrl) return null;

  return (
    <View style={{ marginBottom: 12 }}>
      <View
        style={{
          height: SOCIAL_PROFILE_COVER_H,
          backgroundColor: isDark ? '#1f2937' : '#d1d5db',
          borderBottomLeftRadius: 12,
          borderBottomRightRadius: 12,
          overflow: 'hidden',
        }}
      >
        <Image source={{ uri: profile.coverUrl }} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
      </View>
    </View>
  );
}
