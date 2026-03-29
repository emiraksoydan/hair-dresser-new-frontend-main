import React, { useEffect, useRef, useState } from "react";
import { Text, TextProps } from "./Text";

type Props = {
  value: number;
  durationMs?: number;
  enabled?: boolean;
} & Omit<TextProps, "children">;

/**
 * Tam sayı değişimlerinde kısa sayaç animasyonu (favori / yorum sayıları vb.).
 */
export function AnimatedCountText({
  value,
  durationMs = 380,
  enabled = true,
  ...textProps
}: Props) {
  const [display, setDisplay] = useState(Math.round(value));
  const fromRef = useRef(Math.round(value));
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const target = Math.round(value);
    if (!enabled) {
      setDisplay(target);
      fromRef.current = target;
      return;
    }
    const from = fromRef.current;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, enabled]);

  return (
    <Text {...textProps}>{display}</Text>
  );
}
