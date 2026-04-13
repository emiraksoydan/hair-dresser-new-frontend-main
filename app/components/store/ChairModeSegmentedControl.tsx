import React from "react";
import { View, Pressable, StyleProp, ViewStyle } from "react-native";
import { Icon } from "react-native-paper";
import { Text } from "../common/Text";
import { useLanguage } from "../../hook/useLanguage";
import { useTheme } from "../../hook/useTheme";

const ACCENT = "#c2a523";

type Props = {
  mode: "named" | "barber";
  onModeChange: (mode: "named" | "barber") => void;
  /** Kart / modal içi ek stil */
  style?: StyleProp<ViewStyle>;
  /** Segmentin altında kısa ipucu (ör. birini seçin) */
  footerHint?: string;
};

/**
 * Koltuk tanımı: sadece ad vs personele ata — segment + ikon + metin.
 */
export const ChairModeSegmentedControl = React.memo<Props>(
  ({ mode, onModeChange, style, footerHint }) => {
    const { t } = useLanguage();
    const { colors, isDark } = useTheme();
    const trackBg = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)";
    const segmentActiveBg = isDark ? "rgba(194, 165, 35, 0.14)" : "rgba(194, 165, 35, 0.12)";

    const renderSegment = (
      id: "named" | "barber",
      icon: string,
      selected: boolean,
    ) => (
      <Pressable
        key={id}
        accessibilityRole="tab"
        accessibilityState={{ selected }}
        onPress={() => onModeChange(id)}
        style={({ pressed }) => ({
          flex: 1,
          alignItems: "center",
          justifyContent: "flex-start",
          paddingVertical: 12,
          paddingHorizontal: 6,
          borderRadius: 11,
          backgroundColor: selected ? segmentActiveBg : "transparent",
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <View
          style={{
            width: 44,
            height: 44,
            borderRadius: 13,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 8,
            backgroundColor: selected
              ? ACCENT
              : isDark
                ? "rgba(255,255,255,0.07)"
                : "rgba(0,0,0,0.06)",
            borderWidth: selected ? 0 : 1,
            borderColor: colors.borderColor2,
            shadowColor: selected ? ACCENT : "transparent",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: selected ? 0.25 : 0,
            shadowRadius: 4,
            elevation: selected ? 3 : 0,
          }}
        >
          <Icon source={icon} size={24} color={selected ? "#ffffff" : colors.textSecondary} />
        </View>
        <Text
          style={{
            textAlign: "center",
            fontFamily: selected ? "CenturyGothic-Bold" : "CenturyGothic",
            fontSize: 12,
            lineHeight: 16,
            color: selected ? colors.sectionHeaderText : colors.textSecondary,
          }}
          numberOfLines={2}
        >
          {id === "named"
            ? t("form.chairOnlyNameOption")
            : t("form.chairAssignPersonnelOption")}
        </Text>
      </Pressable>
    );

    return (
      <View style={style}>
        <View
          style={{
            flexDirection: "row",
            borderRadius: 16,
            padding: 5,
            backgroundColor: trackBg,
            borderWidth: 1,
            borderColor: colors.borderColor2,
            marginBottom: footerHint ? 0 : 8,
          }}
        >
          {renderSegment("named", "tag-outline", mode === "named")}
          {renderSegment("barber", "account-supervisor-outline", mode === "barber")}
        </View>
        {!!footerHint && (
          <Text
            style={{
              fontFamily: "CenturyGothic",
              fontSize: 11,
              lineHeight: 15,
              color: colors.textTertiary,
              marginTop: 6,
              marginBottom: 8,
              paddingHorizontal: 2,
            }}
          >
            {footerHint}
          </Text>
        )}
      </View>
    );
  },
);

ChairModeSegmentedControl.displayName = "ChairModeSegmentedControl";
