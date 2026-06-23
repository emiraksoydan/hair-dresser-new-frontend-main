import React, { useCallback, useMemo, useRef, useState } from 'react';
import { skipToken } from '@reduxjs/toolkit/query';

import {
  View,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';

import { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';

import { SocialBottomSheet } from './SocialBottomSheet';

import { Icon } from 'react-native-paper';

import { Text } from '../common/Text';

import SearchBar from '../common/SearchBar';

import { useTheme } from '../../hook/useTheme';

import { useLanguage } from '../../hook/useLanguage';

import { useBottomSheet } from '../../hook/useBottomSheet';

import {

  useGetDeletedSocialChatThreadsQuery,

  useLazyGetDeletedSocialChatThreadsQuery,

  useRestoreSocialChatThreadMutation,

} from '../../store/api';

import type { ChatThreadListItemDto } from '../../types';

import { SocialEmptyStateCard } from './SocialEmptyStateCard';

import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

import { useAlert } from '../../hook/useAlert';

import {
  buildDeletedSocialChatThreadsQuery,
  SOCIAL_CHAT_THREADS_PAGE_SIZE,
} from '../../utils/chat/chatThreadStrip';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';



type Props = {

  sheet: ReturnType<typeof useBottomSheet>;

};



export const SocialDeletedThreadsSheet: React.FC<Props> = ({ sheet }) => {

  const { colors, isDark } = useTheme();

  const { t } = useLanguage();

  const { showSuccess, showError } = useAlert();

  const [query, setQuery] = useState('');

  const { activeProfileId } = useActiveSocialProfile();
  const deletedThreadsQuery = useMemo(
    () => (activeProfileId ? buildDeletedSocialChatThreadsQuery(activeProfileId) : skipToken),
    [activeProfileId],
  );

  const { data: threads, isLoading, refetch, isFetching } = useGetDeletedSocialChatThreadsQuery(
    deletedThreadsQuery,
    { skip: !sheet.isOpen },
  );

  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetDeletedSocialChatThreadsQuery();

  const loadingMoreRef = useRef(false);

  const [restoreThread, { isLoading: restoring }] = useRestoreSocialChatThreadMutation();



  const filtered = useMemo(() => {

    const list = threads ?? [];

    const q = query.trim().toLowerCase();

    if (!q) return list;

    return list.filter((item) => {

      const name = item.participants?.[0]?.displayName?.toLowerCase() ?? item.title?.toLowerCase() ?? '';

      return name.includes(q);

    });

  }, [threads, query]);



  const handleLoadMore = useCallback(async () => {

    const list = threads ?? [];

    if (loadingMoreRef.current || isFetchingMore || isFetching || list.length === 0 || !activeProfileId) return;

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

  }, [threads, isFetchingMore, isFetching, fetchMore, activeProfileId]);



  const handleRestore = useCallback(

    async (threadId: string) => {

      try {

        await restoreThread({ threadId }).unwrap();

        showSuccess(t('social.threadRestored'));

        refetch();

      } catch (error: any) {

        showError(error?.data?.message || t('social.threadRestoreFailed'));

      }

    },

    [restoreThread, showSuccess, showError, t, refetch],

  );



  const renderItem = useCallback(

    ({ item }: { item: ChatThreadListItemDto }) => {

      const participant = item.participants?.[0];

      return (

        <View

          className="flex-row items-center rounded-2xl mb-3 px-3 py-3"

          style={{

            backgroundColor: colors.cardBg,

            borderWidth: 1,

            borderColor: colors.borderColor2,

          }}

        >

          <View

            style={{

              width: 44,

              height: 44,

              borderRadius: 22,

              backgroundColor: isDark ? '#374151' : '#e5e7eb',

              alignItems: 'center',

              justifyContent: 'center',

              overflow: 'hidden',

            }}

          >

            {participant?.imageUrl ? (

              <Image source={{ uri: participant.imageUrl }} style={{ width: 44, height: 44 }} />

            ) : (

              <Icon source="account" size={24} color={colors.headerText} />

            )}

          </View>

          <View style={{ flex: 1, marginLeft: 12, minWidth: 0 }}>

            <Text style={{ fontWeight: '700', color: colors.headerText }} numberOfLines={1}>

              {participant?.displayName ?? item.title}

            </Text>

            <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }} numberOfLines={1}>

              {item.lastMessagePreview ?? t('social.noMessagesYet')}

            </Text>

          </View>

          <TouchableOpacity

            onPress={() => handleRestore(item.threadId)}

            disabled={restoring}

            className="px-3 py-2 rounded-full ml-2"

            style={{ backgroundColor: SOCIAL_ACCENT }}

          >

            <Text style={{ color: SOCIAL_ACCENT_TEXT, fontSize: 12, fontWeight: '700' }}>

              {t('social.restoreThread')}

            </Text>

          </TouchableOpacity>

        </View>

      );

    },

    [colors, isDark, t, handleRestore, restoring],

  );



  const listHeader = useMemo(

    () => (

      <View className="pb-3">

        <Text className="text-lg font-bold mb-1" style={{ color: colors.headerText }}>

          {t('social.deletedThreadsTitle')}

        </Text>

        <Text className="text-sm mb-3" style={{ color: colors.textSecondary }}>

          {t('social.deletedThreadsHint')}

        </Text>

        <SearchBar

          compact

          showButtons={false}

          searchQuery={query}

          setSearchQuery={setQuery}

          placeholder={t('social.deletedThreadsSearch')}

        />

      </View>

    ),

    [colors, query, t],

  );



  const emptyComponent = useMemo(() => {

    if (isLoading || isFetching) return null;

    return (

      <SocialEmptyStateCard

        message={query.trim() ? t('social.deletedThreadsSearchEmpty') : t('social.deletedThreadsEmpty')}

        animationSource={require('../../../assets/animations/messages-empty.json')}

        animationKey="social-deleted-threads-empty"

        animationSize={120}

      />

    );

  }, [isLoading, isFetching, query, t]);



  return (

    <SocialBottomSheet sheet={sheet}>

      <BottomSheetView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>

        {isLoading ? (

          <View className="flex-1 items-center justify-center py-10">

            <ActivityIndicator size="large" color={SOCIAL_ACCENT} />

          </View>

        ) : (

          <BottomSheetFlatList

            data={filtered}

            keyExtractor={(item: ChatThreadListItemDto) => item.threadId}

            renderItem={renderItem}

            ListHeaderComponent={listHeader}

            ListEmptyComponent={emptyComponent}

            onEndReached={handleLoadMore}

            onEndReachedThreshold={0.35}

            ListFooterComponent={

              isFetchingMore ? (

                <ActivityIndicator style={{ marginVertical: 16 }} color={SOCIAL_ACCENT} />

              ) : null

            }

            contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}

            keyboardShouldPersistTaps="handled"

          />

        )}

      </BottomSheetView>

    </SocialBottomSheet>

  );

};


