import { Icon } from "react-native-paper";
import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetMineStoresQuery, useLazyGetBarberStoreEarningsQuery } from "../../store/api";
import { BarberStoreMineDto, EarningsDto } from "../../types";
import type { ThemeColors } from "../../hook/useTheme";
import {
  type CompareMetrics,
  CompareGoldAccentBar,
  CompareHeaderChrome,
  CompareOwnerRow,
  VsBadge,
  compareBackButtonSurface,
  compareHeaderTitleStyle,
  screenBg,
  useCompareCardShell,
  useCompareMetrics,
} from "../compare/compareShared";

const CURRENCY = "₺";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

function MineStoreCompareColumn({
  isDark,
  colors,
  m,
  store,
  earn,
  onCycle,
  t,
}: {
  isDark: boolean;
  colors: ThemeColors;
  m: CompareMetrics;
  store?: BarberStoreMineDto;
  earn: EarningsDto | null;
  onCycle: () => void;
  t: (k: string) => string;
}) {
  const cardStyle = useCompareCardShell(isDark);
  return (
    <View style={cardStyle}>
      <CompareGoldAccentBar />
      <TouchableOpacity
        onPress={onCycle}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: m.titleNameMb,
        }}
      >
        <Text
          numberOfLines={2}
          style={{
            color: colors.sectionHeaderText,
            fontFamily: "CenturyGothic-Bold",
            fontSize: m.titleNameFont,
            flex: 1,
          }}
        >
          {store?.storeName ?? "—"}
        </Text>
        <Icon source="swap-horizontal" size={m.backIcon - 4} color="#ffb900" />
      </TouchableOpacity>

      <CompareOwnerRow label={t("profile.rating")} value={`${store?.rating?.toFixed(1) ?? "—"}`} />
      <CompareOwnerRow label={t("profile.reviews")} value={String(store?.reviewCount ?? 0)} />
      <CompareOwnerRow label={t("profile.favorites")} value={String(store?.favoriteCount ?? 0)} />
      <View
        style={{
          height: StyleSheet.hairlineWidth,
          backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
          marginVertical: m.dividerMv,
        }}
      />
      <Text
        style={{
          color: colors.textSecondary,
          fontSize: m.sectionLabelFont,
          marginBottom: m.sectionLabelMb,
        }}
      >
        {t("profile.storeEarningsTitle")} · {t("profile.periodLast30Days")}
      </Text>
      <CompareOwnerRow
        label={t("profile.totalEarnings")}
        value={`${(earn?.totalEarnings ?? 0).toLocaleString("tr-TR")} ${CURRENCY}`}
        bold
      />
      <CompareOwnerRow
        label={t("profile.dailyEarnings")}
        value={`${(earn?.dailyEarnings ?? 0).toLocaleString("tr-TR")} ${CURRENCY}`}
      />
      <CompareOwnerRow label={t("profile.profitRate")} value={`${(earn?.changePercent ?? 0).toFixed(1)}%`} />
    </View>
  );
}

export default function StoreCompareScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const m = useCompareMetrics();
  const ht = compareHeaderTitleStyle(colors, m);
  const { data: stores = [] } = useGetMineStoresQuery();
  const [fetchEarnings] = useLazyGetBarberStoreEarningsQuery();

  const [leftId, setLeftId] = useState<string | null>(null);
  const [rightId, setRightId] = useState<string | null>(null);
  const [leftE, setLeftE] = useState<EarningsDto | null>(null);
  const [rightE, setRightE] = useState<EarningsDto | null>(null);
  const [loading, setLoading] = useState(false);

  const range = useMemo(() => {
    const endD = new Date();
    const startD = new Date();
    startD.setDate(startD.getDate() - 30);
    return { start: startD, end: endD };
  }, []);

  useEffect(() => {
    if (stores.length >= 2) {
      setLeftId((prev) => prev ?? stores[0].id);
      setRightId((prev) => {
        if (prev) return prev;
        return stores[1].id !== stores[0].id ? stores[1].id : stores[0].id;
      });
    }
  }, [stores]);

  useEffect(() => {
    if (!leftId || !rightId || leftId === rightId) return;
    setLoading(true);
    const start = toDateStr(range.start);
    const end = toDateStr(range.end);
    Promise.all([
      fetchEarnings({ storeId: leftId, startDate: start, endDate: end }).unwrap(),
      fetchEarnings({ storeId: rightId, startDate: start, endDate: end }).unwrap(),
    ])
      .then(([a, b]) => {
        setLeftE(a);
        setRightE(b);
      })
      .catch(() => {
        setLeftE(null);
        setRightE(null);
      })
      .finally(() => setLoading(false));
  }, [leftId, rightId, range.start, range.end, fetchEarnings]);

  const leftStore = stores.find((s) => s.id === leftId) as BarberStoreMineDto | undefined;
  const rightStore = stores.find((s) => s.id === rightId) as BarberStoreMineDto | undefined;

  const cycleStore = (currentId: string | null, otherId: string | null) => {
    if (!stores.length || !currentId) return currentId;
    const idx = stores.findIndex((s) => s.id === currentId);
    if (idx < 0) return currentId;
    for (let step = 1; step <= stores.length; step++) {
      const next = stores[(idx + step) % stores.length];
      if (next.id !== otherId) return next.id;
    }
    return currentId;
  };

  const HeaderRow = () => (
    <CompareHeaderChrome isDark={isDark}>
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={compareBackButtonSurface(isDark, m)}
        >
          <Icon source="chevron-left" size={m.backIcon} color={colors.sectionHeaderText} />
        </TouchableOpacity>
        <View style={{ marginLeft: m.titleMarginLeft, flex: 1 }}>
          <Text style={ht.title}>{t("profile.compareStores")}</Text>
          <Text style={ht.sub}>{t("profile.compareStoresSubtitle")}</Text>
        </View>
      </View>
    </CompareHeaderChrome>
  );

  if (stores.length < 2) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: screenBg(isDark) }} edges={["top"]}>
        <HeaderRow />
        <View style={{ flex: 1, justifyContent: "center", padding: m.emptyPad }}>
          <Text style={{ textAlign: "center", color: colors.textSecondary, fontSize: m.rowFont }}>
            {t("profile.compareStoresSubtitle")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg(isDark) }} edges={["top"]}>
      <HeaderRow />

      {loading ? (
        <View style={{ padding: m.loadingPad, alignItems: "center" }}>
          <ActivityIndicator color="#ffb900" />
        </View>
      ) : null}

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: m.scrollPadH,
          paddingBottom: m.scrollPadBottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", gap: m.gapRow, alignItems: "stretch" }}>
          <MineStoreCompareColumn
            isDark={isDark}
            colors={colors}
            m={m}
            store={leftStore}
            earn={leftE}
            onCycle={() => setLeftId(cycleStore(leftId, rightId))}
            t={t}
          />
          <VsBadge />
          <MineStoreCompareColumn
            isDark={isDark}
            colors={colors}
            m={m}
            store={rightStore}
            earn={rightE}
            onCycle={() => setRightId(cycleStore(rightId, leftId))}
            t={t}
          />
        </View>
        <Text
          style={{
            color: colors.textSecondary,
            fontSize: m.footerNoteFont,
            marginTop: m.footerNoteMt,
            textAlign: "center",
          }}
        >
          {t("profile.filterCustom")}: {range.start.toLocaleDateString("tr-TR")} – {range.end.toLocaleDateString("tr-TR")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
