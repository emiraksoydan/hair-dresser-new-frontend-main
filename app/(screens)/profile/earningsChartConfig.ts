import type { EarningsTheme } from "./earningsTheme";
import { formatChartYAxis } from "./earningsAggregate";

export type GiftedChartStyle = {
  accent: string;
  fillStart: string;
  fillEnd: string;
  gridColor: string;
  labelColor: string;
  barGradient: [string, string];
  pieStroke: string;
};

export type GiftedSeriesPoint = {
  value: number;
  label: string;
  frontColor?: string;
};

export function buildGiftedChartStyle(earningsTheme: EarningsTheme, isDark: boolean): GiftedChartStyle {
  const accent = earningsTheme.chartAccent;
  if (earningsTheme.variant === "store") {
    return {
      accent,
      fillStart: isDark ? "rgba(99,102,241,0.45)" : "rgba(99,102,241,0.35)",
      fillEnd: isDark ? "rgba(99,102,241,0.02)" : "rgba(99,102,241,0.04)",
      gridColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
      labelColor: isDark ? "#cbd5e1" : "#475569",
      barGradient: isDark ? ["#818cf8", "#6366f1"] : ["#6366f1", "#4f46e5"],
      pieStroke: isDark ? "#0f172a" : "#ffffff",
    };
  }
  return {
    accent,
    fillStart: isDark ? "rgba(45,212,191,0.4)" : "rgba(13,148,136,0.32)",
    fillEnd: isDark ? "rgba(13,148,136,0.02)" : "rgba(13,148,136,0.05)",
    gridColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.08)",
    labelColor: isDark ? "#cbd5e1" : "#475569",
    barGradient: isDark ? ["#5eead4", "#0f766e"] : ["#14b8a6", "#0d9488"],
    pieStroke: isDark ? "#042f2e" : "#ffffff",
  };
}

/** X ekseni: tek satır veya iki satır (haftalık Pzt + tarih) */
export function formatChartAxisLabel(label: string): string {
  return label.replace(/\n/g, "\n").trim();
}

export function chartAxisLabelMaxLen(labels: string[]): number {
  return labels.reduce((max, l) => Math.max(max, formatChartAxisLabel(l).replace(/\n/g, " ").length), 0);
}

export function buildGiftedSeries(
  labels: string[],
  values: number[],
  accent: string,
): GiftedSeriesPoint[] {
  return labels.map((label, i) => ({
    value: values[i] ?? 0,
    label: formatChartAxisLabel(label),
    frontColor: accent,
  }));
}

export function getChartMaxValue(values: number[]): number {
  const max = Math.max(...values, 0);
  if (max <= 0) return 100;
  const padded = max * 1.12;
  const magnitude = Math.pow(10, Math.floor(Math.log10(padded)));
  const step = magnitude >= 1000 ? magnitude / 2 : magnitude;
  return Math.ceil(padded / step) * step;
}

/** shop-insights kartı: margin 12×2 + padding 14×2 + iç yatay boşluk */
export function getEarningsChartViewportWidth(screenWidth: number): number {
  return Math.max(280, screenWidth - 52);
}

export function getGiftedChartDimensions(labelCount: number, viewportWidth: number, maxLabelLen = 8) {
  const needsTallLabels = maxLabelLen > 9 || labelCount >= 7;
  const xAxisTextNumberOfLines = needsTallLabels ? 2 : 1;
  const yAxisLabelWidth = 56;
  const initialSpacing = 20;
  const endSpacing = 24;
  const innerPad = 12;
  const availableWidth = Math.max(240, viewportWidth - innerPad);
  const plotWidth = availableWidth - yAxisLabelWidth;

  const baseSpacing = labelCount > 10 ? 50 : labelCount > 6 ? 68 : labelCount > 4 ? 60 : 66;
  const barWidthEstimate = Math.min(36, Math.max(22, baseSpacing - 18));
  const contentMinWidth =
    initialSpacing + endSpacing + Math.max(0, labelCount - 1) * baseSpacing + barWidthEstimate;

  let chartWidth: number;
  let spacing: number;
  if (labelCount <= 1) {
    chartWidth = plotWidth;
    spacing = baseSpacing;
  } else if (contentMinWidth <= plotWidth) {
    chartWidth = plotWidth;
    spacing = Math.max(
      44,
      Math.min(
        baseSpacing,
        Math.floor((plotWidth - initialSpacing - endSpacing - barWidthEstimate) / (labelCount - 1)),
      ),
    );
  } else {
    chartWidth = contentMinWidth;
    spacing = baseSpacing;
  }

  const rotateLabel = labelCount > 11;
  /**
   * gifted-charts: x ekseni kutusu yüksekliği (tek satır için de min 32;
   * kütüphane varsayılanı satır × 20 — aylık 1–7 vb. altta kesilmesin diye paylı).
   */
  const xAxisLabelsHeight = Math.max(36, xAxisTextNumberOfLines * 22 + 8);
  /** Çizgi grafiği: x etiketleri için alt boşluk */
  const labelsExtraHeight = xAxisLabelsHeight + 24;
  /** Çubuk grafiği: çubuk tabanı ile x etiketi — etikete hafif yakın */
  const barLabelsExtraHeight = xAxisLabelsHeight + 22;
  const barLabelsDistanceFromXaxis = 3;
  const barMarginBottom = 2;
  const plotHeight = labelCount > 8 ? 180 : 168;
  const overflowTop = 28;
  const overflowBottom = 24;
  const xAxisLabelsVerticalShift = 6;
  const barXAxisLabelsVerticalShift = 5;
  const noOfSections = labelCount > 12 ? 5 : 4;
  const totalChartHeight = plotHeight + labelsExtraHeight + overflowTop + overflowBottom;
  const barTotalChartHeight = plotHeight + barLabelsExtraHeight + overflowTop + overflowBottom;
  const scrollable = contentMinWidth > plotWidth + 4 || labelCount > 6;

  return {
    chartWidth,
    chartHeight: plotHeight,
    plotHeight,
    spacing,
    initialSpacing,
    endSpacing,
    scrollable,
    noOfSections,
    rotateLabel,
    needsTallLabels,
    xAxisTextNumberOfLines,
    yAxisLabelWidth,
    labelsExtraHeight,
    barLabelsExtraHeight,
    barLabelsDistanceFromXaxis,
    barMarginBottom,
    xAxisLabelsHeight,
    xAxisLabelsVerticalShift,
    barXAxisLabelsVerticalShift,
    overflowBottom,
    overflowTop,
    totalChartHeight,
    barTotalChartHeight,
    /** Animasyonlu etiket kutusu dar; kazanç grafiğinde kapalı */
    chartAnimated: false,
  };
}

export function formatGiftedYLabel(value: string): string {
  return formatChartYAxis(Number(value));
}
