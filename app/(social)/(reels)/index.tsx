import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  ActivityIndicator,
  ViewToken,
  RefreshControl,
  Dimensions,
  StatusBar,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { DEFAULT_FILTER_RADIUS_KM } from '../../constants/filterDefaults';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { SOCIAL_EMPTY_LOTTIES } from '../../constants/socialAnimations';
import { SocialEmptyStateCard } from '../../components/social/SocialEmptyStateCard';
import { SocialReelItem } from '../../components/social/SocialReelItem';
import { SocialReelsAddButton } from '../../components/social/SocialReelsAddButton';
import { SocialReelsBackButton } from '../../components/social/SocialReelsBackButton';
import { SocialCommentsSheet } from '../../components/social/SocialCommentsSheet';
import { SocialShareToChatSheet } from '../../components/social/SocialShareToChatSheet';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useActionGuard } from '../../hook/useActionGuard';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import {
  requestSocialReelsFullCacheReplace,
  useGetSocialReelsFeedQuery,
  useLazyGetSocialReelsFeedQuery,
  useRecordSocialPostViewMutation,
  useToggleSocialLikeMutation,
  useToggleSocialSaveMutation,
} from '../../store/api';
import type { SocialPostDto } from '../../types/social';
import { isPostManagedByActiveProfile } from '../../utils/social/socialActiveProfileScope';

const SCREEN_H = Dimensions.get('screen').height;
const REELS_PAGE_SIZE = 15;

export default function SocialReelsScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const guard = useActionGuard();
  const { activeProfileId } = useActiveSocialProfile();
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') return;
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (!cancelled) setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      } catch {
        /* konum yok */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const reelsQueryArg = {
    limit: REELS_PAGE_SIZE,
    ...(coords
      ? { latitude: coords.latitude, longitude: coords.longitude, radiusKm: DEFAULT_FILTER_RADIUS_KM }
      : {}),
  };

  const { data: reelsData, isLoading, refetch, isFetching, isUninitialized } = useGetSocialReelsFeedQuery(reelsQueryArg);
  const reels = reelsData ?? [];

  useEffect(() => {
    if (coords) refetch();
  }, [coords, refetch]);

  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialReelsFeedQuery();
  const [toggleLike, { isLoading: liking }] = useToggleSocialLikeMutation();
  const [toggleSave, { isLoading: saving }] = useToggleSocialSaveMutation();
  const [recordView] = useRecordSocialPostViewMutation();
  const recordedViewsRef = useRef(new Set<string>());
  const [activeIndex, setActiveIndex] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [viewportH, setViewportH] = useState(SCREEN_H);
  const [hasMore, setHasMore] = useState(true);
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [commentsAllowWrite, setCommentsAllowWrite] = useState(true);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const loadingMoreRef = useRef(false);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    if (viewableItems[0]?.index != null) setActiveIndex(viewableItems[0].index);
  }).current;

  useEffect(() => {
    const post = reels?.[activeIndex];
    if (!post?.id || !activeProfileId || recordedViewsRef.current.has(post.id)) return;
    recordedViewsRef.current.add(post.id);
    recordView({ postId: post.id, profileId: activeProfileId }).catch(() => {});
  }, [activeIndex, reels, recordView, activeProfileId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    recordedViewsRef.current.clear();
    try {
      requestSocialReelsFullCacheReplace();
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || isFetching || isFetchingMore || !reels?.length) return;
    const last = reels[reels.length - 1];
    if (!last?.createdAt) return;
    loadingMoreRef.current = true;
    try {
      const batch = await fetchMore({
        before: last.createdAt,
        beforeId: last.id,
        limit: REELS_PAGE_SIZE,
        ...(coords
          ? { latitude: coords.latitude, longitude: coords.longitude, radiusKm: DEFAULT_FILTER_RADIUS_KM }
          : {}),
      }).unwrap();
      if (!batch?.length || batch.length < REELS_PAGE_SIZE) setHasMore(false);
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [reels, isFetching, isFetchingMore, fetchMore, coords, hasMore]);

  const handleToggleLike = useCallback(
    (post: SocialPostDto) => {
      if (!activeProfileId) return;
      guard(async () => {
        await toggleLike({ profileId: activeProfileId, targetType: 0, targetId: post.id });
      });
    },
    [activeProfileId, toggleLike, guard],
  );

  const handleToggleSave = useCallback(
    (post: SocialPostDto) => {
      if (!activeProfileId) return;
      guard(async () => {
        await toggleSave({ profileId: activeProfileId, postId: post.id });
      });
    },
    [activeProfileId, toggleSave, guard],
  );

  const renderItem = useCallback(
    ({ item, index }: { item: SocialPostDto; index: number }) => (
      <SocialReelItem
        post={item}
        isActive={index === activeIndex}
        liking={liking}
        saving={saving}
        height={viewportH}
        onToggleLike={() => handleToggleLike(item)}
        onToggleSave={() => handleToggleSave(item)}
        onOpenComments={() => {
          setCommentsPostId(item.id);
          setCommentsAllowWrite(!isPostManagedByActiveProfile(item, activeProfileId));
        }}
        onOpenShare={() => setSharePostId(item.id)}
      />
    ),
    [activeIndex, handleToggleLike, handleToggleSave, liking, saving, viewportH, activeProfileId],
  );

  const renderChrome = (onDark: boolean) => (
    <View style={styles.chrome} pointerEvents="box-none">
      <StatusBar barStyle={onDark ? 'light-content' : isDark ? 'light-content' : 'dark-content'} />
      <SocialReelsBackButton onDark={onDark} />
      <SocialReelsAddButton onDark={onDark} />
    </View>
  );

  const renderReelsToolbar = (onDark: boolean) => (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
      <View style={styles.toolbar}>
        <SocialReelsBackButton onDark={onDark} inline />
        <SocialReelsAddButton onDark={onDark} inline />
      </View>
    </SafeAreaView>
  );

  const onLayoutViewport = (h: number) => {
    if (h > 0 && Math.abs(h - viewportH) > 1) setViewportH(h);
  };

  const showInitialLoading = isUninitialized || (isLoading && reels.length === 0);
  const showEmpty = !showInitialLoading && !refreshing && !(isFetching && reels.length === 0) && reels.length === 0;
  const canScroll = reels.length > 1 || hasMore;

  if (showInitialLoading) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {renderReelsToolbar(false)}
        <View style={styles.emptyBody}>
          <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
        </View>
      </View>
    );
  }

  if (showEmpty) {
    return (
      <View style={[styles.screen, { backgroundColor: colors.screenBg }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        {renderReelsToolbar(false)}
        <View style={styles.emptyBody}>
          <SocialEmptyStateCard
            animationSource={SOCIAL_EMPTY_LOTTIES.reels}
            message={t('social.reelsEmpty')}
            animationSize={140}
            animationKey="social-reels-empty"
          />
        </View>
      </View>
    );
  }

  return (
    <View
      style={styles.screenVideo}
      onLayout={(e) => onLayoutViewport(e.nativeEvent.layout.height)}
    >
      <StatusBar barStyle="light-content" />
      <FlatList
        style={styles.list}
        data={reels}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        pagingEnabled={canScroll}
        scrollEnabled={canScroll}
        bounces={canScroll}
        showsVerticalScrollIndicator={false}
        snapToInterval={canScroll ? viewportH : undefined}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 80 }}
        onEndReached={hasMore ? handleLoadMore : undefined}
        onEndReachedThreshold={0.4}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={SOCIAL_ACCENT}
          />
        }
        getItemLayout={(_, index) => ({
          length: viewportH,
          offset: viewportH * index,
          index,
        })}
      />
      {renderChrome(true)}

      <SocialCommentsSheet
        postId={commentsPostId}
        allowComment={commentsAllowWrite}
        onClose={() => {
          setCommentsPostId(null);
          setCommentsAllowWrite(true);
        }}
      />
      <SocialShareToChatSheet
        target={sharePostId ? { kind: 'post', id: sharePostId } : null}
        onClose={() => setSharePostId(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 52,
  },
  emptyBody: {
    flex: 1,
    justifyContent: 'flex-start',
    paddingTop: 8,
    paddingBottom: 24,
  },
  screenVideo: {
    flex: 1,
    backgroundColor: '#000',
  },
  list: {
    flex: 1,
  },
  chrome: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
});
