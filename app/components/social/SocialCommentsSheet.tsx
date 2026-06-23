import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity, Platform } from 'react-native';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { SocialBottomSheet } from './SocialBottomSheet';
import { SocialCommentThread } from './SocialCommentThread';
import { SocialCommentComposer } from './SocialCommentComposer';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useFormatTime } from '../../utils/time/time-formatter';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useSocialLimits } from '../../hook/useSocialLimits';
import {
  useCreateSocialCommentMutation,
  useToggleSocialLikeMutation,
} from '../../store/api';
import type { SocialCommentDto } from '../../types/social';
import { SocialLikeTargetType } from '../../types/social';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type Props = {
  postId: string | null;
  /** false = yalnızca yorumları oku (kendi reels vb.) */
  allowComment?: boolean;
  onClose: () => void;
};

export const SocialCommentsSheet: React.FC<Props> = ({ postId, allowComment = true, onClose }) => {
  const sheet = useBottomSheet({ snapPoints: ['72%', '92%'], enableHandlePanningGesture: true });
  const { colors } = useTheme();
  const { t } = useLanguage();
  const formatTime = useFormatTime();
  const insets = useSafeAreaInsets();
  const dispatch = useAppDispatch();
  const { activeProfileId: myProfileId } = useActiveSocialProfile();
  const { limits } = useSocialLimits();
  const [text, setText] = useState('');
  const [replyingTo, setReplyingTo] = useState<SocialCommentDto | null>(null);
  const [createComment, { isLoading: sending }] = useCreateSocialCommentMutation();
  const [toggleCommentLike] = useToggleSocialLikeMutation();
  const canComment = allowComment && !!myProfileId;

  useEffect(() => {
    if (postId) {
      setText('');
      setReplyingTo(null);
      sheet.present();
    } else {
      sheet.dismiss();
    }
  }, [postId, sheet]);

  const handleDismiss = useCallback(() => {
    onClose();
  }, [onClose]);

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

  if (!postId) return null;

  return (
    <SocialBottomSheet sheet={sheet} onDismiss={handleDismiss} keyboardBehavior="interactive" keyboardBlurBehavior="restore">
      <View style={{ paddingHorizontal: 16, paddingTop: 4, paddingBottom: 10 }}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.headerText }}>{t('social.commentsTitle')}</Text>
      </View>

      {canComment ? (
        <>
          {replyingTo ? (
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingHorizontal: 14,
                paddingBottom: 6,
                backgroundColor: colors.cardBg2,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 12, flex: 1 }} numberOfLines={1}>
                {t('social.replyingTo', { user: replyingTo.profile.username })}
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)} hitSlop={10}>
                <Icon source="close" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          ) : null}
          <SocialCommentComposer
            value={text}
            onChangeText={setText}
            onSend={handleSend}
            maxLength={limits.commentMaxLength}
            placeholder={
              replyingTo
                ? t('social.replyPlaceholder', { user: replyingTo.profile.username })
                : t('social.commentPlaceholder')
            }
            editable={!!myProfileId}
            sending={sending}
            placement="header"
            bottomInset={0}
          />
        </>
      ) : null}

      <View
        style={{
          borderTopWidth: 1,
          borderTopColor: colors.borderColor2,
          flex: 1,
        }}
      >
        <BottomSheetScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: Math.max(insets.bottom, 12) + 8, paddingTop: 8 }}
          keyboardShouldPersistTaps="handled"
        >
          <SocialCommentThread
            postId={postId}
            myProfileId={myProfileId ?? null}
            formatTime={formatTime}
            onReply={canComment ? setReplyingTo : () => {}}
            onLike={handleCommentLike}
            canReply={canComment}
          />
        </BottomSheetScrollView>
      </View>
    </SocialBottomSheet>
  );
};
