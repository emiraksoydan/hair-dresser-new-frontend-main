import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { useCallback, useContext, useEffect } from "react";
import {
  MoreFabPanelContext,
  type MoreFabMenuItem,
} from "../components/layout/MoreFabContext";

/**
 * Bottom sheet açıkken FAB + speed dial gizlensin (BaseTabLayout ref-count ile uyumlu).
 * `anySheetOpen` = o ekrandaki sheet’lerin OR’ı; false iken önceki açık sheet cleanup’ı çalışır.
 */
export function useFabOverlayWhenSheetOpen(anySheetOpen: boolean) {
  const ctx = useContext(MoreFabPanelContext);
  useEffect(() => {
    if (!anySheetOpen) return;
    ctx?.reportOverlayOpen(true);
    return () => ctx?.reportOverlayOpen(false);
  }, [anySheetOpen, ctx]);
}

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
