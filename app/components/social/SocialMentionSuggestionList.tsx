import React, { useCallback } from 'react';
import {
  View,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Image,
  Platform,
  type ListRenderItem,
} from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import type { SocialProfileSearchResultDto } from '../../types/social';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';

/** API üst sınırı 50 */
export const MENTION_SUGGESTION_LIMIT = 30;

type Props = {
  suggestions: SocialProfileSearchResultDto[];
  searching: boolean;
  onPick: (profile: SocialProfileSearchResultDto) => void;
  /** Input ile sol hiza (örn. yorum composer: `px-3`) */
  contentClassName?: string;
};

function SuggestionChip({
  item,
  onPick,
}: {
  item: SocialProfileSearchResultDto;
  onPick: (profile: SocialProfileSearchResultDto) => void;
}) {
  const { colors, isDark } = useTheme();

  return (
    <TouchableOpacity
      onPress={() => onPick(item)}
      activeOpacity={0.65}
      className="flex-row items-center gap-1.5 shrink-0"
    >
      <View
        className={`w-[26px] h-[26px] rounded-full overflow-hidden items-center justify-center ${
          isDark ? 'bg-white/10' : 'bg-black/5'
        }`}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} className="w-[26px] h-[26px]" />
        ) : (
          <Icon source="account" size={14} color={colors.headerText} />
        )}
      </View>
      <Text className="font-semibold text-xs shrink-0" style={{ color: colors.headerText }}>
        @{item.username}
      </Text>
    </TouchableOpacity>
  );
}

/** @ mention önerileri — input hemen üstünde yatay FlatList. */
export const SocialMentionSuggestionList: React.FC<Props> = ({
  suggestions,
  searching,
  onPick,
  contentClassName = '',
}) => {
  const renderItem: ListRenderItem<SocialProfileSearchResultDto> = useCallback(
    ({ item }) => <SuggestionChip item={item} onPick={onPick} />,
    [onPick],
  );

  if (!searching && suggestions.length === 0) return null;

  const padClass = contentClassName.trim();

  return (
    <View className="h-11 bg-transparent">
      {searching && suggestions.length === 0 ? (
        <View className={`flex-1 items-start justify-center ${padClass}`}>
          <ActivityIndicator color={SOCIAL_ACCENT} size="small" />
        </View>
      ) : (
        <FlatList
          horizontal
          data={suggestions}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="always"
          showsHorizontalScrollIndicator={Platform.OS === 'android'}
          nestedScrollEnabled
          contentContainerClassName={`items-center gap-3 py-1.5 ${padClass}`}
        />
      )}
    </View>
  );
};
