import React, { useEffect, useMemo, useRef } from 'react';
import { View, Platform, Text } from 'react-native';
import { IconButton, TextInput as PaperTextInput } from 'react-native-paper';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { getSocialLimits } from '../../utils/social/socialLimitsRuntime';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useLazySearchSocialProfilesQuery } from '../../store/api';
import { getActiveMentionQuery, insertMentionAtCursor } from '../../utils/social/socialMention';
import {
  MENTION_SUGGESTION_LIMIT,
  SocialMentionSuggestionList,
} from './SocialMentionSuggestionList';
import { KeyboardDismissExclusionView } from '../common/KeyboardDismissExclusionView';

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  placeholder: string;
  editable?: boolean;
  sending?: boolean;
  bottomInset?: number;
  maxLength?: number;
  variant?: 'default' | 'story';
  /** sheet header = başlık altı; footer = alt sabit (varsayılan) */
  placement?: 'header' | 'footer';
  isLiked?: boolean;
  onToggleLike?: () => void;
  likeAccessibilityLabel?: string;
};

export const SocialCommentComposer: React.FC<Props> = ({
  value,
  onChangeText,
  onSend,
  placeholder,
  editable = true,
  sending = false,
  bottomInset = 10,
  maxLength = getSocialLimits().commentMaxLength,
  variant = 'default',
  placement = 'footer',
  isLiked = false,
  onToggleLike,
  likeAccessibilityLabel,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const isStory = variant === 'story';
  const [searchProfiles, { data: searchResults, isFetching: searching }] = useLazySearchSocialProfilesQuery();
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
    return searchResults.filter((p) => p.username.toLowerCase().startsWith(q)).slice(0, MENTION_SUGGESTION_LIMIT);
  }, [showSuggestions, searchResults, mentionQuery]);

  const pickSuggestion = (username: string) => {
    onChangeText(insertMentionAtCursor(value, username));
  };

  const showMentionStrip = showSuggestions && (suggestions.length > 0 || searching);
  const canSend = !!value.trim() && editable && !sending;
  const isHeader = placement === 'header' && !isStory;

  const inputOutline = isStory ? 'rgba(255,255,255,0.35)' : colors.borderColor2;
  const inputActiveOutline = isStory ? 'rgba(255,255,255,0.65)' : SOCIAL_ACCENT;
  const inputBg = isStory
    ? 'rgba(255,255,255,0.1)'
    : isDark
      ? '#1f2937'
      : '#f8fafc';
  const inputTextColor = isStory ? '#fff' : colors.headerText;
  const placeholderColor = isStory ? 'rgba(255,255,255,0.55)' : colors.textSecondary;

  return (
    <KeyboardDismissExclusionView
      style={{
        borderTopWidth: isStory || isHeader ? 0 : 1,
        borderTopColor: colors.borderColor2,
        borderBottomWidth: isHeader ? 1 : 0,
        borderBottomColor: isHeader ? colors.borderColor2 : 'transparent',
        backgroundColor: isStory ? 'rgba(0,0,0,0.45)' : colors.cardBg,
        paddingBottom: Math.max(bottomInset, isStory ? 16 : isHeader ? 8 : 10),
        paddingTop: isStory ? 10 : isHeader ? 0 : 0,
      }}
    >
      {showMentionStrip && (
        <SocialMentionSuggestionList
          suggestions={suggestions}
          searching={searching}
          onPick={(profile) => pickSuggestion(profile.username)}
          contentClassName="px-3"
        />
      )}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          paddingHorizontal: 10,
          paddingTop: isStory ? 0 : isHeader ? 8 : 10,
          gap: 2,
        }}
      >
        <PaperTextInput
          mode="outlined"
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={placeholderColor}
          editable={editable && !sending}
          dense
          multiline={false}
          maxLength={maxLength}
          returnKeyType="send"
          onSubmitEditing={onSend}
          outlineColor={inputOutline}
          activeOutlineColor={inputActiveOutline}
          textColor={inputTextColor}
          style={{
            flex: 1,
            backgroundColor: inputBg,
            maxHeight: 48,
          }}
          contentStyle={{
            fontSize: 15,
            paddingVertical: Platform.OS === 'ios' ? 8 : 6,
          }}
          theme={{
            colors: {
              onSurfaceVariant: placeholderColor,
            },
          }}
        />

        {onToggleLike ? (
          <IconButton
            icon={isLiked ? 'thumb-up' : 'thumb-up-outline'}
            size={22}
            iconColor={isLiked ? SOCIAL_ACCENT : isStory ? '#fff' : colors.textSecondary}
            disabled={!editable || sending}
            onPress={onToggleLike}
            accessibilityLabel={likeAccessibilityLabel ?? t('social.likes')}
            style={{ margin: 0 }}
          />
        ) : null}

        <IconButton
          icon="send"
          size={22}
          iconColor={
            canSend ? SOCIAL_ACCENT : isStory ? 'rgba(255,255,255,0.35)' : colors.textSecondary
          }
          disabled={!canSend}
          loading={sending}
          onPress={onSend}
          accessibilityLabel={t('social.commentSend')}
          style={{ margin: 0 }}
        />
      </View>

      {value.length > maxLength * 0.85 && (
        <Text
          style={{
            fontSize: 11,
            textAlign: 'right',
            paddingHorizontal: 14,
            paddingTop: 4,
            color: value.length >= maxLength ? SOCIAL_ACCENT : colors.textTertiary,
          }}
        >
          {value.length}/{maxLength}
        </Text>
      )}
    </KeyboardDismissExclusionView>
  );
};
