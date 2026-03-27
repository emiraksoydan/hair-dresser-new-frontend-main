import { useEffect, useMemo, useState } from "react";
import {
  useGetFreeBarberEarningsQuery,
  useLazyGetBarberStoreEarningsQuery,
} from "../store/api";
import type { EarningsDto } from "../types";
import { mergeEarnings } from "../utils/earnings/merge-earnings";

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
  const [fetchStoreEarnings] = useLazyGetBarberStoreEarningsQuery();
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
        const results = await Promise.all(
          storeIds.map((id) =>
            fetchStoreEarnings({
              storeId: id,
              startDate: start,
              endDate: end,
            }).unwrap()
          )
        );
        if (!cancelled) setMerged(mergeEarnings(results));
      } catch {
        if (!cancelled) setMerged(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [idsKey, rangeStart, rangeEnd, fetchStoreEarnings, storeIds]);

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
