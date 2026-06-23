import React, { useCallback, useEffect, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Icon } from 'react-native-paper';
import { SocialReelItem } from '../../components/social/SocialReelItem';
import { SocialCommentsSheet } from '../../components/social/SocialCommentsSheet';
import { SocialShareToChatSheet } from '../../components/social/SocialShareToChatSheet';
import {
  useDeleteSocialPostMutation,
  useGetSocialPostQuery,
  useRecordSocialPostViewMutation,
  useToggleSocialLikeMutation,
  useToggleSocialSaveMutation,
} from '../../store/api';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useActionGuard } from '../../hook/useActionGuard';
import { useAlert } from '../../hook/useAlert';
import { useLanguage } from '../../hook/useLanguage';
import { useAppDispatch } from '../../store/hook';
import { showSnack } from '../../store/snackbarSlice';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { isPostManagedByActiveProfile } from '../../utils/social/socialActiveProfileScope';

export default function SocialReelViewScreen() {
  const router = useSafeNavigation();
  const { postId } = useLocalSearchParams<{ postId?: string }>();
  const id = postId ? String(postId) : '';
  const { data: post, isLoading } = useGetSocialPostQuery(id, { skip: !id });
  const { activeProfileId } = useActiveSocialProfile();
  const guard = useActionGuard();
  const { confirm } = useAlert();
  const { t } = useLanguage();
  const dispatch = useAppDispatch();
  const [toggleLike, { isLoading: liking }] = useToggleSocialLikeMutation();
  const [toggleSave, { isLoading: saving }] = useToggleSocialSaveMutation();
  const [deletePost, { isLoading: deleting }] = useDeleteSocialPostMutation();
  const [commentsPostId, setCommentsPostId] = useState<string | null>(null);
  const [sharePostId, setSharePostId] = useState<string | null>(null);
  const [recordPostView] = useRecordSocialPostViewMutation();

  useEffect(() => {
    if (!post?.id || !activeProfileId) return;
    recordPostView({ postId: post.id, profileId: activeProfileId }).catch(() => {});
  }, [post?.id, activeProfileId, recordPostView]);

  const handleToggleLike = useCallback(() => {
    guard(async () => {
      if (!activeProfileId || !post) return;
      await toggleLike({ profileId: activeProfileId, targetType: 0, targetId: post.id });
    });
  }, [activeProfileId, post, toggleLike, guard]);

  const handleToggleSave = useCallback(() => {
    guard(async () => {
      if (!activeProfileId || !post) return;
      await toggleSave({ profileId: activeProfileId, postId: post.id });
    });
  }, [activeProfileId, post, toggleSave, guard]);

  const canManagePost = post ? isPostManagedByActiveProfile(post, activeProfileId) : false;

  const handleDeleteReel = useCallback(() => {
    if (!canManagePost || !post) return;
    confirm(
      t('social.deletePostTitle'),
      t('social.deletePostMessage'),
      () =>
        guard(async () => {
          try {
            const res = await deletePost(post.id).unwrap();
            if (res?.success) {
              dispatch(showSnack({ message: t('social.postDeleted'), isError: false }));
              router.back();
            }
          } catch {
            dispatch(showSnack({ message: t('social.postDeleteFailed'), isError: true }));
          }
        }),
      undefined,
      t('social.delete'),
      t('common.cancel'),
    );
  }, [canManagePost, post, confirm, guard, deletePost, dispatch, t, router]);

  if (isLoading || !post) {
    return (
      <View className="flex-1 bg-black items-center justify-center">
        <ActivityIndicator color={SOCIAL_ACCENT} size="large" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-black">
      <SocialReelItem
        post={post}
        isActive
        liking={liking}
        saving={saving}
        onToggleLike={handleToggleLike}
        onToggleSave={handleToggleSave}
        onOpenComments={() => setCommentsPostId(post.id)}
        onOpenShare={() => setSharePostId(post.id)}
      />
      <SafeAreaView edges={['top']} className="absolute top-0 left-0 right-0">
        <View className="flex-row items-center justify-between px-2 pt-1">
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={12}
            className="m-1 w-10 h-10 rounded-full items-center justify-center bg-black/45"
          >
            <Icon source="arrow-left" size={24} color="#fff" />
          </TouchableOpacity>
          {canManagePost ? (
            <TouchableOpacity
              onPress={handleDeleteReel}
              disabled={deleting}
              hitSlop={12}
              className="m-1 w-10 h-10 rounded-full items-center justify-center bg-black/45"
              accessibilityLabel={t('social.delete')}
            >
              <Icon source="delete-outline" size={22} color="#fff" />
            </TouchableOpacity>
          ) : (
            <View className="w-10 h-10 m-1" />
          )}
        </View>
      </SafeAreaView>
      <SocialCommentsSheet
        postId={commentsPostId}
        allowComment={!canManagePost}
        onClose={() => setCommentsPostId(null)}
      />
      <SocialShareToChatSheet
        target={sharePostId ? { kind: 'post', id: sharePostId } : null}
        onClose={() => setSharePostId(null)}
      />
    </View>
  );
}
