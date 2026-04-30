import React, { useCallback } from "react";
import { Keyboard, View, type GestureResponderEvent } from "react-native";
import { isTouchInsideKeyboardDismissExclusion } from "../../utils/keyboardDismissExclusion";

/**
 * Klavye açıkken boş alana dokunulduğunda klavyeyi kapatır.
 *
 * - `View` + `onTouchStart`: ScrollView / liste arka planu gibi yerlerde de tetiklenir
 *   (Pressable `onPress` kökte genelde tetiklenmez).
 * - `KeyboardDismissExclusionView` ile sarılı alanlara (sohbet input satırı vb.)
 *   dokununca `Keyboard.dismiss` **çağrılmaz**; böylece metin kutusuna tekrar basınca
 *   klavye kapanmaz.
 */
export function GlobalKeyboardDismisser({ children }: { children: React.ReactNode }) {
  const handleTouchStart = useCallback((e: GestureResponderEvent) => {
    const n = e.nativeEvent as {
      pageX?: number;
      pageY?: number;
      touches?: Array<{ pageX: number; pageY: number }>;
      changedTouches?: Array<{ pageX: number; pageY: number }>;
    };
    const t0 = n.touches?.[0] ?? n.changedTouches?.[0];
    const x = n.pageX ?? t0?.pageX;
    const y = n.pageY ?? t0?.pageY;
    if (
      typeof x !== "number" ||
      typeof y !== "number" ||
      !Number.isFinite(x) ||
      !Number.isFinite(y)
    ) {
      return;
    }
    if (isTouchInsideKeyboardDismissExclusion(x, y)) {
      return;
    }
    if (typeof Keyboard.isVisible === "function" && Keyboard.isVisible()) {
      Keyboard.dismiss();
    }
  }, []);

  return (
    <View style={{ flex: 1 }} onTouchStart={handleTouchStart}>
      {children}
    </View>
  );
}
