/**
 * Filter types that match backend FilterRequestDto structure exactly
 */

import type { BarberStoreGetDto } from './store';
import type { FreeBarGetDto } from './freebarber';

export interface DiscoveryFilteredResponseDto {
  stores: BarberStoreGetDto[];
  freeBarbers: FreeBarGetDto[];
}

export interface SavedFilterGetDto {
  id: string;
  name: string;
  filterCriteriaJson: string;
  /** Kayıt sırasındaki şema; backend ile uyumlu */
  filterSchemaVersion?: number;
  createdAt: string;
}

export interface SavedFilterCreateDto {
  name: string;
  filterCriteriaJson: string;
}

export interface SavedFilterUpdateDto {
  id: string;
  name: string;
  filterCriteriaJson: string;
}

export interface FilterRequestDto {
  // Konum bilgileri (nearby için)
  latitude?: number;
  longitude?: number;
  distanceKm?: number; // km — varsayılan backend ile 50; "sınırsız" için büyük değer (FE preset)

  // Arama
  searchQuery?: string;

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

  /**
   * 0 Any | 1 Ready (mağaza: açık, serbest berber: müsait) | 2 NotReady
   * Backend AvailabilityFilter
   */
  availability?: number;

  // Puanlama
  minRating?: number; // 0-5

  // Favoriler
  favoritesOnly?: boolean;

  // Kullanıcı ID (favoriler ve diğer kullanıcıya özel filtreler için)
  currentUserId?: string;
}

