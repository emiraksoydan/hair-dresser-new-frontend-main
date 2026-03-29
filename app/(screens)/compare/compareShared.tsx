import React, { useMemo } from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  Platform,
} from "react-native";
import { Text } from "../../components/common/Text";
import { useResponsiveLayout } from "../../hook/useResponsiveLayout";
import { useTheme } from "../../hook/useTheme";

export const CMP_GOLD = "#ffb900";
export const CMP_GOLD_MUTED = "#d97706";

export function screenBg(isDark: boolean) {
  return isDark ? "#0c0f14" : "#eef2f7";
}

function buildCompareMetrics(
  wp: (n: number) => number,
  hp: (n: number) => number,
  ms: (n: number, f?: number) => number,
  width: number,
  height: number,
) {
  return {
    screenPaddingH: wp(4),
    headerPadV: ms(12, 0.2),
    scrollPadH: wp(4),
    scrollPadBottom: Math.max(hp(5), ms(28, 0.1)),
    gapRow: wp(1.5),
    headerTitle: ms(17, 0.25),
    headerSub: ms(11, 0.2),
    backBtnPad: ms(8, 0.2),
    backIcon: Math.min(ms(24, 0.15), 28),
    titleMarginLeft: ms(12, 0.15),
    vsWidth: Math.min(Math.max(width * 0.09, 30), 44),
    vsPillPadH: ms(8, 0.2),
    vsPillPadV: ms(5, 0.15),
    vsPillRadius: ms(10, 0.15),
    vsFont: ms(11, 0.15),
    vsColumnPadTop: ms(20, 0.2),
    cardRadius: ms(18, 0.25),
    cardPad: ms(14, 0.3),
    goldBarH: ms(3, 0.2),
    goldBarMb: ms(10, 0.15),
    rowRadius: ms(10, 0.2),
    rowPadV: ms(6, 0.2),
    rowPadH: ms(8, 0.2),
    rowMb: ms(8, 0.15),
    rowFont: ms(12, 0.2),
    titleNameFont: ms(14, 0.2),
    titleNameMb: ms(8, 0.15),
    fabBottom: Math.max(hp(3), ms(20, 0.1)),
    fabHorizontal: wp(4),
    fabPadV: ms(15, 0.2),
    fabRadius: ms(18, 0.2),
    pickTabPadV: ms(11, 0.2),
    pickTabRadius: ms(14, 0.2),
    pickTabGap: wp(2.5),
    pickTopPad: ms(14, 0.2),
    pickItemPad: ms(14, 0.3),
    pickItemMb: ms(12, 0.2),
    pickItemRadius: ms(16, 0.25),
    badgeSize: ms(26, 0.25),
    emptyPad: ms(24, 0.2),
    listPadBottom: Math.max(hp(12), 100),
    stripOuterRadius: ms(18, 0.25),
    stripPadH: wp(3.5),
    stripPadV: ms(12, 0.2),
    accentLineH: ms(3, 0.2),
    accentLineInset: wp(5),
    dividerMv: ms(10, 0.15),
    sectionLabelMb: ms(6, 0.1),
    sectionLabelFont: ms(11, 0.15),
    addressFont: ms(11, 0.15),
    addressMt: ms(8, 0.15),
    footerNoteMt: ms(14, 0.15),
    footerNoteFont: ms(11, 0.15),
    loadingPad: ms(24, 0.2),
  };
}

export type CompareMetrics = ReturnType<typeof buildCompareMetrics>;

export function useCompareMetrics() {
  const { wp, hp, ms, width, height } = useResponsiveLayout();
  return useMemo(
    () => buildCompareMetrics(wp, hp, ms, width, height),
    [wp, hp, ms, width, height],
  );
}

/** Harita / liste altındaki “Karşılaştırmaya devam” şeridi — panellerde ortak */
export function compareStripOuterStyle(
  isDark: boolean,
  m: CompareMetrics,
  bottom: number,
): ViewStyle {
  return {
    position: "absolute",
    left: m.fabHorizontal,
    right: m.fabHorizontal,
    bottom,
    paddingHorizontal: m.stripPadH,
    paddingVertical: m.stripPadV,
    borderRadius: m.stripOuterRadius,
    backgroundColor: isDark ? "rgba(26, 31, 46, 0.98)" : "rgba(255, 255, 255, 0.98)",
    borderWidth: 1,
    borderColor: "rgba(255, 185, 0, 0.4)",
    elevation: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
      },
      default: {},
    }),
  };
}

export function compareStripCtaStyle(m: CompareMetrics): ViewStyle {
  return {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: m.rowPadV + 2,
    borderRadius: m.pickTabRadius,
    backgroundColor: CMP_GOLD,
  };
}

export function CompareHeaderChrome({
  children,
  isDark,
}: {
  children: React.ReactNode;
  isDark: boolean;
}) {
  const m = useCompareMetrics();
  return (
    <View
      style={[
        headerStyles.bar,
        {
          paddingHorizontal: m.screenPaddingH,
          paddingVertical: m.headerPadV,
          backgroundColor: isDark ? "rgba(26, 31, 46, 0.96)" : "rgba(255, 255, 255, 0.96)",
          borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(15,23,42,0.06)",
        },
      ]}
    >
      {children}
      <View
        style={[
          headerStyles.accentLine,
          {
            left: m.accentLineInset,
            right: m.accentLineInset,
            height: m.accentLineH,
          },
        ]}
      />
    </View>
  );
}

export function VsBadge() {
  const m = useCompareMetrics();
  return (
    <View style={[vsStyles.column, { width: m.vsWidth, paddingTop: m.vsColumnPadTop }]}>
      <View
        style={[
          vsStyles.pill,
          {
            paddingHorizontal: m.vsPillPadH,
            paddingVertical: m.vsPillPadV,
            borderRadius: m.vsPillRadius,
          },
        ]}
      >
        <Text style={[vsStyles.pillText, { fontSize: m.vsFont }]}>VS</Text>
      </View>
    </View>
  );
}

export function CompareGoldAccentBar() {
  const m = useCompareMetrics();
  return (
    <View
      style={{
        height: m.goldBarH,
        borderRadius: 2,
        backgroundColor: "rgba(255, 185, 0, 0.55)",
        marginBottom: m.goldBarMb,
        alignSelf: "stretch",
      }}
    />
  );
}

export function useCompareCardShell(isDark: boolean): ViewStyle {
  const m = useCompareMetrics();
  return useMemo(
    () => ({
      flex: 1,
      borderRadius: m.cardRadius,
      padding: m.cardPad,
      backgroundColor: isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.92)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.09)" : "rgba(203, 213, 225, 0.55)",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.35 : 0.08,
      shadowRadius: 10,
      elevation: isDark ? 0 : 4,
    }),
    [isDark, m],
  );
}

export function CompareMetricRow({ label, value }: { label: string; value: string }) {
  const { colors, isDark } = useTheme();
  const m = useCompareMetrics();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: m.rowMb,
        paddingVertical: m.rowPadV,
        paddingHorizontal: m.rowPadH,
        borderRadius: m.rowRadius,
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(241, 245, 249, 0.75)",
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: m.rowFont }}>{label}</Text>
      <Text
        style={{
          color: colors.sectionHeaderText,
          fontSize: m.rowFont,
          flex: 1,
          textAlign: "right",
          marginLeft: m.rowPadH,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

export function CompareOwnerRow({
  label,
  value,
  bold,
}: {
  label: string;
  value: string;
  bold?: boolean;
}) {
  const { colors, isDark } = useTheme();
  const m = useCompareMetrics();
  return (
    <View
      style={{
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: m.rowMb,
        paddingVertical: m.rowPadV,
        paddingHorizontal: m.rowPadH,
        borderRadius: m.rowRadius,
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(241, 245, 249, 0.75)",
      }}
    >
      <Text style={{ color: colors.textSecondary, fontSize: m.rowFont }}>{label}</Text>
      <Text
        style={{
          color: colors.sectionHeaderText,
          fontSize: m.rowFont,
          fontFamily: bold ? "CenturyGothic-Bold" : "CenturyGothic",
          flex: 1,
          textAlign: "right",
          marginLeft: m.rowPadH,
        }}
        numberOfLines={2}
      >
        {value}
      </Text>
    </View>
  );
}

export function compareBackButtonSurface(isDark: boolean, m: CompareMetrics): ViewStyle {
  return {
    padding: m.backBtnPad,
    borderRadius: m.pickTabRadius,
    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(255,185,0,0.12)",
  };
}

export function compareHeaderTitleStyle(
  colors: { sectionHeaderText: string; textSecondary: string },
  m: CompareMetrics,
): { title: TextStyle; sub: TextStyle } {
  return {
    title: {
      fontFamily: "CenturyGothic-Bold",
      fontSize: m.headerTitle,
      color: colors.sectionHeaderText,
    },
    sub: {
      color: colors.textSecondary,
      fontSize: m.headerSub,
      marginTop: 2,
    },
  };
}

const headerStyles = StyleSheet.create({
  bar: {
    position: "relative",
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  accentLine: {
    position: "absolute",
    bottom: 0,
    borderRadius: 2,
    backgroundColor: "rgba(255, 185, 0, 0.5)",
  },
});

const vsStyles = StyleSheet.create({
  column: {
    alignItems: "center",
    justifyContent: "flex-start",
  },
  pill: {
    backgroundColor: "rgba(255, 185, 0, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(255, 185, 0, 0.45)",
  },
  pillText: {
    fontFamily: "CenturyGothic-Bold",
    color: CMP_GOLD_MUTED,
  },
});
