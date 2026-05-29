import React, { useEffect, useRef, useState } from "react";
import { Text, TextProps } from "./Text";

type Props = {
  value: number;
  suffix?: string;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
  durationMs?: number;
  enabled?: boolean;
  /** Verilirse toLocaleString yerine kullanılır (örn. favori B/M) */
  formatDisplay?: (n: number) => string;
} & Omit<TextProps, "children">;

export function AnimatedMoneyText({
  value,
  suffix = "",
  minimumFractionDigits = 0,
  maximumFractionDigits = 2,
  locale = "tr-TR",
  durationMs = 450,
  enabled = true,
  formatDisplay,
  ...textProps
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }
    const from = fromRef.current;
    const to = value;
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(from + (to - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = to;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [value, durationMs, enabled]);

  const num =
    maximumFractionDigits > 0 || minimumFractionDigits > 0
      ? Number(display.toFixed(maximumFractionDigits))
      : Math.round(display);
  const formatted = formatDisplay
    ? formatDisplay(num)
    : num.toLocaleString(locale, {
        minimumFractionDigits,
        maximumFractionDigits,
      });

  return (
    <Text {...textProps}>
      {formatted}
      {suffix ? ` ${suffix}` : ""}
    </Text>
  );
}
