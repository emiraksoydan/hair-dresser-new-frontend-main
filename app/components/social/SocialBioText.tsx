import React, { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';
import RenderHTML from 'react-native-render-html';
import { Text, type TextProps } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { splitTextByMentions } from '../../utils/social/socialMention';
import { parseFormattedBioText, isBioHtml } from '../../utils/social/socialBioFormat';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';

type Props = {
  text: string;
  style?: TextProps['style'];
  mentionStyle?: TextProps['style'];
  numberOfLines?: number;
};

function LegacyBioText({ text, style, mentionStyle, numberOfLines }: Props) {
  const router = useSafeNavigation();
  const mentionParts = splitTextByMentions(text);

  return (
    <Text style={style} numberOfLines={numberOfLines}>
      {mentionParts.map((part, partIdx) => {
        if (part.type === 'mention') {
          return (
            <Text
              key={`m-${partIdx}-${part.username}`}
              onPress={() =>
                router.push({
                  pathname: '/(screens)/social/profile-view',
                  params: { username: part.username },
                } as never)
              }
              style={[{ color: SOCIAL_ACCENT, fontWeight: '700' }, mentionStyle]}
            >
              @{part.username}
            </Text>
          );
        }

        const inline = parseFormattedBioText(part.value);
        return inline.map((seg, segIdx) => {
          const key = `t-${partIdx}-${segIdx}`;
          const colorStyle = seg.color ? { color: seg.color } : undefined;
          if (seg.type === 'bold') {
            return (
              <Text key={key} style={[{ fontWeight: '700' }, colorStyle]}>
                {seg.value}
              </Text>
            );
          }
          return (
            <Text key={key} style={colorStyle}>
              {seg.value}
            </Text>
          );
        });
      })}
    </Text>
  );
}

export const SocialBioText: React.FC<Props> = React.memo(({ text, style, mentionStyle, numberOfLines }) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();

  const flatStyle = useMemo(() => {
    if (!style) return { color: colors.textSecondary, fontSize: 14, lineHeight: 20 };
    if (Array.isArray(style)) {
      return Object.assign({}, ...style);
    }
    return style as object;
  }, [style, colors.textSecondary]);

  const baseColor = (flatStyle as { color?: string }).color ?? colors.textSecondary;
  const baseSize = (flatStyle as { fontSize?: number }).fontSize ?? 14;
  const baseLineHeight = (flatStyle as { lineHeight?: number }).lineHeight ?? 20;

  if (!isBioHtml(text)) {
    return <LegacyBioText text={text} style={style} mentionStyle={mentionStyle} numberOfLines={numberOfLines} />;
  }

  const source = useMemo(() => ({ html: text }), [text]);
  const tagsStyles = useMemo(
    () => ({
      body: {
        color: baseColor,
        fontSize: baseSize,
        lineHeight: baseLineHeight,
        margin: 0,
        padding: 0,
      },
      p: { marginTop: 0, marginBottom: 4 },
      strong: { fontWeight: '700' as const },
      em: { fontStyle: 'italic' as const },
      a: { color: SOCIAL_ACCENT, textDecorationLine: 'underline' as const },
    }),
    [baseColor, baseSize, baseLineHeight],
  );

  return (
    <RenderHTML
      contentWidth={width - 48}
      source={source}
      tagsStyles={tagsStyles}
      defaultTextProps={{
        numberOfLines,
        style: { color: baseColor },
      }}
    />
  );
});

SocialBioText.displayName = 'SocialBioText';
