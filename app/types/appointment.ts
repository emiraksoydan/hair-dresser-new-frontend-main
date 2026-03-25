/**
 * Appointment-related types
 */

import { BarberType, ServiceOfferingGetDto } from './common';
import { PricingType } from './store';

export enum AppointmentStatus {
  Pending = 0,
  Approved = 1,
  Completed = 2,
  Cancelled = 3,
  Rejected = 4,
  Unanswered = 5,
}

export enum DecisionStatus {
  Pending = 0,
  Approved = 1,
  Rejected = 2,
  NoAnswer = 3,
}

export enum AppointmentRequester {
  Customer = 1,
  Store = 2,
  FreeBarber = 3,
}

export enum StoreSelectionType {
  CustomRequest = 0, // İsteğime Göre
  StoreSelection = 1, // Dükkan Seç
}

export type CreateAppointmentRequestDto = {
  storeId?: string | null;
  chairId?: string | null;
  appointmentDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  freeBarberUserId?: string | null;
  serviceOfferingIds: string[]; // ✅ Sadece ID'ler (services değil)
  requestLatitude?: number | null;
  requestLongitude?: number | null;
  storeSelectionType?: StoreSelectionType | null;
  note?: string | null;
};

export type AddStoreToAppointmentRequestDto = {
  storeId: string;
  chairId: string;
  appointmentDate: string;
  startTime: string;
  endTime: string;
  serviceOfferingIds: string[]; // ✅ Sadece ID'ler
};

export type CreateStoreToFreeBarberRequestDto = {
  storeId: string;
  freeBarberUserId: string;
};


export enum AppointmentFilter {
  /** Admin API: tüm durumlar */
  All = 0,
  Active = 1,
  Completed = 2,
  Cancelled = 3,
  Pending = 4,
}

// Hizmet Detayı
export type AppointmentServiceDto = {
  serviceId: string;
  serviceName: string;
  price: number;
}

// Ana Randevu DTO'su
export type AppointmentGetDto = {
  id: string;
  chairId?: string;
  chairName?: string;
  startTime: string; // "14:30:00"
  endTime: string;
  appointmentDate: string; // "2025-12-14"
  status: AppointmentStatus;
  createdAt: string;

  services: AppointmentServiceDto[];
  totalPrice: number;
  pricingType: PricingType;
  pricingValue: number;
  appointmentRequester: AppointmentRequester

  // Store
  barberStoreId?: string;
  storeUserId?: string; // Dükkan sahibinin User ID'si (şikayet için)
  storeName?: string;
  storeImage?: string;
  storeOwnerNumber?: string; // Dükkan sahibi numarası
  isStoreFavorite: boolean;
  storeType: BarberType;
  myRatingForStore?: number;
  myCommentForStore?: string;
  storeAverageRating?: number; // Store'un ortalama rating'i
  storeAddressDescription?: string; // Dükkan adres açıklaması

  // FreeBarber
  freeBarberId?: string;
  freeBarberUserId?: string; // FreeBarber'ın User ID'si (şikayet için)
  freeBarberName?: string;
  freeBarberImage?: string;
  freeBarberNumber?: string; // Serbest berber numarası
  isFreeBarberFavorite: boolean;
  myRatingForFreeBarber?: number;
  myCommentForFreeBarber?: string;
  freeBarberAverageRating?: number; // FreeBarber'ın ortalama rating'i

  // ManuelBarber
  manuelBarberId?: string;
  manuelBarberName?: string;
  manuelBarberImage?: string;
  myRatingForManuelBarber?: number;
  myCommentForManuelBarber?: string;
  manuelBarberAverageRating?: number; // ManuelBarber'ın ortalama rating'i

  // Customer
  customerUserId?: string;
  customerName?: string;
  customerImage?: string;
  customerNumber?: string; // Müşteri numarası
  isCustomerFavorite: boolean;
  myRatingForCustomer?: number;
  myCommentForCustomer?: string;
  customerAverageRating?: number; // Customer'ın ortalama rating'i
  
  // Decision statuses
  storeDecision?: DecisionStatus;
  freeBarberDecision?: DecisionStatus;
  customerDecision?: DecisionStatus;
  
  // StoreSelectionType
  storeSelectionType?: StoreSelectionType;
  
  // Note
  note?: string; // Randevu notu (Customer -> FreeBarber randevusunda)

  // Frontend-only field: SignalR event'lerinde React.memo re-render'ı tetiklemek için
  _updatedAt?: number;
}

export type SlotDto = {
  slotId: string;
  start: string;
  end: string;
  isBooked: boolean;
  isPast: boolean;
};

export type ChairSlotDto = {
  chairId: string;
  chairName?: string;
  barberId?: string | null;
  barberName?: string | null;
  barberRating?: number | null;
  slots: SlotDto[];
};
