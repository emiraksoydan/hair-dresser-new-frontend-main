export type DateFilterType = "daily" | "weekly" | "monthly" | "yearly" | "custom";

const DAY_KEYS = ["chartDaySun", "chartDayMon", "chartDayTue", "chartDayWed", "chartDayThu", "chartDayFri", "chartDaySat"] as const;
const MONTH_KEYS = [
  "chartMonthJan",
  "chartMonthFeb",
  "chartMonthMar",
  "chartMonthApr",
  "chartMonthMay",
  "chartMonthJun",
  "chartMonthJul",
  "chartMonthAug",
  "chartMonthSep",
  "chartMonthOct",
  "chartMonthNov",
  "chartMonthDec",
] as const;

const WEEK_BUCKET_KEYS = [
  "chartWeekDays1_7",
  "chartWeekDays8_14",
  "chartWeekDays15_21",
  "chartWeekDays22_28",
  "chartWeekDays29_plus",
] as const;

function toDateStr(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Y ekseni: 1500 → 1,5K */
export function formatChartYAxis(value: number): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (abs >= 1_000) return `${(n / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(Math.round(n));
}

export function aggregateBreakdown(
  breakdown: { date: string; amount: number }[],
  filter: DateFilterType,
  t: (key: string) => string,
  locale = "tr-TR",
): { labels: string[]; values: number[]; labelHint?: string } {
  if (filter === "daily") {
    const now = new Date();
    const key = toDateStr(now);
    const found = breakdown.find((b) => b.date === key);
    return {
      labels: [t("profile.chartToday")],
      values: [found ? found.amount : 0],
      labelHint: t("profile.chartLabelHintDaily"),
    };
  }

  if (filter === "weekly") {
    const labels: string[] = [];
    const values: number[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const key = toDateStr(d);
      const dayName = t(`profile.${DAY_KEYS[d.getDay()]}`);
      const shortDate = d.toLocaleDateString(locale, { day: "numeric", month: "short" });
      labels.push(`${dayName}\n${shortDate}`);
      const found = breakdown.find((b) => b.date === key);
      values.push(found ? found.amount : 0);
    }
    return { labels, values, labelHint: t("profile.chartLabelHintWeekly") };
  }

  if (filter === "monthly") {
    const buckets = [0, 0, 0, 0, 0];
    breakdown.forEach((b) => {
      const day = new Date(b.date).getDate();
      const bucket = Math.min(Math.floor((day - 1) / 7), 4);
      buckets[bucket] += b.amount;
    });
    return {
      labels: WEEK_BUCKET_KEYS.map((k) => t(`profile.${k}`)),
      values: buckets,
      labelHint: t("profile.chartLabelHintMonthly"),
    };
  }

  if (filter === "yearly") {
    const now = new Date();
    const labels: string[] = [];
    const buckets = new Array(12).fill(0);
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      labels.push(t(`profile.${MONTH_KEYS[d.getMonth()]}`));
    }
    breakdown.forEach((b) => {
      const d = new Date(b.date);
      const monthsDiff = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsDiff >= 0 && monthsDiff < 12) {
        buckets[11 - monthsDiff] += b.amount;
      }
    });
    return { labels, values: buckets, labelHint: t("profile.chartLabelHintYearly") };
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
      const [y, m] = k.split("-");
      const d = new Date(parseInt(y, 10), parseInt(m, 10) - 1, 1);
      return d.toLocaleDateString(locale, { month: "short", year: "2-digit" });
    }),
    values: sorted.map((k) => monthMap[k]),
    labelHint: t("profile.chartLabelHintCustom"),
  };
}
