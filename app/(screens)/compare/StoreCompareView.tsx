import { Icon } from "react-native-paper";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";

import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useCompareMetrics } from "./compareShared";
import type { CompareMetricRowData } from "./compareMetricTypes";
import type { CompareWinner } from "./compareShared";
import { BarberStoreMineDto } from "../../types";
import { formatFavoriteCount } from "../../utils/formatFavoriteCount";

const STORE = {
  gradDark: ["#0f172a", "#1e1b4b", "#0c0f14"] as const,
  gradLight: ["#e0e7ff", "#f8fafc", "#f1f5f9"] as const,
  heroGrad: ["#312e81", "#4f46e5"] as const,
  heroGradLight: ["#6366f1", "#818cf8"] as const,
  accent: "#6366f1",
  accentLight: "#4f46e5",
  win: "#0d9488",
  lose: "#f43f5e",
  panel: (dark: boolean) => (dark ? "rgba(30,41,59,0.92)" : "rgba(255,255,255,0.96)"),
};

function side(winner: CompareWinner, side: "left" | "right") {
  if (winner === "skip" || winner === "tie") return "neutral" as const;
  if (winner === "left") return side === "left" ? ("win" as const) : ("lose" as const);
  return side === "right" ? ("win" as const) : ("lose" as const);
}

function StoreHeroCard({
  store,
  loading,
  slot,
}: {
  store?: BarberStoreMineDto;
  loading: boolean;
  slot: "left" | "right";
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const m = useCompareMetrics();
  const url = store?.imageList?.[0]?.imageUrl;
  const align = slot === "left" ? "flex-start" : "flex-end";

  if (loading) {
    return (
      <View style={{ flex: 1, minHeight: 168, borderRadius: 16, backgroundColor: STORE.panel(isDark), alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator color={isDark ? "#a5b4fc" : STORE.accentLight} />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={{ flex: 1, minHeight: 120, borderRadius: 16, backgroundColor: STORE.panel(isDark), padding: m.cardPad }}>
        <Text style={{ color: colors.textSecondary }}>—</Text>
      </View>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: slot === "left" ? -12 : 12 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 420, delay: slot === "left" ? 0 : 80 }}
      style={{ flex: 1, borderRadius: 16, overflow: "hidden", backgroundColor: STORE.panel(isDark), borderWidth: 1, borderColor: isDark ? "rgba(129,140,248,0.25)" : "rgba(79,70,229,0.18)" }}
    >
      <View style={{ height: 100, width: "100%" }}>
        {url ? (
          <Image source={{ uri: url }} style={{ width: "100%", height: "100%" }} resizeMode="cover" />
        ) : (
          <LinearGradient colors={isDark ? STORE.heroGrad : STORE.heroGradLight} style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
            <Icon source="storefront" size={40} color="rgba(255,255,255,0.9)" />
          </LinearGradient>
        )}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.75)"]}
          style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: 56, paddingHorizontal: 10, justifyContent: "flex-end", paddingBottom: 8 }}
        >
          <Text numberOfLines={2} style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.titleNameFont, color: "#fff" }}>
            {store.storeName}
          </Text>
        </LinearGradient>
        <View
          style={{
            position: "absolute",
            top: 8,
            [slot === "left" ? "left" : "right"]: 8,
            paddingHorizontal: 8,
            paddingVertical: 3,
            borderRadius: 8,
            backgroundColor: store.isOpenNow ? "rgba(34,197,94,0.9)" : "rgba(100,116,139,0.9)",
          }}
        >
          <Text style={{ fontSize: 10, fontFamily: "CenturyGothic-Bold", color: "#fff" }}>
            {store.isOpenNow ? t("status.open") : t("status.closed")}
          </Text>
        </View>
      </View>
      <View style={{ padding: m.cardPad - 2, alignItems: align }}>
        {!!store.addressDescription && (
          <Text numberOfLines={2} style={{ color: colors.textSecondary, fontSize: m.addressFont, textAlign: slot === "left" ? "left" : "right" }}>
            {store.addressDescription}
          </Text>
        )}
        <View style={{ flexDirection: "row", gap: 6, marginTop: 8, justifyContent: slot === "left" ? "flex-start" : "flex-end" }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? "rgba(250,204,21,0.15)" : "rgba(250,204,21,0.2)" }}>
            <Text style={{ fontSize: 11, color: isDark ? "#fbbf24" : "#b45309" }}>★</Text>
            <Text style={{ fontSize: 11, fontFamily: "CenturyGothic-Bold", color: isDark ? "#fbbf24" : "#b45309" }}>{store.rating.toFixed(1)}</Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: isDark ? "rgba(45,212,191,0.12)" : "rgba(13,148,136,0.1)" }}>
            <Icon source="heart" size={11} color={isDark ? "#2dd4bf" : "#0d9488"} />
            <Text style={{ fontSize: 11, fontFamily: "CenturyGothic-Bold", color: isDark ? "#2dd4bf" : "#0d9488" }}>
              {formatFavoriteCount(store.favoriteCount)}
            </Text>
          </View>
        </View>
      </View>
    </MotiView>
  );
}

function ScoreboardRow({ row, index }: { row: CompareMetricRowData; index: number }) {
  const { colors, isDark } = useTheme();
  const m = useCompareMetrics();
  const l = side(row.winner, "left");
  const r = side(row.winner, "right");
  const lStrong = l === "win";
  const rStrong = r === "win";

  return (
    <MotiView
      from={{ opacity: 0, translateX: -8 }}
      animate={{ opacity: 1, translateX: 0 }}
      transition={{ type: "timing", duration: 320, delay: 120 + index * 45 }}
      style={{
        marginBottom: 10,
        borderRadius: 14,
        padding: 12,
        backgroundColor: STORE.panel(isDark),
        borderWidth: 1,
        borderColor: isDark ? "rgba(129,140,248,0.2)" : "rgba(79,70,229,0.12)",
      }}
    >
      <Text style={{ textAlign: "center", fontSize: m.sectionLabelFont, color: colors.textSecondary, marginBottom: 10, letterSpacing: 0.6, textTransform: "uppercase" }}>
        {row.label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <View
          style={{
            flex: 1,
            alignItems: "flex-end",
            paddingRight: 10,
            paddingVertical: 6,
            paddingLeft: 6,
            borderRadius: 10,
            borderWidth: lStrong ? 2 : 0,
            borderColor: STORE.win,
            backgroundColor: lStrong ? (isDark ? "rgba(13,148,136,0.12)" : "rgba(13,148,136,0.08)") : "transparent",
          }}
        >
          {row.left}
        </View>
        <View style={{ width: 28, alignItems: "center" }}>
          {lStrong ? <Icon source="chevron-left" size={18} color={STORE.win} /> : rStrong ? <Icon source="chevron-right" size={18} color={STORE.accentLight} /> : <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: colors.textTertiary }} />}
        </View>
        <View
          style={{
            flex: 1,
            alignItems: "flex-start",
            paddingLeft: 10,
            paddingVertical: 6,
            paddingRight: 6,
            borderRadius: 10,
            borderWidth: rStrong ? 2 : 0,
            borderColor: STORE.accentLight,
            backgroundColor: rStrong ? (isDark ? "rgba(79,70,229,0.12)" : "rgba(79,70,229,0.08)") : "transparent",
          }}
        >
          {row.right}
        </View>
      </View>
    </MotiView>
  );
}

export function StoreCompareView({
  title,
  subtitle,
  loading,
  left,
  right,
  rows,
  leftWins,
  rightWins,
  leftPct,
  onBack,
}: {
  title: string;
  subtitle: string;
  loading: boolean;
  left?: BarberStoreMineDto;
  right?: BarberStoreMineDto;
  rows: CompareMetricRowData[];
  leftWins: number;
  rightWins: number;
  leftPct: number;
  onBack: () => void;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const m = useCompareMetrics();
  const pageBg = isDark ? "#0c0f14" : "#f1f5f9";
  const grad = isDark ? STORE.gradDark : STORE.gradLight;
  const leader = leftWins === rightWins ? null : leftWins > rightWins ? left : right;
  const leaderName = leader?.storeName ?? "";

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={grad[0]} />
      <LinearGradient colors={[...grad]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 220 }} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: m.screenPaddingH, paddingVertical: m.headerPadV, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={onBack}
            style={{
              padding: m.backBtnPad,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.85)",
            }}
          >
            <Icon source="chevron-left" size={m.backIcon} color={isDark ? "#fff" : STORE.accentLight} />
          </TouchableOpacity>
          <View style={{ marginLeft: m.titleMarginLeft, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 10, backgroundColor: isDark ? "rgba(99,102,241,0.4)" : "rgba(79,70,229,0.15)", alignItems: "center", justifyContent: "center" }}>
                <Icon source="store" size={18} color={isDark ? "#c7d2fe" : STORE.accentLight} />
              </View>
              <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.headerTitle + 1, color: isDark ? "#fff" : "#1e1b4b" }}>{title}</Text>
            </View>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.65)" : "#64748b", fontSize: m.headerSub, marginTop: 4, marginLeft: 40 }}>{subtitle}</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ paddingHorizontal: m.scrollPadH, paddingBottom: m.scrollPadBottom }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: "row", alignItems: "stretch", gap: 8, marginBottom: 20 }}>
            <StoreHeroCard store={left} loading={loading} slot="left" />
            <View style={{ justifyContent: "center", alignItems: "center", width: 44, marginHorizontal: -4, zIndex: 2 }}>
              <MotiView
                from={{ scale: 0.5, rotate: "-8deg" }}
                animate={{ scale: 1, rotate: "0deg" }}
                transition={{ type: "spring", damping: 12 }}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  backgroundColor: isDark ? "#4f46e5" : STORE.accentLight,
                  alignItems: "center",
                  justifyContent: "center",
                  borderWidth: 3,
                  borderColor: isDark ? "#0c0f14" : "#fff",
                  shadowColor: "#000",
                  shadowOpacity: 0.25,
                  shadowRadius: 8,
                  elevation: 6,
                }}
              >
                <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 12, color: "#fff" }}>{t("compare.vs")}</Text>
              </MotiView>
            </View>
            <StoreHeroCard store={right} loading={loading} slot="right" />
          </View>

          {rows.map((row, i) => (
            <ScoreboardRow key={row.label} row={row} index={i} />
          ))}

          {left && right && (
            <MotiView
              from={{ opacity: 0, translateY: 16 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: 300 }}
              style={{
                marginTop: 8,
                borderRadius: 18,
                overflow: "hidden",
                borderWidth: 1,
                borderColor: isDark ? "rgba(129,140,248,0.3)" : "rgba(79,70,229,0.2)",
              }}
            >
              <LinearGradient colors={isDark ? ["#1e1b4b", "#312e81"] : ["#4f46e5", "#6366f1"]} style={{ padding: m.cardPad + 4 }}>
                <Text style={{ textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: m.footerNoteFont, marginBottom: 12 }}>
                  {t("compare.criteriaAdvantage", { count: leftWins + rightWins })}
                </Text>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 14 }}>
                  <View style={{ flex: 1 }}>
                    <Text numberOfLines={1} style={{ fontFamily: "CenturyGothic-Bold", color: "#fff", fontSize: m.rowFont + 1 }}>{left.storeName}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: m.rowFont, marginTop: 4 }}>{leftWins} · {Math.round(leftPct)}%</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: "flex-end" }}>
                    <Text numberOfLines={1} style={{ fontFamily: "CenturyGothic-Bold", color: "#fff", fontSize: m.rowFont + 1, textAlign: "right" }}>{right.storeName}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.75)", fontSize: m.rowFont, marginTop: 4 }}>{rightWins} · {100 - Math.round(leftPct)}%</Text>
                  </View>
                </View>
                <View style={{ height: 12, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.2)", flexDirection: "row", overflow: "hidden" }}>
                  <View style={{ width: `${leftPct}%` as ViewStyle["width"], height: "100%", backgroundColor: STORE.win }} />
                  <View style={{ flex: 1, height: "100%", backgroundColor: "rgba(255,255,255,0.35)" }} />
                </View>
                {leader && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14 }}>
                    <Icon source="trophy" size={18} color="#fde68a" />
                    <Text style={{ fontFamily: "CenturyGothic-Bold", color: "#fde68a", fontSize: m.rowFont }} numberOfLines={1}>
                      {leaderName}
                    </Text>
                  </View>
                )}
              </LinearGradient>
            </MotiView>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
