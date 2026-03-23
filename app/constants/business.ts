/**
 * Business-related constants
 */

/**
 * Business types - translation keys
 * Use getBusinessTypes(t) function to get translated labels
 */
export const BUSINESS_TYPE_KEYS = [
    { translationKey: "barberType.maleHairdresser", value: "MaleHairdresser" },
    { translationKey: "barberType.femaleHairdresser", value: "FemaleHairdresser" },
    { translationKey: "barberType.beautySalon", value: "BeautySalon" },
] as const;

// Alias for backward compatibility
export const BUSINESS_TYPES = BUSINESS_TYPE_KEYS;

/**
 * Get business types with translated labels
 * @param t - Translation function from useLanguage hook
 */
export function getBusinessTypes(t: (key: string) => string) {
    return BUSINESS_TYPE_KEYS.map(bt => ({
        label: t(bt.translationKey),
        value: bt.value
    }));
}

/**
 * Backend BarberType enum değerleri
 * Backend'de: MaleHairdresser = 0, FemaleHairdresser = 1, BeautySalon = 2
 */
export const BARBER_TYPE_TO_ENUM: Record<string, number> = {
    'MaleHairdresser': 0,
    'FemaleHairdresser': 1,
    'BeautySalon': 2,
};

/**
 * Backend'den gelen kategori adlarını enum değerlerine map'ler
 * DB hiyerarşisindeki gerçek isimler: "Erkek Berber", "Kadın Kuaför", "Güzellik Salonu"
 */
export const CATEGORY_NAME_TO_ENUM: Record<string, number> = {
    // DB hiyerarşisindeki gerçek isimler
    'Erkek Berber': 0,
    'Kadın Kuaför': 1,
    'Güzellik Salonu': 2,
    // İngilizce enum değerleri
    'MaleHairdresser': 0,
    'FemaleHairdresser': 1,
    'BeautySalon': 2,
    // İngilizce okunabilir isimler
    'Male Hairdresser': 0,
    'Female Hairdresser': 1,
    'Beauty Salon': 2,
};

/**
 * Category name'i backend enum değerine dönüştürür
 * @param categoryName - Backend'den gelen kategori adı veya enum value
 * @param t - Translation function (optional, for reverse lookup)
 */
export function categoryNameToEnum(categoryName: string | undefined, t?: (key: string) => string): number | undefined {
    if (!categoryName) return undefined;
    if (categoryName === 'all') return undefined;

    // Direkt mapping'den kontrol et
    if (categoryName in CATEGORY_NAME_TO_ENUM) {
        return CATEGORY_NAME_TO_ENUM[categoryName];
    }

    // Direkt value olarak gönderilmişse (MaleHairdresser, FemaleHairdresser, BeautySalon)
    if (categoryName in BARBER_TYPE_TO_ENUM) {
        return BARBER_TYPE_TO_ENUM[categoryName];
    }

    // Translation function varsa, translated label'dan value'ya dönüştür
    if (t) {
        const businessTypes = getBusinessTypes(t);
        const businessType = businessTypes.find(bt => bt.label === categoryName);
        if (businessType) {
            return BARBER_TYPE_TO_ENUM[businessType.value];
        }
    }

    // Case-insensitive arama
    const lowerCategoryName = categoryName.toLowerCase();
    for (const [key, value] of Object.entries(CATEGORY_NAME_TO_ENUM)) {
        if (key.toLowerCase() === lowerCategoryName) {
            return value;
        }
    }

    return undefined;
}
