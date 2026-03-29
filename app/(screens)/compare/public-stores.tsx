import { Icon } from "react-native-paper";
import React from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocalSearchParams } from "expo-router";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetStoreForUsersQuery } from "../../store/api";
import { BarberStoreMineDto } from "../../types";
import { getBarberTypeLabel } from "../../utils/card-helpers";
import {
  CompareGoldAccentBar,
  CompareHeaderChrome,
  CompareMetricRow,
  VsBadge,
  compareBackButtonSurface,
  compareHeaderTitleStyle,
  screenBg,
  useCompareCardShell,
  useCompareMetrics,
} from "./compareShared";

function Col({
  store,
  loading,
}: {
  store?: BarberStoreMineDto;
  loading: boolean;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const m = useCompareMetrics();
  const cardStyle = useCompareCardShell(isDark);

  if (loading) {
    return (
      <View style={{ flex: 1, padding: m.loadingPad, alignItems: "center" }}>
        <ActivityIndicator color="#ffb900" />
      </View>
    );
  }

  if (!store) {
    return (
      <View style={{ flex: 1, padding: m.cardPad }}>
        <Text style={{ color: colors.textSecondary }}>—</Text>
      </View>
    );
  }

  const pricing =
    store.pricingType != null && store.pricingValue != null
      ? `${String(store.pricingType)} · ${String(store.pricingValue)}`
      : "—";

  return (
    <View style={cardStyle}>
      <CompareGoldAccentBar />
      <Text
        numberOfLines={2}
        style={{
          color: colors.sectionHeaderText,
          fontFamily: "CenturyGothic-Bold",
          fontSize: m.titleNameFont,
          marginBottom: m.titleNameMb,
        }}
      >
        {store.storeName}
      </Text>
      <CompareMetricRow label={t("compare.type")} value={getBarberTypeLabel(store.type)} />
      <CompareMetricRow label={t("profile.rating")} value={store.rating?.toFixed(1) ?? "—"} />
      <CompareMetricRow label={t("profile.reviews")} value={String(store.reviewCount ?? 0)} />
      <CompareMetricRow label={t("profile.favorites")} value={String(store.favoriteCount ?? 0)} />
      <CompareMetricRow label={t("compare.serviceCount")} value={String(store.serviceOfferings?.length ?? 0)} />
      <CompareMetricRow label={t("compare.openStatus")} value={store.isOpenNow ? t("status.open") : t("status.closed")} />
      <CompareMetricRow label={t("compare.pricing")} value={pricing} />
      {!!store.addressDescription && (
        <Text
          numberOfLines={3}
          style={{ color: colors.textSecondary, fontSize: m.addressFont, marginTop: m.addressMt }}
        >
          {store.addressDescription}
        </Text>
      )}
    </View>
  );
}

export default function PublicStoresCompareScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const m = useCompareMetrics();
  const { left, right } = useLocalSearchParams<{ left?: string; right?: string }>();
  const ht = compareHeaderTitleStyle(colors, m);

  const qLeft = useGetStoreForUsersQuery(left ?? "", { skip: !left });
  const qRight = useGetStoreForUsersQuery(right ?? "", { skip: !right });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: screenBg(isDark) }} edges={["top"]}>
      <CompareHeaderChrome isDark={isDark}>
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={compareBackButtonSurface(isDark, m)}
          >
            <Icon source="chevron-left" size={m.backIcon} color={colors.sectionHeaderText} />
          </TouchableOpacity>
          <View style={{ marginLeft: m.titleMarginLeft, flex: 1 }}>
            <Text style={ht.title}>{t("compare.publicStoresTitle")}</Text>
            <Text style={ht.sub}>{t("compare.publicSubtitle")}</Text>
          </View>
        </View>
      </CompareHeaderChrome>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: m.scrollPadH,
          paddingBottom: m.scrollPadBottom,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ flexDirection: "row", gap: m.gapRow, alignItems: "stretch" }}>
          <Col store={qLeft.data} loading={qLeft.isFetching && !qLeft.data} />
          <VsBadge />
          <Col store={qRight.data} loading={qRight.isFetching && !qRight.data} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
