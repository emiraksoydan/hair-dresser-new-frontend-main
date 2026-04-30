import { Icon } from "react-native-paper";
import React, { useMemo, type ReactNode } from "react";
import { ActivityIndicator, Image, ScrollView, StatusBar, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocalSearchParams } from "expo-router";
import { Text } from "../../components/common/Text";
import { AnimatedMoneyText } from "../../components/common/AnimatedMoneyText";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetFreeBarberForUsersQuery } from "../../store/api";
import { FreeBarberPanelDto } from "../../types";
import { getBarberTypeLabel } from "../../utils/card-helpers";
import {
  CompareAdvantageBar,
  CompareDuelRow,
  CompareHeaderChrome,
  VsPill,
  type CompareWinner,
  compareBackButtonSurface,
  compareHeaderTitleStyle,
  screenBg,
  useCompareCardShell,
  useCompareMetrics,
} from "./compareShared";

function firstImageUrl(fb?: FreeBarberPanelDto) {
  return fb?.imageList?.[0]?.imageUrl;
}

function valueStyle(colors: { sectionHeaderText: string }, m: { titleNameFont: number }, bold: boolean) {
  return {
    color: colors.sectionHeaderText,
    fontSize: m.titleNameFont,
    fontFamily: bold ? ("CenturyGothic-Bold" as const) : ("CenturyGothic" as const),
  };
}

function useFreeBarberDuelRows(
  t: (k: string) => string,
  l: FreeBarberPanelDto | undefined,
  r: FreeBarberPanelDto | undefined,
  m: { titleNameFont: number },
  colors: { sectionHeaderText: string },
) {
  return useMemo(() => {
    if (!l || !r) {
      return {
        rows: [] as { label: string; winner: CompareWinner; left: ReactNode; right: ReactNode }[],
        leftWins: 0,
        rightWins: 0,
        leftPct: 50,
      };
    }
    const rows: { label: string; winner: CompareWinner; left: ReactNode; right: ReactNode }[] = [];
    let leftWins = 0;
    let rightWins = 0;

    const st = () => valueStyle(colors, m, true);

    const addMetric = (label: string, winner: CompareWinner, leftNode: ReactNode, rightNode: ReactNode) => {
      if (winner === "left") leftWins += 1;
      else if (winner === "right") rightWins += 1;
      rows.push({ label, winner, left: leftNode, right: rightNode });
    };

    rows.push({
      label: t("compare.type"),
      winner: "skip",
      left: <Text style={st()}>{getBarberTypeLabel(l.type)}</Text>,
      right: <Text style={st()}>{getBarberTypeLabel(r.type)}</Text>,
    });

    const wRating = l.rating === r.rating ? ("tie" as const) : l.rating > r.rating ? ("left" as const) : ("right" as const);
    addMetric(
      t("profile.rating"),
      wRating,
      <AnimatedMoneyText value={l.rating} minimumFractionDigits={1} maximumFractionDigits={1} style={st()} enabled />,
      <AnimatedMoneyText value={r.rating} minimumFractionDigits={1} maximumFractionDigits={1} style={st()} enabled />,
    );

    const wRev = l.reviewCount === r.reviewCount ? ("tie" as const) : l.reviewCount > r.reviewCount ? ("left" as const) : ("right" as const);
    addMetric(
      t("profile.reviews"),
      wRev,
      <AnimatedMoneyText value={l.reviewCount} maximumFractionDigits={0} style={st()} enabled />,
      <AnimatedMoneyText value={r.reviewCount} maximumFractionDigits={0} style={st()} enabled />,
    );

    const wFav = l.favoriteCount === r.favoriteCount ? ("tie" as const) : l.favoriteCount > r.favoriteCount ? ("left" as const) : ("right" as const);
    addMetric(
      t("profile.favorites"),
      wFav,
      <AnimatedMoneyText value={l.favoriteCount} maximumFractionDigits={0} style={st()} enabled />,
      <AnimatedMoneyText value={r.favoriteCount} maximumFractionDigits={0} style={st()} enabled />,
    );

    const sL = l.offerings?.length ?? 0;
    const sR = r.offerings?.length ?? 0;
    const wS = sL === sR ? ("tie" as const) : sL > sR ? ("left" as const) : ("right" as const);
    addMetric(
      t("compare.serviceCount"),
      wS,
      <AnimatedMoneyText value={sL} maximumFractionDigits={0} style={st()} enabled />,
      <AnimatedMoneyText value={sR} maximumFractionDigits={0} style={st()} enabled />,
    );

    const wAv =
      l.isAvailable === r.isAvailable
        ? ("tie" as const)
        : l.isAvailable && !r.isAvailable
          ? ("left" as const)
          : !l.isAvailable && r.isAvailable
            ? ("right" as const)
            : ("tie" as const);
    addMetric(
      t("compare.availability"),
      wAv,
      <Text style={st()}>{l.isAvailable ? t("status.available") : t("status.busy")}</Text>,
      <Text style={st()}>{r.isAvailable ? t("status.available") : t("status.busy")}</Text>,
    );

    const totalW = leftWins + rightWins;
    const leftPct = totalW === 0 ? 50 : (100 * leftWins) / totalW;

    return { rows, leftWins, rightWins, leftPct };
  }, [l, r, t, colors, m]);
}

function Hero({ fb, loading, align }: { fb?: FreeBarberPanelDto; loading: boolean; align: "left" | "right" }) {
  const { colors, isDark } = useTheme();
  const m = useCompareMetrics();
  const card = useCompareCardShell(isDark);
  const url = firstImageUrl(fb);
  if (loading) {
    return (
      <View style={[{ flex: 1, minHeight: 132 }, card, { padding: m.cardPad, alignItems: "center", justifyContent: "center" }]}>
        <ActivityIndicator color={isDark ? "#a5b4fc" : "#818cf8"} />
      </View>
    );
  }
  if (!fb) {
    return (
      <View style={[{ flex: 1, minHeight: 100 }, card, { padding: m.cardPad }]}>
        <Text style={{ color: colors.textSecondary }}>—</Text>
      </View>
    );
  }
  const avatar = 78;
  return (
    <View style={[{ flex: 1, minHeight: 140 }, card, { padding: m.cardPad, alignItems: align === "left" ? "flex-start" : "flex-end" }]}>
      {url ? (
        <View
          style={{
            borderRadius: 22,
            padding: 2,
            marginBottom: 10,
            backgroundColor: isDark ? "rgba(99, 102, 241, 0.25)" : "rgba(99, 102, 241, 0.12)",
            shadowColor: isDark ? "#000" : "#94a3b8",
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 6,
            elevation: 2,
          }}
        >
          <Image
            source={{ uri: url }}
            style={{
              width: avatar,
              height: avatar,
              borderRadius: 20,
              backgroundColor: isDark ? "rgba(0,0,0,0.2)" : "#e2e8f0",
            }}
          />
        </View>
      ) : (
        <View
          style={{
            width: avatar,
            height: avatar,
            borderRadius: 20,
            marginBottom: 10,
            backgroundColor: isDark ? "rgba(129, 140, 248, 0.2)" : "rgba(99, 102, 241, 0.1)",
            borderWidth: 1,
            borderColor: isDark ? "rgba(129, 140, 248, 0.35)" : "rgba(99, 102, 241, 0.2)",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon source="account" size={32} color={isDark ? "#a5b4fc" : "#6366f1"} />
        </View>
      )}
      <Text
        numberOfLines={2}
        style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.titleNameFont, color: colors.sectionHeaderText, textAlign: align === "left" ? "left" : "right" }}
      >
        {fb.fullName}
      </Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 8, justifyContent: align === "left" ? "flex-start" : "flex-end" }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, backgroundColor: isDark ? "rgba(250, 204, 21,0.12)" : "rgba(250, 204, 21,0.15)" }}>
          <Text style={{ fontSize: m.addressFont, color: isDark ? "#fbbf24" : "#d97706" }}>★</Text>
          <Text style={{ fontSize: m.addressFont, fontFamily: "CenturyGothic-Bold", color: isDark ? "#fbbf24" : "#d97706" }}>
            {fb.rating.toFixed(1)}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 3, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20, backgroundColor: isDark ? "rgba(45,212,191,0.1)" : "rgba(45,212,191,0.12)" }}>
          <Icon source="heart" size={10} color={isDark ? "#2dd4bf" : "#0d9488"} />
          <Text style={{ fontSize: m.addressFont, fontFamily: "CenturyGothic-Bold", color: isDark ? "#2dd4bf" : "#0d9488" }}>
            {fb.favoriteCount}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function PublicFreeBarbersCompareScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const m = useCompareMetrics();
  const { left, right } = useLocalSearchParams<{ left?: string; right?: string }>();
  const ht = compareHeaderTitleStyle(colors, m);

  const qLeft = useGetFreeBarberForUsersQuery(left ?? "", { skip: !left });
  const qRight = useGetFreeBarberForUsersQuery(right ?? "", { skip: !right });
  const fl = qLeft.data;
  const fr = qRight.data;
  const { rows, leftWins, rightWins, leftPct } = useFreeBarberDuelRows(t, fl, fr, m, colors);
  const loading = (qLeft.isFetching && !qLeft.data) || (qRight.isFetching && !qRight.data);

  return (
    <View style={{ flex: 1, backgroundColor: isDark ? screenBg(isDark) : "#ffffff" }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? screenBg(isDark) : "#ffffff"} />
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? screenBg(isDark) : "#ffffff" }} edges={["top"]}>
        <CompareHeaderChrome isDark={isDark}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={compareBackButtonSurface(isDark, m)}
            >
              <Icon source="chevron-left" size={m.backIcon} color={colors.sectionHeaderText} />
            </TouchableOpacity>
            <View style={{ marginLeft: m.titleMarginLeft, flex: 1 }}>
              <Text style={ht.title}>{t("compare.publicFreeBarbersTitle")}</Text>
              <Text style={ht.sub}>{t("compare.publicSubtitle")}</Text>
            </View>
          </View>
        </CompareHeaderChrome>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: m.scrollPadH,
            paddingBottom: m.scrollPadBottom,
            paddingTop: 16,
          }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
            <Hero fb={fl} loading={loading} align="left" />
            <View style={{ width: m.vsWidth, alignItems: "center", paddingTop: m.vsColumnPadTop }}>
              <VsPill />
            </View>
            <Hero fb={fr} loading={loading} align="right" />
          </View>

          <View style={{ marginTop: 6 }}>
            {rows.map((row) => (
              <CompareDuelRow key={row.label} label={row.label} winner={row.winner} left={row.left} right={row.right} />
            ))}
          </View>

          {fl && fr && (
            <CompareAdvantageBar
              leftName={fl.fullName}
              rightName={fr.fullName}
              leftPct={leftPct}
              leftWins={leftWins}
              rightWins={rightWins}
              summaryLine={t("compare.criteriaAdvantage", { count: leftWins + rightWins })}
            />
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
