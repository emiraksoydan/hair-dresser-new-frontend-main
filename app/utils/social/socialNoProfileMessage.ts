import { UserType } from '../../types';

type SocialTranslate = (key: string) => string;

export function getSocialNoProfilePanelMessage(
  t: SocialTranslate,
  userType: UserType | null | undefined,
): string {
  if (userType === UserType.FreeBarber) {
    return t('social.noProfilePanelMessageFreeBarber');
  }
  if (userType === UserType.BarberStore) {
    return t('social.noProfilePanelMessageStore');
  }
  if (userType === UserType.Customer) {
    return t('social.noProfilePanelMessageCustomer');
  }
  return t('social.noProfilePanelMessageGeneric');
}

export function getSocialProfileRequiredMessage(
  t: SocialTranslate,
  userType: UserType | null | undefined,
): string {
  if (userType === UserType.FreeBarber) {
    return t('social.profileRequiredFreeBarber');
  }
  if (userType === UserType.BarberStore) {
    return t('social.profileRequiredStore');
  }
  return t('social.profileRequiredCustomer');
}
