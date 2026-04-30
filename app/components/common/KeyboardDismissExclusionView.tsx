import React, { useCallback, useEffect, useRef } from "react";
import { Keyboard, type LayoutChangeEvent, View, type ViewProps } from "react-native";
import {
  allocKeyboardDismissExclusionId,
  registerKeyboardDismissExclusion,
  unregisterKeyboardDismissExclusion,
} from "../../utils/keyboardDismissExclusion";

type Props = ViewProps & { className?: string };

/**
 * Sarmalayan alan `measureInWindow` ile kaydedilir; root klavye dismiss bu kutunun
 * içine düşen dokunuşlarda `Keyboard.dismiss` yapmaz.
 */
export function KeyboardDismissExclusionView({ onLayout, children, style, ...rest }: Props) {
  const idRef = useRef(allocKeyboardDismissExclusionId());
  const rafRef = useRef<number | null>(null);
  const viewRef = useRef<View | null>(null);

  const measure = useCallback(() => {
    if (rafRef.current != null) {
      cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      viewRef.current?.measureInWindow((x, y, w, h) => {
        if (w > 0 && h > 0) {
          registerKeyboardDismissExclusion(idRef.current, { x, y, w, h });
        }
      });
    });
  }, []);

  const handleLayout = useCallback(
    (e: LayoutChangeEvent) => {
      onLayout?.(e);
      measure();
    },
    [measure, onLayout]
  );

  useEffect(() => {
    const show = Keyboard.addListener("keyboardDidShow", measure);
    const hide = Keyboard.addListener("keyboardDidHide", measure);
    return () => {
      show.remove();
      hide.remove();
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      unregisterKeyboardDismissExclusion(idRef.current);
    };
  }, [measure]);

  return (
    <View
      ref={viewRef}
      collapsable={false}
      style={style}
      onLayout={handleLayout}
      {...rest}
    >
      {children}
    </View>
  );
}
