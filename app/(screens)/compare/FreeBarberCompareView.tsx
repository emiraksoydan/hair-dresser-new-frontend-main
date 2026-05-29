import { Icon } from "react-native-paper";
import React from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  View,
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
import { FreeBarberPanelDto } from "../../types";
import { formatFavoriteCount } from "../../utils/formatFavoriteCount";

const FB = {
  gradDark: ["#0f172a", "#1e1b4b", "#0c0f14"] as const,
  gradLight: ["#e0e7ff", "#f8fafc", "#f1f5f9"] as const,
  accent: "#6366f1",
  accentLight: "#4f46e5",
  win: "#0d9488",
  alt: "#0891b2",
  panel: (dark: boolean) => (dark ? "rgba(30,41,59,0.92)" : "rgba(255,255,255,0.96)"),
};

function side(winner: CompareWinner, s: "left" | "right") {
  if (winner === "skip" || winner === "tie") return "neutral" as const;
  if (winner === "left") return s === "left" ? ("win" as const) : ("lose" as const);
  return s === "right" ? ("win" as const) : ("lose" as const);
}

function AvatarFace({
  fb,
  loading,
  position,
}: {
  fb?: FreeBarberPanelDto;
  loading: boolean;
  position: "left" | "right";
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const m = useCompareMetrics();
  const size = 96;
  const url = fb?.imageList?.[0]?.imageUrl;
  const shift = position === "left" ? { marginRight: -28 } : { marginLeft: -28 };

  if (loading) {
    return (
      <View style={[{ width: size, height: size, borderRadius: size / 2, ...shift }, { alignItems: "center", justifyContent: "center", backgroundColor: FB.panel(isDark) }]}>
        <ActivityIndicator color={FB.accentLight} />
      </View>
    );
  }

  if (!fb) {
    return (
      <View
        style={[
          { width: size, height: size, borderRadius: size / 2, ...shift },
          { backgroundColor: FB.panel(isDark), alignItems: "center", justifyContent: "center" },
        ]}
      >
        <Text style={{ color: colors.textSecondary }}>—</Text>
      </View>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 14, delay: position === "left" ? 0 : 100 }}
      style={[{ alignItems: "center", zIndex: position === "left" ? 2 : 1 }, shift]}
    >
      <View
        style={{
          padding: 4,
          borderRadius: size / 2 + 4,
          backgroundColor: isDark ? "rgba(99,102,241,0.3)" : "rgba(79,70,229,0.18)",
        }}
      >
        {url ? (
          <Image source={{ uri: url }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: "#e0e7ff" }} />
        ) : (
          <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: isDark ? "#1e1b4b" : "#e0e7ff", alignItems: "center", justifyContent: "center" }}>
            <Icon source="account" size={44} color={isDark ? "#a5b4fc" : FB.accentLight} />
          </View>
        )}
        <View
          style={{
            position: "absolute",
            bottom: 4,
            right: 4,
            width: 18,
            height: 18,
            borderRadius: 9,
            borderWidth: 2,
            borderColor: isDark ? "#0c0f14" : "#fff",
            backgroundColor: fb.isAvailable ? "#22c55e" : "#ef4444",
          }}
        />
      </View>
      <Text numberOfLines={2} style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.titleNameFont, color: isDark ? "#e0e7ff" : "#1e1b4b", marginTop: 10, textAlign: "center", maxWidth: 130 }}>
        {fb.fullName}
      </Text>
      <Text style={{ fontSize: m.addressFont, color: fb.isAvailable ? "#22c55e" : "#ef4444", marginTop: 2 }}>
        {fb.isAvailable ? t("status.available") : t("status.busy")}
      </Text>
      <View style={{ flexDirection: "row", gap: 8, marginTop: 8 }}>
        <Text style={{ fontSize: m.addressFont, fontFamily: "CenturyGothic-Bold", color: isDark ? "#fbbf24" : "#b45309" }}>★ {fb.rating.toFixed(1)}</Text>
        <Text style={{ fontSize: m.addressFont, fontFamily: "CenturyGothic-Bold", color: isDark ? "#2dd4bf" : FB.win }}>
          ♥ {formatFavoriteCount(fb.favoriteCount)}
        </Text>
      </View>
    </MotiView>
  );
}

function TugOfWarRow({ row, index }: { row: CompareMetricRowData; index: number }) {
  const { colors, isDark } = useTheme();
  const m = useCompareMetrics();
  const l = side(row.winner, "left");
  const r = side(row.winner, "right");
  const leftFlex = l === "win" ? 2 : r === "win" ? 1 : 1;
  const rightFlex = r === "win" ? 2 : l === "win" ? 1 : 1;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "timing", duration: 350, delay: 150 + index * 50 }}
      style={{ marginBottom: 14 }}
    >
      <Text style={{ textAlign: "center", fontSize: m.sectionLabelFont, color: colors.textSecondary, marginBottom: 8, fontFamily: "CenturyGothic-Bold" }}>
        {row.label}
      </Text>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8, gap: 8 }}>
        <View style={{ flex: 1, alignItems: "flex-end" }}>{row.left}</View>
        <View style={{ flex: 1, alignItems: "flex-start" }}>{row.right}</View>
      </View>
      <View style={{ flexDirection: "row", height: 10, borderRadius: 999, overflow: "hidden", backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(79,70,229,0.08)" }}>
        <View style={{ flex: leftFlex, backgroundColor: l === "win" ? FB.win : isDark ? "rgba(13,148,136,0.3)" : "rgba(13,148,136,0.2)" }} />
        <View style={{ width: 3, backgroundColor: isDark ? "#0c0f14" : "#fff" }} />
        <View style={{ flex: rightFlex, backgroundColor: r === "win" ? FB.accentLight : isDark ? "rgba(79,70,229,0.25)" : "rgba(79,70,229,0.15)" }} />
      </View>
    </MotiView>
  );
}

export function FreeBarberCompareView({
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
  left?: FreeBarberPanelDto;
  right?: FreeBarberPanelDto;
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
  const grad = isDark ? FB.gradDark : FB.gradLight;
  const leader = leftWins === rightWins ? null : leftWins > rightWins ? left : right;

  return (
    <View style={{ flex: 1, backgroundColor: pageBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={grad[0]} />
      <LinearGradient colors={[...grad]} style={{ position: "absolute", left: 0, right: 0, top: 0, height: 280 }} />
      <SafeAreaView style={{ flex: 1 }} edges={["top"]}>
        <View style={{ paddingHorizontal: m.screenPaddingH, paddingVertical: m.headerPadV, flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={onBack}
            style={{
              padding: m.backBtnPad,
              borderRadius: 999,
              backgroundColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)",
            }}
          >
            <Icon source="chevron-left" size={m.backIcon} color={isDark ? "#a5b4fc" : FB.accentLight} />
          </TouchableOpacity>
          <View style={{ marginLeft: m.titleMarginLeft, flex: 1 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 32, height: 32, borderRadius: 999, backgroundColor: isDark ? "rgba(99,102,241,0.35)" : "rgba(79,70,229,0.12)", alignItems: "center", justifyContent: "center" }}>
                <Icon source="account-group" size={18} color={isDark ? "#c7d2fe" : FB.accentLight} />
              </View>
              <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.headerTitle + 1, color: isDark ? "#fff" : "#1e1b4b" }}>{title}</Text>
            </View>
            <Text style={{ color: isDark ? "rgba(255,255,255,0.65)" : "#64748b", fontSize: m.headerSub, marginTop: 4, marginLeft: 40 }}>{subtitle}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ paddingHorizontal: m.scrollPadH, paddingBottom: m.scrollPadBottom }} showsVerticalScrollIndicator={false}>
          {/* Avatar kartı */}
          <View
            style={{
              borderRadius: 24,
              paddingVertical: 28,
              paddingHorizontal: 16,
              marginBottom: 24,
              backgroundColor: FB.panel(isDark),
              borderWidth: 1,
              borderColor: isDark ? "rgba(129,140,248,0.25)" : "rgba(79,70,229,0.13)",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "flex-end", justifyContent: "center", width: "100%", paddingHorizontal: 8 }}>
              <AvatarFace fb={left} loading={loading} position="left" />
              <MotiView
                from={{ scale: 0, rotate: "180deg" }}
                animate={{ scale: 1, rotate: "0deg" }}
                transition={{ type: "spring", damping: 10, delay: 200 }}
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 26,
                  backgroundColor: isDark ? FB.accentLight : FB.accent,
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 48,
                  zIndex: 10,
                  borderWidth: 4,
                  borderColor: isDark ? "#0c0f14" : "#fff",
                  shadowColor: FB.accent,
                  shadowOpacity: 0.4,
                  shadowRadius: 12,
                  elevation: 8,
                }}
              >
                <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 14, color: "#fff" }}>{t("compare.vs")}</Text>
              </MotiView>
              <AvatarFace fb={right} loading={loading} position="right" />
            </View>
          </View>

          {/* Metrik satırları */}
          <View style={{ borderRadius: 20, padding: m.cardPad + 2, backgroundColor: FB.panel(isDark), borderWidth: 1, borderColor: isDark ? "rgba(129,140,248,0.2)" : "rgba(79,70,229,0.1)", marginBottom: 16 }}>
            {rows.map((row, i) => (
              <TugOfWarRow key={row.label} row={row} index={i} />
            ))}
          </View>

          {/* Footer */}
          {left && right && (
            <MotiView
              from={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 16 }}
              style={{ borderRadius: 22, overflow: "hidden" }}
            >
              <LinearGradient colors={isDark ? ["#1e1b4b", "#312e81"] : ["#4f46e5", "#6366f1"]} style={{ padding: m.cardPad + 6 }}>
                <Text style={{ textAlign: "center", color: "rgba(255,255,255,0.9)", fontSize: m.footerNoteFont, marginBottom: 16 }}>
                  {t("compare.criteriaAdvantage", { count: leftWins + rightWins })}
                </Text>
                <View style={{ flexDirection: "row", height: 56, borderRadius: 16, overflow: "hidden", backgroundColor: "rgba(0,0,0,0.15)" }}>
                  <View style={{ flex: leftWins || 1, alignItems: "center", justifyContent: "center", padding: 8, backgroundColor: "rgba(255,255,255,0.12)" }}>
                    <Text numberOfLines={1} style={{ fontFamily: "CenturyGothic-Bold", color: "#fff", fontSize: m.rowFont }}>{left.fullName}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: m.rowFont + 2, marginTop: 4, fontFamily: "CenturyGothic-Bold" }}>{Math.round(leftPct)}%</Text>
                  </View>
                  <View style={{ width: 2, backgroundColor: "rgba(255,255,255,0.3)" }} />
                  <View style={{ flex: rightWins || 1, alignItems: "center", justifyContent: "center", padding: 8, backgroundColor: "rgba(255,255,255,0.08)" }}>
                    <Text numberOfLines={1} style={{ fontFamily: "CenturyGothic-Bold", color: "#fff", fontSize: m.rowFont, textAlign: "center" }}>{right.fullName}</Text>
                    <Text style={{ color: "rgba(255,255,255,0.85)", fontSize: m.rowFont + 2, marginTop: 4, fontFamily: "CenturyGothic-Bold" }}>{100 - Math.round(leftPct)}%</Text>
                  </View>
                </View>
                {leader && (
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 16, paddingTop: 14, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.2)" }}>
                    <Icon source="crown" size={22} color="#fde68a" />
                    <Text style={{ fontFamily: "CenturyGothic-Bold", color: "#fff", fontSize: m.titleNameFont }} numberOfLines={1}>
                      {leader.fullName}
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
