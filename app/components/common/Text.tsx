import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, Platform } from 'react-native';

export interface TextProps extends RNTextProps {
  children?: React.ReactNode;
}

// NativeWind text-size class'larını tespit etmek için regex
const FONT_SIZE_CLASS_REGEX = /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[[\d.]+(?:px|rem|em)?\])\b/;
// Bold class veya semibold class'larını tespit etmek için regex
const FONT_BOLD_CLASS_REGEX = /\bfont-(bold|semibold|extrabold|black|heavy|700|800|900)\b/;

/**
 * Custom Text component with Century Gothic font applied by default
 * Use this instead of React Native's Text component throughout the app
 */
export const Text: React.FC<TextProps> = ({ className, style, ...props }) => {
  const flatStyle = style ? StyleSheet.flatten(Array.isArray(style) ? style : [style]) : null;
  /** style ile başka font verildiyse varsayılan Century + NativeWind sınıfı ezmesin (Android'de Dancing Script vb. bozuluyordu) */
  const explicitFontFamily = typeof (flatStyle as { fontFamily?: string } | null)?.fontFamily === 'string';

  // Bold class veya style'da fontWeight bold/700+ varsa CenturyGothic-Bold kullan
  const hasBoldClass = FONT_BOLD_CLASS_REGEX.test(className || '');
  const styleFontWeight = (flatStyle as { fontWeight?: string } | null)?.fontWeight;
  const hasBoldStyle = styleFontWeight === 'bold' || Number(styleFontWeight) >= 700;
  const isBold = !explicitFontFamily && (hasBoldClass || hasBoldStyle);

  const fontClassName = explicitFontFamily
    ? className || undefined
    : className
      ? `font-century-gothic ${className}`
      : 'font-century-gothic';

  const hasFontSizeInClass = FONT_SIZE_CLASS_REGEX.test(className || '');
  const hasFontSizeInStyle = !!(flatStyle as { fontSize?: number } | null)?.fontSize;
  const defaultFontSize = hasFontSizeInClass || hasFontSizeInStyle ? {} : { fontSize: 15 };

  const fontStyle = explicitFontFamily
    ? { ...defaultFontSize }
    : Platform.OS === 'ios' || Platform.OS === 'android'
      ? { fontFamily: isBold ? 'CenturyGothic-Bold' : 'CenturyGothic', ...defaultFontSize }
      : { ...defaultFontSize };

  return (
    <RNText
      className={fontClassName}
      style={[fontStyle, style]}
      allowFontScaling={false}
      {...props}
    />
  );
};
