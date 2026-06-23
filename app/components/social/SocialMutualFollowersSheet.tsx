import React, { useCallback, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { SocialBottomSheet } from './SocialBottomSheet';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useBottomSheet } from '../../hook/useBottomSheet';
import {
  useGetSocialMutualFollowersQuery,
  useLazyGetSocialMutualFollowersQuery,
} from '../../store/api';
import type { SocialFollowListItemDto } from '../../types/social';
import { SocialFollowListRow } from './SocialFollowListRow';
import { SocialEmptyStateCard } from './SocialEmptyStateCard';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { SOCIAL_EMPTY_LOTTIES } from '../../constants/socialAnimations';
import { PANEL_FLAT_LIST_PERF } from '../../constants/panelFlatListPerf';

const PAGE_SIZE = 30;

type Props = {
  sheet: ReturnType<typeof useBottomSheet>;
  profileId: string;
  username?: string;
};

export const SocialMutualFollowersSheet: React.FC<Props> = ({ sheet, profileId, username }) => {
  const { colors } = useTheme();
  const { t } = useLanguage();
  const loadingMoreRef = useRef(false);

  const { data: items, isLoading, isFetching } = useGetSocialMutualFollowersQuery(
    { profileId, limit: PAGE_SIZE },
    { skip: !sheet.isOpen || !profileId },
  );
  const [fetchMore, { isFetching: isFetchingMore }] = useLazyGetSocialMutualFollowersQuery();

  const handleLoadMore = useCallback(async () => {
    if (loadingMoreRef.current || isFetching || isFetchingMore || !items?.length || !profileId) return;
    const last = items[items.length - 1];
    loadingMoreRef.current = true;
    try {
      await fetchMore({
        profileId,
        before: last.followedAt,
        beforeId: last.followId,
        limit: PAGE_SIZE,
      }).unwrap();
    } catch {
      /* ignore */
    } finally {
      loadingMoreRef.current = false;
    }
  }, [items, isFetching, isFetchingMore, fetchMore, profileId]);

  const renderItem = useCallback(
    ({ item }: { item: SocialFollowListItemDto }) => (
      <SocialFollowListRow item={item} showOwnerMeta onNavigate={sheet.dismiss} />
    ),
    [sheet.dismiss],
  );

  const listHeader = (
    <View className="pb-3 pt-1">
      <Text className="text-lg font-bold" style={{ color: colors.headerText }}>
        {t('social.mutualFollowersTitle', { user: username ? `@${username}` : '' })}
      </Text>
    </View>
  );

  const emptyComponent =
    !isLoading && (items?.length ?? 0) === 0 ? (
      <SocialEmptyStateCard
        animationSource={SOCIAL_EMPTY_LOTTIES.generic}
        message={t('social.mutualFollowersEmpty')}
        animationSize={120}
        animationKey="social-mutual-empty"
      />
    ) : null;

  return (
    <SocialBottomSheet sheet={sheet}>
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 0, paddingTop: 4 }}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-10">
            <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
          </View>
        ) : (
          <BottomSheetFlatList
            data={items ?? []}
            keyExtractor={(item: SocialFollowListItemDto) => item.followId}
            renderItem={renderItem}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.35}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyComponent}
            ListFooterComponent={
              isFetchingMore ? <ActivityIndicator style={{ marginVertical: 20 }} color={SOCIAL_ACCENT} /> : null
            }
            contentContainerStyle={{ paddingBottom: 28, flexGrow: 1, paddingHorizontal: 0 }}
            {...PANEL_FLAT_LIST_PERF}
          />
        )}
      </BottomSheetView>
    </SocialBottomSheet>
  );
};
