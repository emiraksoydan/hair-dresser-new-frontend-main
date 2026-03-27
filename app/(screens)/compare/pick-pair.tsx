import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Icon } from "react-native-paper";
import { useLocalSearchParams } from "expo-router";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useGetMeQuery, useGetMyFavoritesQuery } from "../../store/api";
import { FavoriteTargetType } from "../../types";
import {
  isOtherUsersFreeBarber,
  isOtherUsersStore,
  shouldFilterOwnFreeBarberFromCompare,
  shouldFilterStoresToOthersOnly,
} from "../../utils/compare-eligibility";

type Kind = "store" | "freebarber";

export default function PickPairCompareScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const { kind: kindParam } = useLocalSearchParams<{ kind?: Kind }>();

  const { data: favorites = [] } = useGetMyFavoritesQuery();
  const { data: me } = useGetMeQuery();
  const userType = me?.data?.userType;
  const uid = me?.data?.id;

  const [kind, setKind] = useState<Kind>("store");
  const [selected, setSelected] = useState<string[]>([]);

  const storeItems = useMemo(() => {
    const raw = favorites.filter((f) => f.targetType === FavoriteTargetType.Store && f.store);
    if (!shouldFilterStoresToOthersOnly(userType)) return raw;
    return raw.filter((f) => isOtherUsersStore(f.store!, uid));
  }, [favorites, userType, uid]);

  const fbItems = useMemo(() => {
    const raw = favorites.filter((f) => f.targetType === FavoriteTargetType.FreeBarber && f.freeBarber);
    if (!shouldFilterOwnFreeBarberFromCompare(userType)) return raw;
    return raw.filter((f) => isOtherUsersFreeBarber(f.freeBarber!, uid));
  }, [favorites, userType, uid]);

  useEffect(() => {
    if (kindParam === "freebarber") {
      setKind("freebarber");
      return;
    }
    if (kindParam === "store") {
      setKind("store");
      return;
    }
    if (storeItems.length >= 2 && fbItems.length < 2) setKind("store");
    else if (fbItems.length >= 2 && storeItems.length < 2) setKind("freebarber");
  }, [kindParam, storeItems.length, fbItems.length]);

  useEffect(() => {
    setSelected([]);
  }, [kind]);

  const list = kind === "store" ? storeItems : fbItems;

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length < 2) return [...prev, id];
      return [prev[1], id];
    });
  }, []);

  const goCompare = useCallback(() => {
    if (selected.length !== 2) return;
    const [a, b] = selected;
    if (kind === "store") {
      router.push({
        pathname: "/(screens)/compare/public-stores",
        params: { left: a, right: b },
      });
    } else {
      router.push({
        pathname: "/(screens)/compare/public-freebarbers",
        params: { left: a, right: b },
      });
    }
  }, [selected, kind, router]);

  const canCompare = selected.length === 2 && list.length >= 2;

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
          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 17, color: colors.sectionHeaderText }}>{t("compare.pickTitle")}</Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>{t("compare.pickSubtitle")}</Text>
        </View>
      </View>

      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
        <TouchableOpacity
          onPress={() => {
            setKind("store");
            setSelected([]);
          }}
          disabled={storeItems.length < 2}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: kind === "store" ? "#ffb900" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            opacity: storeItems.length < 2 ? 0.45 : 1,
          }}
        >
          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 13, color: kind === "store" ? "#1f2937" : colors.sectionHeaderText }}>
            {t("compare.tabStores")}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setKind("freebarber");
            setSelected([]);
          }}
          disabled={fbItems.length < 2}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 12,
            alignItems: "center",
            backgroundColor: kind === "freebarber" ? "#ffb900" : isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)",
            opacity: fbItems.length < 2 ? 0.45 : 1,
          }}
        >
          <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: 13, color: kind === "freebarber" ? "#1f2937" : colors.sectionHeaderText }}>
            {t("compare.tabFreeBarbers")}
          </Text>
        </TouchableOpacity>
      </View>

      {list.length < 2 ? (
        <View style={{ padding: 24 }}>
          <Text style={{ color: colors.textSecondary, textAlign: "center" }}>{t("compare.needMoreFavorites")}</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
          renderItem={({ item }) => {
            const id = kind === "store" ? item.store!.id : item.freeBarber!.id;
            const name = kind === "store" ? item.store!.storeName : item.freeBarber!.fullName;
            const on = selected.includes(id);
            return (
              <TouchableOpacity
                onPress={() => toggle(id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: 14,
                  marginBottom: 10,
                  borderRadius: 14,
                  backgroundColor: isDark ? "#1a1a2e" : "#ffffff",
                  borderWidth: 2,
                  borderColor: on ? "#ffb900" : isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                }}
              >
                <Icon source={on ? "check-circle" : "circle-outline"} size={22} color={on ? "#ffb900" : colors.textSecondary} />
                <Text style={{ marginLeft: 12, color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", flex: 1 }} numberOfLines={2}>
                  {name}
                </Text>
              </TouchableOpacity>
            );
          }}
        />
      )}

      {list.length >= 2 && (
        <View
          style={{
            position: "absolute",
            left: 16,
            right: 16,
            bottom: 24,
            paddingVertical: 14,
            borderRadius: 16,
            backgroundColor: canCompare ? "#ffb900" : isDark ? "#333" : "#d1d5db",
            alignItems: "center",
          }}
        >
          <TouchableOpacity disabled={!canCompare} onPress={goCompare} style={{ width: "100%", alignItems: "center" }}>
            <Text style={{ fontFamily: "CenturyGothic-Bold", color: canCompare ? "#1f2937" : "#6b7280" }}>{t("compare.continue")}</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
