import React, { useEffect, useMemo, useRef } from 'react';
import { View, Platform } from 'react-native';
import { TextInput as PaperTextInput } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLazySearchSocialProfilesQuery } from '../../store/api';
import { getActiveMentionQuery, insertMentionAtCursor } from '../../utils/social/socialMention';
import { getSocialLimits } from '../../utils/social/socialLimitsRuntime';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import {
  MENTION_SUGGESTION_LIMIT,
  SocialMentionSuggestionList,
} from './SocialMentionSuggestionList';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  maxLength?: number;
  onFocus?: () => void;
  onBlur?: () => void;
};

export const SocialCaptionInput: React.FC<Props> = ({
  value,
  onChangeText,
  placeholder,
  maxLength = getSocialLimits().commentMaxLength,
  onFocus,
  onBlur,
}) => {
  const { colors } = useTheme();
  const [searchProfiles, { data: searchResults, isFetching: searching }] =
    useLazySearchSocialProfilesQuery();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const mentionQuery = useMemo(() => getActiveMentionQuery(value), [value]);
  const showSuggestions = mentionQuery !== null && mentionQuery.length >= 1;

  useEffect(() => {
    if (mentionQuery === null || mentionQuery.length < 1) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      searchProfiles({ q: mentionQuery, limit: MENTION_SUGGESTION_LIMIT });
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [mentionQuery, searchProfiles]);

  const suggestions = useMemo(() => {
    if (!showSuggestions || !searchResults?.length) return [];
    const q = mentionQuery!.toLowerCase();
    return searchResults
      .filter((p) => p.username.toLowerCase().startsWith(q))
      .slice(0, MENTION_SUGGESTION_LIMIT);
  }, [showSuggestions, searchResults, mentionQuery]);

  const pickSuggestion = (username: string) => {
    onChangeText(insertMentionAtCursor(value, username));
  };

  const showMentionStrip = showSuggestions && (suggestions.length > 0 || searching);

  return (
    <View>
      {showMentionStrip && (
        <SocialMentionSuggestionList
          suggestions={suggestions}
          searching={searching}
          onPick={(profile) => pickSuggestion(profile.username)}
        />
      )}

      <PaperTextInput
        mode="outlined"
        multiline
        value={value}
        onChangeText={onChangeText}
        onFocus={onFocus}
        onBlur={onBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.textTertiary}
        maxLength={maxLength}
        numberOfLines={6}
        autoCorrect={false}
        autoCapitalize="sentences"
        outlineColor={colors.borderColor2}
        activeOutlineColor={SOCIAL_ACCENT}
        textColor={colors.headerText}
        style={{ backgroundColor: colors.cardBg, minHeight: 140, maxHeight: 160 }}
        contentStyle={{
          minHeight: 120,
          paddingTop: Platform.OS === 'ios' ? 14 : 12,
          paddingBottom: Platform.OS === 'ios' ? 14 : 12,
        }}
      />

      <Text className="text-[11px] mt-2 text-right" style={{ color: colors.textTertiary }}>
        {value.length}/{maxLength}
      </Text>
    </View>
  );
};
