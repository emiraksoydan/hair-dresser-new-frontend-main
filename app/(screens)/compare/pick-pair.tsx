import { Icon } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, StatusBar, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MotiView } from "moti";

import { useLocalSearchParams } from "expo-router";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { api, useGetMeQuery, useGetMyFavoritesQuery } from "../../store/api";
import { useAppDispatch } from "../../store/hook";
import { FavoriteTargetType } from "../../types";
import {
  isOtherUsersFreeBarber,
  isOtherUsersStore,
  shouldFilterOwnFreeBarberFromCompare,
  shouldFilterStoresToOthersOnly,
  shouldShowFreeBarberCompareTab,
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

  // Pick-pair tüm favorileri karşılaştırabilmek için tam listeyi ister.
  // `getMyFavorites` paginated cache (serializeQueryArgs:{}) kullanıyor → mount'ta tam
  // liste için cursor'suz ve limit'siz çağrıyı forceRefetch ile tetikliyoruz;
  // merge `before` olmadığında cache'i replace eder.
  const dispatch = useAppDispatch();
  const { data: favorites = [] } = useGetMyFavoritesQuery();
  useEffect(() => {
    // subscribe:false — primary subscriber zaten `useGetMyFavoritesQuery()`. Burası
    // sadece mount'ta refetch tetikleyici; subscribe:true bırakırsak aynı slot'a
    // ikinci anonim subscriber yaratır, screen unmount'ta da unsubscribe etmez.
    dispatch(
      api.endpoints.getMyFavorites.initiate(undefined, {
        subscribe: false,
        forceRefetch: true,
      }),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { data: me } = useGetMeQuery();
  const userType = me?.data?.userType;
  const uid = me?.data?.id;
  const showFreeBarberTab = shouldShowFreeBarberCompareTab(userType);

  const [kind, setKind] = useState<Kind>("store");
  const [selected, setSelected] = useState<string[]>([]);
  const pickNavRef = useRef(false);

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
    if (!showFreeBarberTab) {
      setKind("store");
      return;
    }
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
  }, [kindParam, storeItems.length, fbItems.length, showFreeBarberTab]);

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

  useEffect(() => {
    if (list.length < 2) {
      pickNavRef.current = false;
      return;
    }
    if (selected.length !== 2) {
      pickNavRef.current = false;
      return;
    }
    if (pickNavRef.current) return;
    pickNavRef.current = true;
    const [a, b] = selected;
    setSelected([]);
    if (kind === "store") {
      router.push({ pathname: "/(screens)/compare/public-stores", params: { left: a, right: b } });
    } else {
      router.push({ pathname: "/(screens)/compare/public-freebarbers", params: { left: a, right: b } });
    }
  }, [selected, kind, list.length, router]);

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
            <Text style={ht.title}>{t("compare.pickTitle")}</Text>
            <Text style={ht.sub}>{t("compare.pickSubtitle")}</Text>
          </View>
        </View>
      </CompareHeaderChrome>

      {showFreeBarberTab ? (
        <View
          style={{
            flexDirection: "row",
            paddingHorizontal: m.scrollPadH,
            paddingTop: m.pickTopPad,
            gap: m.pickTabGap,
          }}
        >
          <MotiView
            from={{ scale: 0.98, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, mass: 0.6 }}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              onPress={() => {
                setKind("store");
                setSelected([]);
              }}
              disabled={storeItems.length < 2}
              style={{
                paddingVertical: m.pickTabPadV,
                borderRadius: m.pickTabRadius,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
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
              <Icon source="storefront-outline" size={m.backIcon - 2} color={kind === "store" ? "#1f2937" : colors.textSecondary} />
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
          </MotiView>
          <MotiView
            from={{ scale: 0.98, opacity: 0.9 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15, mass: 0.6 }}
            style={{ flex: 1 }}
          >
            <TouchableOpacity
              onPress={() => {
                setKind("freebarber");
                setSelected([]);
              }}
              disabled={fbItems.length < 2}
              style={{
                paddingVertical: m.pickTabPadV,
                borderRadius: m.pickTabRadius,
                alignItems: "center",
                flexDirection: "row",
                justifyContent: "center",
                gap: 8,
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
              <Icon source="content-cut" size={m.backIcon - 2} color={kind === "freebarber" ? "#1f2937" : colors.textSecondary} />
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
          </MotiView>
        </View>
      ) : (
        <View style={{ paddingTop: m.pickTopPad }} />
      )}

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
            // Üst başlık + tab bar ile listenin ilk item'ı arasında nefes payı
            // (kullanıcı isteği: hem dükkan hem freebarber tablarında listeye yukarıdan margin ver).
            paddingTop: 24,
            paddingBottom: m.listPadBottom,
          }}
          renderItem={({ item, index: rowIndex }) => {
            const id = kind === "store" ? item.store!.id : item.freeBarber!.id;
            const name = kind === "store" ? item.store!.storeName : item.freeBarber!.fullName;
            const on = selected.includes(id);
            const order = selected.indexOf(id);
            return (
              <MotiView
                from={{ translateY: 6, opacity: 0 }}
                animate={{ translateY: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 18, delay: 28 * rowIndex }}
              >
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
                    <MotiView
                      from={{ scale: 0.4 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", damping: 14 }}
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
                    </MotiView>
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
                  {kind === "store" ? (
                    <Icon source="storefront" size={m.backIcon - 4} color={on ? CMP_GOLD : colors.textSecondary} />
                  ) : (
                    <Icon source="account" size={m.backIcon - 4} color={on ? CMP_GOLD : colors.textSecondary} />
                  )}
                </TouchableOpacity>
              </MotiView>
            );
          }}
        />
      )}
    </SafeAreaView>
    </View>
  );
}
