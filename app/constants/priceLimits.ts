/** TRY — backend `PriceLimits.MaxMonetaryTry` ile aynı (≈1 milyar TL). */
export const MAX_MONETARY_TRY = 999_999_999.99;

/** UI / i18n için formatlanmış üst limit (ör. form.priceExceedsPlatformMax). */
export const MAX_MONETARY_TRY_DISPLAY = MAX_MONETARY_TRY.toLocaleString("tr-TR", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function isMonetaryWithinLimit(n: number): boolean {
  return Number.isFinite(n) && n >= 0 && n <= MAX_MONETARY_TRY + 1e-6;
}
