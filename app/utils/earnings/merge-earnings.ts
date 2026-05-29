import type { EarningsDto } from "../../types";

/**
 * Birden fazla dükkanın EarningsDto verilerini tek bir EarningsDto'ya birleştirir.
 * - totalEarnings / dailyEarnings / previousPeriodEarnings: toplanır
 * - changePercent: ağırlıklı ortalama (toplam previous üzerinden)
 * - dailyBreakdown: aynı tarihlerin amount'ları toplanır
 */
export function mergeEarnings(list: EarningsDto[]): EarningsDto {
  if (!list || list.length === 0) {
    return {
      totalEarnings: 0,
      dailyEarnings: 0,
      previousPeriodEarnings: 0,
      changePercent: 0,
      dailyBreakdown: [],
    };
  }

  if (list.length === 1) return list[0];

  const totalEarnings = list.reduce((s, e) => s + (e.totalEarnings ?? 0), 0);
  const dailyEarnings = list.reduce((s, e) => s + (e.dailyEarnings ?? 0), 0);
  const previousPeriodEarnings = list.reduce((s, e) => s + (e.previousPeriodEarnings ?? 0), 0);

  // changePercent: toplam previous > 0 ise hesapla, yoksa 0
  const changePercent =
    previousPeriodEarnings > 0
      ? ((totalEarnings - previousPeriodEarnings) / previousPeriodEarnings) * 100
      : 0;

  // dailyBreakdown: aynı tarihleri topla
  const breakdownMap: Record<string, number> = {};
  for (const e of list) {
    for (const d of e.dailyBreakdown ?? []) {
      breakdownMap[d.date] = (breakdownMap[d.date] ?? 0) + (d.amount ?? 0);
    }
  }
  const dailyBreakdown = Object.entries(breakdownMap)
    .map(([date, amount]) => ({ date, amount }))
    .sort((a, b) => a.date.localeCompare(b.date));

  return { totalEarnings, dailyEarnings, previousPeriodEarnings, changePercent, dailyBreakdown };
}
