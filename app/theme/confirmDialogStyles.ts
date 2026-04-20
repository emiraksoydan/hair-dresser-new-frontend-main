/**
 * Onay / silme / kaydet gibi diyaloglarda tutarlı yumuşak yeşil ve iptal (kırmızı) tonları.
 */

export const SOFT_CONFIRM_BG_LIGHT = "#a7f3d0";
export const SOFT_CONFIRM_TEXT_LIGHT = "#047857";
/** Açık temada yeşil alanı çerçeveyle netleştirir */
export const SOFT_CONFIRM_BORDER_LIGHT = "rgba(16, 185, 129, 0.42)";

/** Koyu arka plan üzerinde aynı “belirgin yumuşak yeşil” hissi */
export const SOFT_CONFIRM_BG_DARK = "#34d399";
export const SOFT_CONFIRM_TEXT_DARK = "#022c22";
export const SOFT_CONFIRM_BORDER_DARK = "rgba(52, 211, 153, 0.55)";

export const SOFT_CANCEL_BORDER = "rgba(220, 38, 38, 0.45)";
export const SOFT_CANCEL_TEXT = "#b91c1c";

/** İptal: zeminde net görünen yumuşak kırmızı/pembe */
export function softCancelSurface(isDark: boolean) {
  return isDark
    ? {
        backgroundColor: "rgba(185, 28, 28, 0.32)",
        borderColor: "rgba(248, 113, 113, 0.55)",
      }
    : {
        backgroundColor: "#fecdd3",
        borderColor: "rgba(220, 38, 38, 0.4)",
      };
}

export function primaryConfirmButtonColors(isDark: boolean) {
  return isDark
    ? {
        backgroundColor: SOFT_CONFIRM_BG_DARK,
        color: SOFT_CONFIRM_TEXT_DARK,
        borderColor: SOFT_CONFIRM_BORDER_DARK,
      }
    : {
        backgroundColor: SOFT_CONFIRM_BG_LIGHT,
        color: SOFT_CONFIRM_TEXT_LIGHT,
        borderColor: SOFT_CONFIRM_BORDER_LIGHT,
      };
}
