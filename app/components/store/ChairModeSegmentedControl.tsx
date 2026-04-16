import React from "react";
import { View, StyleProp, ViewStyle } from "react-native";
import { SegmentedButtons } from "react-native-paper";
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

    return (
      <View style={style}>
        <SegmentedButtons
          value={mode}
          onValueChange={(val) => onModeChange(val as "named" | "barber")}
          style={{ marginBottom: footerHint ? 0 : 8 }}
          buttons={[
            {
              value: "named",
              icon: "tag-outline",
              label: t("form.chairOnlyNameOption"),
              style: { borderColor: colors.borderColor2 },
              labelStyle: { fontFamily: "CenturyGothic", fontSize: 12 },
            },
            {
              value: "barber",
              icon: "account-supervisor-outline",
              label: t("form.chairAssignPersonnelOption"),
              style: { borderColor: colors.borderColor2 },
              labelStyle: { fontFamily: "CenturyGothic", fontSize: 12 },
            },
          ]}
          theme={{
            colors: {
              secondaryContainer: isDark ? "rgba(194,165,35,0.2)" : "rgba(194,165,35,0.16)",
              onSecondaryContainer: colors.sectionHeaderText,
              outline: colors.borderColor2,
            },
          }}
        />
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
