/**
 * Authentication and user-related types
 */

export enum UserType {
  Customer = 0,
  FreeBarber = 1,
  BarberStore = 2
}

export enum OtpPurpose {
  Register = 0,
  Login = 1,
  Reset = 2,
}

export type JwtPayload = {
  identifier: string;
  sub?: string; // Standard JWT subject claim
  userId?: string; // Alternative user ID field
  name: string;
  lastName: string;
  userType: string;
  exp?: number; // Expiration timestamp
  iat?: number; // Issued at timestamp
  nbf?: number;
  iss?: string;
  aud?: string;
};

export type AccessTokenDto = {
  token: string;
  expiration: string;
  refreshToken: string;
  refreshTokenExpires: string;
  /** Yeni kayıt: kullanım rehberi uyarısı göster */
  showHelpGuideOnboarding?: boolean;
};

export interface VerifyOtpRequest {
  firstName: string;
  lastName: string;
  phoneNumber: string;
  code: string;
  device: string | null;
  userType: number;
  mode: string;
  password?: string;
}

export interface UpdateUserDto {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
}

export interface UserProfileDto {
  id: string;
  firstName: string;
  lastName: string;
  phoneNumber: string;
  userType: UserType;
  customerNumber: string; // Müşteri numarası
  imageId?: string;
  image?: {
    id: string;
    imageUrl: string;
    ownerType: number;
    imageOwnerId: string;
  };
  isActive: boolean;
}

export interface SettingGetDto {
  id: string;
  userId: string;
  showImageAnimation: boolean;
  showPriceAnimation: boolean;
  notificationSoundUrl?: string;
}

export interface SettingUpdateDto {
  showImageAnimation: boolean;
  /** Backend: null/omit = mevcut değeri koru; biz her zaman gönderiyoruz. */
  showPriceAnimation?: boolean;
  // notificationSoundUrl kaldırıldı - kullanıcı ayarlardan seçemez, backend'deki varsayılan ses kullanılır
}

export interface HelpGuideGetDto {
  id: string;
  userType: number; // UserType enum değeri (0: Customer, 1: FreeBarber, 2: BarberStore)
  title: string;
  description: string;
  /** helpGuide.entries.{key} — boşsa title/description (TR) kullanılır */
  translationKey?: string;
  order: number;
  isActive: boolean;
}

