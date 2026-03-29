import React, { useEffect, useMemo, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FAB, Portal } from "react-native-paper";
import { useTheme } from "../../hook/useTheme";
import type { MoreFabMenuItem } from "./MoreFabContext";
import { getMoreFabAnchorBottom } from "./panelBottomOverlays";

/**
 * Son sekme (profil) seçiliyken yüzen sekme balonu ile FAB çakışmasın diye
 * `paddingBottom` artışı (px) — FAB yukarı kayar.
 */
export const FAB_NUDGE_LAST_TAB_CLEARANCE = 14;

type Props = {
  items: MoreFabMenuItem[];
  accentColor: string;
  /** Ek `paddingBottom` (FAB’ı ekran tabanından yukarı iter); son sekmede çakışma önleme için kullanılır */
  fabNudgeDown?: number;
  /** true: FAB gizlenir (açık sheet üzerinde görünmemesi için) */
  hidden?: boolean;
};

/**
 * React Native Paper FAB.Group (speed dial); tab bar üzerinde konumlanır.
 */
export function MoreActionsFab({ items, accentColor, fabNudgeDown = 0, hidden = false }: Props) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);

  const basePadding = useMemo(() => {
    const anchor = getMoreFabAnchorBottom(insets.bottom);
    return Math.max(0, anchor - 16);
  }, [insets.bottom]);

  const targetBottom = basePadding + fabNudgeDown;
  const [paddingBottom, setPaddingBottom] = useState(targetBottom);

  useEffect(() => {
    setPaddingBottom(targetBottom);
  }, [targetBottom]);

  const itemsKey = useMemo(() => items.map((i) => i.id).join("|"), [items]);

  useEffect(() => {
    setOpen(false);
  }, [itemsKey]);

  const actions = useMemo(
    () =>
      items.map((item) => ({
        icon: item.icon,
        label: item.label,
        labelTextColor: "#ffffff",
        labelStyle: { fontFamily: "CenturyGothic-Bold" } as const,
        size: "small" as const,
        style: { backgroundColor: accentColor },
        color: "#ffffff",
        onPress: () => {
          item.onPress();
        },
      })),
    [items, accentColor],
  );

  if (items.length === 0) {
    return null;
  }

  return (
    <Portal>
      <FAB.Group
        open={open}
        visible={!hidden}
        icon={open ? "close" : "plus"}
        actions={actions}
        onStateChange={({ open: next }) => setOpen(next)}
        style={{ paddingBottom: paddingBottom }}
        fabStyle={{
          backgroundColor: open
            ? isDark
              ? "rgba(148,163,184,0.4)"
              : "#e5e7eb"
            : accentColor,
          width: 48,
          height: 48,
          borderRadius: 24,
          margin: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
        color={open ? (isDark ? "#f9fafb" : "#1f2937") : "#ffffff"}
        backdropColor="rgba(0,0,0,0.22)"
        accessibilityLabel={open ? "Menüyü kapat" : "Daha fazla işlem"}
      />
    </Portal>
  );
}
