import React from 'react';
import { I18nManager } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useTheme } from '../../hook/useTheme';

const OUTLINE_D =
  'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z';
const FULL_D =
  'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z';
const HALF_D =
  'M22,9.24l-7.19-0.62L12,2L9.19,8.63L2,9.24l5.46,4.73L5.82,21L12,17.27L18.18,21l-1.63-7.03L22,9.24z M12,15.4V6.1 l1.71,4.04l4.38,0.38l-3.32,2.88l1,4.28L12,15.4z';

const STROKE_LIGHT = '#000000';
const STROKE_WIDTH = 1.2;

type ThemedStarIconProps = {
  index: number;
  size: number;
  color: string;
  type: 'full' | 'half' | 'quarter' | 'three-quarter' | 'empty';
};

/** Açık mod: boş yıldız siyah çerçeve; dolu yıldız turuncu dolgu + siyah kontur. */
export function ThemedStarIcon({ size, color, type }: ThemedStarIconProps) {
  const { isDark } = useTheme();

  if (isDark) {
    const d = type === 'full' ? FULL_D : type === 'half' ? HALF_D : OUTLINE_D;
    return (
      <Svg height={size} width={size} viewBox="0 0 24 24">
        <Path fill={color} d={d} />
      </Svg>
    );
  }

  const rtlStyle =
    type === 'half' && I18nManager.isRTL
      ? { transform: [{ rotateY: '180deg' as const }] }
      : undefined;

  if (type === 'empty') {
    return (
      <Svg height={size} width={size} viewBox="0 0 24 24">
        <Path fill={STROKE_LIGHT} d={OUTLINE_D} />
      </Svg>
    );
  }

  return (
    <Svg height={size} width={size} viewBox="0 0 24 24" style={rtlStyle}>
      <Path fill={STROKE_LIGHT} d={OUTLINE_D} />
      <Path
        fill={color}
        stroke={STROKE_LIGHT}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        d={type === 'full' ? FULL_D : HALF_D}
      />
    </Svg>
  );
}
