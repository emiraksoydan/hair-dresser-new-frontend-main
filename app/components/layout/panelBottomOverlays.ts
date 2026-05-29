/** CustomCurvedTabBar: height 60 + floatOffset 18 */
export const TAB_BAR_STACK_HEIGHT = 78;

/** FAB ile tab bar üstü arası — küçük değer FAB’ı taba yaklaştırır */
export const FAB_GAP_ABOVE_TAB = 8;
/** Ana FAB (Paper FAB.Group) — küçük boy; scroll/FAB çakışma hesapları için */
export const FAB_MAIN_DIAMETER = 44;
/** Açık menüde satırlar arası (MoreActionsFab column gap) */
export const FAB_MENU_STACK_GAP = 12;
/** Menü satırındaki yuvarlak ikon yüksekliği */
export const FAB_MENU_ROW_HEIGHT = 44;
/** Şerit ile menünün en alt ek satırı (harita vb.) arası */
export const COMPARE_STRIP_GAP_ABOVE_OPEN_MENU = 8;

/** MoreActionsFab ile aynı: ana + düğmesinin alt kenarı (ekran altından). */
export function getMoreFabAnchorBottom(insetsBottom: number): number {
  return Math.max(insetsBottom, 0) + TAB_BAR_STACK_HEIGHT + FAB_GAP_ABOVE_TAB;
}

/**
 * İki seçim yapılınca çıkan şeridin `bottom` değeri.
 * Kapalı FAB + açık FAB (üstteki aksiyon satırı) ile çakışmayacak şekilde.
 */
export function getCompareStripBottom(insetsBottom: number): number {
  const anchor = getMoreFabAnchorBottom(insetsBottom);
  return (
    anchor +
    FAB_MAIN_DIAMETER +
    FAB_MENU_STACK_GAP +
    FAB_MENU_ROW_HEIGHT +
    COMPARE_STRIP_GAP_ABOVE_OPEN_MENU
  );
}

/** Tab + FAB üstünde kalan alan için ScrollView contentContainerStyle.paddingBottom */
export function getTabFabScrollPadding(insetsBottom: number): number {
  return getMoreFabAnchorBottom(insetsBottom) + FAB_MAIN_DIAMETER + 20;
}
