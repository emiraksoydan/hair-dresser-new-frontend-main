/** Türkçe para girişi: binlik nokta, ondalık virgül (örn. 1.234,56 veya 150) */
export const trMoneyRegex = /^(\d{1,3}(\.\d{3})*|\d+)(,\d{1,2})?$/;

export const parseTR = (s?: string) => {
    if (!s) return undefined;
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
};
