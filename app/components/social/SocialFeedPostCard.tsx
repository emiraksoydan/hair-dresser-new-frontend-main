import React, { useCallback } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, TouchableOpacity, Dimensions, StyleSheet } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { SocialFeedMedia } from './SocialFeedMedia';
import { SocialMentionText } from './SocialMentionText';
import { SocialPostAuthorRow } from './SocialPostAuthorRow';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import type { SocialPostDto } from '../../types/social';
import { SOCIAL_ACCENT, SOCIAL_PAIR_BLUE, SOCIAL_POST_ACTION } from '../../constants/socialTheme';
import { formatSocialCount } from '../../utils/formatSocialCount';
import { resolveSocialPostAuthorProfile } from '../../utils/social/resolveSocialPostAuthorProfile';
import { isPostManagedByActiveProfile } from '../../utils/social/socialActiveProfileScope';

const CARD_WIDTH = Dimensions.get('window').width;
const ACTION_SIZE = 38;

type ActionButtonProps = {
  icon: string;
  color: string;
  bg: string;
  count?: number;
  countColor?: string;
  active?: boolean;
  activeBg?: string;
  onPress?: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
};

function PostActionButton({
  icon,
  color,
  bg,
  count,
  countColor,
  active,
  activeBg,
  onPress,
  disabled,
  accessibilityLabel,
}: ActionButtonProps) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      hitSlop={6}
      accessibilityLabel={accessibilityLabel}
      style={styles.actionHit}
    >
      <View
        style={[
          styles.actionCircle,
          {
            backgroundColor: active ? (activeBg ?? bg) : isDark ? 'rgba(255,255,255,0.06)' : bg,
          },
        ]}
      >
        <Icon source={icon} size={22} color={color} />
      </View>
      {count != null && count > 0 ? (
        <Text style={[styles.actionCount, { color: countColor ?? colors.headerText }]}>
          {formatSocialCount(count)}
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

type Props = {
  post: SocialPostDto;
  isVisible?: boolean;
  onToggleLike?: () => void;
  onToggleSave?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onOpenComments?: () => void;
  onOpenShare?: () => void;
  liking?: boolean;
  saving?: boolean;
  deleting?: boolean;
  editing?: boolean;
};

export const SocialFeedPostCard: React.FC<Props> = React.memo(({
  post,
  isVisible,
  onToggleLike,
  onToggleSave,
  onEdit,
  onDelete,
  onOpenComments,
  onOpenShare,
  liking,
  saving,
  deleting,
  editing,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { activeProfile } = useActiveSocialProfile();
  const router = useSafeNavigation();
  const authorProfile = resolveSocialPostAuthorProfile(post, activeProfile);
  const showOwnBadge = isPostManagedByActiveProfile(post, activeProfile?.id);

  const openProfile = useCallback(() => {
    router.push({
      pathname: '/(screens)/social/profile-view',
      params: { profileId: post.profileId },
    } as any);
  }, [router, post.profileId]);

  return (
    <View style={{ marginBottom: 10, backgroundColor: colors.cardBg }}>
      <View className="flex-row items-start px-3.5 py-2.5">
        <View style={{ flex: 1 }}>
          <SocialPostAuthorRow profile={authorProfile} onPress={openProfile} showOwnBadge={showOwnBadge} />
        </View>
        {(onEdit || onDelete) && (
          <View className="flex-row items-center gap-1 ml-2">
            {onEdit && (
              <TouchableOpacity
                onPress={onEdit}
                disabled={editing}
                hitSlop={8}
                accessibilityLabel={t('social.editPostCaption')}
                style={[
                  styles.menuIconBtn,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' },
                ]}
              >
                <Icon source="pencil-outline" size={18} color={SOCIAL_PAIR_BLUE} />
              </TouchableOpacity>
            )}
            {onDelete && (
              <TouchableOpacity
                onPress={onDelete}
                disabled={deleting}
                hitSlop={8}
                accessibilityLabel={t('social.delete')}
                style={[
                  styles.menuIconBtn,
                  { backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' },
                ]}
              >
                <Icon source="delete-outline" size={18} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>

      <SocialFeedMedia post={post} width={CARD_WIDTH} height={CARD_WIDTH} isVisible={isVisible} />

      <View style={styles.actionRow}>
        <PostActionButton
          icon={post.isLiked ? 'thumb-up' : 'thumb-up-outline'}
          color={post.isLiked ? SOCIAL_POST_ACTION.like : colors.headerText}
          bg={SOCIAL_POST_ACTION.likeActiveBg}
          active={post.isLiked}
          activeBg={SOCIAL_POST_ACTION.likeActiveBg}
          count={post.likeCount}
          onPress={onToggleLike}
          disabled={liking}
        />
        <PostActionButton
          icon="comment-text-outline"
          color={SOCIAL_POST_ACTION.comment}
          bg={SOCIAL_POST_ACTION.commentBg}
          count={post.commentCount}
          countColor={SOCIAL_POST_ACTION.comment}
          onPress={onOpenComments}
          accessibilityLabel={t('social.commentsTitle')}
        />
        <PostActionButton
          icon="send-outline"
          color={SOCIAL_POST_ACTION.share}
          bg={SOCIAL_POST_ACTION.shareBg}
          onPress={onOpenShare}
          accessibilityLabel={t('social.shareToChat')}
        />
        <View style={{ flex: 1 }} />
        {onToggleSave && (
          <PostActionButton
            icon={post.isSaved ? 'bookmark' : 'bookmark-outline'}
            color={post.isSaved ? SOCIAL_ACCENT : SOCIAL_POST_ACTION.save}
            bg={SOCIAL_POST_ACTION.saveBg}
            active={post.isSaved}
            activeBg={SOCIAL_POST_ACTION.saveBg}
            onPress={onToggleSave}
            disabled={saving}
            accessibilityLabel={t('social.savePost')}
          />
        )}
        {post.viewCount > 0 && (
          <View style={styles.viewBadge}>
            <View
              style={[
                styles.actionCircle,
                {
                  backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : SOCIAL_POST_ACTION.viewBg,
                  width: 32,
                  height: 32,
                  borderRadius: 16,
                },
              ]}
            >
              <Icon source="eye-outline" size={17} color={SOCIAL_POST_ACTION.view} />
            </View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: SOCIAL_POST_ACTION.view }}>
              {formatSocialCount(post.viewCount)}
            </Text>
          </View>
        )}
      </View>

      {!!post.caption && (
        <View style={{ paddingHorizontal: 14, paddingTop: 2, paddingBottom: 12, flexDirection: 'row', flexWrap: 'wrap' }}>
          <Text style={{ fontWeight: '700', color: colors.headerText, fontSize: 14 }}>{authorProfile.username} </Text>
          <SocialMentionText text={post.caption} style={{ color: colors.headerText, fontSize: 14, flex: 1 }} />
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    gap: 4,
  },
  actionHit: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 2,
  },
  actionCircle: {
    width: ACTION_SIZE,
    height: ACTION_SIZE,
    borderRadius: ACTION_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '700',
    minWidth: 16,
  },
  menuIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 2,
  },
});

SocialFeedPostCard.displayName = 'SocialFeedPostCard';
