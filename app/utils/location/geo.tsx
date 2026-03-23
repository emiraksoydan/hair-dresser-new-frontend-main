export const toNum = (v: any): number | null => {
    if (v === null || v === undefined) return null;
    const n = typeof v === "string" ? Number(v.replace(",", ".")) : Number(v);
    return Number.isFinite(n) ? n : null;
};

export const isValidCoord = (lat: number | null, lon: number | null): boolean => {
    if (lat === null || lon === null) return false;
    if (lat < -90 || lat > 90) return false;
    if (lon < -180 || lon > 180) return false;
    if (lat === 0 && lon === 0) return false; // çoğu DB’de “boş” fallback’i
    return true;
};

export const safeCoord = (latAny: any, lonAny: any) => {
    const lat = toNum(latAny);
    const lon = toNum(lonAny);
    return isValidCoord(lat, lon) ? { lat: lat!, lon: lon! } : null;
};
