import { useEffect, useMemo, useState } from "react";
import {
  useGetFreeBarberEarningsQuery,
  useLazyGetBarberStoreEarningsAggregatedQuery,
} from "../store/api";
import type { EarningsDto } from "../types";

function toDateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

/** Same window as shop-insights "monthly" filter: year start → today */
function computeMonthlyRange(): [Date, Date] {
  const now = new Date();
  const s = new Date(now.getFullYear(), 0, 1);
  return [s, now];
}

export function useBarberStorePanelEarningsPreview(storeIds: string[]) {
  const [fetchAggregated] = useLazyGetBarberStoreEarningsAggregatedQuery();
  const [merged, setMerged] = useState<EarningsDto | null>(null);
  const [rangeStart, rangeEnd] = useMemo(() => computeMonthlyRange(), []);
  const idsKey = storeIds.join(",");

  useEffect(() => {
    if (!storeIds.length) {
      setMerged(null);
      return;
    }
    const start = toDateStr(rangeStart);
    const end = toDateStr(rangeEnd);
    let cancelled = false;
    (async () => {
      try {
        const data = await fetchAggregated({
          storeIds,
          startDate: start,
          endDate: end,
        }).unwrap();
        if (!cancelled) setMerged(data);
      } catch {
        if (!cancelled) setMerged(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, rangeStart, rangeEnd, fetchAggregated, storeIds]);

  return merged;
}

export function useFreeBarberPanelEarningsPreview(enabled: boolean) {
  const [rangeStart, rangeEnd] = useMemo(() => computeMonthlyRange(), []);
  const { data } = useGetFreeBarberEarningsQuery(
    {
      startDate: toDateStr(rangeStart),
      endDate: toDateStr(rangeEnd),
    },
    { skip: !enabled }
  );
  return enabled ? (data ?? null) : null;
}
