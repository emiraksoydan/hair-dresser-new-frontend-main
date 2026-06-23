import React, { useCallback, useMemo } from 'react';
import { useSafeNavigation } from '../../hook/useSafeNavigation';
import { View, TouchableOpacity, Platform } from 'react-native';
import { Tabs, useSegments } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from 'react-native-paper';
import { CustomCurvedTabBar, CustomTabItem } from '../common/CustomCurvedTabBar';
import { Text } from '../common/Text';
import { useTheme } from '../../hook/useTheme';
import { useLanguage } from '../../hook/useLanguage';
import { useAuth } from '../../hook/useAuth';
import { useMultiAccount } from '../../context/MultiAccountContext';
import { COLORS } from '../../constants/colors';
import { useSocialLimits } from '../../hook/useSocialLimits';
import { exitSocialMode, SOCIAL_TAB_HREFS } from '../../utils/social/exitSocialMode';
import { useGetBadgeCountsQuery } from '../../store/api';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { resolveSocialMessagesTabBadge } from '../../utils/social/socialProfileUnreadBadge';

const SOCIAL_TABS: {
  name: string;
  titleKey: string;
  icon: string;
  iconFocused: string;
  labelKey: string;
}[] = [
  {
    name: '(feed)',
    titleKey: 'social.tabs.feed',
    icon: 'home-variant-outline',
    iconFocused: 'home-variant',
    labelKey: 'social.tabs.feed',
  },
  {
    name: '(reels)',
    titleKey: 'social.tabs.reels',
    icon: 'play-box-outline',
    iconFocused: 'play-box',
    labelKey: 'social.tabs.reels',
  },
  {
    name: '(search)',
    titleKey: 'social.tabs.search',
    icon: 'magnify',
    iconFocused: 'magnify',
    labelKey: 'social.tabs.search',
  },
  {
    name: '(messages)',
    titleKey: 'social.tabs.messages',
    icon: 'send-outline',
    iconFocused: 'send',
    labelKey: 'social.tabs.messages',
  },
  {
    name: '(profile)',
    titleKey: 'social.tabs.profile',
    icon: 'account-outline',
    iconFocused: 'account',
    labelKey: 'social.tabs.profile',
  },
];

export const SocialTabLayout: React.FC = () => {
  useSocialLimits();
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const segments = useSegments();
  const { userType, isAuthenticated } = useAuth();
  const insets = useSafeAreaInsets();
  const { accounts, currentUserId, switchAccount, openAccountSwitcher } = useMultiAccount();
  const { data: badgeCounts } = useGetBadgeCountsQuery(undefined, { skip: !isAuthenticated });
  const { activeProfileId } = useActiveSocialProfile();
  const unreadSocialMsg = resolveSocialMessagesTabBadge(badgeCounts?.data, activeProfileId);

  const activeTabIndex = useMemo(() => {
    const names = SOCIAL_TABS.map((tab) => tab.name);
    const s = segments as string[];
    for (let i = s.length - 1; i >= 0; i--) {
      const ix = names.indexOf(s[i]!);
      if (ix >= 0) return ix;
    }
    return 0;
  }, [segments]);

  const tabItems: CustomTabItem[] = useMemo(
    () =>
      SOCIAL_TABS.map((tab) => ({
        key: tab.name,
        label: t(tab.labelKey),
        icon: tab.icon,
        iconFocused: tab.iconFocused,
        badgeCount: tab.name === '(messages)' ? unreadSocialMsg : undefined,
      })),
    [t, unreadSocialMsg],
  );

  // Standard header style for non-feed tabs — no shadow/elevation so bg matches content
  const headerStyle = useMemo(
    () => ({
      backgroundColor: colors.screenBg,
      borderBottomWidth: 0,
      elevation: 0,
      shadowOpacity: 0,
      height: 56 + insets.top,
    }),
    [colors.screenBg, insets.top],
  );

  // Back button — shown on all non-feed tabs so user can return to main app
  const renderHeaderLeft = useCallback(
    () => (
      <TouchableOpacity
        onPress={() => exitSocialMode(userType)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        className="ml-2 w-9 h-9 items-center justify-center rounded-full"
        style={{ backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)' }}
      >
        <Icon source="store-outline" size={22} color={colors.headerText} />
      </TouchableOpacity>
    ),
    [userType, colors.headerText, isDark],
  );

  // Custom tab bar using our curved design
  const renderCurvedTabBar = useCallback(
    (props: { state: { routes: { name: string }[] }; navigation: { navigate: (name: string) => void } }) => {
      // Reels: Instagram tarzı tam ekran — alt tab bar gizli
      if (activeTabIndex === 1) return null;

      const { state, navigation } = props;

      return (
        <View style={{ backgroundColor: colors.screenBg, paddingBottom: Platform.OS === 'ios' ? 0 : 4 }}>
          <CustomCurvedTabBar
            tabs={tabItems}
            activeIndex={activeTabIndex}
            onTabPress={(_, tab) => {
              const route = state.routes.find((r) => r.name === tab.key);
              if (route) {
                navigation.navigate(route.name);
                return;
              }
              const href = SOCIAL_TAB_HREFS[tab.key];
              if (href) {
                router.navigate(href);
              }
            }}
            onTabDoubleTap={(_, tab) => {
              if (tab.key !== '(profile)') return;
              const others = accounts.filter(
                (a) =>
                  currentUserId != null &&
                  a.id.toLowerCase() !== currentUserId.toLowerCase() &&
                  !a.needsReauth,
              );
              if (others.length === 0) {
                void openAccountSwitcher();
                return;
              }
              if (others.length === 1) {
                void switchAccount(others[0]!);
                return;
              }
              void openAccountSwitcher();
            }}
            chipBackground={COLORS.UI.ACCENT_GOLD}
            chipForeground={isDark ? COLORS.UI.ACCENT_GOLD : COLORS.PROFILE.NAVY}
            onGoldIconColor={isDark ? COLORS.UI.TEXT_ON_GOLD_DARK : COLORS.UI.TEXT_ON_GOLD}
            backgroundColor={colors.tabBarBg}
            inactiveIconColor={isDark ? '#9CA3AF' : '#6b7280'}
            height={60}
          />
        </View>
      );
    },
    [tabItems, colors, isDark, activeTabIndex, router, accounts, currentUserId, switchAccount, openAccountSwitcher],
  );

  return (
    <Tabs
      tabBar={renderCurvedTabBar}
      screenOptions={{
        headerShown: true,
        tabBarShowLabel: false,
        tabBarStyle: { display: 'none' },
        lazy: true,
        freezeOnBlur: true,
      }}
    >
      <Tabs.Screen name="index" options={{ href: null }} />

      {SOCIAL_TABS.map((tab) => {
        // Feed, search, profile, messages: header is rendered inside the screen itself
        if (tab.name === '(feed)' || tab.name === '(search)' || tab.name === '(profile)' || tab.name === '(reels)' || tab.name === '(messages)') {
          return (
            <Tabs.Screen
              key={tab.name}
              name={tab.name}
              options={{
                headerShown: false,
                title: '',
              }}
            />
          );
        }

        return (
          <Tabs.Screen
            key={tab.name}
            name={tab.name}
            options={{
              headerStyle,
              headerTitle: () => (
                <Text style={{ fontSize: 17, fontWeight: '700', color: colors.headerText }}>
                  {t(tab.titleKey)}
                </Text>
              ),
              headerTitleAlign: 'center',
              headerLeft: renderHeaderLeft,
              headerTintColor: colors.headerText,
            }}
          />
        );
      })}
    </Tabs>
  );
};
