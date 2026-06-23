import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAuth } from '../../hook/useAuth';
import { exitSocialMode } from '../../utils/social/exitSocialMode';
import { useSafeNavigation } from '../../hook/useSafeNavigation';

export const SocialMessagesHeader: React.FC = () => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const { userType } = useAuth();
  const router = useSafeNavigation();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
      <View
        className="flex-row items-center justify-between px-3"
        style={{ height: 56 }}
      >
        <TouchableOpacity
          onPress={() => exitSocialMode(userType)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
        >
          <Icon source="arrow-left" size={22} color={colors.headerText} />
        </TouchableOpacity>

        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.headerText }}>
          {t('social.tabs.messages')}
        </Text>

        <TouchableOpacity
          onPress={() => router.push('/(screens)/social/deleted-threads' as any)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          className="w-9 h-9 items-center justify-center rounded-full"
          style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          accessibilityLabel={t('social.deletedThreadsTitle')}
        >
          <Icon source="history" size={22} color={colors.headerText} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};
