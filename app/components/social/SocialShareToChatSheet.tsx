import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';
import { View, TouchableOpacity, ActivityIndicator, Image } from 'react-native';
import { BottomSheetFlatList } from '@gorhom/bottom-sheet';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import SearchBar from '../common/SearchBar';
import { SocialBottomSheet } from './SocialBottomSheet';
import { useBottomSheet } from '../../hook/useBottomSheet';
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
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import {
  SOCIAL_CHAT_THREADS_PAGE_SIZE,
  buildSocialChatThreadsQuery,
} from '../../utils/chat/chatThreadStrip';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';

type ShareTarget =
  | { kind: 'post'; id: string }
  | { kind: 'profile'; id: string }
  | null;

type Props = {
  target: ShareTarget;
  onClose: () => void;
};

export const SocialShareToChatSheet: React.FC<Props> = ({ target, onClose }) => {
  const sheet = useBottomSheet({ snapPoints: ['58%', '88%'] });
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { push } = useSafeNavigation();
  const dispatch = useAppDispatch();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const postId = target?.kind === 'post' ? target.id : '';
  const profileId = target?.kind === 'profile' ? target.id : '';

  const { activeProfileId } = useActiveSocialProfile();
  const socialThreadsQuery = useMemo(
    () => (activeProfileId ? buildSocialChatThreadsQuery(activeProfileId) : skipToken),
    [activeProfileId],
  );

  const { data: post } = useGetSocialPostQuery(postId, { skip: !postId });
  const { data: profile } = useGetSocialProfileQuery(profileId, { skip: !profileId });
  const { data: threads, isLoading } = useGetSocialChatThreadsQuery(socialThreadsQuery);
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialChatThreadsQuery();
  const [sendMessage, { isLoading: sending }] = useSendChatMessageByThreadMutation();
  const loadingMoreRef = useRef(false);

  useEffect(() => {
    if (target) {
      setSearchQuery('');
      sheet.present();
    } else {
      sheet.dismiss();
    }
  }, [target, sheet]);

  const username = target?.kind === 'post' ? post?.profile.username : profile?.username;

  const shareText = useMemo(() => {
    if (!target?.id || !username) return null;
    const visible =
      target.kind === 'post'
        ? t('social.sharedPostLine', { user: username })
        : t('social.sharedProfileLine', { user: username });
    return encodeSocialShareMessage(visible, { kind: target.kind, id: target.id });
  }, [target, username, t]);

  const filteredThreads = useMemo(() => {
    const list = threads ?? [];
    const q = searchQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter((thread) => {
      const p = thread.participants?.[0];
      const name = (p?.displayName ?? thread.title ?? '').toLowerCase();
      return name.includes(q);
    });
  }, [threads, searchQuery]);

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
        sheet.dismiss();
        onClose();
        push({
          pathname: '/(screens)/chat/[threadId]',
          params: { threadId: thread.threadId, source: 'social' },
        } as any);
      } catch {
        dispatch(showSnack({ message: t('social.shareFailed'), isError: true }));
        setSelectedId(null);
      }
    },
    [shareText, sendMessage, dispatch, t, push, sheet, onClose],
  );

  if (!target) return null;

  return (
    <SocialBottomSheet sheet={sheet} onDismiss={onClose}>
      <View style={{ paddingHorizontal: 16, paddingBottom: 10 }}>
        <Text style={{ fontWeight: '700', fontSize: 16, color: colors.headerText, marginBottom: 10 }}>
          {t('social.sharePickThread')}
        </Text>
        <SearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          showButtons={false}
          placeholder={t('common.search')}
          compact
        />
      </View>
      {isLoading ? (
        <ActivityIndicator color={SOCIAL_ACCENT} style={{ marginVertical: 24 }} />
      ) : (
        <BottomSheetFlatList
          data={filteredThreads}
          keyExtractor={(item: ChatThreadListItemDto) => item.threadId}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.35}
          ListFooterComponent={
            isFetchingMore ? <ActivityIndicator style={{ marginVertical: 16 }} color={SOCIAL_ACCENT} /> : null
          }
          ListEmptyComponent={
            <View style={{ padding: 28, alignItems: 'center' }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('social.messagesEmpty')}</Text>
            </View>
          }
          renderItem={({ item }: { item: ChatThreadListItemDto }) => {
            const p = item.participants?.[0];
            const busy = sending && selectedId === item.threadId;
            return (
              <TouchableOpacity
                disabled={sending || !shareText}
                onPress={() => handleShare(item)}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 16,
                  paddingVertical: 12,
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
                {busy ? (
                  <ActivityIndicator size="small" color={SOCIAL_ACCENT} />
                ) : (
                  <Icon source="send" size={20} color={SOCIAL_ACCENT} />
                )}
              </TouchableOpacity>
            );
          }}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </SocialBottomSheet>
  );
};
