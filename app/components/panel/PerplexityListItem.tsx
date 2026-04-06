import React, { ReactNode } from "react";
import { View } from "react-native";

/**
 * Önceki sürümde scroll ile opacity/scale vardı; animasyonlar kaldırıldı.
 * Eski çağrılar uyumluluk için aynı prop imzası korunur (yok sayılır).
 */
type Props = {
  scrollPos?: unknown;
  index?: number;
  horizontal?: boolean;
  pixelSpace?: boolean;
  pixelFocusHalfWidth?: number;
  children: ReactNode;
};

export function PerplexityListItem({ children }: Props) {
  return <View>{children}</View>;
}
