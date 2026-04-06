import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { View, Pressable, ActivityIndicator } from "react-native";
import { AIAssistantSheet } from "../ai/AIAssistantSheet";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { BottomSheetModal } from "@gorhom/bottom-sheet";
import { CustomCurvedTabBar, CustomTabItem } from "../common/CustomCurvedTabBar";
import { Text } from "../common/Text";
import { BadgeIconButton } from "../common/badgeiconbutton";
import { NotificationsSheet } from "../appointment/notificationsheet";
import {
  MoreActionsFab,
  FAB_NUDGE_LAST_TAB_CLEARANCE,
} from "./MoreActionsFab";
import { Icon } from "react-native-paper";
import {
  MoreFabPanelContext,
  type MoreFabMenuItem,
  type HeaderDeleteAction,
} from "./MoreFabContext";
import { HelpGuideOnboardingNudge } from "./HelpGuideOnboardingNudge";
import { useAppDispatch, useAppSelector } from "../../store/hook";
import { showSnack } from "../../store/snackbarSlice";
import { resetSubscriptionExpired } from "../../store/subscriptionSlice";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useAuth } from "../../hook/useAuth";
import { useBottomSheet } from "../../hook/useBottomSheet";
import { useNotificationSound } from "../../hook/useNotificationSound";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";
import { useGetBadgeCountsQuery } from "../../store/api";
import { UserType } from "../../types";

export interface TabConfig {
  name: string;
  headerTitle: string;
  icon: string;
  iconFocused: string;
  label: string;
  showHeaderLeft?: boolean;
  headerTitleAlign?: "left" | "center";
  /** true: üst başlık metnini gösterme (panel sekmesi) */
  hideHeaderTitle?: boolean;
}

export interface BaseTabLayoutProps {
  userType: UserType;
  accentColor: string;
  tabs: TabConfig[];
  children?: React.ReactNode;
  /** Dükkan: mağaza ekle vb. (Üstten alta: önce bunlar, sonra ortak öğeler, en sonda panel satırları.) */
  fabExtraItems?: MoreFabMenuItem[];
  renderAdditionalBottomSheets?: () => React.ReactNode;
  /**
   * Layout seviyesindeki tam ekran sheet (FormStoreAdd / FormFreeBarberOperation vb.) açıkken FAB gizlensin.
   * Provider dışında olduğu için `reportOverlayOpen` buraya prop ile bağlanır.
   */
  layoutSheetOpen?: boolean;
}

export const BaseTabLayout: React.FC<BaseTabLayoutProps> = ({
  userType,
  accentColor,
  tabs,
  children,
  fabExtraItems,
  renderAdditionalBottomSheets,
  layoutSheetOpen = false,
}) => {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const insets = useSafeAreaInsets();
  const segments = useSegments();

  /** Yol içinde birden fazla sekme adı geçebilir; en sondaki gerçek aktif sekmedir (FAB ters çalışmasın diye). */
  const activeTabIndex = useMemo(() => {
    const names = tabs.map((tab) => tab.name);
    const s = segments as string[];
    for (let i = s.length - 1; i >= 0; i--) {
      const ix = names.indexOf(s[i]!);
      if (ix >= 0) return ix;
    }
    return 0;
  }, [segments, tabs]);

  const fabNudgeDown =
    tabs.length > 0 && activeTabIndex === tabs.length - 1
      ? FAB_NUDGE_LAST_TAB_CLEARANCE
      : 0;

  /** Sadece sekme köşelerinde (alt push yokken) FAB */
  const showMainFab = useMemo(() => {
    const s = segments as string[];
    if (s.length === 0) return true;
    if (s[0] === "(screens)" || s[0] === "(auth)") return false;
    const msgIdx = s.indexOf("(messages)");
    if (msgIdx >= 0 && s[msgIdx + 1] && s[msgIdx + 1] !== "index") {
      return false;
    }
    if (s.includes("chat")) {
      return false;
    }
    const tabNames = new Set([
      "(panel)",
      "(appointment)",
      "(messages)",
      "(favorites)",
      "(profile)",
    ]);
    const tabIdx = s.findIndex((seg) => tabNames.has(seg));
    // Bilinmeyen veya (screens) gibi sekme dışı yollarda FAB gösterme
    if (tabIdx === -1) return false;
    const tail = s.slice(tabIdx + 1);
    if (tail.length === 0) return true;
    if (tail.length === 1 && tail[0] === "index") return true;
    return false;
  }, [segments]);
  const aiSheetRef = useRef<BottomSheetModal>(null);
  const [aiSheetOpen, setAiSheetOpen] = useState(false);
  const [notiSheetOpen, setNotiSheetOpen] = useState(false);
  const [overlaySheetOpen, setOverlaySheetOpen] = useState(false);
  const [panelFabItems, setPanelFabItems] = useState<MoreFabMenuItem[] | null>(null);
  const [headerDeleteAction, setHeaderDeleteAction] = useState<HeaderDeleteAction>(null);
  const dispatch = useAppDispatch();
  const { userName, isAuthenticated } = useAuth();
  const router = useSafeNavigation();
  const subscriptionExpired = useAppSelector(
    (state) => state.subscription.expired,
  );

  // Abonelik süresi dolmuş / ban: baseQuery bu flag'i set ediyor.
  // Aksiyonu alan kullanıcı subscription sayfasına yönlendirilir (geri dönebilir).
  // Sadece FreeBarber ve BarberStore için geçerli.
  useEffect(() => {
    const isSubscriptionUser =
      userType === UserType.FreeBarber || userType === UserType.BarberStore;
    if (subscriptionExpired && isSubscriptionUser) {
      dispatch(resetSubscriptionExpired());
      router.push('/(screens)/subscription' as any);
    }
  }, [subscriptionExpired, userType, router, dispatch]);

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

  // Ortak header actions callbacks
  const handleNotificationPress = useCallback(() => {
    notificationsSheet.present();
  }, [notificationsSheet]);

  const handleInfoPress = useCallback(() => {
    router.push("/(screens)/help-guide" as any);
  }, [router]);

  const handleAIAssistantPress = useCallback(() => {
    setAiSheetOpen(true);
    aiSheetRef.current?.present();
  }, []);

  const noopShopping = useCallback(() => {}, []);

  const mergedFabItems = useMemo(() => {
    const list: MoreFabMenuItem[] = [];
    list.push({
      id: "ai-assistant",
      icon: "microphone",
      label: t("ai.assistantTitle"),
      onPress: handleAIAssistantPress,
    });
    list.push({
      id: "info",
      icon: "information-outline",
      label: t("navigation.info"),
      onPress: handleInfoPress,
    });
    if (userType === UserType.BarberStore && fabExtraItems?.length) {
      list.push(...fabExtraItems);
    }
    list.push({
      id: "shopping",
      icon: "shopping-outline",
      label: t("navigation.shopping"),
      onPress: noopShopping,
    });
    if (panelFabItems?.length) {
      list.push(...panelFabItems);
    }
    return list;
  }, [
    userType,
    fabExtraItems,
    panelFabItems,
    t,
    handleInfoPress,
    handleAIAssistantPress,
    noopShopping,
  ]);

  const reportOverlayOpen = useCallback((open: boolean) => {
    setOverlaySheetOpen(open);
  }, []);

  const moreFabContextValue = useMemo(
    () => ({ setPanelFabItems, reportOverlayOpen, setHeaderDeleteAction }),
    [reportOverlayOpen],
  );

  const renderHeaderRight = useCallback(
    () => (
      <View className="flex-row items-center justify-center mr-2 h-full gap-1">
        {headerDeleteAction &&
          tabs[activeTabIndex]?.name === "(appointment)" && (
          <Pressable
            onPress={headerDeleteAction.onPress}
            disabled={headerDeleteAction.loading}
            style={{
              width: 34,
              height: 34,
              borderRadius: 17,
              alignItems: "center",
              justifyContent: "center",
              marginRight: 2,
              backgroundColor: "rgba(220,38,38,0.88)",
              opacity: headerDeleteAction.loading ? 0.6 : 1,
            }}
          >
            {headerDeleteAction.loading ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <Icon source="delete-sweep-outline" size={20} color="white" />
            )}
          </Pressable>
        )}
        <BadgeIconButton
          icon="bell-outline"
          iconColor={colors.headerText}
          size={22}
          badgeCount={unreadNoti}
          onPress={handleNotificationPress}
          animateWhenActive={true}
        />
      </View>
    ),
    [
      unreadNoti,
      handleNotificationPress,
      colors.headerText,
      headerDeleteAction,
      tabs,
      activeTabIndex,
    ],
  );

  // Memoize tab screen options to prevent React Navigation from processing option changes on every render
  const tabScreenOptions = useMemo(() =>
    tabs.map((tab) => ({
      name: tab.name,
      headerStyle: {
        backgroundColor: colors.headerBg,
        height: tab.hideHeaderTitle
          ? Math.max(52, 44 + insets.top)
          : Math.max(80, 56 + insets.top),
      },
      headerTitleAlign: (tab.headerTitleAlign || "center") as "left" | "center",
      showHeaderLeft: tab.showHeaderLeft,
      headerTitle: tab.headerTitle,
      hideHeaderTitle: tab.hideHeaderTitle,
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
    <MoreFabPanelContext.Provider value={moreFabContextValue}>
      <View style={{ flex: 1, position: "relative" }}>
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
              headerTitle: () =>
                tabOpt.hideHeaderTitle ? (
                  <View style={{ flex: 1 }} />
                ) : (
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
        onChange={(index) => { notificationsSheet.handleChange(index); setNotiSheetOpen(index >= 0); }}
        onDismiss={() => setNotiSheetOpen(false)}
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

      <HelpGuideOnboardingNudge />

      {/* Additional Bottom Sheets */}
      {renderAdditionalBottomSheets?.()}

      {/* Additional children */}
      {children}

      {showMainFab ? (
        <MoreActionsFab
          items={mergedFabItems}
          accentColor={accentColor}
          fabNudgeDown={fabNudgeDown}
          hidden={
            notiSheetOpen ||
            aiSheetOpen ||
            overlaySheetOpen ||
            layoutSheetOpen
          }
        />
      ) : null}

      {/* AI Appointment Assistant */}
      <AIAssistantSheet
        sheetRef={aiSheetRef}
        accentColor={accentColor}
        onClose={() => setAiSheetOpen(false)}
      />
      </View>
    </MoreFabPanelContext.Provider>
  );
};
