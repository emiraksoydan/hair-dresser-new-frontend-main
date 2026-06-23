/**
 * Panel kart FlatList sanallaştırma ayarları.
 *
 * removeClippedSubviews: ekran dışındaki hücreler native tarafta detach edilir;
 * kart başına carousel + çok sayıda view içeren listelerde bellek ve frame
 * süresini belirgin düşürür. (expo-image cache'i sayesinde geri scroll'da
 * görseller anında geldiği için "geç görünme" yan etkisi minimumdur.)
 *
 * windowSize 15 → 9: bellekte tutulan ekran sayısı azaltıldı; autoplay'li
 * carousel'lerin aynı anda mount kalma sayısını da sınırlar.
 */
export const PANEL_FLAT_LIST_PERF = {
  removeClippedSubviews: true,
  initialNumToRender: 8,
  maxToRenderPerBatch: 8,
  updateCellsBatchingPeriod: 50,
  windowSize: 9,
} as const;
