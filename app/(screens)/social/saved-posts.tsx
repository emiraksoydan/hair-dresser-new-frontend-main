import React, { useCallback, useMemo, useRef, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Dimensions } from 'react-native';
import { SocialScreenHeader } from '../../components/social/SocialScreenHeader';
import { SocialUnderlineTabBar } from '../../components/social/SocialUnderlineTabBar';

import { Text } from '../../components/common/Text';
import { SocialFeedPostCard } from '../../components/social/SocialFeedPostCard';
import { SocialEmptyStateCard } from '../../components/social/SocialEmptyStateCard';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { SOCIAL_EMPTY_LOTTIES } from '../../constants/socialAnimations';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import {
  useGetSavedSocialPostsQuery,
  useLazyGetSavedSocialPostsQuery,
  useToggleSocialLikeMutation,
  useToggleSocialSaveMutation,
} from '../../store/api';
import { SocialPostType, type SocialPostDto } from '../../types/social';
import { PANEL_FLAT_LIST_PERF } from '../../constants/panelFlatListPerf';

const PAGE_SIZE = 20;
const REEL_COL = Dimensions.get('window').width / 3;

type SavedTab = 'posts' | 'reels';

export default function SocialSavedPostsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const { activeProfileId } = useActiveSocialProfile();
  const [tab, setTab] = useState<SavedTab>('posts');
  const [refreshing, setRefreshing] = useState(false);
  const loadingMoreRef = useRef(false);

  const queryArgs = useMemo(
    () =>
      tab === 'reels'
        ? { profileId: activeProfileId!, type: SocialPostType.Reel, limit: PAGE_SIZE }
        : { profileId: activeProfileId!, excludeType: SocialPostType.Reel, limit: PAGE_SIZE },
    [activeProfileId, tab],
  );

  const { data: items, isLoading, isFetching, refetch } = useGetSavedSocialPostsQuery(queryArgs, {
    skip: !activeProfileId,
  });
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSavedSocialPostsQuery();
  const [toggleLike, { isLoading: liking }] = useToggleSocialLikeMutation();
  const [toggleSave, { isLoading: saving }] = useToggleSocialSaveMutation();

  const switchTab = useCallback((next: SavedTab) => {
    if (next === tab) return;
    setTab(next);
  }, [tab]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || isFetching || isFetchingMore || !items?.length || !activeProfileId) return;
    const last = items[items.length - 1];
    if (!last?.savedAt) return;
    loadingMoreRef.current = true;
    try {
      await fetchMore({
        ...queryArgs,
        before: last.savedAt,
        beforeId: last.savedEntryId ?? last.id,
        limit: PAGE_SIZE,
      }).unwrap();
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [items, isFetching, isFetchingMore, fetchMore, activeProfileId, queryArgs]);

  const handleToggleLike = useCallback(
    async (post: SocialPostDto) => {
      if (!activeProfileId) return;
      await toggleLike({ profileId: activeProfileId, targetType: 0, targetId: post.id });
    },
    [activeProfileId, toggleLike],
  );

  const handleToggleSave = useCallback(
    async (post: SocialPostDto) => {
      if (!activeProfileId) return;
      await toggleSave({ profileId: activeProfileId, postId: post.id });
    },
    [activeProfileId, toggleSave],
  );

  const renderItem = useCallback(
    ({ item }: { item: SocialPostDto }) => (
      <SocialFeedPostCard
        post={item}
        liking={liking}
        saving={saving}
        onToggleLike={() => handleToggleLike(item)}
        onToggleSave={() => handleToggleSave(item)}
      />
    ),
    [handleToggleLike, handleToggleSave, liking, saving],
  );

  const openReel = useCallback(
    (post: SocialPostDto) => {
      router.push({
        pathname: '/(screens)/social/reel-view',
        params: { postId: post.id },
      } as any);
    },
    [router],
  );

  const savedTabs = useMemo(
    () => [
      {
        key: 'posts',
        icon: 'view-grid-outline',
        iconActive: 'view-grid',
        label: t('social.savedPostsTab'),
      },
      {
        key: 'reels',
        icon: 'play-box-outline',
        iconActive: 'play-box',
        label: t('social.savedReelsTab'),
      },
    ],
    [t],
  );

  const listHeader = (
    <SocialUnderlineTabBar tabs={savedTabs} activeKey={tab} onChange={switchTab} />
  );

  if (!activeProfileId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: colors.textSecondary }}>{t('social.noProfile')}</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.screenBg }}>
      <SocialScreenHeader title={t('social.savedTitle')} />

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
        </View>
      ) : !items?.length ? (
        <View style={{ flex: 1 }}>
          {listHeader}
          <SocialEmptyStateCard
            animationSource={SOCIAL_EMPTY_LOTTIES.post}
            message={t('social.savedEmpty')}
            animationSize={120}
            animationKey="social-saved-empty"
          />
        </View>
      ) : tab === 'reels' ? (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          numColumns={3}
          ListHeaderComponent={listHeader}
          renderItem={({ item }) => {
            const thumb = item.media[0]?.thumbnailUrl ?? item.media[0]?.mediaUrl;
            return (
              <TouchableOpacity
                onPress={() => openReel(item)}
                style={{ width: REEL_COL, height: REEL_COL * 1.6, padding: 1 }}
              >
                {thumb ? (
                  <Image source={{ uri: thumb }} style={{ flex: 1, backgroundColor: '#000' }} resizeMode="cover" />
                ) : (
                  <View style={{ flex: 1, backgroundColor: isDark ? '#111827' : '#e5e7eb' }} />
                )}
              </TouchableOpacity>
            );
          }}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing || (isFetching && !isFetchingMore)} onRefresh={onRefresh} tintColor={SOCIAL_ACCENT} />
          }
          ListFooterComponent={isFetchingMore ? <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginVertical: 16 }} /> : null}
        />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          ListHeaderComponent={listHeader}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshControl={
            <RefreshControl refreshing={refreshing || (isFetching && !isFetchingMore)} onRefresh={onRefresh} tintColor={SOCIAL_ACCENT} />
          }
          ListFooterComponent={isFetchingMore ? <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginVertical: 16 }} /> : null}
          {...PANEL_FLAT_LIST_PERF}
        />
      )}
    </View>
  );
}
