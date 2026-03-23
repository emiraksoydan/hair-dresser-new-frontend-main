/**
 * Filter types that match backend FilterRequestDto structure exactly
 */

export interface FilterRequestDto {
  // Konum bilgileri (nearby için)
  latitude?: number;
  longitude?: number;
  distanceKm?: number; // km - default 10.0

  // Arama
  searchQuery?: string;

  // Kullanıcı türü filtresi (backend expects Turkish: "Hepsi", "Serbest Berber", "Dükkan")
  userType?: string;

  // Ana kategori filtresi (BarberType)
  mainCategory?: number; // BarberType enum as number, null = Hepsi

  // Hizmet filtresi (CategoryId listesi)
  serviceIds?: string[];

  // Fiyat filtresi
  priceSort?: string; // "none", "asc", "desc"
  minPrice?: number;
  maxPrice?: number;

  // Pricing Type (Store için)
  pricingType?: string; // "all", "rent", "percent"

  // Müsaitlik (FreeBarber için)
  isAvailable?: boolean;

  // Açık/Kapalı durumu (Store için)
  isOpenNow?: boolean;

  // Puanlama
  minRating?: number; // 0-5

  // Favoriler
  favoritesOnly?: boolean;

  // Kullanıcı ID (favoriler ve diğer kullanıcıya özel filtreler için)
  currentUserId?: string;
}

