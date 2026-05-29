import { Icon } from "react-native-paper";
import React, { useMemo } from "react";
import { ScrollView, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BarChart, LineChart, PieChart } from "react-native-gifted-charts";

import { Text } from "../../components/common/Text";
import { AnimatedMoneyText } from "../../components/common/AnimatedMoneyText";
import type { EarningsTheme } from "./earningsTheme";
import {
  buildGiftedSeries,
  chartAxisLabelMaxLen,
  formatGiftedYLabel,
  getChartMaxValue,
  getGiftedChartDimensions,
  type GiftedChartStyle,
} from "./earningsChartConfig";

export type ChartType = "line" | "bar" | "pie";

type ThemeColors = {
  sectionHeaderText: string;
  textSecondary: string;
  textTertiary: string;
  cardBg3: string;
  borderColor2: string;
};

export type PieSlice = {
  name: string;
  population: number;
  color: string;
};

export function EarningsChartTypeTabs({
  chartType,
  onChange,
  theme,
  colors,
  labels,
}: {
  chartType: ChartType;
  onChange: (t: ChartType) => void;
  theme: EarningsTheme;
  colors: ThemeColors;
  labels: { line: string; bar: string; pie: string };
}) {
  const modes: { key: ChartType; icon: string; label: string }[] = [
    { key: "line", icon: "chart-line", label: labels.line },
    { key: "bar", icon: "chart-bar", label: labels.bar },
    { key: "pie", icon: "chart-pie", label: labels.pie },
  ];
  return (
    <View
      style={{
        flexDirection: "row",
        gap: 8,
        marginBottom: 12,
        padding: 4,
        borderRadius: 14,
        backgroundColor: colors.cardBg3,
        borderWidth: 1,
        borderColor: theme.accentBorder,
      }}
    >
      {modes.map((m) => {
        const active = chartType === m.key;
        return (
          <TouchableOpacity
            key={m.key}
            onPress={() => onChange(m.key)}
            style={{
              flex: 1,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              paddingVertical: 10,
              borderRadius: 10,
              backgroundColor: active ? theme.chipActiveBg : "transparent",
            }}
          >
            <Icon source={m.icon} size={18} color={active ? theme.chipActiveText : colors.textSecondary} />
            <Text
              style={{
                color: active ? theme.chipActiveText : colors.sectionHeaderText,
                fontFamily: "CenturyGothic-Bold",
                fontSize: 12,
              }}
              numberOfLines={1}
            >
              {m.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function EarningsPeriodStrip({
  theme,
  colors,
  periodLabel,
  rangeLabel,
  totalLabel,
  totalAmount,
  currency,
  animateNumbers,
}: {
  theme: EarningsTheme;
  colors: ThemeColors;
  periodLabel: string;
  rangeLabel: string;
  totalLabel: string;
  totalAmount: number;
  currency: string;
  animateNumbers?: boolean;
}) {
  return (
    <LinearGradient
      colors={
        theme.variant === "store"
          ? (["rgba(79,70,229,0.12)", "rgba(99,102,241,0.06)"] as const)
          : (["rgba(13,148,136,0.14)", "rgba(45,212,191,0.06)"] as const)
      }
      style={{
        marginBottom: 12,
        borderRadius: 14,
        padding: 14,
        borderWidth: 1,
        borderColor: theme.accentBorder,
      }}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
        <View
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: theme.accentSoft,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon source="calendar-range" size={20} color={theme.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{periodLabel}</Text>
          <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 13, marginTop: 2 }} numberOfLines={2}>
            {rangeLabel}
          </Text>
        </View>
      </View>
      <View
        style={{
          marginTop: 12,
          paddingTop: 12,
          borderTopWidth: 1,
          borderTopColor: theme.accentBorder,
          flexDirection: "row",
          alignItems: "baseline",
          justifyContent: "space-between",
        }}
      >
        <Text style={{ color: colors.textSecondary, fontSize: 13 }}>{totalLabel}</Text>
        <AnimatedMoneyText
          value={totalAmount}
          suffix={currency}
          enabled={animateNumbers ?? true}
          style={{ color: theme.accent, fontFamily: "CenturyGothic-Bold", fontSize: 26 }}
        />
      </View>
    </LinearGradient>
  );
}

export function EarningsBreakdownList({
  labels,
  values,
  theme,
  colors,
  isDark,
  currency,
}: {
  labels: string[];
  values: number[];
  theme: EarningsTheme;
  colors: ThemeColors;
  isDark: boolean;
  currency: string;
}) {
  const max = Math.max(...values, 1);
  const total = values.reduce((a, b) => a + b, 0) || 1;

  return (
    <View style={{ gap: 10 }}>
      {labels.map((label, i) => {
        const v = values[i] ?? 0;
        const barPct = Math.max(4, (v / max) * 100);
        const sharePct = total > 0 ? Math.round((v / total) * 100) : 0;
        const displayLabel = label.includes("\n") ? label.replace("\n", " · ") : label;
        return (
          <View
            key={`${label}-${i}`}
            style={{
              borderRadius: theme.cardRadius,
              padding: 14,
              backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "rgba(255,255,255,0.9)",
              borderWidth: 1,
              borderColor: theme.accentBorder,
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                <View
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: theme.accent,
                  }}
                />
                <Text style={{ color: colors.sectionHeaderText, fontFamily: "CenturyGothic-Bold", fontSize: 14 }} numberOfLines={2}>
                  {displayLabel}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                <AnimatedMoneyText
                  value={v}
                  suffix={currency}
                  maximumFractionDigits={2}
                  enabled
                  style={{
                    color: v > 0 ? theme.accent : colors.textSecondary,
                    fontFamily: "CenturyGothic-Bold",
                    fontSize: 16,
                  }}
                />
                <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>{sharePct}%</Text>
              </View>
            </View>
            <View
              style={{
                height: 10,
                borderRadius: 999,
                backgroundColor: theme.accentSoft,
                overflow: "hidden",
              }}
            >
              <View
                style={{
                  width: `${barPct}%`,
                  height: "100%",
                  borderRadius: 999,
                  backgroundColor: theme.accent,
                  opacity: v > 0 ? 0.85 : 0.25,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function EarningsChartShell({
  theme,
  isDark,
  children,
  hint,
  hintColor,
  labelHint,
  axisHint,
}: {
  theme: EarningsTheme;
  isDark: boolean;
  children: React.ReactNode;
  hint?: string;
  hintColor: string;
  labelHint?: string;
  axisHint?: string;
}) {
  return (
    // Dış katman: kart görünümü + kırpma. overflow:"hidden" grafik
    // taşmasını önler; borderRadius ile rounded köşeler korunur.
    <View
      style={{
        overflow: "hidden",
        borderRadius: theme.cardRadius,
        borderWidth: 1,
        borderColor: theme.accentBorder,
        backgroundColor: theme.chartShellBg,
      }}
    >
      {!!labelHint && (
        <Text style={{ color: hintColor, fontSize: 12, marginTop: 10, marginHorizontal: 12, fontFamily: "CenturyGothic" }}>
          {labelHint}
        </Text>
      )}
      {!!axisHint && (
        <Text style={{ color: hintColor, fontSize: 11, marginTop: 4, marginHorizontal: 12, opacity: 0.85, fontFamily: "CenturyGothic" }}>
          {axisHint}
        </Text>
      )}
      {!!hint && (
        <Text style={{ color: hintColor, fontSize: 11, marginTop: 6, marginHorizontal: 12, fontFamily: "CenturyGothic" }}>
          {hint}
        </Text>
      )}
      {/* İç katman: overflow:"visible" pointer/tooltip label'larının
          kırpılmaması için açık bırakılıyor */}
      <View style={{ paddingTop: labelHint || hint || axisHint ? 4 : 8, paddingBottom: 8, overflow: "visible" }}>
        {children}
      </View>
    </View>
  );
}

const axisTextStyle = (color: string) => ({
  color,
  fontSize: 9,
  fontFamily: "CenturyGothic" as const,
  textAlign: "center" as const,
});

export function EarningsLineBarChart({
  chartType,
  labels,
  values,
  chartStyle,
  viewportWidth,
  safeLabelsLength,
}: {
  chartType: "line" | "bar";
  labels: string[];
  values: number[];
  chartStyle: GiftedChartStyle;
  viewportWidth: number;
  safeLabelsLength: number;
}) {
  const maxLabelLen = useMemo(() => chartAxisLabelMaxLen(labels), [labels]);
  const dims = useMemo(
    () => getGiftedChartDimensions(safeLabelsLength, viewportWidth, maxLabelLen),
    [safeLabelsLength, viewportWidth, maxLabelLen],
  );
  const series = useMemo(
    () => buildGiftedSeries(labels, values, chartStyle.accent),
    [labels, values, chartStyle.accent],
  );
  const maxValue = useMemo(() => getChartMaxValue(values), [values]);

  const chartTotalHeight = chartType === "bar" ? dims.barTotalChartHeight : dims.totalChartHeight;
  const chartLabelsExtraHeight = chartType === "bar" ? dims.barLabelsExtraHeight : dims.labelsExtraHeight;
  const chartXAxisVerticalShift =
    chartType === "bar" ? dims.barXAxisLabelsVerticalShift : dims.xAxisLabelsVerticalShift;

  const commonAxis = {
    parentWidth: viewportWidth,
    maxValue,
    noOfSections: dims.noOfSections,
    yAxisLabelWidth: dims.yAxisLabelWidth,
    formatYLabel: formatGiftedYLabel,
    yAxisColor: "transparent",
    xAxisColor: "transparent",
    xAxisThickness: 0,
    rulesColor: "transparent",
    hideRules: true,
    showVerticalLines: false,
    labelsExtraHeight: chartLabelsExtraHeight,
    xAxisLabelsHeight: dims.xAxisLabelsHeight,
    xAxisLabelsVerticalShift: chartXAxisVerticalShift,
    overflowBottom: dims.overflowBottom,
    overflowTop: dims.overflowTop,
    yAxisTextStyle: { color: chartStyle.labelColor, fontSize: 10, fontFamily: "CenturyGothic" },
    xAxisLabelTextStyle: {
      ...axisTextStyle(chartStyle.labelColor),
      fontSize: 10,
      lineHeight: 14,
      width: dims.spacing - 4,
    },
    xAxisTextNumberOfLines: dims.xAxisTextNumberOfLines,
    rotateLabel: dims.rotateLabel,
    backgroundColor: "transparent",
    isAnimated: dims.chartAnimated,
    animationDuration: 600,
  };

  const scrollable = dims.scrollable;

  const chartBlock = chartType === "line" ? (
        <LineChart
          data={series}
          width={dims.chartWidth}
          height={dims.chartHeight}
          spacing={dims.spacing}
          initialSpacing={dims.initialSpacing}
          endSpacing={dims.endSpacing}
          curved
          areaChart
          color={chartStyle.accent}
          thickness={2.5}
          startFillColor={chartStyle.fillStart}
          endFillColor={chartStyle.fillEnd}
          startOpacity={0.55}
          endOpacity={0.08}
          dataPointsColor={chartStyle.accent}
          dataPointsRadius={5}
          focusEnabled
          showStripOnFocus
          stripColor={chartStyle.accent}
          stripOpacity={0.12}
          pointerConfig={{
            pointerStripHeight: dims.plotHeight - 24,
            pointerStripColor: chartStyle.accent,
            pointerStripWidth: 2,
            pointerColor: chartStyle.accent,
            radius: 6,
            pointerLabelWidth: 120,
            pointerLabelHeight: 36,
            activatePointersOnLongPress: false,
            autoAdjustPointerLabelPosition: true,
            pointerLabelComponent: (items: { value?: number }[]) => {
              const v = items[0]?.value ?? 0;
              return (
                <View
                  style={{
                    backgroundColor: chartStyle.accent,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    justifyContent: "center",
                  }}
                >
                  <Text style={{ color: "#fff", fontFamily: "CenturyGothic-Bold", fontSize: 12 }}>
                    {formatGiftedYLabel(String(v))}
                  </Text>
                </View>
              );
            },
          }}
          {...commonAxis}
          xAxisLabelsAtBottom
        />
      ) : (
        <BarChart
          data={series}
          width={dims.chartWidth}
          height={dims.chartHeight}
          spacing={dims.spacing}
          initialSpacing={dims.initialSpacing}
          endSpacing={dims.endSpacing}
          barWidth={Math.min(36, Math.max(22, dims.spacing - 18))}
          roundedTop
          roundedBottom={false}
          gradientColor={chartStyle.barGradient[1]}
          frontColor={chartStyle.barGradient[0]}
          showGradient
          barBorderRadius={6}
          focusBarOnPress
          // showValuesAsTopLabel kaldırıldı: 0 değerli barlarda "0" etiketi
          // x ekseni label'larıyla üst üste biniyordu. Değer bilgisi
          // press/tooltip ile gösteriliyor (renderTooltip).
          topLabelTextStyle={{ color: chartStyle.labelColor, fontSize: 9, fontFamily: "CenturyGothic" }}
          topLabelContainerStyle={{ marginBottom: 4 }}
          renderTooltip={(item: { value?: number }) => {
            const v = item.value ?? 0;
            if (v <= 0) return null; // Sıfır barlarda tooltip gösterme
            return (
              <View
                style={{
                  backgroundColor: chartStyle.accent,
                  borderRadius: 8,
                  paddingHorizontal: 10,
                  paddingVertical: 6,
                  marginBottom: 4,
                }}
              >
                <Text style={{ color: "#fff", fontFamily: "CenturyGothic-Bold", fontSize: 12 }}>
                  {formatGiftedYLabel(String(v))}
                </Text>
              </View>
            );
          }}
          labelsDistanceFromXaxis={dims.barLabelsDistanceFromXaxis}
          barMarginBottom={dims.barMarginBottom}
          {...commonAxis}
          xAxisLabelsAtBottom
        />
      );

  return (
    // Dış View: sabit yükseklik — chart içeriğinin kart dışına
    // taşmaması için totalChartHeight ile sınırlandırılıyor.
    <View style={{ height: chartTotalHeight }}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={scrollable}
        nestedScrollEnabled
        // overflow:"visible" pointer/tooltip için iç katmanda açık,
        // dış kart zaten overflow:"hidden" ile kırpıyor.
        style={{ overflow: "visible", flex: 1 }}
        contentContainerStyle={{
          paddingLeft: 4,
          paddingRight: scrollable ? 8 : 4,
          paddingTop: dims.overflowTop,
          paddingBottom: dims.overflowBottom,
          minHeight: chartTotalHeight,
        }}
      >
        <View style={{ height: dims.plotHeight + chartLabelsExtraHeight, overflow: "visible", justifyContent: "flex-start" }}>
          {chartBlock}
        </View>
      </ScrollView>
    </View>
  );
}

export function EarningsPieBlock({
  pieSlices,
  width,
  colors,
  chartStyle,
}: {
  pieSlices: PieSlice[];
  width: number;
  colors: ThemeColors;
  chartStyle: GiftedChartStyle;
}) {
  const pieData = useMemo(
    () =>
      pieSlices.map((s) => ({
        value: s.population,
        color: s.color,
        text: s.name,
        strokeColor: chartStyle.pieStroke,
        strokeWidth: 2,
      })),
    [pieSlices, chartStyle.pieStroke],
  );

  const radius = Math.min(width * 0.38, 118);
  const innerRadius = Math.round(radius * 0.58);
  const total = pieSlices.reduce((sum, s) => sum + (s.population > 0 ? s.population : 0), 0);

  return (
    <View style={{ alignItems: "center", width: "100%" }}>
      <PieChart
        data={pieData}
        donut
        radius={radius}
        innerRadius={innerRadius}
        innerCircleColor="transparent"
        showText
        textColor={colors.sectionHeaderText}
        textSize={10}
        showValuesAsLabels={false}
        showGradient
        gradientCenterColor={chartStyle.fillStart}
        focusOnPress
        sectionAutoFocus
        strokeColor={chartStyle.pieStroke}
        strokeWidth={2}
        isAnimated
        animationDuration={700}
      />
      <View style={{ width: "100%", marginTop: 14, gap: 8, paddingHorizontal: 8 }}>
        {pieSlices.map((s, idx) => {
          const sharePct = total > 0 ? Math.round((s.population / total) * 100) : 0;
          return (
            <View
              key={`${s.name}-${idx}`}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                paddingVertical: 8,
                paddingHorizontal: 10,
                borderRadius: 10,
                backgroundColor: "rgba(255,255,255,0.04)",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: s.color }} />
                <Text style={{ color: colors.sectionHeaderText, fontSize: 14 }} numberOfLines={1}>
                  {s.name}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end", marginLeft: 8 }}>
                <AnimatedMoneyText
                  value={s.population ?? 0}
                  maximumFractionDigits={0}
                  enabled
                  style={{ color: colors.textSecondary, fontSize: 14, fontFamily: "CenturyGothic-Bold" }}
                />
                <Text style={{ color: colors.textTertiary, fontSize: 11, marginTop: 2 }}>{sharePct}%</Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}
