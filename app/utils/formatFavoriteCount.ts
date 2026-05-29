/**
 * Favori sayısı: &lt;1000 düz; ≥1000 … B (bin); ≥1_000_000 … M (milyon).
 * Bin/milyon için tek ondalak (aşağı yuvarlamalı) ve virgül ayırıcı.
 */
function formatOneDecimalTrunc(v: number): string {
  const r = Math.round(v * 1e6) / 1e6;
  if (Math.abs(r - Math.round(r)) < 1e-6) return String(Math.round(r));
  return r.toFixed(1).replace(".", ",");
}

export function formatFavoriteCount(count: number): string {
  const n = Math.max(0, Math.floor(Number.isFinite(count) ? count : 0));
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = Math.floor(n / 100) / 10;
    return `${formatOneDecimalTrunc(v)} B`;
  }
  if (n < 1_000_000_000) {
    const v = Math.floor(n / 100_000) / 10;
    return `${formatOneDecimalTrunc(v)} M`;
  }
  return `${Math.floor(n / 1_000_000)} M`;
}
