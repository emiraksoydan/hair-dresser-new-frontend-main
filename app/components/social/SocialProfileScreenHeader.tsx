import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { ProfileAccountSwitcherPill } from '../common/ProfileAccountSwitcherPill';
import { useTheme } from '../../hook/useTheme';
import { useAuth } from '../../hook/useAuth';
import { useMultiAccount } from '../../context/MultiAccountContext';
import { exitSocialMode } from '../../utils/social/exitSocialMode';
import { SocialProfileHeaderMenu } from './SocialProfileHeaderMenu';

type Props = {
  onShareProfile?: () => void;
};

export const SocialProfileScreenHeader: React.FC<Props> = ({ onShareProfile }) => {
  const { colors, isDark } = useTheme();
  const { userType } = useAuth();
  const { openAccountSwitcher } = useMultiAccount();

  return (
    <SafeAreaView edges={['top']} style={{ backgroundColor: colors.screenBg }}>
      <View
        className="flex-row items-center px-2 min-h-[52px]"
        style={{ borderBottomWidth: 1, borderBottomColor: colors.borderColor2 }}
      >
        <View className="w-[84px] items-start">
          <TouchableOpacity
            onPress={() => exitSocialMode(userType)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            className="w-9 h-9 items-center justify-center rounded-full ml-1"
            style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
          >
            <Icon source="arrow-left" size={22} color={colors.headerText} />
          </TouchableOpacity>
        </View>

        <View className="flex-1 items-center justify-center px-1">
          <ProfileAccountSwitcherPill
            compact
            onPress={() => openAccountSwitcher()}
          />
        </View>

        <View className="w-[84px] items-end">
          <SocialProfileHeaderMenu onShareProfile={onShareProfile} />
        </View>
      </View>
    </SafeAreaView>
  );
};
