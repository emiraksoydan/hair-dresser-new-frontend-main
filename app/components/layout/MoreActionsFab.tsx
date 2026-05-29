import React, { useEffect, useMemo, useRef, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { FAB, Portal } from "react-native-paper";
import { useTheme } from "../../hook/useTheme";
import {
  COLORS,
  getFabMenuRowWrapperStyle,
  getTextOnGold,
} from "../../constants/colors";
import type { MoreFabMenuItem } from "./MoreFabContext";
import { getMoreFabAnchorBottom } from "./panelBottomOverlays";

/**
 * Son sekme (profil) seçiliyken yüzen sekme balonu ile FAB çakışmasın diye
 * `paddingBottom` artışı (px) — FAB yukarı kayar.
 */
export const FAB_NUDGE_LAST_TAB_CLEARANCE = 14;

const FAB_ACTION_SIZE = 34;

type Props = {
  items: MoreFabMenuItem[];
  /** Açık sarı (kapalı FAB + alt menü düğmeleri) */
  chipBackground?: string;
  /** Ek `paddingBottom` (FAB’ı ekran tabanından yukarı iter); son sekmede çakışma önleme için kullanılır */
  fabNudgeDown?: number;
  /** true: FAB gizlenir (açık sheet üzerinde görünmemesi için) */
  hidden?: boolean;
};

/**
 * React Native Paper FAB.Group (speed dial); tab bar üzerinde konumlanır.
 * Kapalıyken `actions=[]` — gri satırların hayalet renderını önler.
 */
export function MoreActionsFab({
  items,
  chipBackground = COLORS.UI.ACCENT_GOLD,
  fabNudgeDown = 0,
  hidden = false,
}: Props) {
  const { isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const onGold = getTextOnGold(isDark);

  const menuRowWrapper = useMemo(() => getFabMenuRowWrapperStyle(isDark), [isDark]);

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

  useEffect(() => {
    if (hidden) setOpen(false);
  }, [hidden]);

  // Hayalet render koruması: FAB kapandıktan sonra kısa süre actions'ı
  // boş tutmak için küçük bir gecikme. Paper'ın kapanma animasyonu
  // bitmeden actions kaldırılırsa gri kartlar anlık görünebiliyordu.
  const [actionsVisible, setActionsVisible] = useState(false);
  const actionsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (actionsTimerRef.current) clearTimeout(actionsTimerRef.current);
    if (open) {
      // Açılırken hemen göster
      setActionsVisible(true);
    } else {
      // Kapanırken animasyon bittikten sonra kaldır (~250ms)
      actionsTimerRef.current = setTimeout(() => {
        setActionsVisible(false);
      }, 250);
    }
    return () => {
      if (actionsTimerRef.current) clearTimeout(actionsTimerRef.current);
    };
  }, [open]);

  const menuActions = useMemo(
    () =>
      items.map((item) => ({
        icon: item.icon,
        label: item.label,
        labelTextColor: onGold,
        labelStyle: {
          fontFamily: "CenturyGothic-Bold",
          fontSize: 13,
          includeFontPadding: false,
        },
        size: "small" as const,
        wrapperStyle: menuRowWrapper,
        containerStyle: {
          backgroundColor: "transparent",
          elevation: 0,
          shadowOpacity: 0,
          // Paper default: marginVertical:8, paddingVertical:6, marginHorizontal:16
          // Bunlar wrapperStyle padding'iyle çakışıyor — sıfırla
          marginVertical: 0,
          marginHorizontal: 0,
          paddingVertical: 0,
          paddingHorizontal: 0,
        },
        style: {
          backgroundColor: chipBackground,
          borderWidth: 0,
          margin: 0,
          width: FAB_ACTION_SIZE,
          height: FAB_ACTION_SIZE,
          borderRadius: FAB_ACTION_SIZE / 2,
          alignItems: "center" as const,
          justifyContent: "center" as const,
        },
        color: onGold,
        onPress: () => {
          setOpen(false);
          item.onPress();
        },
      })),
    [items, chipBackground, onGold, menuRowWrapper],
  );

  if (items.length === 0) {
    return null;
  }

  const showMenu = open && !hidden;

  return (
    <Portal>
      <FAB.Group
        open={open}
        visible={!hidden}
        icon={open ? "close" : "plus"}
        // Hayalet render: animasyon bitmeden actions kaldırılmaz,
        // animasyon başlamadan önce de gösterilmez.
        actions={showMenu && actionsVisible ? menuActions : []}
        onStateChange={({ open: next }) => setOpen(next)}
        style={{ paddingBottom }}
        fabStyle={{
          backgroundColor: open
            ? isDark
              ? COLORS.UI.FAB_MENU_ROW_BG_DARK
              : COLORS.UI.FAB_MENU_ROW_BG_LIGHT
            : chipBackground,
          borderWidth: 0,
          width: 48,
          height: 48,
          borderRadius: 24,
          margin: 0,
          alignItems: "center",
          justifyContent: "center",
        }}
        color={open ? (isDark ? "#f9fafb" : "#1f2937") : onGold}
        backdropColor={showMenu ? "rgba(0,0,0,0.22)" : "transparent"}
        accessibilityLabel={open ? "Menüyü kapat" : "Daha fazla işlem"}
      />
    </Portal>
  );
}
