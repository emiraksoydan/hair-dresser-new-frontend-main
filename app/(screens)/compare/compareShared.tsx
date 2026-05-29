import React, { useMemo, type ReactNode } from "react";
import {
  View,
  StyleSheet,
  type ViewStyle,
  type TextStyle,
  type DimensionValue,
  Platform,
} from "react-native";
import { Icon } from "react-native-paper";
import { MotiView } from "moti";
import { Text } from "../../components/common/Text";
import { useResponsiveLayout } from "../../hook/useResponsiveLayout";
import { useTheme } from "../../hook/useTheme";

export const CMP_GOLD = "#FACC15";
export const CMP_GOLD_MUTED = "#d97706";

/** Karşılaştırma alt özet çubuğu — sol: yumuşak yeşim, sağ: yumuşak mavi */
export const CMP_ADV_LEFT_SOFT = "rgba(45, 212, 191, 0.42)";
export const CMP_ADV_RIGHT_SOFT = "rgba(96, 165, 250, 0.5)";
export const CMP_ADV_TRACK = "rgba(148, 163, 184, 0.18)";

export type CompareVariant = "store" | "freeBarber";

export type CompareVisualTokens = {
  accent: string;
  accentSoft: string;
  accentBorder: string;
  screenBgLight: string;
  vsPillBg: string;
  vsPillText: string;
  winLeft: string;
  winRight: string;
  lose: string;
  winLeftBg: string;
  winRightBg: string;
  advLeftSoft: string;
  advRightSoft: string;
  headerStripe: string;
  backBtnBgLight: string;
};

export function getCompareVisualTokens(variant: CompareVariant, isDark: boolean): CompareVisualTokens {
  if (variant === "store") {
    return {
      accent: isDark ? "#a5b4fc" : "#4f46e5",
      accentSoft: isDark ? "rgba(129, 140, 248, 0.2)" : "rgba(79, 70, 229, 0.1)",
      accentBorder: isDark ? "rgba(129, 140, 248, 0.35)" : "rgba(79, 70, 229, 0.22)",
      screenBgLight: "#f1f5f9",
      vsPillBg: isDark ? "#6366f1" : "#4f46e5",
      vsPillText: "#ffffff",
      winLeft: isDark ? "#2dd4bf" : "#0d9488",
      winRight: isDark ? "#60a5fa" : "#2563eb",
      lose: "#fb7185",
      winLeftBg: isDark ? "rgba(45, 212, 191, 0.1)" : "rgba(13, 148, 136, 0.08)",
      winRightBg: isDark ? "rgba(96, 165, 250, 0.1)" : "rgba(37, 99, 235, 0.08)",
      advLeftSoft: isDark ? "rgba(45, 212, 191, 0.42)" : "rgba(13, 148, 136, 0.55)",
      advRightSoft: isDark ? "rgba(96, 165, 250, 0.5)" : "rgba(37, 99, 235, 0.55)",
      headerStripe: isDark ? "rgba(99, 102, 241, 0.55)" : "rgba(79, 70, 229, 0.35)",
      backBtnBgLight: "rgba(79, 70, 229, 0.1)",
    };
  }
  return {
    accent: isDark ? "#fda4af" : "#e11d48",
    accentSoft: isDark ? "rgba(251, 113, 133, 0.2)" : "rgba(225, 29, 72, 0.08)",
    accentBorder: isDark ? "rgba(251, 113, 133, 0.35)" : "rgba(225, 29, 72, 0.2)",
    screenBgLight: "#fff1f2",
    vsPillBg: isDark ? "#fb7185" : "#e11d48",
    vsPillText: "#ffffff",
    winLeft: isDark ? "#fb7185" : "#e11d48",
    winRight: isDark ? "#f472b6" : "#db2777",
    lose: "#94a3b8",
    winLeftBg: isDark ? "rgba(251, 113, 133, 0.12)" : "rgba(225, 29, 72, 0.08)",
    winRightBg: isDark ? "rgba(244, 114, 182, 0.12)" : "rgba(219, 39, 119, 0.08)",
    advLeftSoft: isDark ? "rgba(251, 113, 133, 0.45)" : "rgba(225, 29, 72, 0.55)",
    advRightSoft: isDark ? "rgba(244, 114, 182, 0.5)" : "rgba(219, 39, 119, 0.55)",
    headerStripe: isDark ? "rgba(251, 113, 133, 0.5)" : "rgba(225, 29, 72, 0.35)",
    backBtnBgLight: "rgba(225, 29, 72, 0.08)",
  };
}

export function screenBg(isDark: boolean, variant: CompareVariant = "store") {
  if (isDark) return "#0c0f14";
  return getCompareVisualTokens(variant, false).screenBgLight;
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
    scrollPadBottom: Math.max(hp(5), ms(32, 0.1)),
    gapRow: wp(2.5),
    duelBlockRadius: ms(16, 0.2),
    duelBlockPad: ms(12, 0.2),
    headerTitle: ms(17, 0.25),
    headerSub: ms(11, 0.2),
    backBtnPad: ms(8, 0.2),
    backIcon: Math.min(ms(24, 0.15), 28),
    titleMarginLeft: ms(12, 0.15),
    vsWidth: Math.min(Math.max(width * 0.13, 52), 68),
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
    rowMb: ms(10, 0.15),
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
    borderColor: "rgba(250, 204, 21, 0.4)",
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
  variant = "store",
}: {
  children: React.ReactNode;
  isDark: boolean;
  variant?: CompareVariant;
}) {
  const m = useCompareMetrics();
  const tokens = getCompareVisualTokens(variant, isDark);
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
      <View
        style={{
          position: "absolute",
          left: m.screenPaddingH,
          right: m.screenPaddingH,
          bottom: 0,
          height: 3,
          borderRadius: 2,
          backgroundColor: tokens.headerStripe,
        }}
      />
      {children}
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
        backgroundColor: "rgba(250, 204, 21, 0.55)",
        marginBottom: m.goldBarMb,
        alignSelf: "stretch",
      }}
    />
  );
}

export function useCompareCardShell(isDark: boolean, variant: CompareVariant = "store"): ViewStyle {
  const m = useCompareMetrics();
  const tokens = getCompareVisualTokens(variant, isDark);
  return useMemo(
    () => ({
      flex: 1,
      borderRadius: m.cardRadius,
      padding: m.cardPad + 2,
      backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(255, 255, 255, 0.97)",
      borderWidth: 1,
      borderColor: isDark ? "rgba(255,255,255,0.08)" : tokens.accentBorder,
      shadowColor: isDark ? "#000" : variant === "store" ? "#64748b" : "#fda4af",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: isDark ? 0.28 : 0.06,
      shadowRadius: isDark ? 8 : 14,
      elevation: isDark ? 0 : 3,
    }),
    [isDark, m, tokens.accentBorder, variant],
  );
}

export type CompareWinner = "left" | "right" | "tie" | "skip";

function sideResult(
  winner: CompareWinner,
  side: "left" | "right",
): "win" | "lose" | "tie" | "skip" {
  if (winner === "skip") return "skip";
  if (winner === "tie") return "tie";
  if (winner === "left") return side === "left" ? "win" : "lose";
  return side === "right" ? "win" : "lose";
}

export function VsPill({ variant = "store" }: { variant?: CompareVariant }) {
  const m = useCompareMetrics();
  const { isDark } = useTheme();
  const tokens = getCompareVisualTokens(variant, isDark);
  return (
    <MotiView
      from={{ scale: 0.3, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", damping: 11, stiffness: 200, delay: 180 }}
      style={{
        paddingHorizontal: m.vsPillPadH + (variant === "freeBarber" ? 4 : 0),
        paddingVertical: m.vsPillPadV,
        borderRadius: variant === "freeBarber" ? 999 : m.vsPillRadius,
        backgroundColor: tokens.vsPillBg,
        alignItems: "center",
        justifyContent: "center",
        shadowColor: tokens.vsPillBg,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 4,
      }}
    >
      <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.vsFont, color: tokens.vsPillText }}>
        VS
      </Text>
    </MotiView>
  );
}

export function CompareDuelRow({
  label,
  left,
  right,
  winner,
  variant = "store",
}: {
  label: string;
  left: ReactNode;
  right: ReactNode;
  winner: CompareWinner;
  variant?: CompareVariant;
}) {
  const { colors, isDark } = useTheme();
  const m = useCompareMetrics();
  const tokens = getCompareVisualTokens(variant, isDark);
  const l = sideResult(winner, "left");
  const r = sideResult(winner, "right");
  const showL = l === "win" || l === "lose";
  const showR = r === "win" || r === "lose";
  const lColor = l === "win" ? tokens.winLeft : l === "lose" ? tokens.lose : colors.textSecondary;
  const rColor = r === "win" ? tokens.winRight : r === "lose" ? tokens.lose : colors.textSecondary;
  const lBg = l === "win" ? tokens.winLeftBg : "transparent";
  const rBg = r === "win" ? tokens.winRightBg : "transparent";
  const blockRadius = variant === "freeBarber" ? 999 : m.duelBlockRadius;
  return (
    <View
      style={{
        marginBottom: m.rowMb,
        borderRadius: blockRadius,
        paddingVertical: m.duelBlockPad,
        paddingHorizontal: m.duelBlockPad,
        backgroundColor: isDark ? "rgba(255,255,255,0.04)" : variant === "freeBarber" ? "rgba(255,255,255,0.95)" : "rgba(248, 250, 252, 0.9)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.06)" : tokens.accentBorder,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color: colors.textSecondary,
          fontSize: m.sectionLabelFont,
          marginBottom: m.sectionLabelMb + 2,
          letterSpacing: 0.3,
        }}
      >
        {label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", minHeight: 44 }}>
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-end",
            paddingRight: 8,
            paddingVertical: 4,
            paddingLeft: 4,
            gap: 5,
            borderRadius: m.rowRadius,
            backgroundColor: lBg,
          }}
        >
          <View style={{ flexShrink: 1, alignItems: "flex-end" }}>{left}</View>
          {showL && (
            <Icon source={l === "win" ? "trending-up" : "trending-down"} size={18} color={lColor} />
          )}
        </View>
        <View
          style={{
            width: 1,
            height: 32,
            backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(148, 163, 184, 0.25)",
          }}
        />
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "flex-start",
            paddingLeft: 8,
            paddingVertical: 4,
            paddingRight: 4,
            gap: 5,
            borderRadius: m.rowRadius,
            backgroundColor: rBg,
          }}
        >
          {showR && (
            <Icon source={r === "win" ? "trending-up" : "trending-down"} size={18} color={rColor} />
          )}
          <View style={{ flexShrink: 1, alignItems: "flex-start" }}>{right}</View>
        </View>
      </View>
    </View>
  );
}

export function CompareAdvantageBar({
  leftName,
  rightName,
  leftPct,
  leftWins,
  rightWins,
  summaryLine,
  variant = "store",
}: {
  leftName: string;
  rightName: string;
  leftPct: number;
  leftWins: number;
  rightWins: number;
  summaryLine: string;
  variant?: CompareVariant;
}) {
  const { colors, isDark } = useTheme();
  const m = useCompareMetrics();
  const tokens = getCompareVisualTokens(variant, isDark);
  const w = Math.max(0, Math.min(1, leftPct / 100));
  const leftW = `${(w * 100).toFixed(2)}%` as DimensionValue;
  return (
    <MotiView
      from={{ opacity: 0.9 }}
      animate={{ opacity: 1 }}
      transition={{ type: "timing", duration: 400 }}
      style={{
        borderRadius: variant === "freeBarber" ? m.cardRadius + 8 : m.cardRadius + 2,
        padding: m.cardPad + 4,
        marginTop: m.footerNoteMt + 4,
        backgroundColor: isDark ? tokens.accentSoft : "rgba(255, 255, 255, 0.98)",
        borderWidth: 1,
        borderColor: isDark ? tokens.accentBorder : tokens.accentBorder,
        shadowColor: isDark ? "#000" : variant === "store" ? "#94a3b8" : "#fda4af",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: isDark ? 0.2 : 0.04,
        shadowRadius: 12,
        elevation: isDark ? 0 : 2,
      }}
    >
      <Text
        style={{
          textAlign: "center",
          color: colors.textSecondary,
          fontSize: m.footerNoteFont,
          marginBottom: m.rowMb + 2,
          lineHeight: 18,
        }}
      >
        {summaryLine}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "flex-start", marginBottom: 12, gap: 8 }}>
        <View style={{ flex: 1, paddingRight: 4 }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.rowFont + 1, color: colors.sectionHeaderText }}
          >
            {leftName}
          </Text>
          <Text
            style={{
              fontSize: m.rowFont,
              color: tokens.winLeft,
              marginTop: 3,
            }}
          >
            {leftWins} · {Math.round(leftPct)}%
          </Text>
        </View>
        <View style={{ flex: 1, paddingLeft: 4, alignItems: "flex-end" }}>
          <Text
            numberOfLines={1}
            style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.rowFont + 1, color: colors.sectionHeaderText, textAlign: "right" }}
          >
            {rightName}
          </Text>
          <Text
            style={{
              fontSize: m.rowFont,
              color: tokens.winRight,
              marginTop: 3,
            }}
          >
            {rightWins} · {100 - Math.round(leftPct)}%
          </Text>
        </View>
      </View>
      <View
        style={{
          height: 20,
          borderRadius: 999,
          backgroundColor: CMP_ADV_TRACK,
          overflow: "hidden",
          flexDirection: "row",
        }}
      >
        <MotiView
          from={{ opacity: 0.8 }}
          animate={{ opacity: 1 }}
          transition={{ type: "spring", damping: 18, stiffness: 200 }}
          style={{ width: leftW, height: "100%", backgroundColor: tokens.advLeftSoft, alignItems: "center", justifyContent: "center" }}
        >
          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 10, color: "rgba(255,255,255,0.95)" }}>
            {Math.round(leftPct)}%
          </Text>
        </MotiView>
        <View style={{ flex: 1, minWidth: 0, height: "100%", backgroundColor: tokens.advRightSoft, alignItems: "center", justifyContent: "center" }}>
          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 10, color: "rgba(255,255,255,0.95)" }}>
            {100 - Math.round(leftPct)}%
          </Text>
        </View>
      </View>
    </MotiView>
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

export function compareBackButtonSurface(
  isDark: boolean,
  m: CompareMetrics,
  variant: CompareVariant = "store",
): ViewStyle {
  const tokens = getCompareVisualTokens(variant, isDark);
  return {
    padding: m.backBtnPad,
    borderRadius: m.pickTabRadius,
    backgroundColor: isDark ? "rgba(255,255,255,0.08)" : tokens.backBtnBgLight,
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
});
