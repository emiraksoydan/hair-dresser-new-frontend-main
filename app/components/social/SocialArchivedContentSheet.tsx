import React, { useCallback } from 'react';
import { View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { BottomSheetFlatList, BottomSheetView } from '@gorhom/bottom-sheet';
import { SocialBottomSheet } from './SocialBottomSheet';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useBottomSheet } from '../../hook/useBottomSheet';
import {
  useGetSocialArchivedContentQuery,
  useRestoreSocialArchivedItemMutation,
} from '../../store/api';
import type { SocialArchivedItemDto } from '../../types/social';
import { SocialArchivedKind } from '../../types/social';
import { SocialEmptyStateCard } from './SocialEmptyStateCard';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { SOCIAL_EMPTY_LOTTIES } from '../../constants/socialAnimations';
import { useAlert } from '../../hook/useAlert';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';

type Props = {
  sheet: ReturnType<typeof useBottomSheet>;
  profileId: string;
};

export const SocialArchivedContentSheet: React.FC<Props> = ({ sheet, profileId }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();
  const { data, isLoading, refetch, isFetching } = useGetSocialArchivedContentQuery(
    { profileId, limit: 100 },
    { skip: !sheet.isOpen || !profileId },
  );
  const [restoreItem, { isLoading: restoring }] = useRestoreSocialArchivedItemMutation();

  const items = data?.items ?? [];

  const kindLabel = useCallback(
    (item: SocialArchivedItemDto) => {
      switch (item.kind) {
        case SocialArchivedKind.Post:
          return t('social.archivedKindPost');
        case SocialArchivedKind.Story:
          return t('social.archivedKindStory');
        case SocialArchivedKind.Highlight:
          return t('social.archivedKindHighlight');
        case SocialArchivedKind.HighlightItem:
          return t('social.archivedKindHighlightItem');
        default:
          return '';
      }
    },
    [t],
  );

  const itemTitle = useCallback(
    (item: SocialArchivedItemDto) => {
      if (item.title?.trim()) return item.title.trim();
      if (item.parentTitle && item.kind === SocialArchivedKind.HighlightItem) {
        return t('social.archivedHighlightItemOf', { title: item.parentTitle });
      }
      return kindLabel(item);
    },
    [kindLabel, t],
  );

  const handleRestore = useCallback(
    async (item: SocialArchivedItemDto) => {
      try {
        await restoreItem({
          kind: item.kind,
          id: item.id,
          parentId: item.parentId ?? undefined,
        }).unwrap();
        showSuccess(t('social.archivedRestored'));
        refetch();
      } catch (error: unknown) {
        const msg = (error as { data?: { message?: string } })?.data?.message;
        showError(translateSocialApiMessage(msg, t, t('social.archivedRestoreFailed')));
      }
    },
    [restoreItem, showSuccess, showError, t, refetch],
  );

  const renderItem = useCallback(
    ({ item }: { item: SocialArchivedItemDto }) => (
      <View
        className="flex-row items-center rounded-2xl mb-3 px-3 py-3"
        style={{
          backgroundColor: colors.cardBg,
          borderWidth: 1,
          borderColor: colors.borderColor2,
        }}
      >
        <View
          className="rounded-lg overflow-hidden mr-3"
          style={{
            width: 52,
            height: 52,
            backgroundColor: isDark ? '#374151' : '#e5e7eb',
          }}
        >
          {item.thumbUrl ? (
            <Image source={{ uri: item.thumbUrl }} style={{ width: 52, height: 52 }} />
          ) : (
            <View className="flex-1 items-center justify-center">
              <Icon source="image-outline" size={22} color={colors.textSecondary} />
            </View>
          )}
        </View>
        <View className="flex-1 min-w-0 mr-2">
          <Text className="text-[11px] font-semibold uppercase" style={{ color: colors.textTertiary }}>
            {kindLabel(item)}
          </Text>
          <Text className="text-sm font-semibold mt-0.5" style={{ color: colors.headerText }} numberOfLines={2}>
            {itemTitle(item)}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => handleRestore(item)}
          disabled={restoring}
          className="rounded-full px-3 py-2"
          style={{ backgroundColor: SOCIAL_ACCENT }}
        >
          <Text className="text-xs font-bold" style={{ color: SOCIAL_ACCENT_TEXT }}>
            {t('social.archivedRestore')}
          </Text>
        </TouchableOpacity>
      </View>
    ),
    [colors, isDark, kindLabel, itemTitle, handleRestore, restoring, t],
  );

  const listHeader = (
    <View className="pb-3">
      <Text className="text-lg font-bold mb-1" style={{ color: colors.headerText }}>
        {t('social.archivedTitle')}
      </Text>
      <Text className="text-sm" style={{ color: colors.textSecondary }}>
        {t('social.archivedSubtitle')}
      </Text>
    </View>
  );

  const emptyComponent =
    !isLoading && !isFetching ? (
      <SocialEmptyStateCard
        animationSource={SOCIAL_EMPTY_LOTTIES.generic}
        message={t('social.archivedEmpty')}
        animationSize={120}
        animationKey="social-archived-empty"
      />
    ) : null;

  return (
    <SocialBottomSheet sheet={sheet}>
      <BottomSheetView style={{ flex: 1, paddingHorizontal: 16, paddingTop: 4 }}>
        {isLoading ? (
          <View className="flex-1 items-center justify-center py-10">
            <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
          </View>
        ) : (
          <BottomSheetFlatList
            data={items}
            keyExtractor={(item: SocialArchivedItemDto) => `${item.kind}-${item.id}`}
            renderItem={renderItem}
            ListHeaderComponent={listHeader}
            ListEmptyComponent={emptyComponent}
            contentContainerStyle={{ paddingBottom: 28, flexGrow: 1 }}
          />
        )}
      </BottomSheetView>
    </SocialBottomSheet>
  );
};
