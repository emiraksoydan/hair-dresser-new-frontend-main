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
  /**
   * true: mevcut kullanıcı karşı tarafı favoriye ALMAMIŞSA.
   * Thread listede görünür ve badge alınmaya devam eder,
   * ancak detaya girilemez, mesaj gönderilemez, okundu yapılamaz.
   */
  isRestrictedForCurrentUser: boolean;
};

export type ChatThreadParticipantDto = {
  userId: string;
  displayName: string;
  imageUrl?: string | null;
  userType: UserType;
  barberType?: BarberType | null; // Store veya FreeBarber için
};

export enum ChatMessageType {
  Text = 0,
  Image = 1,
  Location = 2,
  File = 3,
  Audio = 4,
}

export type ChatMessageItemDto = {
  messageId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
  isFullyRead?: boolean; // optional: yeni/optimistic mesajlarda henüz set edilmez (default false)
  messageType?: ChatMessageType;
  mediaUrl?: string | null;
  replyToMessageId?: string | null;
  replyToTextPreview?: string | null;
};

export type ChatMessagesReadEvent = {
  threadId: string;
  readerUserId: string;
  messageIds: string[];
};

export type ChatMessageDto = {
  threadId: string;
  messageId: string;
  senderUserId: string;
  text: string;
  createdAt: string;
  messageType?: ChatMessageType;
  mediaUrl?: string | null;
  replyToMessageId?: string | null;
  replyToTextPreview?: string | null;
};
