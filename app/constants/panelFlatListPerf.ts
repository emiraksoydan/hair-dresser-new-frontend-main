/**
 * Panel kart FlatList sanallaştırma — değerler kasıtlı olarak gevşetildi;
 * scroll sırasında kart içeriğinin geç görünmesini azaltır.
 * Çok uzun listelerde bellek artışı olursa initialNumToRender / windowSize düşürülebilir.
 */
export const PANEL_FLAT_LIST_PERF = {
  removeClippedSubviews: false,
  initialNumToRender: 12,
  maxToRenderPerBatch: 12,
  updateCellsBatchingPeriod: 32,
  windowSize: 15,
} as const;
