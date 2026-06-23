import React from 'react';
import { View } from 'react-native';
import { useTheme } from '../../hook/useTheme';

type Props = {
  count: number;
  activeIndex: number;
  /** Tam ekran medya üzerinde (beyaz pasif noktalar) */
  variant?: 'default' | 'onMedia';
  className?: string;
};

const ACTIVE_COLOR = '#f05e23';

export function CarouselPaginationDots({
  count,
  activeIndex,
  variant = 'default',
  className = '',
}: Props) {
  const { isDark } = useTheme();

  if (count <= 1) return null;

  return (
    <View className={`flex-row justify-center items-center py-1 ${className}`}>
      {Array.from({ length: count }, (_, index) => {
        const isActive = index === activeIndex;
        const inactiveColor =
          variant === 'onMedia'
            ? 'rgba(255,255,255,0.35)'
            : isDark
              ? 'rgba(255,255,255,0.3)'
              : 'rgba(0,0,0,0.2)';

        return (
          <View
            key={index}
            className="mx-1 rounded-full"
            style={{
              width: 10,
              height: 10,
              backgroundColor: isActive ? ACTIVE_COLOR : inactiveColor,
            }}
          />
        );
      })}
    </View>
  );
}
