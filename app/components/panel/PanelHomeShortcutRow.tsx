import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Icon } from "react-native-paper";
import { Text } from "../common/Text";
import type { ThemeColors } from "../../hook/useTheme";

type Props = {
  label: string;
  onPress: () => void;
  colors: ThemeColors;
  isDark: boolean;
  /** Sol ikon (MaterialCommunityIcons / Paper) */
  icon?: string;
};

/** Panel ana ekranı: profil paneline / işletmelerime kompakt kısayol */
export function PanelHomeShortcutRow({
  label,
  onPress,
  colors,
  isDark,
  icon = "storefront-outline",
}: Props) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={{
        marginTop: 8,
        marginBottom: 4,
        borderRadius: 12,
        paddingVertical: 8,
        paddingHorizontal: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
        backgroundColor: isDark
          ? "rgba(251,191,36,0.1)"
          : "rgba(251,191,36,0.14)",
        borderColor: "rgba(255,185,0,0.45)",
        borderWidth: 1,
      }}
    >
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: isDark
            ? "rgba(255,185,0,0.15)"
            : "rgba(255,185,0,0.22)",
        }}
      >
        <Icon source={icon} size={18} color="#ffb900" />
      </View>
      <Text
        style={{
          color: colors.sectionHeaderText,
          fontFamily: "CenturyGothic-Bold",
          fontSize: 13,
          flex: 1,
        }}
        numberOfLines={1}
      >
        {label}
      </Text>
      <Icon source="chevron-right" size={22} color="#ffb900" />
    </TouchableOpacity>
  );
}
