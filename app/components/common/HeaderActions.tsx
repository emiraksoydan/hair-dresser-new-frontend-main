import React from "react";
import { View } from "react-native";
import { BadgeIconButton } from "./badgeiconbutton";
import { HeaderDropdownMenu } from "./headerdropdownmenu";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";

interface HeaderActionsProps {
  unreadNoti: number;
  onNotificationPress: () => void;
  onInfoPress: () => void;
  onShoppingPress?: () => void;
}


export const HeaderActions = React.memo<HeaderActionsProps>(({
  unreadNoti,
  onNotificationPress,
  onInfoPress,
  onShoppingPress,
}) => {
  const { t } = useLanguage();
  const { colors } = useTheme();

  const menuItems = [
    {
      icon: "information-outline",
      label: t("navigation.info"),
      onPress: onInfoPress,
    },
    {
      icon: "shopping-outline",
      label: t("navigation.shopping"),
      onPress: onShoppingPress || (() => { }),
    },
  ];

  return (
    <View className="items-center justify-center flex-row mr-2">
      <BadgeIconButton
        icon="bell-outline"
        iconColor={colors.headerText}
        size={22}
        badgeCount={unreadNoti}
        onPress={onNotificationPress}
        animateWhenActive={true}
      />
      <HeaderDropdownMenu iconSize={22} items={menuItems} />
    </View>
  );
});

HeaderActions.displayName = "HeaderActions";
