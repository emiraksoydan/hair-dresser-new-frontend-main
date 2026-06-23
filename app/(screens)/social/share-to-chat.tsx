import React, { useCallback, useMemo, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { View, FlatList, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '../../components/common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import {
  useGetSocialChatThreadsQuery,
  useGetSocialPostQuery,
  useGetSocialProfileQuery,
  useLazyGetSocialChatThreadsQuery,
  useSendChatMessageByThreadMutation,
} from '../../store/api';
import type { ChatThreadListItemDto } from '../../types';
import { encodeSocialShareMessage } from '../../utils/social/socialShareMessage';
import { showSnack } from '../../store/snackbarSlice';
import { useAppDispatch } from '../../store/hook';
import {
  SOCIAL_CHAT_THREADS_PAGE_SIZE,
  buildSocialChatThreadsQuery,
} from '../../utils/chat/chatThreadStrip';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';

export default function ShareToSocialChatScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { goBack, push } = useSafeNavigation();
  const dispatch = useAppDispatch();
  const params = useLocalSearchParams<{ kind?: string; id?: string }>();
  const kind = params.kind === 'profile' ? 'profile' : 'post';
  const id = String(params.id ?? '');

  const { activeProfileId } = useActiveSocialProfile();
  const socialThreadsQuery = useMemo(
    () => (activeProfileId ? buildSocialChatThreadsQuery(activeProfileId) : skipToken),
    [activeProfileId],
  );

  const { data: post } = useGetSocialPostQuery(id, { skip: !id || kind !== 'post' });
  const { data: profile } = useGetSocialProfileQuery(id, { skip: !id || kind !== 'profile' });
  const { data: threads, isLoading } = useGetSocialChatThreadsQuery(socialThreadsQuery);
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialChatThreadsQuery();
  const loadingMoreRef = useRef(false);
  const [sendMessage, { isLoading: sending }] = useSendChatMessageByThreadMutation();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const username = kind === 'post' ? post?.profile.username : profile?.username;

  const shareText = useMemo(() => {
    if (!id || !username) return null;
    const visible =
      kind === 'post'
        ? t('social.sharedPostLine', { user: username })
        : t('social.sharedProfileLine', { user: username });
    return encodeSocialShareMessage(visible, { kind, id });
  }, [kind, id, username, t]);

  const handleLoadMore = useCallback(async () => {
    const list = threads ?? [];
    if (loadingMoreRef.current || isFetchingMore || list.length === 0 || !activeProfileId) return;
    if (list.length % SOCIAL_CHAT_THREADS_PAGE_SIZE !== 0) return;
    const last = list[list.length - 1];
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
  }, [threads, isFetchingMore, fetchMore, activeProfileId]);

  const handleShare = useCallback(
    async (thread: ChatThreadListItemDto) => {
      if (!shareText) return;
      setSelectedId(thread.threadId);
      try {
        await sendMessage({ threadId: thread.threadId, text: shareText }).unwrap();
        dispatch(showSnack({ message: t('social.shareSent'), isError: false }));
        push({
          pathname: '/(screens)/chat/[threadId]',
          params: { threadId: thread.threadId, source: 'social' },
        } as any);
      } catch {
        dispatch(showSnack({ message: t('social.shareFailed'), isError: true }));
        setSelectedId(null);
      }
    },
    [shareText, sendMessage, dispatch, t, push],
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={['top']}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 12,
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor2,
        }}
      >
        <TouchableOpacity onPress={goBack} hitSlop={12}>
          <Icon source="close" size={24} color={colors.headerText} />
        </TouchableOpacity>
        <Text style={{ flex: 1, marginLeft: 12, fontSize: 17, fontWeight: '700', color: colors.headerText }}>
          {t('social.sharePickThread')}
        </Text>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={SOCIAL_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={threads ?? []}
          keyExtractor={(item) => item.threadId}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={SOCIAL_ACCENT} /> : null
          }
          ListEmptyComponent={
            <View style={{ padding: 32, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('social.messagesEmpty')}</Text>
            </View>
          }
          renderItem={({ item }) => {
            const p = item.participants?.[0];
            const busy = sending && selectedId === item.threadId;
            return (
              <TouchableOpacity
                disabled={sending || !shareText}
                onPress={() => handleShare(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  padding: 16,
                  borderBottomWidth: 1,
                  borderBottomColor: colors.borderColor2,
                  opacity: sending && selectedId !== item.threadId ? 0.5 : 1,
                }}
              >
                <View
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 22,
                    backgroundColor: isDark ? '#374151' : '#e5e7eb',
                    overflow: 'hidden',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p?.imageUrl ? (
                    <Image source={{ uri: p.imageUrl }} style={{ width: 44, height: 44 }} />
                  ) : (
                    <Icon source="account" size={22} color={colors.headerText} />
                  )}
                </View>
                <Text style={{ flex: 1, marginLeft: 12, fontWeight: '600', color: colors.headerText }}>
                  {p?.displayName ?? item.title}
                </Text>
                {busy ? <ActivityIndicator size="small" color={SOCIAL_ACCENT} /> : <Icon source="send" size={20} color={SOCIAL_ACCENT} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}
