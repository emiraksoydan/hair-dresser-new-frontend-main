import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useSafeNavigation } from '../../hook/useSafeNavigation';

type Props = {
  title: string;
  onBack?: () => void;
  right?: React.ReactNode;
};

export const SocialScreenHeader: React.FC<Props> = ({ title, onBack, right }) => {
  const { colors } = useTheme();
  const router = useSafeNavigation();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
      <View
        className="flex-row items-center justify-between px-3 py-2.5"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor }}
      >
        <View className="flex-row items-center flex-1 min-w-0">
          <TouchableOpacity
            onPress={onBack ?? (() => router.back())}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: colors.cardBg3,
              borderWidth: 1,
              borderColor: colors.borderColor2,
            }}
          >
            <Icon source="chevron-left" size={24} color={colors.sectionHeaderText} />
          </TouchableOpacity>
          <Text
            className="ml-2.5 flex-1"
            numberOfLines={1}
            style={{
              color: colors.sectionHeaderText,
              fontFamily: 'CenturyGothic-Bold',
              fontSize: 17,
            }}
          >
            {title}
          </Text>
        </View>
        {right ? <View className="ml-2">{right}</View> : null}
      </View>
    </SafeAreaView>
  );
};
