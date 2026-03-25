/**
 * Notification-related types
 */

import { AppointmentStatus } from './appointment';

export enum NotificationType {
  AppointmentCreated = 0,
  AppointmentApproved = 1,
  AppointmentRejected = 2,
  AppointmentCancelled = 3,
  AppointmentCompleted = 4,
  AppointmentUnanswered = 5,
  AppointmentDecisionUpdated = 6,

  // 3'lü sistem için yeni bildirim tipleri
  FreeBarberRejectedInitial = 7,      // FreeBarber ilk isteği reddetti (Müşteri'ye)
  StoreRejectedSelection = 8,          // Store seçimi reddetti (FreeBarber+Müşteri'ye)
  StoreApprovedSelection = 9,          // Store onayladı (FreeBarber+Müşteri'ye)
  StoreSelectionTimeout = 10,          // Store 5dk cevap vermedi (FreeBarber+Müşteri'ye)
  CustomerRejectedFinal = 11,          // Müşteri final red verdi (FreeBarber+Store'a)
  CustomerApprovedFinal = 12,          // Müşteri final onay verdi (FreeBarber+Store'a)
  CustomerFinalTimeout = 13,           // Müşteri 30dk içinde cevap vermedi (Herkes'e)
}

export type NotificationDto = {
  id: string;
  type: NotificationType;
  appointmentId?: string | null;
  title: string;
  body?: string | null;
  payloadJson: string;
  createdAt: string;
  isRead: boolean;
  // Frontend-only field: SignalR event'lerinde React.memo re-render'ı tetiklemek için
  _updatedAt?: number;
};

export interface NotificationPayload {
  appointmentId: string;
  recipientRole: string;
  date?: string | null;
  startTime?: string | null;
  endTime?: string | null;

  store?: {
    storeId: string;
    storeOwnerUserId: string; // camelCase - backend JSON serialization camelCase kullanıyor
    /** Dükkan sahibinin müşteri numarası (backend: StoreNotifyDto.StoreOwnerNumber) */
    storeOwnerNumber?: string | null;
    storeName: string;
    imageUrl?: string;
    type?: number; // BarberType: 0 = MaleHairdresser, 1 = FemaleHairdresser, 2 = BeautySalon
    pricingType?: number; // PricingType enum
    pricingValue?: number;
    rating?: number;
    isInFavorites?: boolean; // Bu dükkan favorilerde mi?
    addressDescription?: string; // Dükkan adres açıklaması
  };
  customer?: {
    userId: string;
    displayName?: string;
    avatarUrl?: string;
    roleHint: string;
    type?: number; // FreeBarber için BarberType
    rating?: number; // FreeBarber için rating
    isInFavorites?: boolean; // Bu müşteri favorilerde mi?
    customerNumber?: string; // Müşteri numarası
  };
  freeBarber?: {
    userId: string;
    displayName: string;
    avatarUrl?: string;
    roleHint: string;
    type?: number; // BarberType: 0 = MaleHairdresser, 1 = FemaleHairdresser, 2 = BeautySalon
    rating?: number;
    isInFavorites?: boolean; // Bu serbest berber favorilerde mi?
    customerNumber?: string; // Müşteri numarası
  };
  chair?: {
    chairId: string;
    chairName: string;
    manuelBarberId?: string;
    manuelBarberName?: string;
    manuelBarberImageUrl?: string;
    manuelBarberRating?: number;
    manuelBarberType?: number; // BarberType for Manuel Barber
  };
  status?: AppointmentStatus;
  storeDecision?: number;
  freeBarberDecision?: number;
  customerDecision?: number;
  storeSelectionType?: number;
  note?: string | null;
  pendingExpiresAt?: string | null; // UTC formatında ISO string
  serviceOfferings?: Array<{
    id: string;
    serviceName: string;
    price: number;
  }>;

  // Favori durumu (recipient'a göre)
  isCustomerInFavorites?: boolean; // Store veya FreeBarber için müşteri favorilerinde mi?
  isFreeBarberInFavorites?: boolean; // Store için freeBarber favorilerinde mi?
  isStoreInFavorites?: boolean; // FreeBarber için store favorilerinde mi?
}



