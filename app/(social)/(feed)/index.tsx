import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, FlatList, ActivityIndicator, RefreshControl, ViewToken } from 'react-native';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { SOCIAL_EMPTY_LOTTIES } from '../../constants/socialAnimations';
import { SocialFeedHeader } from '../../components/social/SocialFeedHeader';
import { SocialFeedPostCard } from '../../components/social/SocialFeedPostCard';
import { SocialEmptyStateCard } from '../../components/social/SocialEmptyStateCard';
import { SocialInlineEditSheet } from '../../components/social/SocialInlineEditSheet';
import { SocialCommentsSheet } from '../../components/social/SocialCommentsSheet';
import { SocialShareToChatSheet } from '../../components/social/SocialShareToChatSheet';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAlert } from '../../hook/useAlert';
import { useActionGuard } from '../../hook/useActionGuard';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useSocialLimits } from '../../hook/useSocialLimits';
import {
  requestSocialFeedFullCacheReplace,
  useDeleteSocialPostMutation,
  useGetSocialFeedQuery,
  useLazyGetSocialFeedQuery,
  useRecordSocialPostViewMutation,
  useToggleSocialLikeMutation,
  useToggleSocialSaveMutation,
  useUpdateSocialPostMutation,
} from '../../store/api';
import type { SocialPostDto } from '../../types/social';
import { PANEL_FLAT_LIST_PERF } from '../../constants/panelFlatListPerf';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { isPostManagedByActiveProfile } from '../../utils/social/socialActiveProfileScope';

const FEED_PAGE_SIZE = 20;

export default function SocialFeedScreen() {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { confirm } = useAlert();
  const dispatch = useAppDispatch();
  const guard = useActionGuard();
  const { activeProfileId } = useActiveSocialProfile();
  const { data: posts, isLoading, isFetching, refetch, error } = useGetSocialFeedQuery({
    limit: FEED_PAGE_SIZE,
  });
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialFeedQuery();
  const [toggleLike, { isLoading: liking }] = useToggleSocialLikeMutation();
  const [toggleSave, { isLoading: saving }] = useToggleSocialSaveMutation();
  const [deletePost, { isLoading: deleting }] = useDeleteSocialPostMutation();
  const [updatePost, { isLoading: updatingCaption }] = useUpdateSocialPostMutation();
  const { limits } = useSocialLimits();
  const [refreshing, setRefreshing] = useState(false);
  const [visiblePostIds, setVisiblePostIds] = useState<Set<string>>(() => new Set());
  const [editingPost, setEditingPost] = useState<SocialPostDto | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const loadingMoreRef = useRef(false);
  const recordedViewIdsRef = useRef(new Set<string>());
  const [recordPostView] = useRecordSocialPostViewMutation();

  useEffect(() => {
    if (!activeProfileId || visiblePostIds.size === 0) return;
    visiblePostIds.forEach((postId) => {
      if (recordedViewIdsRef.current.has(postId)) return;
      recordedViewIdsRef.current.add(postId);
      recordPostView({ postId, profileId: activeProfileId }).catch(() => {});
    });
  }, [visiblePostIds, activeProfileId, recordPostView]);

  const onViewableItemsChanged = useRef(({ viewableItems }: { viewableItems: ViewToken[] }) => {
    const ids = viewableItems
      .map((v) => (v.item as SocialPostDto | undefined)?.id)
      .filter((id): id is string => !!id);
    setVisiblePostIds(new Set(ids));
  }).current;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setHasMore(true);
    try {
      requestSocialFeedFullCacheReplace();
      await refetch();
    } finally {
      setRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || loadingMoreRef.current || isFetching || isFetchingMore || !posts?.length) return;
    const last = posts[posts.length - 1];
    if (!last?.createdAt) return;
    loadingMoreRef.current = true;
    try {
      const prevLen = posts.length;
      const batch = await fetchMore({
        before: last.createdAt,
        beforeId: last.id,
        limit: FEED_PAGE_SIZE,
      }).unwrap();
      if (!batch?.length || batch.length < FEED_PAGE_SIZE) setHasMore(false);
      else if (posts.length === prevLen) setHasMore(false);
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [posts, isFetching, isFetchingMore, fetchMore, hasMore]);

  const handleToggleLike = useCallback(
    (post: SocialPostDto) => {
      if (!activeProfileId) return;
      guard(async () => {
        await toggleLike({
          profileId: activeProfileId,
          targetType: 0,
          targetId: post.id,
        });
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

  const handleDeletePost = useCallback(
    (post: SocialPostDto) => {
      confirm(
        t('social.deletePostTitle'),
        t('social.deletePostMessage'),
        () =>
          guard(async () => {
            try {
              const res = await deletePost(post.id).unwrap();
              if (res?.success) {
                dispatch(showSnack({ message: t('social.postDeleted'), isError: false }));
              }
            } catch {
              dispatch(showSnack({ message: t('social.postDeleteFailed'), isError: true }));
            }
          }),
        undefined,
        t('social.delete'),
        t('common.cancel'),
      );
    },
    [confirm, deletePost, dispatch, t, guard],
  );

  const handleEditPost = useCallback((post: SocialPostDto) => {
    setEditingPost(post);
    setEditCaption(post.caption ?? '');
  }, []);

  const handleCloseEdit = useCallback(() => {
    setEditingPost(null);
    setEditCaption('');
  }, []);

  const handleSaveCaption = useCallback(async () => {
    if (!editingPost) return;
    await guard(async () => {
      try {
        const res = await updatePost({
          postId: editingPost.id,
          caption: editCaption,
        }).unwrap();
        if (res?.success) {
          dispatch(showSnack({ message: t('social.postUpdated'), isError: false }));
          handleCloseEdit();
          return;
        }
        dispatch(
          showSnack({
            message: translateSocialApiMessage(res?.message, t, t('social.postUpdateFailed')),
            isError: true,
          }),
        );
      } catch (e: unknown) {
        const msg =
          e && typeof e === 'object' && 'data' in e
            ? (e as { data?: { message?: string } }).data?.message
            : undefined;
        dispatch(
          showSnack({
            message: translateSocialApiMessage(msg, t, t('social.postUpdateFailed')),
            isError: true,
          }),
        );
      }
    });
  }, [editingPost, editCaption, updatePost, dispatch, t, handleCloseEdit, guard]);

  const renderItem = useCallback(
    ({ item }: { item: SocialPostDto }) => {
      const canManage = isPostManagedByActiveProfile(item, activeProfileId);
      return (
      <SocialFeedPostCard
        post={item}
        isVisible={visiblePostIds.has(item.id)}
        liking={liking}
        saving={saving}
        deleting={deleting}
        editing={updatingCaption && editingPost?.id === item.id}
        onToggleLike={() => handleToggleLike(item)}
        onToggleSave={() => handleToggleSave(item)}
        onEdit={canManage ? () => handleEditPost(item) : undefined}
        onDelete={canManage ? () => handleDeletePost(item) : undefined}
        onOpenComments={() => setCommentsPostId(item.id)}
        onOpenShare={() => setSharePostId(item.id)}
      />
      );
    },
    [
      handleToggleLike,
      handleToggleSave,
      handleDeletePost,
      handleEditPost,
      liking,
      saving,
      deleting,
      updatingCaption,
      editingPost?.id,
      visiblePostIds,
      activeProfileId,
    ],
  );

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center" style={{ backgroundColor: colors.screenBg }}>
        <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SocialFeedHeader />

      <FlatList
        data={posts ?? []}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 55 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing || (isFetching && !isFetchingMore)}
            onRefresh={onRefresh}
            tintColor={SOCIAL_ACCENT}
          />
        }
        ListFooterComponent={
          isFetchingMore && hasMore ? (
            <ActivityIndicator style={{ marginVertical: 20 }} color={SOCIAL_ACCENT} />
          ) : null
        }
        ListEmptyComponent={
          <SocialEmptyStateCard
            animationSource={SOCIAL_EMPTY_LOTTIES.post}
            message={error ? t('social.feedError') : t('social.feedEmpty')}
            animationSize={140}
            animationKey="social-feed-empty"
          />
        }
        {...PANEL_FLAT_LIST_PERF}
      />

      <SocialInlineEditSheet
        visible={!!editingPost}
        title={t('social.editPostTitle')}
        value={editCaption}
        onChangeText={setEditCaption}
        onClose={handleCloseEdit}
        onSave={handleSaveCaption}
        saving={updatingCaption}
        placeholder={t('social.captionPlaceholder')}
        maxLength={limits.commentMaxLength}
      />

      <SocialCommentsSheet postId={commentsPostId} onClose={() => setCommentsPostId(null)} />
      <SocialShareToChatSheet
        target={sharePostId ? { kind: 'post', id: sharePostId } : null}
        onClose={() => setSharePostId(null)}
      />
    </View>
  );
}
