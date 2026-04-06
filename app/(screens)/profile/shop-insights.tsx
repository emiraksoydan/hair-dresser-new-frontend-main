import { Icon } from "react-native-paper";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

import { BarChart, LineChart, PieChart } from "react-native-chart-kit";
import { MultiSelect } from "react-native-element-dropdown";
import { Text } from "../../components/common/Text";
import { useTheme } from "../../hook/useTheme";
import { getEarningsChartSwitchProps } from "../../constants/colors";
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
  useLazyGetBarberStoreEarningsAggregatedQuery,
  useGetFreeBarberEarningsQuery,
} from "../../store/api";
import { EarningsDto, UserType } from "../../types";
import LottieView from "lottie-react-native";
import { AnimatedMoneyText } from "../../components/common/AnimatedMoneyText";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CURRENCY = "₺";

/** Yan peek: dar kart + header/footer spacer + separator — paddingHorizontal yerine */
const EARNINGS_CARD_HEIGHT = 182;
const EARNINGS_CARD_WIDTH = Math.round(SCREEN_WIDTH * 0.62);
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
type ChartType = "line" | "bar" | "pie";

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

function aggregateBreakdown(
  breakdown: { date: string; amount: number }[],
  filter: DateFilterType
): { labels: string[]; values: number[] } {
  const dayNames = ["Paz", "Pzt", "Sal", "Çar", "Per", "Cum", "Cmt"];
  const monthNames = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

  if (filter === "daily") {
    const now = new Date();
    const key = toDateStr(now);
    const found = breakdown.find((b) => b.date === key);
    return { labels: [dayNames[now.getDay()]], values: [found ? found.amount : 0] };
  }

  if (filter === "weekly") {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toDateStr(d);
      labels.push(dayNames[d.getDay()]);
      const found = breakdown.find((b) => b.date === key);
      values.push(found ? found.amount : 0);
    }
    return { labels, values };
  }

  if (filter === "monthly") {
    const buckets: number[] = [0, 0, 0, 0, 0];
    const labels = ["1.H", "2.H", "3.H", "4.H", "5.H"];
    breakdown.forEach((b) => {
      const day = new Date(b.date).getDate();
      const bucket = Math.min(Math.floor((day - 1) / 7), 4);
      buckets[bucket] += b.amount;
    });
    return { labels, values: buckets };
  }

  if (filter === "yearly") {
    const now = new Date();
    const labels: string[] = [];
    const buckets = new Array(12).fill(0);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(monthNames[d.getMonth()]);
    }
    breakdown.forEach((b) => {
      const d = new Date(b.date);
      const monthsDiff =
        (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsDiff >= 0 && monthsDiff < 12) {
        const idx = 11 - monthsDiff;
        buckets[idx] += b.amount;
      }
    });
    return { labels, values: buckets };
  }

  const monthMap: Record<string, number> = {};
  breakdown.forEach((b) => {
    const d = new Date(b.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    monthMap[key] = (monthMap[key] || 0) + b.amount;
  });
  const sorted = Object.keys(monthMap).sort();
  return {
    labels: sorted.map((k) => {
      const [, m] = k.split("-");
      return monthNames[parseInt(m, 10) - 1];
    }),
    values: sorted.map((k) => monthMap[k]),
  };
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
  /** Yüzde vb. metin göstermek için (ör. kar oranı) */
  valueOverride?: string;
  subText?: string;
  icon: string;
  accentColor: string;
  isDark: boolean;
  showLottie?: boolean;
  lottieSource?: number;
  animateNumbers?: boolean;
  /** Varsayılan ₺ yerine özel sonek (örn. %) */
  valueSuffix?: string;
  /** Carousel: alt metin + Lottie için merkez odaklı opacity */
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
        ...(Platform.OS === "ios"
          ? { shadowColor: accentColor, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.28, shadowRadius: 14 }
          : { elevation: 6 }),
      }}
    >
      {/* Top accent line */}
      <View
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: 3,
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          backgroundColor: accentColor,
          opacity: 0.7,
        }}
      />
      <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
        <View style={{ flex: 1, minWidth: 0, paddingRight: showLottie && lottieSource != null ? 6 : 0 }}>
          {/* Icon + label */}
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

          {/* Value */}
          {valueOverride != null ? (
            <Text
              style={{
                color: accentColor,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 26,
              }}
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
              style={{
                color: accentColor,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 26,
              }}
              enabled={animateNumbers}
            />
          ) : (
            <Text
              style={{
                color: accentColor,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 26,
              }}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.8}
            >
              {value.toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
              {suffix}
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
      opacity: interpolate(
        x,
        [(index - 1) * s, index * s, (index + 1) * s],
        [0.45, 1, 0.45],
        Extrapolation.CLAMP
      ),
      transform: [
        {
          scale: interpolate(
            x,
            [(index - 1) * s, index * s, (index + 1) * s],
            [0.86, 1, 0.86],
            Extrapolation.CLAMP
          ),
        },
      ],
    };
  }, [index, s]);

  return (
    <View
      style={{
        width: EARNINGS_CARD_WIDTH,
        height: EARNINGS_CAROUSEL_HEIGHT,
        justifyContent: "center",
      }}
    >
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
        contentContainerStyle={{
          paddingVertical: 7,
        }}
        style={{ height: EARNINGS_CAROUSEL_HEIGHT }}
        renderItem={({ item, index }) => (
          <EarningsCarouselItem
            item={item}
            index={index}
            scrollX={scrollX}
            isDark={isDark}
            showLottie={showLottie}
          />
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
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  colors: any;
}) => (
  <TouchableOpacity
    onPress={onPress}
    style={{
      paddingHorizontal: 13,
      paddingVertical: 7,
      borderRadius: 20,
      backgroundColor: active ? "#ffb900" : colors.cardBg3,
      borderWidth: 1,
      borderColor: active ? "#ffb900" : colors.borderColor2,
      marginRight: 6,
    }}
  >
    <Text
      style={{
        color: active ? "#1f2937" : colors.sectionHeaderText,
        fontFamily: "CenturyGothic-Bold",
        fontSize: 12,
      }}
    >
      {label}
    </Text>
  </TouchableOpacity>
);

const PIE_COLORS = [
  "rgba(251,191,36,0.85)",
  "rgba(45,212,191,0.88)",
  "rgba(96,165,250,0.9)",
  "rgba(192,132,252,0.88)",
  "rgba(244,114,182,0.85)",
  "rgba(52,211,153,0.88)",
  "rgba(251,146,60,0.85)",
  "rgba(148,163,184,0.85)",
];

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

  const { data: myStoresRaw = [] } = useGetMineStoresQuery(undefined, {
    skip: !isBarberStore,
  });
  const stores = useMemo(
    () => (myStoresRaw ?? []).map((s: any) => ({ id: s.id, name: s.storeName || "Dükkan" })),
    [myStoresRaw],
  );
  const storeSelectOptions = useMemo(
    () => stores.map((s) => ({ label: s.name, value: s.id })),
    [stores]
  );

  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  useEffect(() => {
    if (!stores.length) {
      setSelectedStoreIds((prev) => (prev.length === 0 ? prev : []));
      return;
    }
    const allIds = stores.map((s) => s.id);
    setSelectedStoreIds((prev) => {
      const valid = prev.filter((id) => allIds.includes(id));
      const next = valid.length > 0 ? valid : allIds;
      const a = [...next].sort().join(",");
      const b = [...prev].sort().join(",");
      if (a === b) return prev;
      return next;
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

  const [fetchStoreEarningsAggregated] = useLazyGetBarberStoreEarningsAggregatedQuery();
  const fetchEarningsRef = useRef(fetchStoreEarningsAggregated);
  fetchEarningsRef.current = fetchStoreEarningsAggregated;

  const [storeEarnings, setStoreEarnings] = useState<EarningsDto | null>(null);
  const [storeAllTimeEarnings, setStoreAllTimeEarnings] = useState<EarningsDto | null>(null);
  const [loadingStore, setLoadingStore] = useState(false);

  const selectedStoreIdsKey = useMemo(() => [...selectedStoreIds].sort().join(","), [selectedStoreIds]);
  const rangeStartStr = useMemo(() => toDateStr(rangeStart), [rangeStart]);
  const rangeEndStr = useMemo(() => toDateStr(rangeEnd), [rangeEnd]);

  const selectedStoreIdsRef = useRef(selectedStoreIds);
  selectedStoreIdsRef.current = selectedStoreIds;

  useEffect(() => {
    const ids = selectedStoreIdsRef.current;
    if (!isBarberStore || ids.length === 0) {
      setStoreEarnings(null);
      setLoadingStore(false);
      return;
    }
    let cancelled = false;
    setLoadingStore(true);
    fetchEarningsRef
      .current({
        storeIds: ids,
        startDate: rangeStartStr,
        endDate: rangeEndStr,
      })
      .unwrap()
      .then((data) => {
        if (!cancelled) setStoreEarnings(data);
      })
      .catch(() => {
        if (!cancelled) setStoreEarnings(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingStore(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isBarberStore, selectedStoreIdsKey, rangeStartStr, rangeEndStr]);

  useEffect(() => {
    const ids = selectedStoreIdsRef.current;
    if (!isBarberStore || ids.length === 0) {
      setStoreAllTimeEarnings(null);
      return;
    }
    let cancelled = false;
    const end = toDateStr(new Date());
    fetchEarningsRef
      .current({
        storeIds: ids,
        startDate: ALL_TIME_START,
        endDate: end,
      })
      .unwrap()
      .then((data) => {
        if (!cancelled) setStoreAllTimeEarnings(data);
      })
      .catch(() => {
        if (!cancelled) setStoreAllTimeEarnings(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isBarberStore, selectedStoreIdsKey]);

  const { data: fbEarnings, isFetching: fbEarningsFetching } = useGetFreeBarberEarningsQuery(
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

  const { labels: chartLabels, values: chartValues } = useMemo(
    () => aggregateBreakdown(earnings?.dailyBreakdown ?? [], dateFilter),
    [earnings, dateFilter]
  );
  const rawValues = chartValues.map((v) => (isNaN(v) || !isFinite(v) ? 0 : v));
  const safeValues = rawValues.length > 0 ? rawValues : [0];
  const safeLabels = chartLabels.length > 0 ? chartLabels : [""];
  const chartLineColor = isDark ? "rgba(251,191,36,0.78)" : "rgba(245,158,11,0.88)";
  const chartData = {
    labels: safeLabels,
    datasets: [{ data: safeValues, color: () => chartLineColor, strokeWidth: 2.5 }],
  };
  const chartConfig = useMemo(
    () => ({
      backgroundGradientFrom: isDark ? colors.cardBg3 : colors.cardBg3,
      backgroundGradientTo: isDark ? colors.cardBg : "#f8fafc",
      decimalPlaces: 0,
      color: (opacity = 1) => `rgba(251,191,36,${0.32 + opacity * 0.48})`,
      labelColor: (opacity = 1) =>
        isDark ? `rgba(203,213,225,${opacity})` : `rgba(71,85,105,${opacity})`,
      propsForDots: { r: "4", strokeWidth: "1.5", stroke: chartLineColor },
      propsForBackgroundLines: {
        stroke: isDark ? "rgba(255,255,255,0.07)" : "rgba(15,23,42,0.07)",
      },
      propsForLabels: {
        fontSize: safeLabels.length > 10 ? 9 : 10,
      },
      fillShadowGradient: "rgba(251,191,36,0.95)",
      fillShadowGradientOpacity: isDark ? 0.1 : 0.14,
    }),
    [isDark, colors.cardBg, colors.cardBg3, chartLineColor, safeLabels.length],
  );

  const horizontalLabelRotation =
    safeLabels.length > 10 ? -55 : safeLabels.length > 6 ? -40 : 0;
  const minLabelPx =
    dateFilter === "monthly" || safeLabels.length > 8 ? 52 : 46;
  const chartInnerWidth = Math.max(
    SCREEN_WIDTH - 32,
    safeLabels.length * minLabelPx,
  );
  const chartPlotHeight = horizontalLabelRotation !== 0 ? 210 : 190;

  const hasChartActivity = rawValues.some((v) => v > 0);

  const chartAwaitingEarnings =
    (isBarberStore && loadingStore && !storeEarnings) ||
    (isFreeBarber && fbEarningsFetching && fbEarnings === undefined);

  const datePickerSheet = useBottomSheet({
    snapPoints: Platform.OS === "ios" ? ["62%", "88%"] : ["58%", "78%"],
    enablePanDownToClose: true,
  });

  const pct = earnings?.changePercent ?? 0;
  const pctText = `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  const prevText = `${t("profile.previousPeriod")}: ${(earnings?.previousPeriodEarnings ?? 0).toLocaleString("tr-TR")} ${CURRENCY}`;
  const profitFg = pct >= 0 ? "#4ade80" : "#fb923c";

  const pieSlices = useMemo(() => {
    const pairs = safeLabels.map((label, i) => ({
      name: label.length > 8 ? `${label.slice(0, 7)}…` : label,
      amount: safeValues[i] ?? 0,
    }));
    const nonZero = pairs.filter((p) => p.amount > 0);
    if (nonZero.length === 0) return [{ name: "—", population: 1, color: "#64748b", legendFontColor: "#94a3b8" }];
    const top = nonZero.slice(0, 7);
    const rest = nonZero.slice(7).reduce((s, x) => s + x.amount, 0);
    const data = top.map((p, i) => ({
      name: p.name,
      population: p.amount,
      color: PIE_COLORS[i % PIE_COLORS.length],
      legendFontColor: isDark ? "#cbd5e1" : "#475569",
    }));
    if (rest > 0) {
      data.push({
        name: "…",
        population: rest,
        color: PIE_COLORS[data.length % PIE_COLORS.length],
        legendFontColor: isDark ? "#cbd5e1" : "#475569",
      });
    }
    return data;
  }, [safeLabels, safeValues, isDark]);

  const filterLabels: Record<DateFilterType, string> = useMemo(
    () => ({
      daily: t("profile.filterDaily") || "Günlük",
      weekly: t("profile.filterWeekly") || "Haftalık",
      monthly: t("profile.filterMonthly") || "Aylık",
      yearly: t("profile.filterYearly") || "Yıllık",
      custom: t("profile.filterCustom") || "Tarih Aralığı",
    }),
    [t],
  );

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
    <SafeAreaView
      style={{ flex: 1, backgroundColor: isDark ? "#0f0f1a" : "#f1f5f9" }}
      edges={["top"]}
    >
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} backgroundColor={isDark ? "#0f0f1a" : "#ffffff"} />
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
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text
            style={{
              color: colors.sectionHeaderText,
              fontFamily: "CenturyGothic-Bold",
              fontSize: 17,
            }}
          >
            {pageTitle}
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 11, marginTop: 2 }}>
            {isFreeBarber ? t("profile.panelEarningsSubtitle") : t("profile.storeEarningsSubtitle")}
          </Text>
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
          <TouchableOpacity
            onPress={onExportCsv}
            accessibilityLabel={t("profile.exportExcel")}
            style={{ padding: 8, borderRadius: 12, backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "rgba(16,185,129,0.18)" }}
          >
            <Icon source="microsoft-excel" size={22} color="#059669" />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onExportPdf}
            accessibilityLabel={t("profile.exportPdf")}
            style={{ padding: 8, borderRadius: 12, backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "rgba(239,68,68,0.16)" }}
          >
            <Icon source="file-pdf-box" size={22} color="#dc2626" />
          </TouchableOpacity>
          {isBarberStore && stores.length >= 2 && (
            <TouchableOpacity
              onPress={() => router.push("/(screens)/profile/store-compare")}
              style={{ padding: 8, borderRadius: 12, backgroundColor: isDark ? "rgba(255,185,0,0.12)" : "rgba(255,185,0,0.2)" }}
            >
              <Icon source="compare-horizontal" size={22} color="#ffb900" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{ paddingBottom: 72 }}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View
          style={{
            paddingHorizontal: 12,
            paddingTop: 10,
            paddingBottom: 10,
            backgroundColor: isDark ? "#0f0f1a" : "#f1f5f9",
            borderBottomWidth: 1,
            borderBottomColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.07)",
            zIndex: 10,
          }}
        >
          <Text
            style={{
              color: colors.sectionHeaderText,
              fontFamily: "CenturyGothic-Bold",
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            {t("profile.filter") || "Filtreler"}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingRight: 4 }}>
            {(["daily", "weekly", "monthly", "yearly", "custom"] as DateFilterType[]).map((f) => (
              <FilterChip
                key={f}
                label={filterLabels[f]}
                active={dateFilter === f}
                onPress={() => setDateFilter(f)}
                colors={colors}
              />
            ))}
          </ScrollView>

          {dateFilter === "custom" && (
            <View style={{ flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 4 }}>
              <TouchableOpacity
                onPress={() => {
                  setPickerMode("start");
                  setTimeout(() => datePickerSheet.present(), 60);
                }}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  padding: 10,
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{t("profile.customStart") || "Başlangıç"}</Text>
                <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", marginTop: 2 }}>
                  {customStart.toLocaleDateString("tr-TR")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setPickerMode("end");
                  setTimeout(() => datePickerSheet.present(), 60);
                }}
                style={{
                  flex: 1,
                  borderRadius: 12,
                  padding: 10,
                  backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)",
                }}
              >
                <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{t("profile.customEnd") || "Bitiş"}</Text>
                <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", marginTop: 2 }}>
                  {customEnd.toLocaleDateString("tr-TR")}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {isBarberStore && stores.length > 0 && (
            <View style={{ marginTop: 10 }}>
              <Text
                style={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic-Bold",
                  marginBottom: 8,
                  fontSize: 12,
                }}
              >
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
                activeColor="#ffb900"
                style={{
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
                  borderRadius: 10,
                  paddingHorizontal: 10,
                  minHeight: 44,
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#f8fafc",
                }}
                containerStyle={{
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                  backgroundColor: isDark ? "#121522" : "#ffffff",
                }}
                inputSearchStyle={{
                  color: colors.sectionHeaderText,
                  borderRadius: 8,
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
                }}
                placeholderStyle={{
                  color: colors.textSecondary,
                  fontSize: 12,
                }}
                selectedTextStyle={{
                  color: colors.sectionHeaderText,
                  fontSize: 12,
                  fontFamily: "CenturyGothic-Bold",
                }}
                itemTextStyle={{
                  color: colors.sectionHeaderText,
                  fontSize: 12,
                }}
                selectedStyle={{
                  borderRadius: 14,
                  backgroundColor: isDark ? "rgba(255,185,0,0.22)" : "rgba(255,185,0,0.2)",
                  borderColor: "#ffb900",
                }}
                selectedTextProps={{ numberOfLines: 1 }}
              />
            </View>
          )}
        </View>

        <View style={{ paddingTop: 8, paddingBottom: 6 }}>
          {loadingStore && (
            <View style={{ alignItems: "center", marginBottom: 12 }}>
              <ActivityIndicator color="#ffb900" />
            </View>
          )}

          {/* Kazanç kartları: yatay snap + scroll’a göre yan kartlar silik/küçük */}
          <ShopInsightsEarningsCarousel
            cards={[
              {
                label: t("profile.dailyEarnings"),
                value: earnings?.dailyEarnings ?? 0,
                icon: "cash-multiple",
                accentColor: "#5eead4",
                lottieSource: LOTTIE_EARNINGS_COIN,
                animateNumbers: showPriceAnimationSetting,
              },
              {
                label: t("profile.totalEarnings"),
                value: earnings?.totalEarnings ?? 0,
                subText: prevText,
                icon: "finance",
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

        <View
          style={{
            backgroundColor: colors.cardBg,
            borderRadius: 18,
            padding: 14,
            marginHorizontal: 12,
            marginTop: 14,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.borderColor2,
            ...(Platform.OS === "ios"
              ? {
                  shadowColor: "#000",
                  shadowOffset: { width: 0, height: 3 },
                  shadowOpacity: isDark ? 0.32 : 0.07,
                  shadowRadius: 10,
                }
              : { elevation: 3 }),
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10, marginRight: 8 }}>
              <View
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 12,
                  backgroundColor: isDark ? "rgba(255,185,0,0.12)" : "rgba(255,185,0,0.2)",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon source="chart-areaspline" size={22} color="#ffb900" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text
                  style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 14 }}
                  numberOfLines={1}
                >
                  {t("profile.earningsChart") || "Kazanç Grafiği"}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 10, marginTop: 2 }} numberOfLines={2}>
                  {t("profile.earningsBreakdownHint")}
                </Text>
              </View>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{showChart ? t("profile.viewChart") : t("profile.viewTable")}</Text>
              <View
                style={{
                  borderRadius: 22,
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.12)",
                }}
              >
                <Switch
                  value={showChart}
                  onValueChange={setShowChart}
                  {...getEarningsChartSwitchProps(showChart)}
                />
              </View>
            </View>
          </View>

          {showChart ? (
            <>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                {(["line", "bar", "pie"] as ChartType[]).map((ct) => (
                  <TouchableOpacity
                    key={ct}
                    onPress={() => setChartType(ct)}
                    style={{
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                      borderRadius: 10,
                      backgroundColor: chartType === ct ? "#ffb900" : colors.cardBg3,
                      borderWidth: 1,
                      borderColor: chartType === ct ? "#ffb900" : colors.borderColor2,
                    }}
                  >
                    <Text
                      style={{
                        color: chartType === ct ? "#1f2937" : colors.sectionHeaderText,
                        fontFamily: "CenturyGothic-Bold",
                        fontSize: 12,
                      }}
                    >
                      {ct === "line" ? t("profile.chartModeLine") : ct === "bar" ? t("profile.chartModeBar") : t("profile.chartModePie")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {!chartAwaitingEarnings && earnings != null && (
                <View
                  style={{
                    marginBottom: 12,
                    paddingVertical: 10,
                    paddingHorizontal: 12,
                    borderRadius: 12,
                    backgroundColor: colors.cardBg3,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.borderColor2,
                  }}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Icon source="calendar-range" size={18} color="#ffb900" />
                    <Text style={{ color: colors.textSecondary, fontSize: 11, flex: 1 }} numberOfLines={2}>
                      {filterLabels[dateFilter]} · {toDateStr(rangeStart)} — {toDateStr(rangeEnd)}
                    </Text>
                  </View>
                  <Text
                    style={{
                      marginTop: 8,
                      color: colors.sectionHeaderText,
                      fontFamily: "CenturyGothic-Bold",
                      fontSize: 16,
                    }}
                  >
                    {t("profile.chartPeriodTotal")}{" "}
                    {(earnings.totalEarnings ?? 0).toLocaleString("tr-TR", {
                      minimumFractionDigits: 0,
                      maximumFractionDigits: 2,
                    })}{" "}
                    {CURRENCY}
                  </Text>
                </View>
              )}

              {chartAwaitingEarnings ? (
                <View
                  style={{
                    minHeight: 210,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: 14,
                    backgroundColor: colors.cardBg3,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.borderColor2,
                  }}
                >
                  <ActivityIndicator color="#ffb900" size="large" />
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 12 }}>{t("profile.chartLoading")}</Text>
                </View>
              ) : !hasChartActivity ? (
                <View
                  style={{
                    alignItems: "center",
                    justifyContent: "center",
                    paddingVertical: 28,
                    paddingHorizontal: 12,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderStyle: "dashed",
                    borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                    backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  }}
                >
                  {showImageAnimationSetting ? (
                    <LottieView
                      source={require("../../../assets/animations/earnings-empty.json") as any}
                      autoPlay
                      loop
                      style={{ width: 120, height: 120 }}
                    />
                  ) : (
                    <Icon source="chart-timeline-variant" size={44} color={colors.textTertiary} />
                  )}
                  <Text
                    style={{
                      color: colors.sectionHeaderText,
                      fontFamily: "CenturyGothic-Bold",
                      fontSize: 14,
                      marginTop: 10,
                      textAlign: "center",
                    }}
                  >
                    {t("profile.earningsEmptyTitle")}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: "center" }}>
                    {t("profile.earningsEmptySubtitle")}
                  </Text>
                </View>
              ) : chartType === "pie" ? (
                <View
                  style={{
                    alignItems: "center",
                    overflow: "hidden",
                    borderRadius: 14,
                    backgroundColor: isDark ? "rgba(0,0,0,0.2)" : colors.cardBg3,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.borderColor2,
                    paddingVertical: 8,
                  }}
                >
                  <PieChart
                    data={pieSlices as any}
                    width={Math.min(SCREEN_WIDTH - 56, 360)}
                    height={220}
                    chartConfig={chartConfig}
                    accessor="population"
                    backgroundColor="transparent"
                    paddingLeft="12"
                    hasLegend={false}
                    absolute
                    style={{ marginVertical: 4 }}
                  />
                  <View style={{ width: "100%", marginTop: 8, gap: 6, paddingHorizontal: 4 }}>
                    {pieSlices.map((s, idx) => (
                      <View key={`${s.name}-${idx}`} style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                          <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: (s as any).color }} />
                          <Text style={{ color: colors.sectionHeaderText, fontSize: 12 }} numberOfLines={1}>
                            {s.name}
                          </Text>
                        </View>
                        <Text style={{ color: colors.textSecondary, fontSize: 12, fontFamily: "CenturyGothic-Bold" }}>
                          {(s as any).population?.toLocaleString?.("tr-TR") ?? ""} {CURRENCY}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              ) : (
                <View
                  style={{
                    overflow: "hidden",
                    alignItems: "flex-start",
                    borderRadius: 14,
                    backgroundColor: isDark ? "rgba(0,0,0,0.2)" : colors.cardBg3,
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: colors.borderColor2,
                    paddingTop: 6,
                    paddingBottom: 4,
                  }}
                >
                  <Text style={{ color: colors.textTertiary, fontSize: 10, marginBottom: 6, marginHorizontal: 8 }}>
                    {t("profile.chartScrollHint")}
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={safeLabels.length > 6}>
                    {chartType === "line" ? (
                      <LineChart
                        data={chartData}
                        width={chartInnerWidth}
                        height={chartPlotHeight}
                        chartConfig={chartConfig}
                        bezier
                        withInnerLines
                        withOuterLines={false}
                        style={{ borderRadius: 12, marginLeft: 0 }}
                        fromZero
                        yAxisLabel=""
                        yAxisSuffix=""
                        segments={4}
                        horizontalLabelRotation={horizontalLabelRotation}
                      />
                    ) : (
                      <BarChart
                        data={chartData}
                        width={chartInnerWidth}
                        height={chartPlotHeight}
                        yAxisLabel=""
                        yAxisSuffix=""
                        chartConfig={chartConfig}
                        style={{ borderRadius: 12, marginLeft: 0 }}
                        fromZero
                        showBarTops={false}
                        withInnerLines={false}
                        segments={4}
                        horizontalLabelRotation={horizontalLabelRotation}
                      />
                    )}
                  </ScrollView>
                </View>
              )}
            </>
          ) : !hasChartActivity ? (
            <View
              style={{
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 24,
                paddingHorizontal: 12,
                marginTop: 14,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: "dashed",
                borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)",
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
              }}
            >
              {showImageAnimationSetting ? (
                <LottieView
                  source={require("../../../assets/animations/earnings-empty.json") as any}
                  autoPlay
                  loop
                  style={{ width: 100, height: 100 }}
                />
              ) : (
                <Icon source="table-large" size={40} color={colors.textTertiary} />
              )}
              <Text
                style={{
                  color: colors.sectionHeaderText,
                  fontFamily: "CenturyGothic-Bold",
                  fontSize: 14,
                  marginTop: 10,
                  textAlign: "center",
                }}
              >
                {t("profile.earningsEmptyTitle")}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 6, textAlign: "center" }}>
                {t("profile.earningsEmptySubtitle")}
              </Text>
            </View>
          ) : (
            <View
              style={{
                flexDirection: "row",
                flexWrap: "wrap",
                gap: 10,
                justifyContent: "space-between",
              }}
            >
              {safeLabels.map((label, i) => (
                <View
                  key={label + i}
                  style={{
                    width: (SCREEN_WIDTH - 12 * 2 - 14 * 2 - 10) / 2,
                    borderRadius: 14,
                    paddingVertical: 12,
                    paddingHorizontal: 10,
                    backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                    borderWidth: 1,
                    borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
                  }}
                >
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={1}>
                    {label}
                  </Text>
                  <Text
                    style={{
                      color: safeValues[i] > 0 ? "#0d9488" : colors.textSecondary,
                      fontFamily: "CenturyGothic-Bold",
                      fontSize: 15,
                      marginTop: 6,
                    }}
                  >
                    {safeValues[i].toLocaleString("tr-TR", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}{" "}
                    {CURRENCY}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>

      <BottomSheetModal
        ref={datePickerSheet.ref}
        index={0}
        snapPoints={datePickerSheet.snapPoints}
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
              backgroundColor: "#ffb900",
              borderRadius: 12,
              paddingVertical: 12,
              alignItems: "center",
            }}
          >
            <Text style={{ color: "#1f2937", fontFamily: "CenturyGothic-Bold", fontSize: 15 }}>{t("common.ok")}</Text>
          </TouchableOpacity>
        </BottomSheetScrollView>
      </BottomSheetModal>
    </SafeAreaView>
  );
}
