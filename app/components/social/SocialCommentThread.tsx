import React, { useCallback, useRef, useState } from 'react';
import { View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { SocialMentionText } from './SocialMentionText';
import { SocialInlineEditSheet } from './SocialInlineEditSheet';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAlert } from '../../hook/useAlert';
import {
  useDeleteSocialCommentMutation,
  useGetSocialCommentsQuery,
  useLazyGetSocialCommentsQuery,
  useUpdateSocialCommentMutation,
} from '../../store/api';
import { useAppDispatch } from '../../store/hook';
import { showSnack } from '../../store/snackbarSlice';
import type { SocialCommentDto } from '../../types/social';
import { useSocialLimits } from '../../hook/useSocialLimits';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import {
  SOCIAL_COMMENTS_PAGE_SIZE,
  socialCommentsQuery,
} from '../../utils/social/social-pagination';

type CommentRowProps = {
  comment: SocialCommentDto;
  postId: string;
  myProfileId: string | null;
  depth?: number;
  formatTime: (iso: string) => string;
  onReply: (comment: SocialCommentDto) => void;
  onLike: (comment: SocialCommentDto) => void;
  onEdit: (comment: SocialCommentDto) => void;
  onDelete: (comment: SocialCommentDto) => void;
  canReply?: boolean;
};

const LoadMoreButton: React.FC<{ loading: boolean; onPress: () => void }> = ({ loading, onPress }) => {
  const { t } = useLanguage();
  if (loading) return <ActivityIndicator color={SOCIAL_ACCENT} className="my-2.5" />;
  return (
    <TouchableOpacity onPress={onPress} className="py-2.5 items-center">
      <Text className="text-[13px] font-semibold" style={{ color: SOCIAL_ACCENT }}>
        {t('social.loadMore')}
      </Text>
    </TouchableOpacity>
  );
};

const CommentReplies: React.FC<{
  postId: string;
  parentId: string;
  myProfileId: string | null;
  formatTime: (iso: string) => string;
  onReply: (comment: SocialCommentDto) => void;
  onLike: (comment: SocialCommentDto) => void;
  onEdit: (comment: SocialCommentDto) => void;
  onDelete: (comment: SocialCommentDto) => void;
  canReply?: boolean;
}> = ({ postId, parentId, myProfileId, formatTime, onReply, onLike, onEdit, onDelete, canReply = true }) => {
  const { colors } = useTheme();
  const queryArgs = socialCommentsQuery(postId, parentId);
  const { data: replies, isLoading } = useGetSocialCommentsQuery(queryArgs);
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialCommentsQuery();
  const loadingMoreRef = useRef(false);

  const handleLoadMore = useCallback(async () => {
    const list = replies ?? [];
    if (loadingMoreRef.current || isFetchingMore || list.length === 0) return;
    if (list.length % SOCIAL_COMMENTS_PAGE_SIZE !== 0) return;
    const last = list[list.length - 1];
    loadingMoreRef.current = true;
    try {
      await fetchMore({ ...queryArgs, before: last.createdAt, beforeId: last.id }).unwrap();
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [replies, isFetchingMore, fetchMore, queryArgs]);

  if (isLoading) {
    return <ActivityIndicator color={SOCIAL_ACCENT} className="my-2 ml-11" />;
  }

  const list = replies ?? [];
  const canLoadMore = list.length > 0 && list.length % SOCIAL_COMMENTS_PAGE_SIZE === 0;

  return (
    <View className="ml-7">
      {list.map((reply) => (
        <CommentRow
          key={reply.id}
          comment={reply}
          postId={postId}
          myProfileId={myProfileId}
          depth={1}
          formatTime={formatTime}
          onReply={onReply}
          onLike={onLike}
          onEdit={onEdit}
          onDelete={onDelete}
          canReply={canReply}
        />
      ))}
      {list.length === 0 && (
        <Text className="text-xs my-1.5 ml-4" style={{ color: colors.textSecondary }}>
          —
        </Text>
      )}
      {canLoadMore ? <LoadMoreButton loading={isFetchingMore} onPress={handleLoadMore} /> : null}
    </View>
  );
};

const CommentRow: React.FC<CommentRowProps> = ({
  comment,
  postId,
  myProfileId,
  depth = 0,
  formatTime,
  onReply,
  onLike,
  onEdit,
  onDelete,
  canReply = true,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const [expanded, setExpanded] = useState(false);
  const isReply = depth > 0;
  const isOwn = !!myProfileId && comment.profile.id === myProfileId;
  const avatarSize = isReply ? 30 : 36;

  return (
    <View
      className="px-4 py-2.5"
      style={{
        borderBottomWidth: isReply ? 0 : 1,
        borderBottomColor: colors.borderColor2,
      }}
    >
      <View className="flex-row">
        <View
          className="items-center justify-center mr-2.5 overflow-hidden"
          style={{
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
          }}
        >
          {comment.profile.avatarUrl ? (
            <Image
              source={{ uri: comment.profile.avatarUrl }}
              className="w-full h-full"
              style={{ width: avatarSize, height: avatarSize, borderRadius: avatarSize / 2 }}
            />
          ) : (
            <Icon source="account" size={isReply ? 16 : 18} color={colors.headerText} />
          )}
        </View>
        <View className="flex-1">
          <View className="flex-row items-center gap-2">
            <Text
              className="font-bold"
              style={{ color: colors.headerText, fontSize: isReply ? 12 : 13 }}
            >
              @{comment.profile.username}
            </Text>
            <Text className="text-[11px]" style={{ color: colors.textSecondary }}>
              {formatTime(comment.createdAt)}
            </Text>
          </View>
          <SocialMentionText
            text={comment.text}
            style={{ marginTop: 4, color: colors.headerText, fontSize: isReply ? 13 : 14 }}
          />
          <View className="flex-row items-center mt-1.5 gap-4">
            <TouchableOpacity onPress={() => onLike(comment)} className="flex-row items-center gap-1">
              <Icon
                source={comment.isLiked ? 'thumb-up' : 'thumb-up-outline'}
                size={16}
                color={comment.isLiked ? SOCIAL_ACCENT : colors.textSecondary}
              />
              {comment.likeCount > 0 && (
                <Text className="text-xs" style={{ color: colors.textSecondary }}>
                  {comment.likeCount}
                </Text>
              )}
            </TouchableOpacity>
            {!isReply && canReply && (
              <TouchableOpacity onPress={() => onReply(comment)}>
                <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                  {t('social.reply')}
                </Text>
              </TouchableOpacity>
            )}
            {isOwn && (
              <>
                <TouchableOpacity onPress={() => onEdit(comment)}>
                  <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                    {t('social.edit')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => onDelete(comment)}>
                  <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                    {t('social.delete')}
                  </Text>
                </TouchableOpacity>
              </>
            )}
          </View>
          {!isReply && comment.replyCount > 0 && (
            <TouchableOpacity onPress={() => setExpanded((v) => !v)} className="mt-2">
              <Text className="text-xs font-semibold" style={{ color: colors.textSecondary }}>
                {expanded
                  ? t('social.hideReplies')
                  : t('social.viewReplies', { count: comment.replyCount })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
      {!isReply && expanded && (
        <CommentReplies
          postId={postId}
          parentId={comment.id}
          myProfileId={myProfileId}
          formatTime={formatTime}
          onReply={onReply}
          onLike={onLike}
          onEdit={onEdit}
          onDelete={onDelete}
          canReply={canReply}
        />
      )}
    </View>
  );
};

type Props = {
  postId: string;
  myProfileId: string | null;
  formatTime: (iso: string) => string;
  onReply: (comment: SocialCommentDto) => void;
  onLike: (comment: SocialCommentDto) => void;
  isLoading?: boolean;
  canReply?: boolean;
};

export const SocialCommentThread: React.FC<Props> = ({
  postId,
  myProfileId,
  formatTime,
  onReply,
  onLike,
  isLoading: externalLoading,
  canReply = true,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const { confirm } = useAlert();
  const dispatch = useAppDispatch();
  const { limits } = useSocialLimits();
  const queryArgs = socialCommentsQuery(postId);
  const { data: comments, isLoading } = useGetSocialCommentsQuery(queryArgs);
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialCommentsQuery();
  const [updateComment, { isLoading: updating }] = useUpdateSocialCommentMutation();
  const [deleteComment] = useDeleteSocialCommentMutation();
  const loadingMoreRef = useRef(false);
  const [editingComment, setEditingComment] = useState<SocialCommentDto | null>(null);
  const [editText, setEditText] = useState('');

  const handleEditOpen = useCallback((comment: SocialCommentDto) => {
    setEditingComment(comment);
    setEditText(comment.text);
  }, []);

  const handleEditClose = useCallback(() => {
    setEditingComment(null);
    setEditText('');
  }, []);

  const handleEditSave = useCallback(async () => {
    if (!editingComment || !myProfileId) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    try {
      const res = await updateComment({
        commentId: editingComment.id,
        profileId: myProfileId,
        text: trimmed,
        postId: editingComment.postId,
        parentCommentId: editingComment.parentCommentId,
      }).unwrap();
      if (res?.success) {
        dispatch(showSnack({ message: t('social.commentUpdated'), isError: false }));
        handleEditClose();
        return;
      }
      dispatch(
        showSnack({
          message: translateSocialApiMessage(res?.message, t, t('social.commentUpdateFailed')),
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
          message: translateSocialApiMessage(msg, t, t('social.commentUpdateFailed')),
          isError: true,
        }),
      );
    }
  }, [editingComment, myProfileId, editText, updateComment, dispatch, t, handleEditClose]);

  const handleDelete = useCallback(
    (comment: SocialCommentDto) => {
      if (!myProfileId) return;
      confirm(
        t('social.deleteCommentTitle'),
        t('social.deleteCommentMessage'),
        async () => {
          try {
            const res = await deleteComment({
              commentId: comment.id,
              profileId: myProfileId,
              postId: comment.postId,
              parentCommentId: comment.parentCommentId,
            }).unwrap();
            if (res?.success) {
              dispatch(showSnack({ message: t('social.commentDeleted'), isError: false }));
            }
          } catch {
            dispatch(showSnack({ message: t('social.commentDeleteFailed'), isError: true }));
          }
        },
        undefined,
        t('social.delete'),
        t('common.cancel'),
      );
    },
    [myProfileId, confirm, deleteComment, dispatch, t],
  );

  const handleLoadMore = useCallback(async () => {
    const list = comments ?? [];
    if (loadingMoreRef.current || isFetchingMore || list.length === 0) return;
    if (list.length % SOCIAL_COMMENTS_PAGE_SIZE !== 0) return;
    const last = list[list.length - 1];
    loadingMoreRef.current = true;
    try {
      await fetchMore({ ...queryArgs, before: last.createdAt, beforeId: last.id }).unwrap();
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [comments, isFetchingMore, fetchMore, queryArgs]);

  if (isLoading || externalLoading) {
    return <ActivityIndicator color={SOCIAL_ACCENT} className="my-4" />;
  }

  if (!comments?.length) {
    return (
      <Text className="text-center p-5" style={{ color: colors.textSecondary }}>
        {t('social.commentsEmpty')}
      </Text>
    );
  }

  const canLoadMore = comments.length % SOCIAL_COMMENTS_PAGE_SIZE === 0;

  return (
    <>
      {comments.map((comment) => (
        <CommentRow
          key={comment.id}
          comment={comment}
          postId={postId}
          myProfileId={myProfileId}
          formatTime={formatTime}
          onReply={onReply}
          onLike={onLike}
          onEdit={handleEditOpen}
          onDelete={handleDelete}
          canReply={canReply}
        />
      ))}
      {canLoadMore ? <LoadMoreButton loading={isFetchingMore} onPress={handleLoadMore} /> : null}
      <SocialInlineEditSheet
        visible={!!editingComment}
        title={t('social.editCommentTitle')}
        value={editText}
        onChangeText={setEditText}
        onClose={handleEditClose}
        onSave={handleEditSave}
        saving={updating}
        placeholder={t('social.commentPlaceholder')}
        maxLength={limits.commentMaxLength}
      />
    </>
  );
};
