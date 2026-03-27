import React from "react";
import { ActivityIndicator, ScrollView, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetFreeBarberForUsersQuery } from "../../store/api";
import { FreeBarberPanelDto } from "../../types";
import { getBarberTypeLabel } from "../../utils/card-helpers";

function Col({
  fb,
  loading,
}: {
  fb?: FreeBarberPanelDto;
  loading: boolean;
}) {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();

  if (loading) {
    return (
      <View style={{ flex: 1, padding: 16, alignItems: "center" }}>
        <ActivityIndicator color="#ffb900" />
      </View>
    );
  }

  if (!fb) {
    return (
      <View style={{ flex: 1, padding: 12 }}>
        <Text style={{ color: colors.textSecondary }}>—</Text>
      </View>
    );
  }

  return (
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
      <Text numberOfLines={2} style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 14, marginBottom: 8 }}>
        {fb.fullName}
      </Text>
      <Row label={t("compare.type")} value={getBarberTypeLabel(fb.type)} />
      <Row label={t("profile.rating")} value={fb.rating?.toFixed(1) ?? "—"} />
      <Row label={t("profile.reviews")} value={String(fb.reviewCount ?? 0)} />
      <Row label={t("profile.favorites")} value={String(fb.favoriteCount ?? 0)} />
      <Row label={t("compare.serviceCount")} value={String(fb.offerings?.length ?? 0)} />
      <Row label={t("compare.availability")} value={fb.isAvailable ? t("status.available") : t("status.busy")} />
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.sectionHeaderText, fontSize: 12, flex: 1, textAlign: "right", marginLeft: 8 }} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

export default function PublicFreeBarbersCompareScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const { left, right } = useLocalSearchParams<{ left?: string; right?: string }>();

  const qLeft = useGetFreeBarberForUsersQuery(left ?? "", { skip: !left });
  const qRight = useGetFreeBarberForUsersQuery(right ?? "", { skip: !right });

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
          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 17, color: colors.sectionHeaderText }}>{t("compare.publicFreeBarbersTitle")}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{t("compare.publicSubtitle")}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        <View style={{ flexDirection: "row", gap: 10, alignItems: "stretch" }}>
          <Col fb={qLeft.data} loading={qLeft.isFetching && !qLeft.data} />
          <Col fb={qRight.data} loading={qRight.isFetching && !qRight.data} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
