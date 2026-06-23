import React, { useCallback } from 'react';
import { View, FlatList, TouchableOpacity, Image, ActivityIndicator, RefreshControl } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../../components/common/Text';
import { SocialScreenHeader } from '../../components/social/SocialScreenHeader';
import { SocialEmptyStateCard } from '../../components/social/SocialEmptyStateCard';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import {
  useGetSocialArchivedContentQuery,
  useRestoreSocialArchivedItemMutation,
} from '../../store/api';
import type { SocialArchivedItemDto } from '../../types/social';
import { SocialArchivedKind } from '../../types/social';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';
import { SOCIAL_EMPTY_LOTTIES } from '../../constants/socialAnimations';
import { useAlert } from '../../hook/useAlert';
import { translateSocialApiMessage } from '../../utils/social/translateSocialApiMessage';

export default function SocialArchivedContentScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { showSuccess, showError } = useAlert();
  const { activeProfileId } = useActiveSocialProfile();

  const { data, isLoading, refetch, isFetching } = useGetSocialArchivedContentQuery(
    { profileId: activeProfileId!, limit: 100 },
    { skip: !activeProfileId },
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
        className="flex-row items-center rounded-xl mb-3 px-3 py-3"
        style={{ backgroundColor: colors.cardBg, borderWidth: 1, borderColor: colors.borderColor2 }}
      >
        <View
          className="rounded-lg overflow-hidden mr-3"
          style={{ width: 52, height: 52, backgroundColor: isDark ? '#374151' : '#e5e7eb' }}
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

  if (!activeProfileId) {
    return (
      <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
        <SocialScreenHeader title={t('social.archivedTitle')} />
        <View className="flex-1 items-center justify-center px-6">
          <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>{t('social.noProfile')}</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SocialScreenHeader title={t('social.archivedTitle')} />
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color={SOCIAL_ACCENT} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => `${item.kind}-${item.id}`}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, paddingBottom: 32, flexGrow: 1 }}
          refreshControl={
            <RefreshControl refreshing={isFetching && !isLoading} onRefresh={refetch} tintColor={SOCIAL_ACCENT} />
          }
          ListHeaderComponent={
            <Text className="text-sm mb-4" style={{ color: colors.textSecondary }}>
              {t('social.archivedSubtitle')}
            </Text>
          }
          ListEmptyComponent={
            !isFetching ? (
              <SocialEmptyStateCard
                animationSource={SOCIAL_EMPTY_LOTTIES.generic}
                message={t('social.archivedEmpty')}
                animationSize={120}
                animationKey="social-archived-empty"
              />
            ) : null
          }
        />
      )}
    </View>
  );
}
