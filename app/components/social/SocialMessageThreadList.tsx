import React, { useCallback, useMemo, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import {
  View,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { useAlert } from '../../hook/useAlert';
import {
  useDeleteChatThreadMutation,
  useGetSocialChatThreadsQuery,
  useLazyGetSocialChatThreadsQuery,
} from '../../store/api';
import { SOCIAL_CHAT_THREADS_PAGE_SIZE, buildSocialChatThreadsQuery } from '../../utils/chat/chatThreadStrip';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useAuth } from '../../hook/useAuth';
import type { ChatThreadListItemDto } from '../../types';
import { useFormatTime } from '../../utils/time/time-formatter';
import { SocialEmptyStateCard } from './SocialEmptyStateCard';
import { SocialMessagesHeader } from './SocialMessagesHeader';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { getChatAccent, getChatListRowStyle } from '../../constants/chatTheme';
import { OwnerAvatar } from '../common/owneravatar';
import { ImageOwnerType, UserType } from '../../types';
import { exitSocialMode } from '../../utils/social/exitSocialMode';
import { getSocialNoProfilePanelMessage } from '../../utils/social/socialNoProfileMessage';

import { DEFAULT_AVATAR } from '../../constants/images';

export const SocialMessageThreadList: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { confirm } = useAlert();
  const router = useSafeNavigation();
  const formatTime = useFormatTime();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { activeProfileId, isLoading: profilesLoading } = useActiveSocialProfile();
  const { userType } = useAuth();
  const socialThreadsQuery = useMemo(
    () => (activeProfileId ? buildSocialChatThreadsQuery(activeProfileId) : skipToken),
    [activeProfileId],
  );

  const { data: threads, isLoading, refetch, isFetching } = useGetSocialChatThreadsQuery(socialThreadsQuery);
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialChatThreadsQuery();
  const loadingMoreRef = useRef(false);
  const [deleteThread] = useDeleteChatThreadMutation();
  const accent = getChatAccent(true);


  const confirmDelete = useCallback(
    (item: ChatThreadListItemDto) => {
      confirm(
        t('chat.deleteThread'),
        t('chat.deleteThreadConfirm'),
        async () => {
          setDeletingId(item.threadId);
          try {
            await deleteThread({ threadId: item.threadId }).unwrap();
          } finally {
            setDeletingId(null);
          }
        },
        undefined,
        t('common.delete'),
        t('common.cancel'),
      );
    },
    [confirm, deleteThread, t],
  );

  const renderItem = useCallback(
    ({ item }: { item: ChatThreadListItemDto }) => {
      const participant = item.participants?.[0];
      const hasUnread = item.unreadCount > 0;
      const isDeleting = deletingId === item.threadId;

      return (
        <TouchableOpacity
          onPress={() =>
            router.push({
              pathname: '/(screens)/chat/[threadId]',
              params: { threadId: item.threadId, source: 'social' },
            } as any)
          }
          activeOpacity={0.85}
          className="mb-3 px-4 py-3.5"
          style={getChatListRowStyle(isDark, hasUnread, accent, colors.cardBg)}
        >
          <View className="flex-row items-center">
            <View
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                backgroundColor: isDark ? '#374151' : '#e5e7eb',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
              }}
            >
              {participant ? (
                <OwnerAvatar
                  ownerId={participant.userId}
                  ownerType={ImageOwnerType.User}
                  fallbackUrl={participant.imageUrl}
                  skipOwnerImageFetch
                  placeholderAsset={DEFAULT_AVATAR}
                  imageClassName="w-full h-full"
                  iconSource={
                    participant.userType === UserType.BarberStore
                      ? 'store'
                      : participant.userType === UserType.FreeBarber
                        ? 'account-supervisor'
                        : 'account'
                  }
                  iconSize={24}
                  iconColor={colors.headerText}
                  iconContainerClassName="bg-transparent"
                />
              ) : (
                <Image source={DEFAULT_AVATAR} style={{ width: '100%', height: '100%' }} resizeMode="cover" />
              )}
            </View>

            <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>
              <View className="flex-row items-center justify-between">
                <Text style={{ fontWeight: '700', color: colors.headerText, fontSize: 15, flex: 1 }} numberOfLines={1}>
                  {participant?.displayName ?? item.title}
                </Text>
                {!!item.lastMessageAt && (
                  <Text style={{ color: colors.textSecondary, fontSize: 11, marginLeft: 8 }}>
                    {formatTime(item.lastMessageAt)}
                  </Text>
                )}
              </View>
              <Text
                numberOfLines={1}
                style={{
                  marginTop: 4,
                  color: hasUnread ? colors.headerText : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: hasUnread ? '600' : '400',
                }}
              >
                {item.lastMessagePreview ?? t('social.noMessagesYet')}
              </Text>
            </View>

            {hasUnread && (
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: SOCIAL_ACCENT,
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginLeft: 8,
                  paddingHorizontal: 6,
                }}
              >
                <Text style={{ color: SOCIAL_ACCENT_TEXT, fontSize: 11, fontWeight: '700' }}>{item.unreadCount}</Text>
              </View>
            )}

            <TouchableOpacity
              onPress={() => confirmDelete(item)}
              disabled={isDeleting}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              className="ml-2 w-9 h-9 items-center justify-center rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(239,68,68,0.12)' : 'rgba(239,68,68,0.08)' }}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Icon source="delete-outline" size={20} color="#ef4444" />
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      );
    },
    [colors, formatTime, isDark, router, t, confirmDelete, deletingId, accent],
  );

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || isFetchingMore || !threads?.length || !activeProfileId) return;
    if (threads.length % SOCIAL_CHAT_THREADS_PAGE_SIZE !== 0) return;
    const last = threads[threads.length - 1];
    if (!last?.lastMessageAt) return;
    loadingMoreRef.current = true;
    try {
      await fetchMore({
        profileId: activeProfileId,
        before: last.lastMessageAt,
        beforeId: last.threadId,
        limit: SOCIAL_CHAT_THREADS_PAGE_SIZE,
      }).unwrap();
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [threads, fetchMore, isFetchingMore, activeProfileId]);

  if (isLoading || profilesLoading) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
        <SocialMessagesHeader />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
        </View>
      </View>
    );
  }

  if (!activeProfileId) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
        <SocialMessagesHeader />
        <SocialEmptyStateCard
          title={t('social.noProfilePanelTitle')}
          message={getSocialNoProfilePanelMessage(t, userType)}
          animationSource={require('../../../assets/animations/messages-empty.json')}
          animationSize={130}
          animationKey="social-messages-no-profile"
          actionLabel={
            userType === UserType.FreeBarber || userType === UserType.BarberStore
              ? t('social.noProfilePanelActionBusiness')
              : t('social.noProfilePanelAction')
          }
          onAction={() => exitSocialMode(userType)}
        />
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SocialMessagesHeader />
      <FlatList
        data={threads ?? []}
        keyExtractor={(item) => item.threadId}
        renderItem={renderItem}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 24,
          flexGrow: 1,
        }}
        refreshControl={
          <RefreshControl refreshing={isFetching} onRefresh={refetch} tintColor={SOCIAL_ACCENT} />
        }
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.35}
        ListFooterComponent={
          isFetchingMore ? (
            <ActivityIndicator style={{ marginVertical: 16 }} color={SOCIAL_ACCENT} />
          ) : null
        }
        ListEmptyComponent={
          <SocialEmptyStateCard
            animationSource={require('../../../assets/animations/messages-empty.json')}
            message={t('social.messagesEmpty')}
            animationSize={130}
            animationKey="social-messages-empty"
          />
        }
      />
    </View>
  );
};
