import React, { useCallback, useEffect, useState } from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { AnimatedCountText } from '../common/AnimatedCountText';
import { useTheme } from '../../hook/useTheme';
import { formatSocialCount } from '../../utils/formatSocialCount';

type StatItem = {
  icon: string;
  value: number;
  tooltip: string;
};

type Props = {
  items: StatItem[];
};

function StatBadge({ icon, value, tooltip, colors }: StatItem & { colors: ReturnType<typeof useTheme>['colors'] }) {
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    if (!showTip) return;
    const id = setTimeout(() => setShowTip(false), 2800);
    return () => clearTimeout(id);
  }, [showTip]);

  const onPress = useCallback(() => setShowTip((v) => !v), []);

  return (
    <View style={{ position: 'relative' }}>
      <TouchableOpacity
        onPress={onPress}
        activeOpacity={0.75}
        hitSlop={6}
        className="flex-row items-center gap-1"
        accessibilityLabel={tooltip}
      >
        <Icon source={icon} size={13} color={colors.textSecondary} />
        <AnimatedCountText
          value={value}
          formatValue={formatSocialCount}
          className="text-[11px]"
          style={{ color: colors.textSecondary }}
          numberOfLines={1}
        />
      </TouchableOpacity>
      {showTip ? (
        <View
          style={{
            position: 'absolute',
            top: 22,
            right: 0,
            zIndex: 20,
            minWidth: 140,
            maxWidth: 200,
            paddingHorizontal: 8,
            paddingVertical: 6,
            borderRadius: 8,
            backgroundColor: colors.cardBg,
            borderWidth: 1,
            borderColor: colors.borderColor2,
            shadowColor: '#000',
            shadowOpacity: 0.12,
            shadowRadius: 6,
            shadowOffset: { width: 0, height: 2 },
            elevation: 4,
          }}
        >
          <Text className="text-[10px] leading-4" style={{ color: colors.textSecondary }}>
            {tooltip}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

/** Own-profile quick stats (views, reels, highlights) with tap tooltips. */
export function SocialProfileOwnerStatsRow({ items }: Props) {
  const { colors } = useTheme();
  if (!items.length) return null;

  return (
    <View className="flex-row items-center gap-3">
      {items.map((item) => (
        <StatBadge key={item.icon} {...item} colors={colors} />
      ))}
    </View>
  );
}
