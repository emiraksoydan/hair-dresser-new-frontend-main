import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  View,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Dimensions,
} from 'react-native';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/common/Text';
import { SocialFeedMedia } from '../../components/social/SocialFeedMedia';
import { SocialPostAuthorRow } from '../../components/social/SocialPostAuthorRow';
import { SocialShareToChatSheet } from '../../components/social/SocialShareToChatSheet';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAlert } from '../../hook/useAlert';
import {
  useCreateSocialCommentMutation,
  useDeleteSocialPostMutation,
  useUpdateSocialPostMutation,
  useGetSocialPostQuery,
  usePinSocialPostMutation,
  useRecordSocialPostViewMutation,
  useToggleSocialLikeMutation,
  useToggleSocialSaveMutation,
  useUnpinSocialPostMutation,
} from '../../store/api';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import type { SocialCommentDto } from '../../types/social';
import { SocialLikeTargetType } from '../../types/social';
import { useFormatTime } from '../../utils/time/time-formatter';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useSocialLimits } from '../../hook/useSocialLimits';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { isPostManagedByActiveProfile } from '../../utils/social/socialActiveProfileScope';
import { SocialCommentThread } from '../../components/social/SocialCommentThread';
import { SocialCommentComposer } from '../../components/social/SocialCommentComposer';
import { KeyboardDismissExclusionView } from '../../components/common/KeyboardDismissExclusionView';
import { SocialMentionText } from '../../components/social/SocialMentionText';
import { SocialInlineEditSheet } from '../../components/social/SocialInlineEditSheet';
import { formatSocialCount } from '../../utils/formatSocialCount';

const CARD_WIDTH = Dimensions.get('window').width;

export default function SocialPostDetailScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { confirm } = useAlert();
  const dispatch = useAppDispatch();
  const router = useSafeNavigation();
  const insets = useSafeAreaInsets();
  const formatTime = useFormatTime();
  const params = useLocalSearchParams<{ postId?: string }>();
  const postId = String(params.postId ?? '');

  const { data: post, isLoading: postLoading } = useGetSocialPostQuery(postId, { skip: !postId });
  const [recordView] = useRecordSocialPostViewMutation();
  const viewRecorded = useRef(false);
  const { activeProfileId: myProfileId } = useActiveSocialProfile();
  const canManagePost = post ? isPostManagedByActiveProfile(post, myProfileId) : false;

  useEffect(() => {
    if (!postId || !myProfileId || viewRecorded.current) return;
    viewRecorded.current = true;
    recordView({ postId, profileId: myProfileId }).catch(() => {});
  }, [postId, myProfileId, recordView]);
  const { limits } = useSocialLimits();

  const [toggleLike, { isLoading: likingPost }] = useToggleSocialLikeMutation();
  const [toggleSave, { isLoading: savingPost }] = useToggleSocialSaveMutation();
  const [toggleCommentLike] = useToggleSocialLikeMutation();
  const [createComment, { isLoading: sending }] = useCreateSocialCommentMutation();
  const [deletePost, { isLoading: deleting }] = useDeleteSocialPostMutation();
  const [updatePost, { isLoading: updatingCaption }] = useUpdateSocialPostMutation();
  const [pinPost, { isLoading: pinning }] = usePinSocialPostMutation();
  const [unpinPost, { isLoading: unpinning }] = useUnpinSocialPostMutation();
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<SocialCommentDto | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [editCaption, setEditCaption] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  const openEditCaption = useCallback(() => {
    if (!post) return;
    setEditCaption(post.caption ?? '');
    setEditVisible(true);
  }, [post]);

  const handleSaveCaption = useCallback(async () => {
    if (!post) return;
    try {
      const res = await updatePost({
        postId: post.id,
        caption: editCaption,
      }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.postUpdated'), isError: false }));
        setEditVisible(false);
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
  }, [post, updatePost, editCaption, dispatch, t]);

  const handleDeletePost = useCallback(() => {
    if (!post) return;
    confirm(
      t('social.deletePostTitle'),
      t('social.deletePostMessage'),
      async () => {
        try {
          const res = await deletePost(post.id).unwrap();
          if (res?.success) {
            dispatch(showSnack({ message: t('social.postDeleted'), isError: false }));
            router.back();
          }
        } catch {
          dispatch(showSnack({ message: t('social.postDeleteFailed'), isError: true }));
        }
      },
      undefined,
      t('social.delete'),
      t('common.cancel'),
    );
  }, [post, confirm, deletePost, dispatch, t, router]);

  const handleTogglePin = useCallback(async () => {
    if (!post) return;
    try {
      if (post.isPinned) {
        await unpinPost(post.id).unwrap();
        dispatch(showSnack({ message: t('social.postUnpinned'), isError: false }));
      } else {
        await pinPost(post.id).unwrap();
        dispatch(showSnack({ message: t('social.postPinned'), isError: false }));
      }
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e
          ? (e as { data?: { message?: string } }).data?.message
          : undefined;
      dispatch(
        showSnack({
          message: translateSocialApiMessage(msg, t, t('social.postDeleteFailed')),
          isError: true,
        }),
      );
    }
  }, [post, pinPost, unpinPost, dispatch, t]);

  const handlePostLike = useCallback(async () => {
    if (!myProfileId || !post) return;
    await toggleLike({ profileId: myProfileId, targetType: SocialLikeTargetType.Post, targetId: post.id });
  }, [myProfileId, post, toggleLike]);

  const handlePostSave = useCallback(async () => {
    if (!myProfileId || !post) return;
    await toggleSave({ profileId: myProfileId, postId: post.id });
  }, [myProfileId, post, toggleSave]);

  const handleCommentLike = useCallback(
    async (comment: SocialCommentDto) => {
      if (!myProfileId) return;
      await toggleCommentLike({
        profileId: myProfileId,
        targetType: SocialLikeTargetType.Comment,
        targetId: comment.id,
      });
    },
    [myProfileId, toggleCommentLike],
  );

  const handleReply = useCallback((comment: SocialCommentDto) => {
    setReplyingTo(comment);
  }, []);

  const handleSend = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed || !myProfileId || !postId) return;
    try {
      await createComment({
        profileId: myProfileId,
        postId,
        text: trimmed,
        parentCommentId: replyingTo?.id,
      }).unwrap();
      setText('');
      setReplyingTo(null);
    } catch (e: unknown) {
      const msg =
        e && typeof e === 'object' && 'data' in e
          ? (e as { data?: { message?: string } }).data?.message
          : undefined;
      dispatch(
        showSnack({
          message: translateSocialApiMessage(msg, t, t('social.commentFailed')),
          isError: true,
        }),
      );
    }
  }, [text, myProfileId, postId, replyingTo, createComment, dispatch, t]);

  if (postLoading || !postId) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.screenBg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
      </View>
    );
  }

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
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 17, fontWeight: '700', color: colors.headerText }}>
          {t('social.postDetail')}
        </Text>
        {canManagePost && post ? (
          <>
            <TouchableOpacity
              onPress={openEditCaption}
              hitSlop={12}
              style={{ marginRight: 8 }}
              accessibilityLabel={t('social.editPostCaption')}
            >
              <Icon source="pencil-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleTogglePin}
              disabled={pinning || unpinning}
              hitSlop={12}
              style={{ marginRight: 8 }}
            >
              <Icon
                source={post.isPinned ? 'pin-off-outline' : 'pin-outline'}
                size={24}
                color={colors.textSecondary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleDeletePost} disabled={deleting} hitSlop={12}>
              <Icon source="delete-outline" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 44 : 0}
      >
        <KeyboardDismissExclusionView style={{ flex: 1 }}>
          <ScrollView
            contentContainerStyle={{ paddingBottom: 12 }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            nestedScrollEnabled
          >
          {post && (
            <View style={{ marginBottom: 8 }}>
              <View style={{ paddingHorizontal: 14, paddingTop: 12, paddingBottom: 8 }}>
                <SocialPostAuthorRow
                  profile={post.profile}
                  onPress={() =>
                    router.push({
                      pathname: '/(screens)/social/profile-view',
                      params: { profileId: post.profileId },
                    } as any)
                  }
                />
              </View>

              <SocialFeedMedia post={post} width={CARD_WIDTH} height={CARD_WIDTH} isVisible />

              <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingTop: 12, gap: 16 }}>
                <TouchableOpacity onPress={handlePostLike} disabled={likingPost} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon
                    source={post.isLiked ? 'thumb-up' : 'thumb-up-outline'}
                    size={26}
                    color={post.isLiked ? SOCIAL_ACCENT : colors.headerText}
                  />
                  {post.likeCount > 0 && (
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.headerText }}>
                      {formatSocialCount(post.likeCount)}
                    </Text>
                  )}
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Icon source="comment-outline" size={24} color={colors.headerText} />
                  {post.commentCount > 0 && (
                    <Text style={{ fontSize: 13, fontWeight: '600', color: colors.headerText }}>
                      {formatSocialCount(post.commentCount)}
                    </Text>
                  )}
                </View>
                <TouchableOpacity onPress={() => setShareOpen(true)}>
                  <Icon source="share-variant-outline" size={24} color={colors.headerText} />
                </TouchableOpacity>
                <View style={{ flex: 1 }} />
                {myProfileId && (
                  <TouchableOpacity onPress={handlePostSave} disabled={savingPost} hitSlop={8}>
                    <Icon
                      source={post.isSaved ? 'bookmark' : 'bookmark-outline'}
                      size={24}
                      color={post.isSaved ? SOCIAL_ACCENT : colors.headerText}
                    />
                  </TouchableOpacity>
                )}
                {post.viewCount > 0 && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Icon source="eye-outline" size={20} color={colors.textSecondary} />
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                      {formatSocialCount(post.viewCount)}
                    </Text>
                  </View>
                )}
              </View>

              {!!post.caption && (
                <View style={{ paddingHorizontal: 14, paddingTop: 6, flexDirection: 'row', flexWrap: 'wrap' }}>
                  <Text style={{ fontWeight: '700', color: colors.headerText, fontSize: 14 }}>{post.profile.username} </Text>
                  <SocialMentionText text={post.caption} style={{ color: colors.headerText, fontSize: 14, flex: 1 }} />
                </View>
              )}

              <Text
                style={{
                  paddingHorizontal: 14,
                  paddingTop: 16,
                  paddingBottom: 8,
                  fontWeight: '700',
                  color: colors.headerText,
                  fontSize: 15,
                }}
              >
                {t('social.commentsTitle')}
              </Text>
            </View>
          )}

          <SocialCommentThread
            postId={postId}
            myProfileId={myProfileId ?? null}
            formatTime={formatTime}
            onReply={handleReply}
            onLike={handleCommentLike}
          />
          </ScrollView>
        </KeyboardDismissExclusionView>

        {replyingTo && (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingHorizontal: 14,
              paddingVertical: 8,
              backgroundColor: isDark ? '#1f2937' : '#f8fafc',
              borderTopWidth: 1,
              borderTopColor: colors.borderColor2,
            }}
          >
            <Text style={{ color: colors.textSecondary, fontSize: 13, flex: 1 }} numberOfLines={1}>
              {t('social.replyingTo', { user: replyingTo.profile.username })}
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={12}>
              <Icon source="close" size={18} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}

        <SocialCommentComposer
          value={text}
          onChangeText={setText}
          onSend={handleSend}
          maxLength={limits.commentMaxLength}
          placeholder={
            replyingTo
              ? t('social.replyPlaceholder', { user: replyingTo.profile.username })
              : myProfileId
                ? t('social.commentPlaceholder')
                : t('social.noProfile')
          }
          editable={!!myProfileId}
          sending={sending}
          bottomInset={insets.bottom}
        />
      </KeyboardAvoidingView>

      <SocialInlineEditSheet
        visible={editVisible}
        title={t('social.editPostTitle')}
        value={editCaption}
        onChangeText={setEditCaption}
        onClose={() => setEditVisible(false)}
        onSave={handleSaveCaption}
        saving={updatingCaption}
        placeholder={t('social.captionPlaceholder')}
        maxLength={limits.commentMaxLength}
      />

      <SocialShareToChatSheet
        target={shareOpen && post ? { kind: 'post', id: post.id } : null}
        onClose={() => setShareOpen(false)}
      />
    </SafeAreaView>
  );
}
