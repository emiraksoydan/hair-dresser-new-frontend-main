/** In-app / tab badge label: 1–99 as-is, 100+ shown as "+99" */
export function badgeCountLabel(count: number): string {
  if (count > 99) return "+99";
  return String(count);
}
