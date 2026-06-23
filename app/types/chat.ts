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
  isSocialThread?: boolean;
  /** Sosyal DM: mevcut kullanıcının bu thread'deki profil kimliği */
  viewerSocialProfileId?: string | null;
  title: string;
  lastMessagePreview?: string | null;
  lastMessageAt?: string | null;
  unreadCount: number;
  currentUserImageUrl?: string | null; // Mevcut kullanıcının profil resmi (mesaj balonlarında göstermek için)
  participants: ChatThreadParticipantDto[];
  /** Favorite thread + BarberStore counterparty: which store to favorite */
  favoriteStoreId?: string | null;
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
  /** Sosyal DM thread'lerinde karşı tarafın sosyal profil kimliği */
  socialProfileId?: string | null;
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
  /** İstemci tarafı: kayıt metering ile üretilen 0…1 tepe değerleri (API’de yoksa sadece lokal) */
  waveformPeaks?: number[] | null;
  /** File mesajları için orijinal dosya adı (backend tarafından doldurulur). */
  fileName?: string | null;
  /** true: mesaj gönderildikten sonra düzenlendi. */
  isEdited?: boolean;
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
