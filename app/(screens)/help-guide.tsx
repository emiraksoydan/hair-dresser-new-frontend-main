import React, { useMemo, useState } from "react";
import { View, ScrollView, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { Text } from "../components/common/Text";
import SearchBar from "../components/common/searchbar";
import { useLanguage } from "../hook/useLanguage";
import { useTheme } from "../hook/useTheme";
import { useSafeNavigation } from "../hook/useSafeNavigation";
import { useAuth } from "../hook/useAuth";
import { useGetHelpGuideByUserTypeQuery } from "../store/api";
import type { HelpGuideGetDto } from "../types/auth";

function resolveHelpGuideStrings(item: HelpGuideGetDto, t: (key: string, opts?: { defaultValue?: string }) => string, lang: string) {
  const key = item.translationKey?.trim();
  const useEntries = lang !== "tr" && !!key;
  const title = useEntries
    ? t(`helpGuide.entries.${key}.title`, { defaultValue: item.title })
    : item.title;
  const description = useEntries
    ? t(`helpGuide.entries.${key}.description`, { defaultValue: item.description ?? "" })
    : item.description ?? "";
  return { title, description };
}

export default function HelpGuideScreen() {
  const { t, currentLanguage } = useLanguage();
  const { colors } = useTheme();
  const router = useSafeNavigation();
  const { userType, isAuthenticated } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: helpGuideResponse, isLoading } = useGetHelpGuideByUserTypeQuery(
    userType ?? 0,
    { skip: !isAuthenticated || userType === null },
  );

  const items = useMemo(() => {
    if (helpGuideResponse?.success && helpGuideResponse.data?.length) {
      return [...helpGuideResponse.data].sort((a, b) => a.order - b.order);
    }
    return [];
  }, [helpGuideResponse]);

  const displayRows = useMemo(() => {
    return items.map((item) => {
      const { title, description } = resolveHelpGuideStrings(item, t, currentLanguage);
      return { item, title, description };
    });
  }, [items, t, currentLanguage]);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return displayRows;
    const q = searchQuery.toLowerCase();
    return displayRows.filter(
      (row) =>
        row.title.toLowerCase().includes(q) || row.description.toLowerCase().includes(q),
    );
  }, [displayRows, searchQuery]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.screenBg }} edges={["top", "left", "right"]}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 16,
          paddingVertical: 12,
          borderBottomWidth: 1,
          borderBottomColor: colors.borderColor,
          backgroundColor: colors.cardBg,
        }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          activeOpacity={0.7}
          style={{
            width: 36,
            height: 36,
            borderRadius: 18,
            backgroundColor: colors.screenBg,
            alignItems: "center",
            justifyContent: "center",
            marginRight: 12,
          }}
        >
          <Icon source="arrow-left" size={22} color={colors.sectionHeaderText} />
        </TouchableOpacity>
        <Text
          style={{
            color: colors.sectionHeaderText,
            fontSize: 18,
            fontFamily: "CenturyGothic-Bold",
            flex: 1,
          }}
        >
          {t("helpGuide.screenTitle")}
        </Text>
      </View>

      <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <SearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} showButtons={false} />
      </View>

      {isLoading ? (
        <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          showsVerticalScrollIndicator={false}
        >
          {filteredRows.length === 0 ? (
            <View style={{ paddingVertical: 32, alignItems: "center" }}>
              <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
                {t("common.noSearchResults")}
              </Text>
            </View>
          ) : (
            filteredRows.map(({ item, title, description }) => (
              <View key={item.id} style={{ marginBottom: 20 }}>
                <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 8 }}>
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: "#f05e23",
                      marginRight: 10,
                    }}
                  />
                  <Text
                    style={{
                      color: colors.sectionHeaderText,
                      fontSize: 16,
                      fontFamily: "CenturyGothic-Bold",
                      flex: 1,
                    }}
                  >
                    {title}
                  </Text>
                </View>
                {description ? (
                  <Text
                    style={{
                      color: colors.textSecondary,
                      fontSize: 14,
                      lineHeight: 22,
                      marginLeft: 18,
                      fontFamily: "CenturyGothic",
                    }}
                  >
                    {description}
                  </Text>
                ) : null}
              </View>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
