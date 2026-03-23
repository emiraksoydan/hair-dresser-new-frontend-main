/**
 * Free Barber-related types
 */

import { BarberType, ImageGetDto, ServiceOfferingGetDto } from './common';
import type { CreateImageDto, ServiceOfferingCreateDto, ServiceOfferingUpdateDto, UpdateImageDto } from './store';

export type FreeBarberCreateDto = {
  firstName: string;
  lastName: string;
  type: BarberType;
  imageList?: CreateImageDto[];
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  barberCertificateImageId?: string;
  beautySalonCertificateImageId?: string;
  offerings: ServiceOfferingCreateDto[];
};

export type FreeBarberUpdateDto = {
  id: string;
  firstName: string;
  lastName: string;
  type: BarberType;
  imageList?: UpdateImageDto[];
  latitude: number;
  longitude: number;
  isAvailable: boolean;
  barberCertificateImageId?: string;
  beautySalonCertificateImageId?: string;
  offerings: ServiceOfferingUpdateDto[];
};

export type FreeBarGetDto = {
  id: string;
  freeBarberUserId?: string;
  fullName: string;
  rating: number;
  favoriteCount: number;
  isFavorited?: boolean;
  isAvailable: boolean;
  distanceKm: number;
  type: BarberType;
  reviewCount: number;
  latitude: number;
  longitude: number;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
  isOwnPanel?: boolean; // Kullanıcının kendi paneli mi (filtrelerden etkilenmez)
  /** Güzellik salonu sertifikası varsa dolu; kartta "Güzellik Uzmanı" chip gösterilir */
  beautySalonCertificateImageId?: string | null;
};

export type FreeBarberPanelDto = {
  id: string;
  freeBarberUserId?: string;
  fullName: string;
  rating: number;
  favoriteCount: number;
  isAvailable: boolean;
  type: BarberType;
  reviewCount: number;
  latitude: number;
  longitude: number;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
  /** Güzellik salonu sertifikası varsa dolu; kartta "Güzellik Uzmanı" chip gösterilir */
  beautySalonCertificateImageId?: string | null;
};

export type FreeBarberMinePanelDetailDto = {
  id: string;
  firstName: string;
  lastName: string;
  type: BarberType;
  isAvailable: boolean;
  barberCertificateImageId?: string;
  barberCertificateImage?: ImageGetDto;
  beautySalonCertificateImageId?: string;
  beautySalonCertificateImage?: ImageGetDto;
  offerings: ServiceOfferingGetDto[];
  imageList: ImageGetDto[];
  latitude?: number;
  longitude?: number;
};

// Re-export from store types for convenience
export type { CreateImageDto, ServiceOfferingCreateDto, ServiceOfferingUpdateDto, UpdateImageDto };


