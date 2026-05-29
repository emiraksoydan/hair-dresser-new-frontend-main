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
  // FlatList cell wrap View'inde `width: '100%'` ve `alignItems: 'center'` olmazsa,
  // bazı RN sürümlerinde ilk render'da çocuğun (kart) genişliği 0 ölçülüp sonradan
  // düzeltiliyor → kullanıcının raporladığı "kart ilk render'da bozuk, scroll edince
  // düzeliyor" semptomunu üretir. Sabit %100 width + center align ile bu giderildi.
  return <View style={{ width: "100%", alignItems: "center" }}>{children}</View>;
}
