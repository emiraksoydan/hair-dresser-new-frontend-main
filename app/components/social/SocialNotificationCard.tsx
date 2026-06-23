import React, { useCallback, useMemo } from 'react';
import { View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { navigateToSocialStory } from '../../utils/social/socialStoryNavigation';
import {
  NotificationType,
  parseSocialNotificationPayload,
  type NotificationDto,
} from '../../types/notification';

export const SocialNotificationCard = React.memo(function SocialNotificationCard({
  item,
  onMarkRead,
  onDelete,
  isDeleting,
  onCloseSheet,
}: {
  item: NotificationDto;
  onMarkRead: (notification: NotificationDto) => Promise<void>;
  onDelete?: (notification: NotificationDto) => Promise<void>;
  isDeleting?: boolean;
  onCloseSheet?: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const payload = useMemo(() => parseSocialNotificationPayload(item.payloadJson), [item.payloadJson]);

  const iconName = useMemo(() => {
    switch (item.type) {
      case NotificationType.SocialPostLiked:
      case NotificationType.SocialStoryLiked:
        return 'thumb-up';
      case NotificationType.SocialPostCommented:
      case NotificationType.SocialCommentReplied:
      case NotificationType.SocialStoryReplied:
        return 'comment-outline';
      case NotificationType.SocialNewFollower:
        return 'account-plus-outline';
      case NotificationType.SocialMentioned:
        return 'at';
      default:
        return 'bell-outline';
    }
  }, [item.type]);

  const handleOpen = useCallback(() => {
    if (!item.isRead) void onMarkRead(item);
    onCloseSheet?.();

    if (payload?.postId) {
      router.push({
        pathname: '/(screens)/social/post-detail',
        params: { postId: payload.postId },
      } as any);
      return;
    }

    if (payload && navigateToSocialStory(router, payload)) {
      return;
    }

    if (payload?.actorProfileId) {
      router.push({
        pathname: '/(screens)/social/profile-view',
        params: { profileId: payload.actorProfileId },
      } as any);
    }
  }, [item, onMarkRead, onCloseSheet, router, payload]);

  return (
    <View
      style={{
        marginHorizontal: 12,
        marginVertical: 6,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
        backgroundColor: isDark ? '#1a1d24' : '#ffffff',
        padding: 14,
        opacity: item.isRead ? 0.78 : 1,
      }}
    >
      <TouchableOpacity onPress={handleOpen} activeOpacity={0.85}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: isDark ? '#374151' : '#e5e7eb',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {payload?.actorAvatarUrl ? (
              <Image source={{ uri: payload.actorAvatarUrl }} style={{ width: 40, height: 40 }} />
            ) : (
              <Icon source={iconName} size={20} color={SOCIAL_ACCENT} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text
              style={{
                color: isDark ? '#e5e7eb' : '#111827',
                fontSize: 14,
                fontFamily: 'CenturyGothic-Bold',
                marginBottom: 4,
              }}
              numberOfLines={2}
            >
              {item.title}
            </Text>
            {!!item.body && (
              <Text
                style={{
                  color: isDark ? '#9ca3af' : '#4b5563',
                  fontSize: 12,
                  fontFamily: 'CenturyGothic',
                  lineHeight: 17,
                }}
                numberOfLines={3}
              >
                {item.body}
              </Text>
            )}
            <Text style={{ marginTop: 6, color: SOCIAL_ACCENT, fontSize: 12, fontWeight: '600' }}>
              {t('social.openNotification')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>

      {onDelete && (
        <TouchableOpacity
          onPress={() => onDelete(item)}
          disabled={isDeleting}
          style={{ alignSelf: 'flex-end', marginTop: 8, padding: 4 }}
        >
          {isDeleting ? (
            <ActivityIndicator size="small" color={colors.textSecondary} />
          ) : (
            <Icon source="delete-outline" size={18} color={colors.textSecondary} />
          )}
        </TouchableOpacity>
      )}
    </View>
  );
});
