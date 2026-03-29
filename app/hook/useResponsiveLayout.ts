import { useMemo } from "react";
import { PixelRatio, useWindowDimensions } from "react-native";

/** ~iPhone 13 genişliği; ölçek referansı */
const BASE_WIDTH = 390;

/**
 * Ekran boyutuna göre wp/hp (yüzde), ms (moderate scale) ve kırılımlar.
 * Tüm uygulamada import edilerek sabit px yerine kullanılabilir.
 */
export function useResponsiveLayout() {
  const { width, height, fontScale } = useWindowDimensions();

  return useMemo(() => {
    const wp = (p: number) => (width * p) / 100;
    const hp = (p: number) => (height * p) / 100;
    const ms = (size: number, factor = 0.5) => {
      const scale = width / BASE_WIDTH;
      const n = size + (scale - 1) * size * factor;
      return Math.max(10, Math.round(PixelRatio.roundToNearestPixel(n)));
    };

    return {
      width,
      height,
      fontScale,
      wp,
      hp,
      ms,
      isCompact: width < 360,
      isTablet: width >= 768,
    };
  }, [width, height, fontScale]);
}
