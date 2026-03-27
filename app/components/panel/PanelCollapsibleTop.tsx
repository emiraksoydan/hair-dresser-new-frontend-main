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
  children: React.ReactNode;
  /** Shown when collapsed (e.g. earnings summary line) */
  collapsedHint?: string;
};

export function PanelCollapsibleTop({
  expanded,
  onToggle,
  children,
  collapsedHint,
}: Props) {
  const { colors } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={{ marginTop: 8 }}>
      <TouchableOpacity
        onPress={onToggle}
        activeOpacity={0.85}
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 4,
          paddingVertical: 4,
          marginBottom: expanded ? 6 : 0,
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
