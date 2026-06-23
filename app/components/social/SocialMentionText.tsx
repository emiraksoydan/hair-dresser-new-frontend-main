import React, { useCallback } from 'react';
import { Text, type TextProps } from '../common/Text';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { splitTextByMentions } from '../../utils/social/socialMention';
import { SOCIAL_ACCENT, SOCIAL_ACCENT_TEXT } from '../../constants/socialTheme';

type Props = {
  text: string;
  style?: TextProps['style'];
  mentionStyle?: TextProps['style'];
  numberOfLines?: number;
};

export const SocialMentionText: React.FC<Props> = React.memo(
  ({ text, style, mentionStyle, numberOfLines }) => {
    const router = useSafeNavigation();
    const parts = splitTextByMentions(text);

    const openMention = useCallback(
      (username: string) => {
        router.push({
          pathname: '/(screens)/social/profile-view',
          params: { username },
        } as never);
      },
      [router],
    );

    return (
      <Text style={style} numberOfLines={numberOfLines}>
        {parts.map((part, idx) => {
          if (part.type === 'text') {
            return <Text key={`t-${idx}`}>{part.value}</Text>;
          }
          return (
            <Text
              key={`m-${idx}-${part.username}`}
              onPress={() => openMention(part.username)}
              style={[
                { color: SOCIAL_ACCENT, fontWeight: '700' },
                mentionStyle,
              ]}
            >
              @{part.username}
            </Text>
          );
        })}
      </Text>
    );
  },
);

SocialMentionText.displayName = 'SocialMentionText';
