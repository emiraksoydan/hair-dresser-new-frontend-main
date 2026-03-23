/**
 * Chat-related types
 */

import { AppointmentStatus } from './appointment';
import { UserType, BarberType } from './index';

export type ChatThreadListItemDto = {
  threadId: string; // Her thread için unique ID (hem randevu hem favori için)
  appointmentId?: string | null; // Nullable: favori thread'lerde null
  status?: AppointmentStatus | null; // Nullable: favori thread'lerde null
  isFavoriteThread: boolean;
  title: string;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  currentUserImageUrl?: string | null; // Mevcut kullanıcının profil resmi (mesaj balonlarında göstermek için)
  participants: ChatThreadParticipantDto[];
};

export type ChatThreadParticipantDto = {
  userId: string;
  displayName: string;
  imageUrl?: string | null;
  userType: UserType;
  barberType?: BarberType | null; // Store veya FreeBarber için
};

export type ChatMessageItemDto = {
  messageId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
  isFullyRead?: boolean; // optional: yeni/optimistic mesajlarda henüz set edilmez (default false)
};

export type ChatMessagesReadEvent = {
  threadId: string;
  readerUserId: string;
  messageIds: string[];
};

export type ChatMessageDto = {
  threadId: string;
  appointmentId?: string | null; // Nullable: favori thread'lerde null
  messageId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
};
