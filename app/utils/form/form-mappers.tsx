/**
 * Common form mapping utilities
 * Centralizes mapping functions used across multiple form components
 */

/**
 * Maps business type string to numeric value
 * @param type - Business type string (e.g., "MaleHairdresser", "FemaleHairdresser", "BeautySalon")
 * @returns Numeric type value
 */
export const mapBarberType = (type: string): number => {
  const raw = (type ?? "").toString().trim();
  if (!raw) return 0;

  const asNum = Number(raw);
  if (!Number.isNaN(asNum) && Number.isFinite(asNum)) {
    if (asNum === 0) return 0;
    if (asNum === 1) return 1;
    if (asNum === 2) return 2;
  }

  if (raw === "MaleHairdresser") return 0;
  if (raw === "FemaleHairdresser") return 1;
  if (raw === "BeautySalon") return 2;

  const lower = raw.toLowerCase();
  const normalizeTr = (value: string) =>
    value
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/ı/g, "i")
      .replace(/İ/g, "i")
      .replace(/ğ/g, "g")
      .replace(/ş/g, "s")
      .replace(/ç/g, "c")
      .replace(/ö/g, "o")
      .replace(/ü/g, "u");

  const norm = normalizeTr(lower);

  if (norm === "erkek berber") return 0;
  if (norm === "bayan kuafor" || norm === "kadin kuafor") return 1;
  if (norm === "guzellik salonu") return 2;

  return 0;
};

/**
 * Maps business type number to string label
 * @param type - Numeric business type
 * @returns Business type string label
 */
export const mapTypeToLabel = (type: number): string => {
  switch (type) {
    case 0:
      return "MaleHairdresser";
    case 1:
      return "FemaleHairdresser";
    case 2:
      return "BeautySalon";
    default:
      return "";
  }
};

/**
 * Maps business type number to display name (Turkish)
 * @param type - Numeric business type
 * @returns Display name in Turkish
 */
export const mapTypeToDisplayName = (type: number | string): string => {
  // If it's already a Turkish display name, keep it
  if (typeof type === "string") {
    const raw = type.trim();
    const lower = raw.toLowerCase();

    if (lower === "erkek berber") return "Erkek Berber";
    if (lower === "bayan kuaför" || lower === "bayan kuafor" || lower === "kadın kuaför" || lower === "kadin kuafor") return "Kadın Kuaför";
    if (lower === "güzellik salonu" || lower === "guzellik salonu") return "Güzellik Salonu";

    // If it's enum label, map it
    if (raw === "MaleHairdresser") return "Erkek Berber";
    if (raw === "FemaleHairdresser") return "Kadın Kuaför";
    if (raw === "BeautySalon") return "Güzellik Salonu";

    // Numeric string support
    const n = Number(raw);
    if (!Number.isNaN(n) && Number.isFinite(n)) {
      return mapTypeToDisplayName(n);
    }

    return "";
  }

  switch (type) {
    case 0:
      return "Erkek Berber";
    case 1:
      return "Kadın Kuaför";
    case 2:
      return "Güzellik Salonu";
    default:
      return "";
  }
};

/**
 * Maps pricing mode to numeric value
 * @param mode - Pricing mode ('percent' or 'rent')
 * @returns Numeric pricing type (0 for percent, 1 for rent)
 */
export const mapPricingType = (mode: "percent" | "rent"): number => {
  return mode === "percent" ? 0 : 1;
};
