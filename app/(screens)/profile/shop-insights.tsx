import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Switch,
  TouchableOpacity,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Extrapolation,
  interpolate,
  type AnimatedStyle,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import DateTimePicker from "@react-native-community/datetimepicker";
import { BottomSheetModal, BottomSheetScrollView } from "@gorhom/bottom-sheet";
import { Icon } from "react-native-paper";
import { MultiSelect } from "react-native-element-dropdown";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { useLanguage } from "../../hook/useLanguage";
import { useSafeNavigation } from "../../hook/useSafeNavigation";
import { useBottomSheet } from "../../hook/useBottomSheet";
import {
  shareEarningsCsv,
  shareEarningsPdf,
  type EarningsExportPayload,
} from "../../utils/export/earnings-export";
import {
  useGetMeQuery,
  useGetMineStoresQuery,
  useGetSettingQuery,
  useLazyGetBarberStoreEarningsQuery,
  useGetFreeBarberEarningsQuery,
} from "../../store/api";
import { EarningsDto, UserType } from "../../types";
import { mergeEarnings } from "../../utils/earnings/merge-earnings";
import LottieView from "lottie-react-native";
import { AnimatedMoneyText } from "../../components/common/AnimatedMoneyText";
import { getEarningsTheme, getPiePalette } from "./earningsTheme";
import { buildGiftedChartStyle, getEarningsChartViewportWidth } from "./earningsChartConfig";
import { aggregateBreakdown } from "./earningsAggregate";
import {
  EarningsLineBarChart,
  EarningsChartShell,
  EarningsChartTypeTabs,
  EarningsPeriodStrip,
  EarningsPieBlock,
  EarningsBreakdownList,
  type ChartType,
  type PieSlice,
} from "./earningsChartUi";
import { getEarningsChartSwitchProps } from "../../constants/colors";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CURRENCY = "₺";

const EARNINGS_CARD_HEIGHT = 182;
const EARNINGS_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.68);
const EARNINGS_CARD_GAP = 14;
const EARNINGS_SNAP_INTERVAL = EARNINGS_CARD_WIDTH + EARNINGS_CARD_GAP;
const EARNINGS_SIDE_PAD = (SCREEN_WIDTH - EARNINGS_CARD_WIDTH) / 2;
const EARNINGS_CAROUSEL_HEIGHT = EARNINGS_CARD_HEIGHT + 14;

type ShopInsightsEarningsCardModel = {
  label: string;
  value: number;
  valueOverride?: string;
  subText?: string;
  icon: string;
  accentColor: string;
  lottieSource?: number;
  animateNumbers?: boolean;
};

const LOTTIE_EARNINGS_COIN = require("../../../assets/animations/coin.json");
const LOTTIE_EARNINGS_TREASURE = require("../../../assets/animations/treasurercoin.json");
const LOTTIE_EARNINGS_GROWTH = require("../../../assets/animations/profitgrowth.json");

type DateFilterType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}
const ALL_TIME_START = "2000-01-01";

function computeRange(filter: DateFilterType, customStart: Date, customEnd: Date): [Date, Date] {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === "daily") {
    return [startOfToday, now];
  }
  if (filter === "weekly") {
    const s = new Date(now);
    s.setDate(now.getDate() - 6);
    return [s, now];
  }
  if (filter === "monthly") {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    return [s, now];
  }
  if (filter === "yearly") {
    const s = new Date(now);
    s.setFullYear(now.getFullYear() - 1);
    return [s, now];
  }
  return [customStart, customEnd];
}

const EarningsCard = ({
  label,
  value,
  valueOverride,
  subText,
  icon,
  accentColor,
  isDark,
  showLottie,
  lottieSource,
  animateNumbers,
  valueSuffix,
  detailAnimatedStyle,
}: {
  label: string;
  value: number;
  valueOverride?: string;
  subText?: string;
  icon: string;
  accentColor: string;
  isDark: boolean;
  showLottie?: boolean;
  lottieSource?: number;
  animateNumbers?: boolean;
  valueSuffix?: string;
  detailAnimatedStyle?: AnimatedStyle<ViewStyle>;
}) => {
  const cardBg = isDark ? "rgba(30,41,59,0.97)" : `${accentColor}22`;
  const accentBg = `${accentColor}28`;
  const suffix = valueSuffix ?? CURRENCY;
  const subTextStyle = {
    color: isDark ? "rgba(255,255,255,0.45)" : "rgba(30,41,59,0.45)",
    fontSize: 10,
    marginTop: 5,
    fontFamily: "CenturyGothic",
  } as const;

  return (
    <View
      style={{
        flex: 1,
        minWidth: 0,
        borderRadius: 22,
        paddingVertical: 18,
        paddingHorizontal: 18,
        backgroundColor: cardBg,
        borderWidth: 1,
        borderColor: `${accentColor}40`,
        overflow: "hidden",
      }}
    >
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 3,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: accentColor,
          opacity: 0.7,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: showLottie && lottieSource != null ? 6 : 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 12, gap: 10 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                backgroundColor: accentBg,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon source={icon} size={22} color={accentColor} />
            </View>
            <Text
              style={{
                color: isDark ? "rgba(255,255,255,0.82)" : "rgba(30,41,59,0.82)",
                fontFamily: "CenturyGothic-Bold",
                fontSize: 13,
                flex: 1,
                lineHeight: 18,
              }}
              numberOfLines={2}
            >
              {label}
            </Text>
          </View>
          {valueOverride != null ? (
            <Text
              style={{ color: accentColor, fontFamily: "CenturyGothic-Bold", fontSize: 26 }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
            >
              {valueOverride}
            </Text>
          ) : animateNumbers ? (
            <AnimatedMoneyText
              value={value}
              suffix={suffix}
              style={{ color: accentColor, fontFamily: "CenturyGothic-Bold", fontSize: 26 }}
              enabled={animateNumbers}
            />
          ) : (
            <Text
              style={{ color: accentColor, fontFamily: "CenturyGothic-Bold", fontSize: 26 }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {value.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })} {suffix}
            </Text>
          )}
          {!!subText &&
            (detailAnimatedStyle ? (
              <Animated.View style={detailAnimatedStyle}>
                <Text style={subTextStyle} numberOfLines={2}>
                  {subText}
                </Text>
              </Animated.View>
            ) : (
              <Text style={subTextStyle} numberOfLines={2}>
                {subText}
              </Text>
            ))}
        </View>
        {showLottie && lottieSource != null ? (
          detailAnimatedStyle ? (
            <Animated.View style={detailAnimatedStyle}>
              <LottieView
                source={lottieSource as any}
                autoPlay
                loop
                style={{ width: 62, height: 62, flexShrink: 0, marginLeft: 4 }}
              />
            </Animated.View>
          ) : (
            <LottieView
              source={lottieSource as any}
              autoPlay
              loop
              style={{ width: 48, height: 48, flexShrink: 0, marginLeft: 4 }}
            />
          )
        ) : null}
      </View>
    </View>
  );
};

function EarningsCarouselItem({
  item,
  index,
  scrollX,
  isDark,
  showLottie,
}: {
  item: ShopInsightsEarningsCardModel;
  index: number;
  scrollX: SharedValue<number>;
  isDark: boolean;
  showLottie: boolean;
}) {
  const s = EARNINGS_SNAP_INTERVAL;
  const animStyle = useAnimatedStyle(() => {
    const x = scrollX.value;
    return {
      opacity: interpolate(x, [(index - 1) * s, index * s, (index + 1) * s], [0.45, 1, 0.45], Extrapolation.CLAMP),
      transform: [
        {
          scale: interpolate(x, [(index - 1) * s, index * s, (index + 1) * s], [0.86, 1, 0.86], Extrapolation.CLAMP),
        },
      ],
    };
  }, [index, s]);

  return (
    <View style={{ width: EARNINGS_CARD_WIDTH, height: EARNINGS_CAROUSEL_HEIGHT, justifyContent: "center" }}>
      <Animated.View style={[{ width: EARNINGS_CARD_WIDTH, height: EARNINGS_CARD_HEIGHT }, animStyle]}>
        <EarningsCard
          label={item.label}
          value={item.value}
          valueOverride={item.valueOverride}
          subText={item.subText}
          icon={item.icon}
          accentColor={item.accentColor}
          isDark={isDark}
          showLottie={showLottie}
          lottieSource={item.lottieSource}
          animateNumbers={item.animateNumbers}
        />
      </Animated.View>
    </View>
  );
}

function ShopInsightsEarningsCarousel({
  cards,
  isDark,
  showLottie,
}: {
  cards: ShopInsightsEarningsCardModel[];
  isDark: boolean;
  showLottie: boolean;
}) {
  const scrollX = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollX.value = e.contentOffset.x;
    },
  });

  return (
    <View style={{ overflow: "visible" }}>
      <Animated.FlatList
        data={cards}
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => `earning-${i}`}
        snapToInterval={EARNINGS_SNAP_INTERVAL}
        snapToAlignment="start"
        decelerationRate="fast"
        disableIntervalMomentum
        scrollEventThrottle={16}
        onScroll={onScroll}
        ListHeaderComponent={<View style={{ width: EARNINGS_SIDE_PAD }} />}
        ListFooterComponent={<View style={{ width: EARNINGS_SIDE_PAD }} />}
        ItemSeparatorComponent={() => <View style={{ width: EARNINGS_CARD_GAP }} />}
        contentContainerStyle={{ paddingVertical: 4 }}
        style={{ height: EARNINGS_CAROUSEL_HEIGHT }}
        renderItem={({ item, index }) => (
          <EarningsCarouselItem item={item} index={index} scrollX={scrollX} isDark={isDark} showLottie={showLottie} />
        )}
      />
    </View>
  );
}

const FilterChip = ({
  label,
  active,
  onPress,
  colors,
  activeColor,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
  activeColor: string;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: active ? activeColor : colors.cardBg3,
      borderWidth: 1,
      borderColor: active ? activeColor : colors.borderColor2,
      marginRight: 6,
    }}
  >
    <Text
      style={{
        color: active ? "#ffffff" : colors.sectionHeaderText,
        fontFamily: "CenturyGothic-Bold",
        fontSize: 12,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

export default function ShopInsightsPage() {
  const { colors, isDark } = useTheme();
  const { t } = useLanguage();
  const router = useSafeNavigation();
  const { data: settingData } = useGetSettingQuery();
  const showImageAnimationSetting = settingData?.data?.showImageAnimation ?? true;
  const showPriceAnimationSetting = settingData?.data?.showPriceAnimation ?? true;

  const { data: meData } = useGetMeQuery();
  const userType = meData?.data?.userType;
  const isBarberStore = userType === UserType.BarberStore;
  const isFreeBarber = userType === UserType.FreeBarber;

  const variant = isBarberStore ? "store" : "freeBarber";
  const earningsTheme = useMemo(() => getEarningsTheme(variant, isDark), [variant, isDark]);
  const chartStyle = useMemo(() => buildGiftedChartStyle(earningsTheme, isDark), [earningsTheme, isDark]);
  const viewportWidth = useMemo(() => getEarningsChartViewportWidth(SCREEN_WIDTH), []);

  // = [] kullanmıyoruz: her render'da yeni [] referansı üretir ve
  // aşağıdaki useEffect sonsuz döngüye girer.
  const { data: myStoresRaw } = useGetMineStoresQuery(undefined, {
    skip: !isBarberStore,
  });
  const stores = useMemo(
    () => (myStoresRaw ?? []).map((s: any) => ({ id: s.id, name: s.storeName || t("labels.storeDefaultName") })),
    [myStoresRaw, t]
  );
  const storeSelectOptions = useMemo(
    () => stores.map((s) => ({ label: s.name, value: s.id })),
    [stores]
  );

  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  useEffect(() => {
    if (!stores.length) {
      setSelectedStoreIds([]);
      return;
    }
    setSelectedStoreIds((prev) => {
      const valid = prev.filter((id) => stores.some((s) => s.id === id));
      return valid.length > 0 ? valid : stores.map((s) => s.id);
    });
  }, [stores]);

  const [dateFilter, setDateFilter] = useState<DateFilterType>("monthly");
  const [customStart, setCustomStart] = useState(
    new Date(new Date().setDate(new Date().getDate() - 30))
  );
  const [customEnd, setCustomEnd] = useState(new Date());
  const [pickerMode, setPickerMode] = useState<null | "start" | "end">(null);

  const [rangeStart, rangeEnd] = useMemo(
    () => computeRange(dateFilter, customStart, customEnd),
    [dateFilter, customStart, customEnd]
  );

  const [showChart, setShowChart] = useState(true);
  const [chartType, setChartType] = useState<ChartType>("line");

  const chartSwitchProps = useMemo(() => getEarningsChartSwitchProps(showChart), [showChart]);

  const [fetchStoreEarnings] = useLazyGetBarberStoreEarningsQuery();
  const [storeEarnings, setStoreEarnings] = useState<EarningsDto | null>(null);
  const [storeAllTimeEarnings, setStoreAllTimeEarnings] = useState<EarningsDto | null>(null);
  const [loadingStore, setLoadingStore] = useState(false);

  const loadBarberStoreEarnings = useCallback(async () => {
    if (!isBarberStore || selectedStoreIds.length === 0) return;
    setLoadingStore(true);
    try {
      const start = toDateStr(rangeStart);
      const end = toDateStr(rangeEnd);
      if (selectedStoreIds.length > 1) {
        const results = await Promise.all(selectedStoreIds.map((id) =>
          fetchStoreEarnings({ storeId: id, startDate: start, endDate: end }).unwrap()
        ));
        setStoreEarnings(mergeEarnings(results));
      } else {
        const data = await fetchStoreEarnings({
          storeId: selectedStoreIds[0],
          startDate: start,
          endDate: end,
        }).unwrap();
        setStoreEarnings(data);
      }
    } catch {
      setStoreEarnings(null);
    } finally {
      setLoadingStore(false);
    }
  }, [isBarberStore, selectedStoreIds, rangeStart, rangeEnd, fetchStoreEarnings]);

  useEffect(() => {
    loadBarberStoreEarnings();
  }, [loadBarberStoreEarnings]);

  const loadBarberStoreAllTimeEarnings = useCallback(async () => {
    if (!isBarberStore || selectedStoreIds.length === 0) {
      setStoreAllTimeEarnings(null);
      return;
    }
    try {
      const end = toDateStr(new Date());
      if (selectedStoreIds.length > 1) {
        const results = await Promise.all(
          selectedStoreIds.map((id) =>
            fetchStoreEarnings({ storeId: id, startDate: ALL_TIME_START, endDate: end }).unwrap()
          )
        );
        setStoreAllTimeEarnings(mergeEarnings(results));
      } else {
        const data = await fetchStoreEarnings({
          storeId: selectedStoreIds[0],
          startDate: ALL_TIME_START,
          endDate: end,
        }).unwrap();
        setStoreAllTimeEarnings(data);
      }
    } catch {
      setStoreAllTimeEarnings(null);
    }
  }, [isBarberStore, selectedStoreIds, fetchStoreEarnings]);

  useEffect(() => {
    loadBarberStoreAllTimeEarnings();
  }, [loadBarberStoreAllTimeEarnings]);

  const { data: fbEarnings } = useGetFreeBarberEarningsQuery(
    { startDate: toDateStr(rangeStart), endDate: toDateStr(rangeEnd) },
    { skip: !isFreeBarber }
  );
  const { data: fbAllTimeEarnings } = useGetFreeBarberEarningsQuery(
    { startDate: ALL_TIME_START, endDate: toDateStr(new Date()) },
    { skip: !isFreeBarber }
  );

  const earnings: EarningsDto | null = isBarberStore ? storeEarnings : fbEarnings ?? null;
  const allTimeTotalEarnings = isBarberStore
    ? (storeAllTimeEarnings?.totalEarnings ?? 0)
    : (fbAllTimeEarnings?.totalEarnings ?? 0);

  const { labels: chartLabels, values: chartValues, labelHint } = useMemo(
    () => aggregateBreakdown(earnings?.dailyBreakdown ?? [], dateFilter, t),
    [earnings, dateFilter, t]
  );

  const rawValues = chartValues.map((v) => (isNaN(v) || !isFinite(v) ? 0 : v));
  const safeValues = rawValues.length > 0 ? rawValues : [0];
  const safeLabels = chartLabels.length > 0 ? chartLabels : [""];

  const hasChartActivity = rawValues.some((v) => v > 0);

  const pieSlices: PieSlice[] = useMemo(() => {
    const palette = getPiePalette(variant);
    const pairs = safeLabels.map((label, i) => ({
      name: label.includes("\n") ? label.split("\n").join(" ") : label,
      amount: safeValues[i] ?? 0,
    }));
    const nonZero = pairs.filter((p) => p.amount > 0);
    if (nonZero.length === 0) return [{ name: "—", population: 1, color: "#64748b" }];
    const top = nonZero.slice(0, 6);
    const rest = nonZero.slice(6).reduce((s, x) => s + x.amount, 0);
    const data: PieSlice[] = top.map((p, i) => ({
      name: p.name.length > 8 ? `${p.name.slice(0, 7)}…` : p.name,
      population: p.amount,
      color: palette[i % palette.length],
    }));
    if (rest > 0) {
      data.push({ name: "…", population: rest, color: palette[data.length % palette.length] });
    }
    return data;
  }, [safeLabels, safeValues, variant]);

  const datePickerSheet = useBottomSheet({
    snapPoints: Platform.OS === "ios" ? ["62%", "88%"] : ["58%", "78%"],
    enablePanDownToClose: true,
  });

  const pct = earnings?.changePercent ?? 0;
  const pctText = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const softPositive = pct >= 0;
  const profitBg = softPositive ? (isDark ? "rgba(16,185,129,0.22)" : "rgba(187,247,208,0.95)") : (isDark ? "rgba(248,113,113,0.18)" : "rgba(254,202,202,0.95)");
  const profitFg = softPositive ? "#059669" : "#dc2626";

  // useMemo ile sarmalıyoruz; düz obje her render'da yeni referans üretir.
  const filterLabels = useMemo<Record<DateFilterType, string>>(() => ({
    daily: t("profile.filterDaily"),
    weekly: t("profile.filterWeekly"),
    monthly: t("profile.filterMonthly"),
    yearly: t("profile.filterYearly"),
    custom: t("profile.filterCustom"),
  }), [t]);

  const pageTitle = isFreeBarber
    ? t("profile.panelEarningsTitle")
    : t("profile.storeEarningsTitle");

  const periodLabelForExport = useMemo(
    () =>
      `${toDateStr(rangeStart)} — ${toDateStr(rangeEnd)} · ${filterLabels[dateFilter]}`,
    [rangeStart, rangeEnd, dateFilter, filterLabels],
  );

  const buildExportPayload = useCallback((): EarningsExportPayload => {
    const rows = safeLabels.map((label, i) => ({
      label,
      amount: safeValues[i] ?? 0,
    }));
    return {
      title: pageTitle,
      periodLabel: periodLabelForExport,
      dailyEarnings: earnings?.dailyEarnings ?? 0,
      totalEarnings: earnings?.totalEarnings ?? 0,
      previousPeriodEarnings: earnings?.previousPeriodEarnings ?? 0,
      changePercent: earnings?.changePercent ?? 0,
      rows,
    };
  }, [
    pageTitle,
    periodLabelForExport,
    earnings,
    safeLabels,
    safeValues,
  ]);

  const onExportCsv = useCallback(async () => {
    try {
      await shareEarningsCsv(buildExportPayload());
    } catch {
      Alert.alert(t("common.error"), t("profile.exportError"));
    }
  }, [buildExportPayload, t]);

  const onExportPdf = useCallback(async () => {
    try {
      await shareEarningsPdf(buildExportPayload());
    } catch {
      Alert.alert(t("common.error"), t("profile.exportError"));
    }
  }, [buildExportPayload, t]);

  const onPickerChange = (event: any, d?: Date) => {
    if (Platform.OS === "android" && event?.type === "dismissed") {
      setPickerMode(null);
      datePickerSheet.dismiss();
      return;
    }
    if (Platform.OS === "android" && d) {
      if (pickerMode === "start") setCustomStart(d);
      if (pickerMode === "end") setCustomEnd(d);
      setPickerMode(null);
      datePickerSheet.dismiss();
      return;
    }
    if (!d) return;
    if (pickerMode === "start") setCustomStart(d);
    if (pickerMode === "end") setCustomEnd(d);
  };

  return (
    <View style={{ flex: 1, backgroundColor: earningsTheme.pageBg }}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={earningsTheme.headerSurface} translucent={false} />
      <SafeAreaView
        style={{ flex: 1, backgroundColor: earningsTheme.headerSurface }}
        edges={["top"]}
      >
      {/* ── Header ── */}
      <View
        style={{
          paddingHorizontal: 16,
          paddingVertical: 12,
          backgroundColor: earningsTheme.headerSurface,
          borderBottomWidth: 1,
          borderBottomColor: earningsTheme.accentBorder,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={{ padding: 8, borderRadius: 12, backgroundColor: earningsTheme.accentSoft, flexShrink: 0 }}
          >
            <Icon source="chevron-left" size={24} color={earningsTheme.accent} />
          </TouchableOpacity>
          <View style={{ flex: 1, marginLeft: 10, minWidth: 0, flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View
              style={{
                width: 34,
                height: 34,
                borderRadius: 10,
                backgroundColor: earningsTheme.accentSoft,
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon source={earningsTheme.headerIcon} size={18} color={earningsTheme.accent} />
            </View>
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: colors.sectionHeaderText,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 16,
              }}
            >
              {pageTitle}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 0, marginLeft: 6 }}>
            <TouchableOpacity
              onPress={onExportCsv}
              accessibilityLabel={t("profile.exportExcel")}
              style={{ padding: 7, borderRadius: 10, backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.18)" }}
            >
              <Icon source="microsoft-excel" size={20} color="#059669" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onExportPdf}
              accessibilityLabel={t("profile.exportPdf")}
              style={{ padding: 7, borderRadius: 10, backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.16)" }}
            >
              <Icon source="file-pdf-box" size={20} color="#dc2626" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* ── Filtreler — header'ın hemen altında, sabit şerit ── */}
      <View
        style={{
          backgroundColor: earningsTheme.headerSurface,
          borderBottomWidth: isBarberStore && stores.length > 0 ? 0 : 1,
          borderBottomColor: earningsTheme.accentBorder,
          paddingTop: 8,
          paddingBottom: isBarberStore && stores.length > 0 ? 4 : 10,
        }}
      >
        <Text
          style={{
            color: colors.sectionHeaderText,
            fontFamily: "CenturyGothic-Bold",
            fontSize: 12,
            paddingHorizontal: 16,
            marginBottom: 6,
          }}
        >
          {t("profile.filter")}
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 6 }}
        >
          {(["daily", "weekly", "monthly", "yearly", "custom"] as DateFilterType[]).map((f) => (
            <FilterChip
              key={f}
              label={filterLabels[f]}
              active={dateFilter === f}
              onPress={() => setDateFilter(f)}
              colors={colors}
              activeColor={earningsTheme.chipActiveBg}
            />
          ))}
        </ScrollView>

        {/* Özel Tarih Aralığı */}
        {dateFilter === "custom" && (
          <View style={{ flexDirection: "row", gap: 8, marginTop: 8, paddingHorizontal: 16 }}>
            <TouchableOpacity
              onPress={() => { setPickerMode("start"); setTimeout(() => datePickerSheet.present(), 60); }}
              style={{
                flex: 1, borderRadius: 12, padding: 10,
                backgroundColor: earningsTheme.accentSoft,
                borderWidth: 1, borderColor: earningsTheme.accentBorder,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{t("profile.customStart")}</Text>
              <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", marginTop: 2 }}>
                {customStart.toLocaleDateString("tr-TR")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => { setPickerMode("end"); setTimeout(() => datePickerSheet.present(), 60); }}
              style={{
                flex: 1, borderRadius: 12, padding: 10,
                backgroundColor: earningsTheme.accentSoft,
                borderWidth: 1, borderColor: earningsTheme.accentBorder,
              }}
            >
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{t("profile.customEnd")}</Text>
              <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", marginTop: 2 }}>
                {customEnd.toLocaleDateString("tr-TR")}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── Dükkan Seçici (BarberStore) — filtrelerin altında sabit ── */}
      {isBarberStore && stores.length > 0 && (
        <View
          style={{
            backgroundColor: earningsTheme.headerSurface,
            borderBottomWidth: 1,
            borderBottomColor: earningsTheme.accentBorder,
            paddingHorizontal: 16,
            paddingTop: 10,
            paddingBottom: 12,
          }}
        >
          <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", marginBottom: 8, fontSize: 13 }}>
            {t("profile.selectStore")}
          </Text>
          <MultiSelect
            data={storeSelectOptions}
            labelField="label"
            valueField="value"
            value={selectedStoreIds}
            onChange={(values: string[]) => {
              if (!values || values.length === 0) return;
              setSelectedStoreIds(values);
            }}
            placeholder={t("profile.selectStore")}
            search
            searchPlaceholder={t("common.search")}
            dropdownPosition="auto"
            inside
            alwaysRenderSelectedItem
            visibleSelectedItem
            activeColor={earningsTheme.accentSoft}
            style={{
              borderWidth: 1,
              borderColor: earningsTheme.accentBorder,
              borderRadius: 10,
              paddingHorizontal: 10,
              minHeight: 44,
              backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
            }}
            containerStyle={{
              borderRadius: 12,
              borderWidth: 1,
              borderColor: earningsTheme.accentBorder,
              backgroundColor: isDark ? "#121522" : "#ffffff",
            }}
            inputSearchStyle={{ color: colors.sectionHeaderText, borderRadius: 8, borderColor: earningsTheme.accentBorder }}
            placeholderStyle={{ color: colors.textSecondary, fontSize: 12 }}
            selectedTextStyle={{ color: colors.sectionHeaderText, fontSize: 12, fontFamily: "CenturyGothic-Bold" }}
            itemTextStyle={{ color: colors.sectionHeaderText, fontSize: 12 }}
            selectedStyle={{ borderRadius: 14, backgroundColor: earningsTheme.accentSoft, borderColor: earningsTheme.accent }}
            selectedTextProps={{ numberOfLines: 1 }}
          />
        </View>
      )}

      <ScrollView
        contentContainerStyle={{ paddingTop: 4, paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {loadingStore && (
          <View style={{ alignItems: "center", marginBottom: 10 }}>
            <ActivityIndicator color={earningsTheme.accent} />
          </View>
        )}

        <View style={{ marginBottom: 16 }}>
        <ShopInsightsEarningsCarousel
          cards={[
            {
              label: `${filterLabels[dateFilter]} ${t("profile.earningsSuffix")}`,
              value: earnings?.totalEarnings ?? 0,
              icon: "cash-multiple",
              accentColor: "#5eead4",
              lottieSource: LOTTIE_EARNINGS_COIN,
              animateNumbers: showPriceAnimationSetting,
            },
            {
              label: t("profile.previousPeriod"),
              value: earnings?.previousPeriodEarnings ?? 0,
              icon: "history",
              accentColor: "#7dd3fc",
              lottieSource: LOTTIE_EARNINGS_TREASURE,
              animateNumbers: showPriceAnimationSetting,
            },
            {
              label: t("profile.profitRate"),
              value: 0,
              valueOverride: pctText,
              icon: pct >= 0 ? "trending-up" : "trending-down",
              accentColor: profitFg,
              lottieSource: LOTTIE_EARNINGS_GROWTH,
              animateNumbers: false,
            },
            {
              label: t("profile.allTimeTotalLabel"),
              value: allTimeTotalEarnings,
              icon: "chart-timeline-variant",
              accentColor: "#fcd34d",
              lottieSource: LOTTIE_EARNINGS_TREASURE,
              animateNumbers: showPriceAnimationSetting,
            },
          ]}
          isDark={isDark}
          showLottie={showImageAnimationSetting}
        />
        </View>

        {/* ── Grafik / Tablo Kartı ── */}
        <View
          style={{
            backgroundColor: earningsTheme.headerSurface,
            borderRadius: earningsTheme.cardRadius,
            padding: 14,
            marginHorizontal: 16,
            marginTop: 2,
            borderWidth: earningsTheme.cardBorderWidth,
            borderColor: earningsTheme.accentBorder,
          }}
        >
          {/* Kart Başlığı: sol → ikon + başlık + alt başlık | sağ → "Grafik/Tablo" + switch */}
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
              <View
                style={{
                  width: 40, height: 40, borderRadius: 12,
                  backgroundColor: earningsTheme.accentSoft,
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <Icon source="chart-line-variant" size={22} color={earningsTheme.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 15 }}>
                  {t("profile.earningsChart")}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 1 }}>
                  {t("profile.earningsChartSubtitle")}

                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                {showChart ? t("profile.viewChart") : t("profile.viewTable")}
              </Text>
              <Switch value={showChart} onValueChange={setShowChart} {...chartSwitchProps} />
            </View>
          </View>

          {showChart ? (
            <>
              {/* Grafik Tipi Sekmeleri */}
              <EarningsChartTypeTabs
                chartType={chartType}
                onChange={setChartType}
                theme={earningsTheme}
                colors={colors}
                labels={{
                  line: t("profile.chartModeLine"),
                  bar: t("profile.chartModeBar"),
                  pie: t("profile.chartModePie"),
                }}
              />

              {/* Dönem Bilgi Şeridi */}
              <View style={{ marginTop: 10 }}>
                <EarningsPeriodStrip
                  theme={earningsTheme}
                  colors={colors}
                  periodLabel={filterLabels[dateFilter]}
                  rangeLabel={`${toDateStr(rangeStart)} — ${toDateStr(rangeEnd)}`}
                  totalLabel={t("profile.chartPeriodTotal")}
                  totalAmount={earnings?.totalEarnings ?? 0}
                  currency={CURRENCY}
                  animateNumbers={showPriceAnimationSetting}
                />
              </View>

              {!hasChartActivity ? (
                <View
                  style={{
                    alignItems: "center", justifyContent: "center",
                    paddingVertical: 28, paddingHorizontal: 12,
                    borderRadius: earningsTheme.cardRadius,
                    borderWidth: 1, borderStyle: "dashed",
                    borderColor: earningsTheme.accentBorder,
                    backgroundColor: earningsTheme.accentSoft,
                  }}
                >
                  {showImageAnimationSetting ? (
                    <LottieView
                      source={require("../../../assets/animations/earnings-empty.json") as any}
                      autoPlay loop style={{ width: 120, height: 120 }}
                    />
                  ) : (
                    <Icon source="chart-timeline-variant" size={44} color={earningsTheme.accent} />
                  )}
                  <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 14, marginTop: 10, textAlign: "center" }}>
                    {t("profile.earningsEmptyTitle")}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: "center" }}>
                    {t("profile.earningsEmptySubtitle")}
                  </Text>
                </View>
              ) : chartType === "pie" ? (
                <EarningsPieBlock
                  pieSlices={pieSlices}
                  width={viewportWidth}
                  colors={colors}
                  chartStyle={chartStyle}
                />
              ) : (
                <EarningsChartShell
                  theme={earningsTheme}
                  isDark={isDark}
                  hintColor={earningsTheme.accent}
                  labelHint={labelHint}
                  axisHint={t("profile.chartScrollHint")}
                >
                  <EarningsLineBarChart
                    chartType={chartType}
                    labels={safeLabels}
                    values={safeValues}
                    chartStyle={chartStyle}
                    viewportWidth={viewportWidth}
                    safeLabelsLength={safeLabels.length}
                  />
                </EarningsChartShell>
              )}
            </>
          ) : !hasChartActivity ? (
            <View
              style={{
                alignItems: "center", justifyContent: "center",
                paddingVertical: 24, paddingHorizontal: 12,
                borderRadius: earningsTheme.cardRadius,
                borderWidth: 1, borderStyle: "dashed",
                borderColor: earningsTheme.accentBorder,
                backgroundColor: earningsTheme.accentSoft,
              }}
            >
              {showImageAnimationSetting ? (
                <LottieView
                  source={require("../../../assets/animations/earnings-empty.json") as any}
                  autoPlay loop style={{ width: 100, height: 100 }}
                />
              ) : (
                <Icon source="table-large" size={40} color={earningsTheme.accent} />
              )}
              <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 14, marginTop: 10, textAlign: "center" }}>
                {t("profile.earningsEmptyTitle")}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: "center" }}>
                {t("profile.earningsEmptySubtitle")}
              </Text>
            </View>
          ) : (
            <EarningsBreakdownList
              labels={safeLabels}
              values={safeValues}
              theme={earningsTheme}
              colors={colors}
              isDark={isDark}
              currency={CURRENCY}
            />
          )}
        </View>
      </ScrollView>

      {/* Tarih Seçici Bottom Sheet */}
      <BottomSheetModal
        ref={datePickerSheet.ref}
        index={0}
        snapPoints={datePickerSheet.snapPoints}
        enableDynamicSizing={false}
        enablePanDownToClose={datePickerSheet.enablePanDownToClose}
        backdropComponent={datePickerSheet.makeBackdrop()}
        onChange={datePickerSheet.handleChange}
        backgroundStyle={{ backgroundColor: colors.sheetBg }}
        handleIndicatorStyle={{ backgroundColor: colors.sheetHandle }}
      >
        <BottomSheetScrollView
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 15, marginBottom: 8 }}>
            {pickerMode === "start" ? t("profile.customStart") : pickerMode === "end" ? t("profile.customEnd") : ""}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 12, marginBottom: 12 }}>
            {t("profile.pickDateHint")}
          </Text>
          {pickerMode !== null && (
            <View
              style={{
                backgroundColor: colors.sheetBg,
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 4,
              }}
            >
              <DateTimePicker
                value={pickerMode === "start" ? customStart : customEnd}
                mode="date"
                display={Platform.OS === "ios" ? "inline" : "calendar"}
                onChange={onPickerChange}
                locale="tr-TR"
                themeVariant={isDark ? "dark" : "light"}
                {...(Platform.OS === "android"
                  ? { textColor: colors.sectionHeaderText }
                  : {})}
              />
            </View>
          )}
          <TouchableOpacity
            onPress={() => {
              datePickerSheet.dismiss();
              setPickerMode(null);
            }}
            style={{
              marginTop: 16,
              backgroundColor: earningsTheme.chipActiveBg,
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: earningsTheme.chipActiveText, fontFamily: "CenturyGothic-Bold", fontSize: 15 }}>
              {t("common.ok")}
            </Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
      </SafeAreaView>
    </View>
  );
}
