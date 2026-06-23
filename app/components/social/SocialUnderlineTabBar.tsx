import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';

export type SocialUnderlineTab = {
  key: string;
  icon: string;
  iconActive: string;
  label: string;
};

type Props<T extends string> = {
  tabs: SocialUnderlineTab[];
  activeKey: T;
  onChange: (key: T) => void;
};

export function SocialUnderlineTabBar<T extends string>({ tabs, activeKey, onChange }: Props<T>) {
  const { colors } = useTheme();

  return (
    <View className="flex-row" style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor2 }}>
      {tabs.map((item) => {
        const active = activeKey === item.key;
        return (
          <TouchableOpacity
            key={item.key}
            onPress={() => onChange(item.key as T)}
            activeOpacity={0.75}
            className="flex-1 flex-row items-center justify-center gap-1 py-3 px-0.5"
            style={{
              borderBottomWidth: active ? 2 : 0,
              borderBottomColor: active ? SOCIAL_ACCENT : 'transparent',
            }}
          >
            <Icon
              source={active ? item.iconActive : item.icon}
              size={17}
              color={active ? colors.headerText : colors.textSecondary}
            />
            <Text
              className="text-[11px] font-semibold"
              numberOfLines={1}
              style={{ color: active ? colors.headerText : colors.textSecondary }}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}
