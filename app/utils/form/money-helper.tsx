export const moneyStringToNumber = (s: string) =>
    Number(s.replace(/\./g, '').replace(',', '.'));

export const parseTR = (s?: string) => {
    if (!s) return undefined;
    const n = Number(s.replace(/\./g, "").replace(",", "."));
    return Number.isFinite(n) ? n : undefined;
};
