import React, { useCallback } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';

import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import type { SocialFollowListItemDto } from '../../types/social';
import { socialProfileOwnerLabel, socialProfileOwnerNumberLabel } from '../../utils/social/socialProfileOwnerLabel';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT, SOCIAL_PAIR_BLUE, SOCIAL_PAIR_ORANGE } from '../../constants/socialTheme';
import { SocialProfileOwnerType } from '../../types/social';

type Props = {
  item: SocialFollowListItemDto;
  showFollowAction?: boolean;
  showOwnerMeta?: boolean;
  onToggleFollow?: () => void;
  followLoading?: boolean;
  onNavigate?: () => void;
};

function ownerMeta(type: SocialProfileOwnerType, t: (key: string) => string) {
  switch (type) {
    case SocialProfileOwnerType.FreeBarber:
      return { label: t('social.ownerFreeBarber'), icon: 'content-cut', color: SOCIAL_PAIR_ORANGE };
    case SocialProfileOwnerType.BarberStore:
      return { label: t('social.ownerStore'), icon: 'store-outline', color: SOCIAL_PAIR_BLUE };
    default:
      return { label: t('social.ownerCustomer'), icon: 'account-outline', color: '#6b7280' };
  }
}

export const SocialFollowListRow: React.FC<Props> = React.memo(
  ({ item, showFollowAction, showOwnerMeta, onToggleFollow, followLoading, onNavigate }) => {
    const { colors, isDark } = useTheme();
    const { t } = useLanguage();
    const router = useSafeNavigation();
    const { profile } = item;

    const openProfile = useCallback(() => {
      onNavigate?.();
      router.push({
        pathname: '/(screens)/social/profile-view',
        params: { profileId: profile.id },
      } as any);
    }, [router, profile.id, onNavigate]);

    const meta = ownerMeta(profile.ownerType, t);
    const numberLabel = socialProfileOwnerNumberLabel(profile.ownerType, t);

    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor2,
        }}
      >
        <TouchableOpacity onPress={openProfile} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 24,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              marginRight: 12,
            }}
          >
            {profile.avatarUrl ? (
              <Image source={{ uri: profile.avatarUrl }} style={{ width: 48, height: 48 }} />
            ) : (
              <Icon source="account" size={24} color={colors.headerText} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '700', color: colors.headerText, fontSize: 15 }}>@{profile.username}</Text>
            {showOwnerMeta ? (
              <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
                <View
                  className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
                  style={{ backgroundColor: `${meta.color}18` }}
                >
                  <Icon source={meta.icon} size={12} color={meta.color} />
                  <Text className="text-[11px] font-semibold" style={{ color: meta.color }}>
                    {meta.label}
                  </Text>
                </View>
                {profile.ownerNumber ? (
                  <View
                    className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
                  >
                    <Text className="text-[10px] font-medium" style={{ color: colors.textSecondary }}>
                      {numberLabel} #{profile.ownerNumber}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : (
              <Text style={{ marginTop: 2, color: colors.textSecondary, fontSize: 12 }}>
                {socialProfileOwnerLabel(profile.ownerType, t)}
              </Text>
            )}
          </View>
        </TouchableOpacity>

        {showFollowAction && !profile.isOwnProfile && onToggleFollow && (
          <TouchableOpacity
            onPress={onToggleFollow}
            disabled={followLoading}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 8,
              backgroundColor: profile.isFollowing ? colors.cardBg : SOCIAL_ACCENT,
              borderWidth: profile.isFollowing ? 1 : 0,
              borderColor: colors.borderColor2,
              minWidth: 96,
              alignItems: 'center',
            }}
          >
            {followLoading ? (
              <ActivityIndicator size="small" color={profile.isFollowing ? colors.headerText : SOCIAL_ACCENT_TEXT} />
            ) : (
              <Text
                style={{
                  color: profile.isFollowing ? colors.headerText : SOCIAL_ACCENT_TEXT,
                  fontWeight: '600',
                  fontSize: 13,
                }}
              >
                {profile.isFollowing ? t('social.followingBtn') : t('social.follow')}
              </Text>
            )}
          </TouchableOpacity>
        )}
      </View>
    );
  },
);

SocialFollowListRow.displayName = 'SocialFollowListRow';
