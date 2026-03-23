import React, { useState, useMemo, useCallback } from "react";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { CustomCurvedTabBar, CustomTabItem } from "../common/CustomCurvedTabBar";
import { Text } from "../common/Text";
import { BadgeIconButton } from "../common/badgeiconbutton";
import { HeaderActions } from "../common/HeaderActions";
import { HeaderDropdownMenu } from "../common/headerdropdownmenu";
import { NotificationsSheet } from "../appointment/notificationsheet";
import { InfoModal } from "../common/infomodal";
import { useAppDispatch } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { useAuth } from "../../hook/useAuth";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { useNotificationSound } from "../../hook/useNotificationSound";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import {
  useGetBadgeCountsQuery,
  useGetHelpGuideByUserTypeQuery,
} from "../../store/api";
import { UserType } from "../../types";

export interface TabConfig {
  name: string;
  headerTitle: string;
  icon: string;
  iconFocused: string;
  label: string;
  showHeaderLeft?: boolean;
  headerTitleAlign?: "left" | "center";
}

export interface BaseTabLayoutProps {
  userType: UserType;
  accentColor: string;
  tabs: TabConfig[];
  children?: React.ReactNode;
  dropdownMenuItems?: Array<{
    icon: string;
    label: string;
    onPress: () => void;
  }>;
  renderAdditionalBottomSheets?: () => React.ReactNode;
}

export const BaseTabLayout: React.FC<BaseTabLayoutProps> = ({
  userType,
  accentColor,
  tabs,
  children,
  dropdownMenuItems,
  renderAdditionalBottomSheets,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const dispatch = useAppDispatch();
  const { userName, isAuthenticated } = useAuth();

  // Bottom sheet hook
  const notificationsSheet = useBottomSheet({
    snapPoints: ["60%", "90%"],
    enablePanDownToClose: true,
    enableOverDrag: false,
  });

  // Badge count'ları API'den al (SignalR ile anlık güncellenir)
  const { data: badgeCounts } = useGetBadgeCountsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const unreadNoti = badgeCounts?.data?.notificationUnreadCount || 0;
  const unreadMsg = badgeCounts?.data?.chatUnreadCount || 0;

  // Play notification sound when badge count changes
  useNotificationSound(unreadNoti);

  // Help guide items - API'den dinamik olarak çek
  const { data: helpGuideResponse } = useGetHelpGuideByUserTypeQuery(
    userType,
    { skip: !isAuthenticated },
  );

  const infoItems = useMemo(() => {
    if (helpGuideResponse?.success && helpGuideResponse?.data?.length > 0) {
      return helpGuideResponse.data.map((guide) => ({
        title: guide.title,
        description: guide.description,
      }));
    }
    return [];
  }, [helpGuideResponse]);

  // Ortak header actions callbacks
  const handleNotificationPress = useCallback(() => {
    notificationsSheet.present();
  }, [notificationsSheet]);

  const handleInfoPress = useCallback(() => {
    setInfoModalVisible(true);
  }, []);

  // Header right component - dropdown veya basit actions
  const renderHeaderRight = useCallback(
    () => {
      if (dropdownMenuItems && dropdownMenuItems.length > 0) {
        return (
          <View className="flex-row items-center justify-center mr-2 h-full">
            <BadgeIconButton
              icon="bell-outline"
              iconColor={colors.headerText}
              size={22}
              badgeCount={unreadNoti}
              onPress={handleNotificationPress}
              animateWhenActive={true}
            />
            <HeaderDropdownMenu iconSize={22} items={dropdownMenuItems} />
          </View>
        );
      }

      return (
        <View className="h-full justify-center">
          <HeaderActions
            unreadNoti={unreadNoti}
            onNotificationPress={handleNotificationPress}
            onInfoPress={handleInfoPress}
          />
        </View>
      );
    },
    [
      unreadNoti,
      dropdownMenuItems,
      handleNotificationPress,
      handleInfoPress,
    ],
  );

  // Memoize tab screen options to prevent React Navigation from processing option changes on every render
  const tabScreenOptions = useMemo(() =>
    tabs.map((tab) => ({
      name: tab.name,
      headerStyle: { backgroundColor: colors.headerBg, height: Math.max(80, 56 + insets.top) },
      headerTitleAlign: (tab.headerTitleAlign || "center") as "left" | "center",
      showHeaderLeft: tab.showHeaderLeft,
      headerTitle: tab.headerTitle,
    })),
    [tabs, colors.headerBg, insets.top]
  );

  // Custom Curved Tab Bar renderer
  const renderCurvedTabBar = useCallback(
    (props: any) => {
      const { state, navigation } = props;

      const activeRoute = state.routes[state.index];
      let activeIndex = 0;

      if (activeRoute.name !== "index") {
        const matchingTabIndex = tabs.findIndex(
          (tab: TabConfig) => tab.name === activeRoute.name
        );
        if (matchingTabIndex >= 0) {
          activeIndex = matchingTabIndex;
        }
      }

      // Dinamik olarak curvedTabs oluştur - Material Design icon isimleri
      const customTabs: CustomTabItem[] = tabs.map((tab) => ({
        key: tab.name,
        label: String(tab.label || ""),
        icon: tab.icon, // Outline icon (pasif)
        iconFocused: tab.iconFocused, // Filled icon (aktif/float)
        badgeCount: tab.name === "(messages)" ? unreadMsg : undefined,
      }));

      const handleTabPress = (index: number, tabItem: CustomTabItem) => {
        if (tabItem.key) {
          navigation.navigate(tabItem.key as any);
        } else {
          const tabRoutes = state.routes.filter((route: any) => route.name !== "index");
          const targetRoute = tabRoutes[index];
          if (targetRoute) {
            navigation.navigate(targetRoute.name);
          }
        }
      };

      return (
        <View style={{
          // screenBg kullan: notch (oval oyuk) alanı görünsün - dark/light her ikisinde kontrast sağlar
          backgroundColor: colors.screenBg,
          // shadowColor: '#000',
          // shadowOffset: { width: 0, height: -2 },
          // shadowOpacity: isDark ? 0 : 0.1,
          // shadowRadius: 8,
          // elevation: isDark ? 0 : 10,
        }}>
          <CustomCurvedTabBar
            tabs={customTabs}
            activeIndex={activeIndex}
            onTabPress={handleTabPress}
            accentColor={accentColor}
            backgroundColor={colors.tabBarBg}
            activeIconColor="#FFFFFF"
            inactiveIconColor={isDark ? "#9CA3AF" : "#6b7280"}
            height={60}
          />
        </View>
      );
    },
    [tabs, unreadMsg, accentColor, colors, isDark],
  );

  return (
    <>
      <Tabs
        tabBar={renderCurvedTabBar}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            display: "none",
          },
        }}
      >
        <Tabs.Screen name="index" options={{ href: null }} />

        {tabScreenOptions.map((tabOpt) => (
          <Tabs.Screen
            key={tabOpt.name}
            name={tabOpt.name}
            options={{
              headerStyle: tabOpt.headerStyle,
              headerShown: true,
              headerTitle: () => (
                <View className="flex-1 justify-center">
                  <Text className="text-2xl mr-0" style={{ color: colors.headerText }}>
                    {tabOpt.showHeaderLeft && userName
                      ? t("navigation.welcomeWithName", { name: userName })
                      : tabOpt.headerTitle}
                  </Text>
                </View>
              ),
              headerTitleAlign: tabOpt.headerTitleAlign,
              headerRight: renderHeaderRight,
            }}
          />
        ))}
      </Tabs>

      {/* Notifications Bottom Sheet */}
      <BottomSheetModal
        ref={notificationsSheet.ref}
        backdropComponent={notificationsSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        snapPoints={notificationsSheet.snapPoints}
        enableOverDrag={notificationsSheet.enableOverDrag}
        enablePanDownToClose={notificationsSheet.enablePanDownToClose}
        onChange={notificationsSheet.handleChange}
      >
        <NotificationsSheet
          onClose={() => notificationsSheet.dismiss()}
          autoOpenFirstUnread={true}
          onDeleteSuccess={(message) =>
            dispatch(showSnack({ message, isError: false }))
          }
          onDeleteInfo={(message) =>
            dispatch(showSnack({ message, isError: true }))
          }
          onDeleteError={(message) =>
            dispatch(showSnack({ message, isError: true }))
          }
        />
      </BottomSheetModal>

      {/* Info Modal */}
      <InfoModal
        visible={infoModalVisible}
        onClose={() => setInfoModalVisible(false)}
        title={t("navigation.usageInfo")}
        items={infoItems}
      />

      {/* Additional Bottom Sheets */}
      {renderAdditionalBottomSheets?.()}

      {/* Additional children */}
      {children}
    </>
  );
};
