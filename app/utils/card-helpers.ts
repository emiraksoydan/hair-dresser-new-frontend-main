import { BarberType } from '../types';
import i18n from '../i18n/config';

/**
 * Get barber type label text (localized)
 */
export const getBarberTypeLabel = (type: BarberType): string => {
  switch (type) {
    case BarberType.MaleHairdresser:
      return i18n.t('barberType.maleHairdresser');
    case BarberType.FemaleHairdresser:
      return i18n.t('barberType.femaleHairdresser');
    case BarberType.BeautySalon:
      return i18n.t('barberType.beautySalon');
    default:
      return '';
  }
};

/**
 * Get short barber type label (for compact views) (localized)
 */
export const getShortBarberTypeLabel = (type: BarberType): string => {
  switch (type) {
    case BarberType.MaleHairdresser:
      return i18n.t('barberType.maleHairdresserShort');
    case BarberType.FemaleHairdresser:
      return i18n.t('barberType.femaleHairdresserShort');
    default:
      return '';
  }
};

/**
 * Get barber type icon name
 */
export const getBarberTypeIcon = (type: BarberType): string => {
  switch (type) {
    case BarberType.MaleHairdresser:
      return 'face-man';
    case BarberType.FemaleHairdresser:
      return 'face-woman';
    case BarberType.BeautySalon:
      return 'store';
    default:
      return 'account';
  }
};
