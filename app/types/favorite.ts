/**
 * Favorite-related types
 */

import { BarberStoreGetDto } from './store';
import { FreeBarGetDto } from './freebarber';

export type ToggleFavoriteDto = {
  targetId: string;
  targetType?: FavoriteTargetType; // Favori tipi (Store, FreeBarber, Customer, ManuelBarber)
  appointmentId?: string | null; // Opsiyonel: Randevu sayfasından geliyorsa appointmentId gönderilir
};

export type ToggleFavoriteResponseDto = {
  isFavorite: boolean;
  favoriteCount: number;
};

export enum FavoriteTargetType {
  Store = 1,
  FreeBarber = 2,
  Customer = 3,
  ManuelBarber = 4,
}

export type UserFavoriteDto = {
  id: string;
  firstName: string;
  lastName: string;
  imageUrl?: string | null;
  rating: number; // Ortalama rating
  favoriteCount: number; // Favori sayısı
  reviewCount: number; // Yorum sayısı
};

export type ManuelBarberFavoriteDto = {
  id: string;
  fullName: string;
  imageUrl?: string | null;
};

export type FavoriteGetDto = {
  id: string;
  favoritedFromId: string;
  favoritedToId: string;
  targetName?: string | null;
  targetImage?: string | null;
  createdAt: string;
  targetType: FavoriteTargetType;

  // Store detayları (targetType = Store ise dolu)
  store?: BarberStoreGetDto | null;

  // FreeBarber detayları (targetType = FreeBarber ise dolu)
  freeBarber?: FreeBarGetDto | null;

  // Customer detayları (targetType = Customer ise dolu)
  customer?: UserFavoriteDto | null;

  // ManuelBarber detayları (targetType = ManuelBarber ise dolu)
  manuelBarber?: ManuelBarberFavoriteDto | null;
};
