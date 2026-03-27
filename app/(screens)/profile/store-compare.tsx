import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetMineStoresQuery, useLazyGetBarberStoreEarningsQuery } from "../../store/api";
import { BarberStoreMineDto, EarningsDto } from "../../types";

const CURRENCY = "₺";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

export default function StoreCompareScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
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

  if (stores.length < 2) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0f0f1a" : "#f1f5f9" }} edges={["top"]}>
        <View style={{ flexDirection: "row", alignItems: "center", padding: 16 }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{
              padding: 8,
              borderRadius: 12,
              backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
            }}
          >
            <Icon source="chevron-left" size={24} color={colors.sectionHeaderText} />
          </TouchableOpacity>
          <Text style={{ marginLeft: 12, fontFamily: "CenturyGothic-Bold", fontSize: 17, color: colors.sectionHeaderText }}>
            {t("profile.compareStores")}
          </Text>
        </View>
        <View style={{ flex: 1, justifyContent: "center", padding: 24 }}>
          <Text style={{ textAlign: "center", color: colors.textSecondary }}>{t("profile.compareStoresSubtitle")}</Text>
        </View>
      </SafeAreaView>
    );
  }

  const Col = ({
    store,
    earn,
    onCycle,
  }: {
    store?: BarberStoreMineDto;
    earn: EarningsDto | null;
    onCycle: () => void;
  }) => (
    <View
      style={{
        flex: 1,
        borderRadius: 16,
        padding: 12,
        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
        borderWidth: 1,
        borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
      }}
    >
      <TouchableOpacity onPress={onCycle} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <Text numberOfLines={2} style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 14, flex: 1 }}>
          {store?.storeName ?? "—"}
        </Text>
        <Icon source="swap-horizontal" size={20} color="#ffb900" />
      </TouchableOpacity>

      <Row label={t("profile.rating")} a={`${store?.rating?.toFixed(1) ?? "—"}`} />
      <Row label={t("profile.reviews")} a={String(store?.reviewCount ?? 0)} />
      <Row label={t("profile.favorites")} a={String(store?.favoriteCount ?? 0)} />
      <View style={{ height: 1, backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)", marginVertical: 10 }} />
      <Text style={{ color: colors.textSecondary, fontSize: 11, marginBottom: 6 }}>
        {t("profile.storeEarningsTitle")} · {t("profile.periodLast30Days")}
      </Text>
      <Row
        label={t("profile.totalEarnings")}
        a={`${(earn?.totalEarnings ?? 0).toLocaleString("tr-TR")} ${CURRENCY}`}
        bold
      />
      <Row label={t("profile.dailyEarnings")} a={`${(earn?.dailyEarnings ?? 0).toLocaleString("tr-TR")} ${CURRENCY}`} />
      <Row label={t("profile.profitRate")} a={`${(earn?.changePercent ?? 0).toFixed(1)}%`} />
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: isDark ? "#0f0f1a" : "#f1f5f9" }} edges={["top"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
          borderBottomWidth: 1,
          borderBottomColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.07)",
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={{
            padding: 8,
            borderRadius: 12,
            backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          }}
        >
          <Icon source="chevron-left" size={24} color={colors.sectionHeaderText} />
        </TouchableOpacity>
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 17, color: colors.sectionHeaderText }}>{t("profile.compareStores")}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{t("profile.compareStoresSubtitle")}</Text>
        </View>
      </View>

      {loading ? (
        <View style={{ padding: 24 }}>
          <ActivityIndicator color="#ffb900" />
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch" }}>
          <Col
            store={leftStore}
            earn={leftE}
            onCycle={() => setLeftId(cycleStore(leftId, rightId))}
          />
          <Col
            store={rightStore}
            earn={rightE}
            onCycle={() => setRightId(cycleStore(rightId, leftId))}
          />
        </View>
        <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 14, textAlign: "center" }}>
          {t("profile.filterCustom")}: {range.start.toLocaleDateString("tr-TR")} – {range.end.toLocaleDateString("tr-TR")}
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({ label, a, bold }: { label: string; a: string; bold?: boolean }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.sectionHeaderText, fontSize: 12, fontFamily: bold ? "CenturyGothic-Bold" : "CenturyGothic" }}>{a}</Text>
    </View>
  );
}
