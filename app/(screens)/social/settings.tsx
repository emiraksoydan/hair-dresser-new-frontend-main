import React, { useCallback } from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, Switch } from 'react-native-paper';

import { Text } from '../../components/common/Text';
import { SocialScreenHeader } from '../../components/social/SocialScreenHeader';
import { useTheme } from '../../hook/useTheme';
import { useThemeContext } from '../../context/ThemeContext';
import { useLanguage } from '../../hook/useLanguage';
import { getProfilePaperSwitchProps } from '../../constants/colors';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useGetSettingQuery, useUpdateSettingMutation, useUpdateSocialProfileMutation } from '../../store/api';
import type { SettingUpdateDto } from '../../types/auth';
import { SocialDmPolicy } from '../../types/social';
import { SOCIAL_ACCENT } from '../../constants/socialTheme';
import { useSafeNavigation } from '../../hook/useSafeNavigation';

function SettingsNavRow({
  icon,
  iconColor,
  label,
  subtitle,
  onPress,
  isLast,
  colors,
}: {
  icon: string;
  iconColor: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  isLast?: boolean;
  colors: ReturnType<typeof useTheme>['colors'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      className="flex-row items-center justify-between p-4"
      style={isLast ? undefined : { borderBottomColor: colors.borderColor, borderBottomWidth: 1 }}
    >
      <View className="flex-row items-center flex-1 min-w-0 mr-3">
        <Icon source={icon} size={24} color={iconColor} />
        <View className="ml-3 flex-1 min-w-0">
          <Text className="text-base" style={{ color: colors.sectionHeaderText }}>
            {label}
          </Text>
          {subtitle ? (
            <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }} numberOfLines={2}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <Icon source="chevron-right" size={24} color="#6b7280" />
    </TouchableOpacity>
  );
}

function SettingToggleRow({
  label,
  description,
  value,
  onChange,
  colors,
  isDark,
  isLast,
}: {
  label: string;
  description?: string;
  value: boolean;
  onChange: (next: boolean) => void;
  colors: ReturnType<typeof useTheme>['colors'];
  isDark: boolean;
  isLast?: boolean;
}) {
  return (
    <>
      <View className="flex-row items-center justify-between py-1">
        <View className="flex-1 mr-4">
          <Text className="text-base font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
            {label}
          </Text>
          {description ? (
            <Text className="text-sm mt-0.5" style={{ color: colors.textSecondary }}>
              {description}
            </Text>
          ) : null}
        </View>
        <Switch value={value} onValueChange={onChange} {...getProfilePaperSwitchProps(isDark)} />
      </View>
      {!isLast ? <View style={{ height: 1, backgroundColor: colors.borderColor, marginVertical: 8 }} /> : null}
    </>
  );
}

export default function SocialSettingsScreen() {
  const { colors, isDark } = useTheme();
  const { themeMode, toggleTheme } = useThemeContext();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const { activeProfile } = useActiveSocialProfile();
  const { data: settingRes } = useGetSettingQuery();
  const [updateSetting] = useUpdateSettingMutation();
  const [updateSocialProfile] = useUpdateSocialProfileMutation();
  const setting = settingRes?.data;

  const handleDmPolicyChange = useCallback(
    (policy: SocialDmPolicy) => {
      if (!activeProfile?.id || activeProfile.dmPolicy === policy) return;
      updateSocialProfile({ profileId: activeProfile.id, dmPolicy: policy });
    },
    [activeProfile, updateSocialProfile],
  );

  const patchSetting = useCallback(
    (patch: Partial<SettingUpdateDto>) => {
      if (!setting) return;
      updateSetting({
        showImageAnimation: setting.showImageAnimation,
        showPriceAnimation: setting.showPriceAnimation,
        enableNotificationSound: setting.enableNotificationSound,
        socialNotifyPostEngagement: setting.socialNotifyPostEngagement ?? true,
        socialNotifyComments: setting.socialNotifyComments ?? true,
        socialNotifyFollowers: setting.socialNotifyFollowers ?? true,
        socialNotifyMentions: setting.socialNotifyMentions ?? true,
        socialNotifyStoryEngagement: setting.socialNotifyStoryEngagement ?? true,
        ...patch,
      });
    },
    [setting, updateSetting],
  );

  const dmOptions = [
    { value: SocialDmPolicy.Everyone, label: t('social.dmPolicyEveryone') },
    { value: SocialDmPolicy.FollowersOnly, label: t('social.dmPolicyFollowers') },
  ];

  return (
    <View className="flex-1" style={{ backgroundColor: colors.screenBg }}>
      <SocialScreenHeader title={t('social.settingsTitle')} />
      <SafeAreaView edges={['bottom']} style={{ flex: 1, backgroundColor: colors.screenBg }}>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
          {activeProfile?.id ? (
            <>
              <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                {t('social.settingsContentSection')}
              </Text>
              <View className="rounded-xl mb-6" style={{ backgroundColor: colors.cardBg }}>
                <SettingsNavRow
                  icon="bookmark-outline"
                  iconColor="#8b5cf6"
                  label={t('social.savedTitle')}
                  subtitle={t('social.savedSubtitle')}
                  onPress={() => router.push('/(screens)/social/saved-posts' as any)}
                  colors={colors}
                />
                <SettingsNavRow
                  icon="archive-arrow-up-outline"
                  iconColor="#0ea5e9"
                  label={t('social.archivedTitle')}
                  subtitle={t('social.archivedSubtitle')}
                  onPress={() => router.push('/(screens)/social/archived-content' as any)}
                  colors={colors}
                />
                <SettingsNavRow
                  icon="archive-arrow-down-outline"
                  iconColor="#f59e0b"
                  label={t('social.deletedThreadsTitle')}
                  subtitle={t('social.deletedThreadsHint')}
                  onPress={() => router.push('/(screens)/social/deleted-threads' as any)}
                  colors={colors}
                />
                <SettingsNavRow
                  icon="account-cancel"
                  iconColor="#ef4444"
                  label={t('social.blockedUsersLink')}
                  onPress={() => router.push('/(screens)/profile/blocked-users' as any)}
                  isLast
                  colors={colors}
                />
              </View>

              <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                {t('social.dmPolicyTitle')}
              </Text>
              <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.cardBg }}>
                <Text className="text-sm mb-3" style={{ color: colors.textSecondary }}>
                  {t('social.dmPolicyHint')}
                </Text>
                {dmOptions.map((opt, index) => {
                  const selected = (activeProfile.dmPolicy ?? SocialDmPolicy.Everyone) === opt.value;
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => handleDmPolicyChange(opt.value)}
                      activeOpacity={0.7}
                      className="flex-row items-center justify-between py-2"
                      style={
                        index < dmOptions.length - 1
                          ? { borderBottomWidth: 1, borderBottomColor: colors.borderColor }
                          : undefined
                      }
                    >
                      <Text className="text-base" style={{ color: colors.sectionHeaderText }}>
                        {opt.label}
                      </Text>
                      {selected ? <Icon source="check-circle" size={22} color={SOCIAL_ACCENT} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : (
            <View className="rounded-xl mb-6" style={{ backgroundColor: colors.cardBg }}>
              <SettingsNavRow
                icon="archive-arrow-down-outline"
                iconColor="#f59e0b"
                label={t('social.deletedThreadsTitle')}
                subtitle={t('social.deletedThreadsHint')}
                onPress={() => router.push('/(screens)/social/deleted-threads' as any)}
                colors={colors}
              />
              <SettingsNavRow
                icon="account-cancel"
                iconColor="#ef4444"
                label={t('social.blockedUsersLink')}
                onPress={() => router.push('/(screens)/profile/blocked-users' as any)}
                isLast
                colors={colors}
              />
            </View>
          )}

          {setting ? (
            <>
              <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                {t('social.appearanceSection')}
              </Text>
              <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.cardBg }}>
                <SettingToggleRow
                  label={t('social.lottieLoop')}
                  description={t('social.lottieLoopHint')}
                  value={setting.showImageAnimation ?? true}
                  onChange={(v) => patchSetting({ showImageAnimation: v })}
                  colors={colors}
                  isDark={isDark}
                  isLast
                />
              </View>

              <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
                {t('social.notificationsSection')}
              </Text>
              <View className="rounded-xl p-4 mb-6" style={{ backgroundColor: colors.cardBg }}>
                <SettingToggleRow
                  label={t('social.notifyPostEngagement')}
                  value={setting.socialNotifyPostEngagement ?? true}
                  onChange={(v) => patchSetting({ socialNotifyPostEngagement: v })}
                  colors={colors}
                  isDark={isDark}
                />
                <SettingToggleRow
                  label={t('social.notifyComments')}
                  value={setting.socialNotifyComments ?? true}
                  onChange={(v) => patchSetting({ socialNotifyComments: v })}
                  colors={colors}
                  isDark={isDark}
                />
                <SettingToggleRow
                  label={t('social.notifyFollowers')}
                  value={setting.socialNotifyFollowers ?? true}
                  onChange={(v) => patchSetting({ socialNotifyFollowers: v })}
                  colors={colors}
                  isDark={isDark}
                />
                <SettingToggleRow
                  label={t('social.notifyMentions')}
                  value={setting.socialNotifyMentions ?? true}
                  onChange={(v) => patchSetting({ socialNotifyMentions: v })}
                  colors={colors}
                  isDark={isDark}
                />
                <SettingToggleRow
                  label={t('social.notifyStoryEngagement')}
                  value={setting.socialNotifyStoryEngagement ?? true}
                  onChange={(v) => patchSetting({ socialNotifyStoryEngagement: v })}
                  colors={colors}
                  isDark={isDark}
                  isLast
                />
              </View>
            </>
          ) : null}

          <Text className="text-sm mb-2" style={{ color: colors.textSecondary }}>
            {t('profile.appearanceSection')}
          </Text>
          <View className="rounded-xl p-4" style={{ backgroundColor: colors.cardBg }}>
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon
                  source={themeMode === 'dark' ? 'weather-night' : 'weather-sunny'}
                  size={20}
                  color={themeMode === 'dark' ? '#60a5fa' : '#f59e0b'}
                />
                <Text className="text-base font-century-gothic-bold" style={{ color: colors.sectionHeaderText }}>
                  {themeMode === 'dark' ? t('profile.darkMode') : t('profile.lightMode')}
                </Text>
              </View>
              <Switch
                value={themeMode === 'dark'}
                onValueChange={toggleTheme}
                {...getProfilePaperSwitchProps(isDark)}
              />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
