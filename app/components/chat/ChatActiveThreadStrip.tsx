import React, { useCallback, useRef, useEffect } from 'react';
import { FlatList, View, type ListRenderItem } from 'react-native';
import { Text } from '../common/Text';
import type { ChatThreadListItemDto } from '../../types';
import { ChatThreadRingAvatar } from './ChatThreadRingAvatar';
import { getThreadStripParticipant } from '../../utils/chat/chatThreadStrip';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';

type Props = {
  threads: ChatThreadListItemDto[];
  activeThreadId: string;
  accentColor: string;
  onSelectThread: (threadId: string, isSocialThread?: boolean) => void;
  onLoadMore?: () => void;
  loadingMore?: boolean;
  /** Sosyal sohbet: profil fotoğrafı yoksa sistem placeholder'ı kullan */
  socialAvatars?: boolean;
};

const ITEM_WIDTH = 60;
const STRIP_AVATAR_SIZE = 44;

export const ChatActiveThreadStrip: React.FC<Props> = ({
  threads,
  activeThreadId,
  accentColor,
  onSelectThread,
  onLoadMore,
  loadingMore,
  socialAvatars = false,
}) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const listRef = useRef<FlatList<ChatThreadListItemDto>>(null);

  const visibleThreads = threads.filter((thread) => getThreadStripParticipant(thread));
  const activeIndex = visibleThreads.findIndex((thread) => thread.threadId === activeThreadId);

  useEffect(() => {
    if (activeIndex < 0 || !listRef.current) return;
    listRef.current.scrollToIndex({
      index: activeIndex,
      animated: true,
      viewPosition: 0.35,
    });
  }, [activeIndex, visibleThreads.length]);

  const renderItem: ListRenderItem<ChatThreadListItemDto> = useCallback(
    ({ item: thread }) => {
      const participant = getThreadStripParticipant(thread);
      if (!participant) return null;
      const isActive = thread.threadId === activeThreadId;
      const label = participant.displayName?.replace(/^@/, '') ?? thread.title;

      return (
        <View style={{ width: ITEM_WIDTH, alignItems: 'center' }}>
          <ChatThreadRingAvatar
            userId={participant.userId}
            imageUrl={participant.imageUrl}
            userType={participant.userType}
            size={STRIP_AVATAR_SIZE}
            skipOwnerImageFetch={socialAvatars || !!thread.isSocialThread}
            ringColor={accentColor}
            active={isActive}
            hasUnread={!isActive && thread.unreadCount > 0}
            onPress={
              isActive
                ? undefined
                : () => onSelectThread(thread.threadId, !!thread.isSocialThread)
            }
          />
          <Text
            numberOfLines={1}
            style={{
              marginTop: 4,
              fontSize: 10,
              fontWeight: isActive ? '700' : '500',
              color: isActive ? colors.headerText : colors.textSecondary,
              maxWidth: ITEM_WIDTH - 4,
              textAlign: 'center',
            }}
          >
            {label}
          </Text>
        </View>
      );
    },
    [accentColor, activeThreadId, colors.headerText, colors.textSecondary, onSelectThread, socialAvatars],
  );

  if (visibleThreads.length === 0) return null;

  return (
    <View style={{ paddingBottom: 6 }}>
      <Text
        style={{
          paddingHorizontal: 16,
          marginBottom: 4,
          fontSize: 10,
          fontWeight: '600',
          color: colors.textSecondary,
          letterSpacing: 0.3,
          textTransform: 'uppercase',
        }}
      >
        {t('chat.activeThreads')}
      </Text>
      <FlatList
        ref={listRef}
        horizontal
        data={visibleThreads}
        keyExtractor={(item) => item.threadId}
        renderItem={renderItem}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 12, gap: 4 }}
        getItemLayout={(_, index) => ({
          length: ITEM_WIDTH + 4,
          offset: (ITEM_WIDTH + 4) * index,
          index,
        })}
        onEndReached={() => {
          if (!loadingMore) onLoadMore?.();
        }}
        onEndReachedThreshold={0.4}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({
            offset: Math.max(0, info.index * (ITEM_WIDTH + 4) - 24),
            animated: true,
          });
        }}
      />
    </View>
  );
};
