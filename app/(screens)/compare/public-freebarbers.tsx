import { Icon } from "react-native-paper";
import React from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useLocalSearchParams } from "expo-router";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetFreeBarberForUsersQuery } from "../../store/api";
import { FreeBarberPanelDto } from "../../types";
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
  fb,
  loading,
}: {
  fb?: FreeBarberPanelDto;
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

  if (!fb) {
    return (
      <View style={{ flex: 1, padding: m.cardPad }}>
        <Text style={{ color: colors.textSecondary }}>—</Text>
      </View>
    );
  }

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
        {fb.fullName}
      </Text>
      <CompareMetricRow label={t("compare.type")} value={getBarberTypeLabel(fb.type)} />
      <CompareMetricRow label={t("profile.rating")} value={fb.rating?.toFixed(1) ?? "—"} />
      <CompareMetricRow label={t("profile.reviews")} value={String(fb.reviewCount ?? 0)} />
      <CompareMetricRow label={t("profile.favorites")} value={String(fb.favoriteCount ?? 0)} />
      <CompareMetricRow label={t("compare.serviceCount")} value={String(fb.offerings?.length ?? 0)} />
      <CompareMetricRow
        label={t("compare.availability")}
        value={fb.isAvailable ? t("status.available") : t("status.busy")}
      />
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
            <Text style={ht.title}>{t("compare.publicFreeBarbersTitle")}</Text>
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
          <Col fb={qLeft.data} loading={qLeft.isFetching && !qLeft.data} />
          <VsBadge />
          <Col fb={qRight.data} loading={qRight.isFetching && !qRight.data} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
