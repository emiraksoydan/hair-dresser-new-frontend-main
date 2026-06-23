import React, { useMemo } from 'react';
import { View, TouchableOpacity, Image } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import type { SocialProfileSearchResultDto } from '../../types/social';
import { SocialProfileOwnerType } from '../../types/social';
import { SOCIAL_PAIR_BLUE, SOCIAL_PAIR_ORANGE } from '../../constants/socialTheme';
import { socialProfileOwnerNumberLabel } from '../../utils/social/socialProfileOwnerLabel';

type Props = {
  item: SocialProfileSearchResultDto;
  onPress: () => void;
  variant?: 'list' | 'dropdown';
};

function ownerMeta(type: SocialProfileOwnerType, t: (k: string) => string) {
  switch (type) {
    case SocialProfileOwnerType.FreeBarber:
      return { label: t('social.ownerFreeBarber'), icon: 'content-cut', color: SOCIAL_PAIR_ORANGE };
    case SocialProfileOwnerType.BarberStore:
      return { label: t('social.ownerStore'), icon: 'store-outline', color: SOCIAL_PAIR_BLUE };
    default:
      return { label: t('social.ownerCustomer'), icon: 'account-outline', color: '#6b7280' };
  }
}

export const SocialSearchProfileRow: React.FC<Props> = React.memo(({ item, onPress, variant = 'list' }) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const isDropdown = variant === 'dropdown';

  const meta = useMemo(() => ownerMeta(item.ownerType, t), [item.ownerType, t]);
  const numberLabel = socialProfileOwnerNumberLabel(item.ownerType, t);
  const avatarSize = isDropdown ? 44 : 52;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className={
        isDropdown
          ? 'flex-row items-center px-3 py-2.5 gap-3'
          : 'mx-4 mb-3 rounded-2xl p-3.5 border flex-row items-center'
      }
      style={
        isDropdown
          ? undefined
          : {
              backgroundColor: colors.cardBg,
              borderColor: isDark ? colors.borderColor2 : colors.borderColor,
            }
      }
    >
      <View
        className="rounded-full overflow-hidden items-center justify-center shrink-0"
        style={{
          width: avatarSize,
          height: avatarSize,
          backgroundColor: isDark ? '#374151' : '#e5e7eb',
        }}
      >
        {item.avatarUrl ? (
          <Image source={{ uri: item.avatarUrl }} style={{ width: avatarSize, height: avatarSize }} />
        ) : (
          <Icon source="account" size={avatarSize * 0.5} color={colors.headerText} />
        )}
      </View>

      <View className="flex-1 min-w-0 mr-1">
        <Text
          className={isDropdown ? 'font-bold text-sm' : 'font-bold text-[15px]'}
          style={{ color: colors.headerText }}
          numberOfLines={1}
        >
          @{item.username}
        </Text>

        <View className="flex-row items-center flex-wrap gap-1.5 mt-1">
          <View
            className="flex-row items-center gap-1 px-2 py-0.5 rounded-full"
            style={{ backgroundColor: `${meta.color}18` }}
          >
            <Icon source={meta.icon} size={12} color={meta.color} />
            <Text className="text-[11px] font-semibold" style={{ color: meta.color }}>
              {meta.label}
            </Text>
          </View>
          {item.ownerNumber ? (
            <View
              className="flex-row items-center gap-0.5 px-2 py-0.5 rounded-full"
              style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)' }}
            >
              <Text className="text-[10px] font-medium" style={{ color: colors.textSecondary }}>
                {numberLabel} #{item.ownerNumber}
              </Text>
            </View>
          ) : null}
        </View>

        {!isDropdown && !!item.bio && (
          <Text className="text-xs mt-1.5 leading-4" style={{ color: colors.textSecondary }} numberOfLines={2}>
            {item.bio}
          </Text>
        )}
      </View>

      <Icon source="chevron-right" size={isDropdown ? 18 : 20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
});

SocialSearchProfileRow.displayName = 'SocialSearchProfileRow';
