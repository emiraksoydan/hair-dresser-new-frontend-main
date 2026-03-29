import React from "react";
import { TouchableOpacity, View } from "react-native";
import { MotiView } from "moti";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Text } from "../common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";

type Props = {
  expanded: boolean;
  onToggle: () => void;
  /** Search bar + optional chips */
  children?: React.ReactNode;
  /** Shown when collapsed (e.g. earnings summary line) */
  collapsedHint?: string;
  /** Sağ uç: liste/ızgara vb. (ör. dokun satırı) */
  trailingAccessory?: React.ReactNode;
};

export function PanelCollapsibleTop({
  expanded,
  onToggle,
  children,
  collapsedHint,
  trailingAccessory,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={{ marginTop: 8 }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4,
          paddingVertical: 4,
          marginBottom: expanded ? 6 : 0,
        }}
      >
        <TouchableOpacity
          onPress={onToggle}
          activeOpacity={0.85}
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            minHeight: 32,
          }}
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? t("panel.collapseTopSection")
              : t("panel.expandTopSection")
          }
        >
          <MotiView
            animate={{ rotateZ: expanded ? "90deg" : "0deg" }}
            transition={{ type: "timing", duration: 220 }}
          >
            <MaterialCommunityIcons
              name="chevron-right"
              size={22}
              color={colors.sectionHeaderText}
            />
          </MotiView>
          <Text
            style={{
              flex: 1,
              color: colors.textSecondary,
              fontSize: 12,
              marginLeft: 2,
            }}
            numberOfLines={1}
          >
            {expanded
              ? t("panel.topSectionExpandedHint")
              : collapsedHint ?? t("panel.topSectionCollapsedHint")}
          </Text>
        </TouchableOpacity>
        {trailingAccessory ? (
          <View style={{ marginLeft: 2 }}>{trailingAccessory}</View>
        ) : null}
      </View>

      <MotiView
        animate={{
          opacity: expanded ? 1 : 0,
          scale: expanded ? 1 : 0.98,
        }}
        transition={{ type: "timing", duration: 280 }}
        style={{
          overflow: expanded ? "visible" : "hidden",
          maxHeight: expanded ? 2000 : 0,
        }}
      >
        {children}
      </MotiView>
    </View>
  );
}
