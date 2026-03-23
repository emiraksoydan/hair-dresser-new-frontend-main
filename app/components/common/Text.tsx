import React from 'react';
import { Text as RNText, TextProps as RNTextProps, StyleSheet, Platform } from 'react-native';

export interface TextProps extends RNTextProps {
  children?: React.ReactNode;
}

// NativeWind text-size class'larını tespit etmek için regex
const FONT_SIZE_CLASS_REGEX = /\btext-(xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl|\[[\d.]+(?:px|rem|em)?\])\b/;

/**
 * Custom Text component with Century Gothic font applied by default
 * Use this instead of React Native's Text component throughout the app
 */
export const Text: React.FC<TextProps> = ({ className, style, ...props }) => {
  // Century Gothic font'u className ile ekle ve style ile de uygula
  const fontClassName = className
    ? `font-century-gothic ${className}`
    : 'font-century-gothic';

  // Eğer className'de font-size class'ı varsa ya da explicit style'da fontSize varsa
  // default 15px uygulanmaz; yoksa 15px default olarak uygulanır
  const hasFontSizeInClass = FONT_SIZE_CLASS_REGEX.test(className || '');
  const flatStyle = style ? StyleSheet.flatten(Array.isArray(style) ? style : [style]) : null;
  const hasFontSizeInStyle = !!(flatStyle as any)?.fontSize;
  const defaultFontSize = hasFontSizeInClass || hasFontSizeInStyle ? {} : { fontSize: 15 };

  const fontStyle = Platform.select({
    ios: { fontFamily: 'CenturyGothic', ...defaultFontSize },
    android: { fontFamily: 'CenturyGothic', ...defaultFontSize },
    default: { ...defaultFontSize },
  });

  return (
    <RNText
      className={fontClassName}
      style={[fontStyle, style]}
      allowFontScaling={false}
      {...props}
    />
  );
};
