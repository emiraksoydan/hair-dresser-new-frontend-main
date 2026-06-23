import React, { useCallback } from 'react';
import { View, FlatList, ActivityIndicator, type ListRenderItem } from 'react-native';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import type { SocialProfileSearchResultDto } from '../../types/social';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_SOFT, SOCIAL_ACCENT_SOFT_DARK } from '../../constants/socialTheme';
import { SocialSearchProfileRow } from './SocialSearchProfileRow';

type Props = {
  visible: boolean;
  profiles: SocialProfileSearchResultDto[];
  searching: boolean;
  emptyMessage?: string;
  onPick: (profile: SocialProfileSearchResultDto) => void;
};

/** Arama yapılırken kullanıcı sonuçları — search bar altında renkli kart dropdown. */
export const SocialSearchProfileDropdown: React.FC<Props> = ({
  visible,
  profiles,
  searching,
  emptyMessage,
  onPick,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  const renderItem: ListRenderItem<SocialProfileSearchResultDto> = useCallback(
    ({ item }) => (
      <SocialSearchProfileRow item={item} variant="dropdown" onPress={() => onPick(item)} />
    ),
    [onPick],
  );

  if (!visible) return null;

  return (
    <View
      className="rounded-2xl border overflow-hidden"
      style={{
        maxHeight: 280,
        backgroundColor: colors.cardBg,
        borderColor: isDark ? colors.borderColor2 : `${SOCIAL_ACCENT}55`,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOpacity: isDark ? 0.4 : 0.14,
        shadowRadius: 16,
        shadowOffset: { width: 0, height: 8 },
        elevation: 16,
      }}
    >
      <View
        className="px-3.5 py-2 border-b"
        style={{
          backgroundColor: isDark ? SOCIAL_ACCENT_SOFT_DARK : SOCIAL_ACCENT_SOFT,
          borderBottomColor: isDark ? colors.borderColor2 : `${SOCIAL_ACCENT}33`,
        }}
      >
        <Text className="text-xs font-semibold" style={{ color: SOCIAL_ACCENT }}>
          {t('social.searchProfilesTitle')}
        </Text>
      </View>

      {searching ? (
        <View className="py-5 items-center">
          <ActivityIndicator color={SOCIAL_ACCENT} size="small" />
        </View>
      ) : profiles.length === 0 ? (
        <View className="py-5 px-4">
          <Text className="text-sm text-center" style={{ color: colors.textSecondary }}>
            {emptyMessage ?? '—'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={profiles}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="always"
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => (
            <View style={{ height: 1, backgroundColor: colors.borderColor2, marginHorizontal: 12 }} />
          )}
          renderItem={renderItem}
        />
      )}
    </View>
  );
};
