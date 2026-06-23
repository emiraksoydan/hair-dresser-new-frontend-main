import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/common/Text';
import { SocialFollowListRow } from '../../components/social/SocialFollowListRow';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import {
  requestSocialFollowListFullCacheReplace,
  useFollowSocialProfileMutation,
  useGetSocialFollowListQuery,
  useLazyGetSocialFollowListQuery,
  useUnfollowSocialProfileMutation,
} from '../../store/api';
import type { SocialFollowListItemDto } from '../../types/social';
import { PANEL_FLAT_LIST_PERF } from '../../constants/panelFlatListPerf';

const PAGE_SIZE = 30;

export default function SocialFollowListScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const params = useLocalSearchParams<{
    profileId?: string;
    kind?: string;
    username?: string;
  }>();

  const profileId = String(params.profileId ?? '');
  const initialKind = params.kind === 'following' ? 'following' : 'followers';
  const [kind, setKind] = useState<'followers' | 'following'>(initialKind);
  const { activeProfileId } = useActiveSocialProfile();

  const { data: items, isLoading, isFetching } = useGetSocialFollowListQuery(
    { profileId, kind, limit: PAGE_SIZE },
    { skip: !profileId },
  );
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialFollowListQuery();
  const [follow, { isLoading: following }] = useFollowSocialProfileMutation();
  const [unfollow, { isLoading: unfollowing }] = useUnfollowSocialProfileMutation();
  const [busyProfileId, setBusyProfileId] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const title = useMemo(() => {
    const user = params.username ? `@${params.username}` : '';
    return kind === 'followers' ? t('social.followersTitle', { user }) : t('social.followingTitle', { user });
  }, [kind, params.username, t]);

  const switchTab = useCallback(
    (next: 'followers' | 'following') => {
      if (next === kind) return;
      requestSocialFollowListFullCacheReplace(profileId, next);
      setKind(next);
    },
    [kind, profileId],
  );

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || isFetching || isFetchingMore || !items?.length || !profileId) return;
    const last = items[items.length - 1];
    loadingMoreRef.current = true;
    try {
      await fetchMore({
        profileId,
        kind,
        before: last.followedAt,
        beforeId: last.followId,
        limit: PAGE_SIZE,
      }).unwrap();
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [items, isFetching, isFetchingMore, fetchMore, profileId, kind]);

  const handleToggleFollow = useCallback(
    async (item: SocialFollowListItemDto) => {
      if (!activeProfileId || item.profile.isOwnProfile) return;
      setBusyProfileId(item.profile.id);
      try {
        if (item.profile.isFollowing) {
          await unfollow({
            followerProfileId: activeProfileId,
            followingProfileId: item.profile.id,
          }).unwrap();
        } else {
          await follow({
            followerProfileId: activeProfileId,
            followingProfileId: item.profile.id,
          }).unwrap();
        }
      } finally {
        setBusyProfileId(null);
      }
    },
    [activeProfileId, follow, unfollow],
  );

  const renderItem = useCallback(
    ({ item }: { item: SocialFollowListItemDto }) => (
      <SocialFollowListRow
        item={item}
        showFollowAction
        followLoading={busyProfileId === item.profile.id && (following || unfollowing)}
        onToggleFollow={() => handleToggleFollow(item)}
      />
    ),
    [handleToggleFollow, busyProfileId, following, unfollowing],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 8,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor2,
        }}
      >
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Icon source="arrow-left" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text
          numberOfLines={1}
          style={{ flex: 1, marginLeft: 12, fontSize: 17, fontWeight: '700', color: colors.headerText }}
        >
          {title}
        </Text>
      </View>

      <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.borderColor2 }}>
        {(['followers', 'following'] as const).map((tab) => {
          const active = kind === tab;
          return (
            <TouchableOpacity
              key={tab}
              onPress={() => switchTab(tab)}
              style={{
                flex: 1,
                paddingVertical: 12,
                alignItems: 'center',
                borderBottomWidth: 2,
                borderBottomColor: active ? SOCIAL_ACCENT : 'transparent',
              }}
            >
              <Text style={{ fontWeight: active ? '700' : '500', color: active ? SOCIAL_ACCENT : colors.textSecondary }}>
                {tab === 'followers' ? t('social.followers') : t('social.following')}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={items ?? []}
          keyExtractor={(item) => item.followId}
          renderItem={renderItem}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={SOCIAL_ACCENT} /> : null
          }
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                {kind === 'followers' ? t('social.followersEmpty') : t('social.followingEmpty')}
              </Text>
            </View>
          }
          {...PANEL_FLAT_LIST_PERF}
        />
      )}
    </SafeAreaView>
  );
}
