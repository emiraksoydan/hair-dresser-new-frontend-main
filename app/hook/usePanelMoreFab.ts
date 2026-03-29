import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback, useContext, useEffect } from "react";
import {
  MoreFabPanelContext,
  type MoreFabMenuItem,
} from "../components/layout/MoreFabContext";

/** Sadece `(panel)` sekmesindeyken FAB'a harita/liste vb. ekler; sekmeden çıkınca temizler. */
export function usePanelMoreFab(items: MoreFabMenuItem[]) {
  const ctx = useContext(MoreFabPanelContext);
  const focused = useIsFocused();

  useEffect(() => {
    if (!ctx || !focused) return;
    ctx.setPanelFabItems(items);
  }, [ctx, focused, items]);

  useFocusEffect(
    useCallback(() => {
      return () => {
        ctx?.setPanelFabItems(null);
      };
    }, [ctx]),
  );
}
