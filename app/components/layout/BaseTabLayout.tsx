import React, { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { View, Pressable, ActivityIndicator, TouchableOpacity, StyleSheet, Image, Linking, Platform } from "react-native";
import { MotiView } from "moti";
import { usePermissionSwitches } from "../../hook/usePermissionSwitches";
import { AIAssistantSheet } from "../ai/AIAssistantSheet";
import { useSegments } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Tabs } from "expo-router";
import { BottomSheetModal, BottomSheetView } from "@gorhom/bottom-sheet";
import { CustomCurvedTabBar, CustomTabItem } from "../common/CustomCurvedTabBar";
import { Text } from "../common/Text";
import { BadgeIconButton } from "../common/BadgeIconButton";
import { NotificationsSheet } from "../appointment/NotificationSheet";
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
import { COLORS } from "../../constants/colors";
import { useGetBadgeCountsQuery } from "../../store/api";
import { UserType } from "../../types";
import { useMultiAccount } from "../../context/MultiAccountContext";
import { useNotificationOpener } from "../../context/NotificationOpenerContext";
import { useSubscriptionGuard } from "../../hook/useSubscriptionGuard";
import { AccountSwitcherSheet } from "../common/AccountSwitcherSheet";

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
  const [accountSwitcherOpen, setAccountSwitcherOpen] = useState(false);
  const [overlaySheetOpen, setOverlaySheetOpen] = useState(false);
  const [permDropdownOpen, setPermDropdownOpen] = useState(false);

  const { locationGranted, notificationGranted } = usePermissionSwitches();
  const hasPermissionIssue = !locationGranted || !notificationGranted;
  const [panelFabItems, setPanelFabItems] = useState<MoreFabMenuItem[] | null>(null);
  const [headerDeleteAction, setHeaderDeleteAction] = useState<HeaderDeleteAction>(null);
  const dispatch = useAppDispatch();
  const { userName, isAuthenticated } = useAuth();
  const { withSubscription } = useSubscriptionGuard();
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

  // Tek referanslı snapPoints — her render'da yeni dizi gorhom'da yüksekliği oynatabiliyor.
  const notificationSheetSnapPoints = useMemo((): (string | number)[] => ["100%"], []);
  const notificationsSheet = useBottomSheet({
    snapPoints: notificationSheetSnapPoints,
    enablePanDownToClose: true,
    enableOverDrag: false,
  });

  const { registerOpenNotifications } = useNotificationOpener();
  useEffect(() => {
    registerOpenNotifications(notificationsSheet.present);
  }, [registerOpenNotifications, notificationsSheet.present]);

  // Multi-account switcher
  const {
    accounts,
    currentUserId,
    switchAccount,
    registerOpenAccountSwitcher,
    prepareAccountSwitcherList,
    isSwitchingAccount,
    accountBadges,
    removeSavedAccount,
  } = useMultiAccount();
  const accountSwitcherSheet = useBottomSheet({
    snapPoints: ["50%", "85%"],
    enablePanDownToClose: true,
    enableOverDrag: false,
  });

  const openAccountSwitcherSheet = useCallback(async () => {
    await prepareAccountSwitcherList();
    accountSwitcherSheet.present();
  }, [prepareAccountSwitcherList, accountSwitcherSheet.present]);

  // Register the open function so profile header chevron can trigger it too
  useEffect(() => {
    registerOpenAccountSwitcher(() => {
      void openAccountSwitcherSheet();
    });
  }, [registerOpenAccountSwitcher, openAccountSwitcherSheet]);

  // Badge count'ları API'den al (SignalR ile anlık güncellenir)
  const { data: badgeCounts } = useGetBadgeCountsQuery(undefined, {
    skip: !isAuthenticated,
  });

  const unreadNoti = badgeCounts?.data?.notificationUnreadCount || 0;
  const unreadMsg = badgeCounts?.data?.chatUnreadCount || 0;

  // Mesaj detay sayfasındayken ses sustur — thread listesinde çalsın, detayda çalmasın
  const isInChatDetail = useMemo(() => {
    const s = segments as string[];
    if (s.includes("chat")) return true;
    const msgIdx = s.indexOf("(messages)");
    if (msgIdx >= 0 && s[msgIdx + 1] && s[msgIdx + 1] !== "index") return true;
    return false;
  }, [segments]);

  // Play notification sound when badge count changes
  useNotificationSound(unreadNoti, unreadMsg, { suppressSound: isInChatDetail });

  // Ortak header actions callbacks
  const handleNotificationPress = useCallback(() => {
    notificationsSheet.present();
  }, [notificationsSheet]);

  const handleInfoPress = useCallback(() => {
    router.push("/(screens)/help-guide" as any);
  }, [router]);

  const handleAIAssistantPress = useCallback(() => {
    withSubscription(() => {
      setAiSheetOpen(true);
      aiSheetRef.current?.present();
    });
  }, [withSubscription]);

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

  /** Birden fazla sheet aynı anda açık olabilsin; her kaynak +1/-1 ile FAB gizlenir (boolean tek başına yetmez). */
  const overlayFabLockRef = useRef(0);
  const reportOverlayOpen = useCallback((open: boolean) => {
    if (open) {
      overlayFabLockRef.current += 1;
    } else {
      overlayFabLockRef.current = Math.max(0, overlayFabLockRef.current - 1);
    }
    setOverlaySheetOpen(overlayFabLockRef.current > 0);
  }, []);

  const moreFabContextValue = useMemo(
    () => ({ setPanelFabItems, reportOverlayOpen, setHeaderDeleteAction }),
    [reportOverlayOpen],
  );

  const renderHeaderRight = useCallback(
    () => (
      <View
        className="flex-row items-center justify-center h-full gap-1.5"
        style={
          Platform.OS === "android"
            ? { marginRight: 14 }
            : { marginRight: 4 }
        }
      >
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
        {hasPermissionIssue && (
          <TouchableOpacity
            onPress={() => setPermDropdownOpen((v) => !v)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 4 }}
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon source="alert-circle-outline" size={22} color="#c2a523" />
          </TouchableOpacity>
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
      hasPermissionIssue,
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
          : tab.name === "(profile)"
            ? Math.max(80, 60 + insets.top)
            : Math.max(80, 56 + insets.top),
      },
      headerTitleAlign: (tab.headerTitleAlign || "center") as "left" | "center",
      showHeaderLeft: tab.showHeaderLeft,
      headerTitle: tab.headerTitle,
      hideHeaderTitle: tab.hideHeaderTitle,
    })),
    [tabs, colors.headerBg, colors.headerText, insets.top, accounts, currentUserId, openAccountSwitcherSheet]
  );

  const otherAccounts = useMemo(
    () =>
      accounts.filter(
        (a) =>
          currentUserId == null ||
          a.id.toLowerCase() !== currentUserId.toLowerCase()
      ),
    [accounts, currentUserId]
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

      const handleTabDoubleTap = async (index: number, tabItem: CustomTabItem) => {
        // Only handle double-tap on the profile tab
        if (tabItem.key !== "(profile)") return;
        const otherAccounts = accounts.filter(
          (a) =>
            currentUserId == null ||
            a.id.toLowerCase() !== currentUserId.toLowerCase()
        );
        if (otherAccounts.length === 0) {
          void openAccountSwitcherSheet();
          return;
        }
        if (otherAccounts.length === 1) {
          await switchAccount(otherAccounts[0]!);
        } else {
          void openAccountSwitcherSheet();
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
            onTabDoubleTap={handleTabDoubleTap}
            chipBackground={COLORS.UI.ACCENT_GOLD}
            chipForeground={isDark ? COLORS.UI.ACCENT_GOLD : COLORS.PROFILE.NAVY}
            onGoldIconColor={isDark ? COLORS.UI.TEXT_ON_GOLD_DARK : COLORS.UI.TEXT_ON_GOLD}
            backgroundColor={colors.tabBarBg}
            inactiveIconColor={isDark ? "#9CA3AF" : "#6b7280"}
            height={60}
          />
        </View>
      );
    },
    [tabs, unreadMsg, colors, isDark, accounts, currentUserId, switchAccount, openAccountSwitcherSheet],
  );

  return (
    <MoreFabPanelContext.Provider value={moreFabContextValue}>
      <View style={{ flex: 1, position: "relative", overflow: "visible" }}>
      <Tabs
        tabBar={renderCurvedTabBar}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            display: "none",
          },
          /** İlk dokunuşta tüm sekmeleri mount etme — ilk açılış + RAM. */
          lazy: true,
          /** Odakta olmayan sekme React ağacını dondurur; sekme geçişinde daha az arka plan işi. */
          freezeOnBlur: true,
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
                ) : tabOpt.name === "(profile)" ? (
                  <TouchableOpacity
                    onPress={() => { void openAccountSwitcherSheet(); }}
                    activeOpacity={0.75}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: COLORS.PROFILE.NAVY,
                      borderRadius: 22,
                      paddingHorizontal: 14,
                      paddingVertical: 7,
                      gap: 6,
                    }}
                  >
                    <View style={{ minWidth: 0 }}>
                      <Text
                        numberOfLines={1}
                        style={{ color: '#fff', fontSize: 14, fontFamily: 'CenturyGothic-Bold', lineHeight: 17 }}
                      >
                        {userName || tabOpt.headerTitle}
                      </Text>
                      <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 10, lineHeight: 13 }}>
                        {t("accounts.hub")}
                      </Text>
                    </View>
                    <Icon source="chevron-down" size={16} color="rgba(255,255,255,0.65)" />
                  </TouchableOpacity>
                ) : tabOpt.name === "(panel)" && userName != null && userName !== "" ? (
                  <View
                    style={{
                      flex: 1,
                      flexDirection: "row",
                      alignItems: "center",
                      minWidth: 0,
                      paddingVertical: 2,
                      marginRight: 4,
                    }}
                  >
                    <Image
                      source={require("../../../assets/icon.png")}
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 18,
                        marginRight: 8,
                        resizeMode: "contain",
                      }}
                    />
                    <Text
                      className="text-lg font-century-gothic-bold"
                      numberOfLines={1}
                      style={{ color: colors.headerText, flexShrink: 1 }}
                    >
                      {t("navigation.welcomeWithName", { name: userName })}
                    </Text>
                  </View>
                ) : (
                  <View className="flex-1 justify-center">
                    <Text
                      className={tabOpt.name === "(appointment)" ? "text-xl mr-0" : "text-2xl mr-0"}
                      style={{ color: colors.headerText }}
                    >
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
        enableDynamicSizing={false}
        enableOverDrag={notificationsSheet.enableOverDrag}
        enablePanDownToClose={notificationsSheet.enablePanDownToClose}
        enableContentPanningGesture={true}
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

      {/* İzin uyarı dropdown'ı */}
      {permDropdownOpen && (
        <>
          {/* Dışarı tıklanınca kapat */}
          <Pressable
            style={[StyleSheet.absoluteFillObject, { zIndex: 996 }]}
            onPress={() => setPermDropdownOpen(false)}
          />
          <MotiView
            from={{ opacity: 0, translateY: -8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 220 }}
            style={[
              styles.permDropdown,
              {
                top: tabs[activeTabIndex]?.hideHeaderTitle
                  ? Math.max(52, 44 + insets.top)
                  : Math.max(80, 56 + insets.top),
                backgroundColor: colors.cardBg,
                borderColor: colors.borderColor,
              },
            ]}
          >
            {/* Başlık satırı */}
            <View style={styles.permDropdownHeader}>
              <Icon source="alert-circle-outline" size={18} color="#c2a523" />
              <Text
                style={[
                  styles.permDropdownTitle,
                  { color: colors.text, marginLeft: 6, flex: 1 },
                ]}
              >
                {t("permissionBanner.dropdownTitle")}
              </Text>
              <TouchableOpacity
                onPress={() => setPermDropdownOpen(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Icon source="close" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>

            {/* Bildirim satırı */}
            {!notificationGranted && (
              <View style={styles.permRow}>
                <View style={styles.permRowText}>
                  <Text style={[styles.permRowLabel, { color: "#c2a523" }]}>
                    {t("permissionBanner.notificationLabel")}
                  </Text>
                  <Text style={[styles.permRowDesc, { color: colors.textSecondary }]}>
                    {t("permissionBanner.notificationDesc")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setPermDropdownOpen(false);
                    if (Platform.OS === "ios") {
                      Linking.openURL("app-settings:").catch(() =>
                        Linking.openSettings().catch(() => {})
                      );
                    } else {
                      Linking.openSettings().catch(() => {});
                    }
                  }}
                  style={styles.permBtn}
                >
                  <Text style={styles.permBtnText}>
                    {t("permissionBanner.goToSettings")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Konum satırı */}
            {!locationGranted && (
              <View style={[styles.permRow, { marginBottom: 0 }]}>
                <View style={styles.permRowText}>
                  <Text style={[styles.permRowLabel, { color: "#c2a523" }]}>
                    {t("permissionBanner.locationLabel")}
                  </Text>
                  <Text style={[styles.permRowDesc, { color: colors.textSecondary }]}>
                    {t("permissionBanner.locationDesc")}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    setPermDropdownOpen(false);
                    if (Platform.OS === "ios") {
                      Linking.openURL("app-settings:").catch(() =>
                        Linking.openSettings().catch(() => {})
                      );
                    } else {
                      Linking.openSettings().catch(() => {});
                    }
                  }}
                  style={styles.permBtn}
                >
                  <Text style={styles.permBtnText}>
                    {t("permissionBanner.goToSettings")}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </MotiView>
        </>
      )}

      {/* Account Switcher Bottom Sheet */}
      <BottomSheetModal
        ref={accountSwitcherSheet.ref}
        backdropComponent={accountSwitcherSheet.makeBackdrop()}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        snapPoints={accountSwitcherSheet.snapPoints}
        enableDynamicSizing={false}
        enableOverDrag={accountSwitcherSheet.enableOverDrag}
        enablePanDownToClose={accountSwitcherSheet.enablePanDownToClose}
        onChange={(index) => {
          accountSwitcherSheet.handleChange(index);
          setAccountSwitcherOpen(index >= 0);
        }}
        onDismiss={() => setAccountSwitcherOpen(false)}
      >
        <AccountSwitcherSheet
          accounts={accounts}
          currentUserId={currentUserId}
          onSelectAccount={async (target) => {
            if (
              currentUserId == null ||
              target.id.toLowerCase() !== currentUserId.toLowerCase()
            ) {
              await switchAccount(target);
            }
          }}
          onClose={() => accountSwitcherSheet.dismiss()}
          onAddAccount={() => router.push({ pathname: '/(auth)', params: { addAccount: 'true' } } as any)}
          onReauthAccount={(acc) =>
            router.push({
              pathname: '/(auth)',
              params: {
                addAccount: 'true',
                reauth: 'true',
                phone: acc.phone || '',
                userType: String(acc.userType),
              },
            } as any)
          }
          onRemoveAccount={(acc) => removeSavedAccount(acc.id)}
          accountBadges={accountBadges}
          currentAccountUnread={badgeCounts?.data?.notificationUnreadCount ?? 0}
        />
      </BottomSheetModal>

      {/* Additional Bottom Sheets */}
      {renderAdditionalBottomSheets?.()}

      {/* Additional children */}
      {children}

      {isSwitchingAccount && (
        <View style={[styles.switchingOverlay, { backgroundColor: isDark ? "rgba(0,0,0,0.48)" : "rgba(0,0,0,0.32)" }]}>
          <ActivityIndicator size="large" color={accentColor} />
        </View>
      )}

      {showMainFab ? (
        <MoreActionsFab
          items={mergedFabItems}
          chipBackground={COLORS.UI.ACCENT_GOLD}
          fabNudgeDown={fabNudgeDown}
          hidden={
            notiSheetOpen ||
            accountSwitcherOpen ||
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

const styles = StyleSheet.create({
  switchingOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  permDropdown: {
    position: "absolute",
    right: 8,
    zIndex: 998,
    width: 290,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
  },
  permDropdownHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  permDropdownTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  permRowText: {
    flex: 1,
  },
  permRowLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 2,
  },
  permRowDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  permBtn: {
    backgroundColor: "#c2a523",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  permBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1f2937",
  },
});
