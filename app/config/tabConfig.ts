import { TabConfig } from "../components/layout/BaseTabLayout";

/**
 * Generates common tabs configuration for all user types.
 * Panel tab is customizable via panelConfig parameter.
 */
export const getCommonTabs = (
  t: (key: string) => string,
  panelConfig: {
    icon: string;
    iconFocused: string;
    label: string;
  }
): TabConfig[] => [
    {
      name: "(panel)",
      headerTitle: t("navigation.welcome"),
      icon: panelConfig.icon,
      iconFocused: panelConfig.iconFocused,
      label: panelConfig.label,
      showHeaderLeft: true,
      headerTitleAlign: "left",
    },
    {
      name: "(appointment)",
      headerTitle: t("navigation.myAppointments"),
      icon: "clock-outline",
      iconFocused: "clock",
      label: t("navigation.appointments"),
    },
    {
      name: "(messages)",
      headerTitle: t("navigation.myMessages"),
      icon: "message-outline",
      iconFocused: "message",
      label: t("navigation.messages"),
    },
    {
      name: "(favorites)",
      headerTitle: t("navigation.myFavorites"),
      icon: "heart-outline",
      iconFocused: "heart",
      label: t("navigation.favorites"),
    },
    {
      name: "(profile)",
      headerTitle: t("profile.myProfile"),
      icon: "account-outline",
      iconFocused: "account",
      label: t("navigation.profile"),
    },
  ];

/**
 * Pre-configured panel tab settings for each user type
 */
export const panelTabConfigs = {
  customer: {
    icon: "home-outline",
    iconFocused: "home",
    labelKey: "navigation.shops",
  },
  barberStore: {
    icon: "store-outline",
    iconFocused: "store",
    labelKey: "navigation.shops",
  },
  freeBarber: {
    icon: "store-outline",
    iconFocused: "store",
    labelKey: "navigation.businesses",
  },
};

/**
 * Accent colors for each user type
 */
export const accentColors = {
  customer: "#ffb900",
  barberStore: "#ffb900",
  freeBarber: "#ffb900",
};
