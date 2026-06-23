import { SocialProfileOwnerType } from '../../types/social';
import { normalizeSocialProfileOwnerType } from './normalizeSocialProfile';

export function socialProfileOwnerLabel(
  ownerType: SocialProfileOwnerType | unknown,
  t: (key: string) => string,
): string {
  switch (normalizeSocialProfileOwnerType(ownerType)) {
    case SocialProfileOwnerType.FreeBarber:
      return t('social.ownerFreeBarber');
    case SocialProfileOwnerType.BarberStore:
      return t('social.ownerStore');
    default:
      return t('social.ownerCustomer');
  }
}

export function socialProfileOwnerNumberLabel(
  ownerType: SocialProfileOwnerType | unknown,
  t: (key: string) => string,
): string {
  switch (normalizeSocialProfileOwnerType(ownerType)) {
    case SocialProfileOwnerType.BarberStore:
      return t('social.storeNumber');
    case SocialProfileOwnerType.FreeBarber:
      return t('social.barberNumber');
    default:
      return t('social.customerNumber');
  }
}
