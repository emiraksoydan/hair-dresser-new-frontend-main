import { Icon } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

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
import {
  CompareHeaderChrome,
  CMP_GOLD,
  compareBackButtonSurface,
  compareHeaderTitleStyle,
  screenBg,
  useCompareMetrics,
} from "./compareShared";

type Kind = "store" | "freebarber";

export default function PickPairCompareScreen() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const m = useCompareMetrics();
  const ht = compareHeaderTitleStyle(colors, m);
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
            <Text style={ht.title}>{t("compare.pickTitle")}</Text>
            <Text style={ht.sub}>{t("compare.pickSubtitle")}</Text>
          </View>
        </View>
      </CompareHeaderChrome>

      <View
        style={{
          flexDirection: "row",
          paddingHorizontal: m.scrollPadH,
          paddingTop: m.pickTopPad,
          gap: m.pickTabGap,
        }}
      >
        <TouchableOpacity
          onPress={() => {
            setKind("store");
            setSelected([]);
          }}
          disabled={storeItems.length < 2}
          style={{
            flex: 1,
            paddingVertical: m.pickTabPadV,
            borderRadius: m.pickTabRadius,
            alignItems: "center",
            backgroundColor:
              kind === "store"
                ? CMP_GOLD
                : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.85)",
            borderWidth: kind === "store" ? 0 : 1,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(203,213,225,0.6)",
            opacity: storeItems.length < 2 ? 0.45 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: "CenturyGothic-Bold",
              fontSize: m.rowFont + 1,
              color: kind === "store" ? "#1f2937" : colors.sectionHeaderText,
            }}
          >
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
            paddingVertical: m.pickTabPadV,
            borderRadius: m.pickTabRadius,
            alignItems: "center",
            backgroundColor:
              kind === "freebarber"
                ? CMP_GOLD
                : isDark
                  ? "rgba(255,255,255,0.06)"
                  : "rgba(255,255,255,0.85)",
            borderWidth: kind === "freebarber" ? 0 : 1,
            borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(203,213,225,0.6)",
            opacity: fbItems.length < 2 ? 0.45 : 1,
          }}
        >
          <Text
            style={{
              fontFamily: "CenturyGothic-Bold",
              fontSize: m.rowFont + 1,
              color: kind === "freebarber" ? "#1f2937" : colors.sectionHeaderText,
            }}
          >
            {t("compare.tabFreeBarbers")}
          </Text>
        </TouchableOpacity>
      </View>

      {list.length < 2 ? (
        <View style={{ padding: m.emptyPad }}>
          <Text style={{ color: colors.textSecondary, textAlign: "center" }}>{t("compare.needMoreFavorites")}</Text>
        </View>
      ) : (
        <FlatList
          data={list}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: m.scrollPadH,
            paddingBottom: m.listPadBottom,
          }}
          renderItem={({ item }) => {
            const id = kind === "store" ? item.store!.id : item.freeBarber!.id;
            const name = kind === "store" ? item.store!.storeName : item.freeBarber!.fullName;
            const on = selected.includes(id);
            const order = selected.indexOf(id);
            return (
              <TouchableOpacity
                onPress={() => toggle(id)}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  padding: m.pickItemPad,
                  marginBottom: m.pickItemMb,
                  borderRadius: m.pickItemRadius,
                  backgroundColor: isDark ? "rgba(255,255,255,0.055)" : "rgba(255,255,255,0.95)",
                  borderWidth: on ? 2 : 1,
                  borderColor: on ? CMP_GOLD : isDark ? "rgba(255,255,255,0.08)" : "rgba(203,213,225,0.55)",
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: isDark ? 0.2 : 0.06,
                  shadowRadius: 8,
                  elevation: isDark ? 0 : 3,
                }}
              >
                {on && order >= 0 ? (
                  <View
                    style={{
                      width: m.badgeSize,
                      height: m.badgeSize,
                      borderRadius: m.badgeSize / 2,
                      backgroundColor: CMP_GOLD,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text style={{ fontFamily: "CenturyGothic-Bold", fontSize: m.rowFont + 1, color: "#1f2937" }}>
                      {order + 1}
                    </Text>
                  </View>
                ) : (
                  <Icon source="circle-outline" size={m.backIcon - 2} color={colors.textSecondary} />
                )}
                <Text
                  style={{
                    marginLeft: m.titleMarginLeft,
                    color: colors.sectionHeaderText,
                    fontFamily: "CenturyGothic-Bold",
                    flex: 1,
                    fontSize: m.rowFont + 1,
                  }}
                  numberOfLines={2}
                >
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
            left: m.fabHorizontal,
            right: m.fabHorizontal,
            bottom: m.fabBottom,
            paddingVertical: m.fabPadV,
            borderRadius: m.fabRadius,
            backgroundColor: canCompare ? CMP_GOLD : isDark ? "rgba(255,255,255,0.08)" : "rgba(226,232,240,0.95)",
            alignItems: "center",
            borderWidth: canCompare ? 0 : 1,
            borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(203,213,225,0.8)",
            shadowColor: "#000",
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: canCompare ? 0.2 : 0,
            shadowRadius: 10,
            elevation: canCompare ? 6 : 0,
          }}
        >
          <TouchableOpacity
            disabled={!canCompare}
            onPress={goCompare}
            style={{
              width: "100%",
              alignItems: "center",
              flexDirection: "row",
              justifyContent: "center",
              gap: m.rowPadH,
            }}
          >
            <Icon
              source="compare-horizontal"
              size={m.backIcon - 4}
              color={canCompare ? "#1f2937" : colors.textSecondary}
            />
            <Text
              style={{
                fontFamily: "CenturyGothic-Bold",
                fontSize: m.rowFont + 1,
                color: canCompare ? "#1f2937" : colors.textSecondary,
              }}
            >
              {t("compare.continue")}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}
