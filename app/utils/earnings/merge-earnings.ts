import type { EarningsDto } from "../../types";

export function mergeEarnings(parts: EarningsDto[]): EarningsDto {
  if (parts.length === 0) {
    return {
      totalEarnings: 0,
      dailyEarnings: 0,
      previousPeriodEarnings: 0,
      changePercent: 0,
      dailyBreakdown: [],
    };
  }
  if (parts.length === 1) return parts[0];
  const byDay = new Map<string, number>();
  let total = 0;
  let daily = 0;
  let prev = 0;
  for (const e of parts) {
    total += Number(e.totalEarnings) || 0;
    daily += Number(e.dailyEarnings) || 0;
    prev += Number(e.previousPeriodEarnings) || 0;
    for (const b of e.dailyBreakdown ?? []) {
      const k = b.date;
      byDay.set(k, (byDay.get(k) ?? 0) + (Number(b.amount) || 0));
    }
  }
  const prevNum = prev;
  const changePct =
    prevNum === 0 ? (total > 0 ? 100 : 0) : ((total - prevNum) / prevNum) * 100;
  const breakdown = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, amount]) => ({ date, amount }));
  return {
    totalEarnings: total,
    dailyEarnings: daily,
    previousPeriodEarnings: prev,
    changePercent: Math.round(changePct * 10) / 10,
    dailyBreakdown: breakdown,
  };
}
