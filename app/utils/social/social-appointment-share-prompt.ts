import type { AppointmentGetDto } from '../../types/appointment';
import { AppointmentStatus } from '../../types/appointment';
import { SocialProfileOwnerType } from '../../types/social';

export type AppointmentShareRole = 'customer' | 'store' | 'freeBarber';

export type AppointmentShareMentionTarget = {
  ownerType: SocialProfileOwnerType;
  ownerId: string;
};

type Listener = (appointment: AppointmentGetDto) => void;
const listeners = new Set<Listener>();

export function subscribeAppointmentSharePrompt(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Yalnızca UI'dan (Tamamla veya karttaki Paylaş) çağrılır — SignalR tetiklemiyor. */
export function requestAppointmentSharePrompt(appointment: AppointmentGetDto): void {
  if (appointment.status !== AppointmentStatus.Completed) return;
  listeners.forEach((listener) => listener(appointment));
}

export function getAppointmentShareRole(
  appointment: AppointmentGetDto,
  currentUserId: string | null | undefined,
): AppointmentShareRole | null {
  if (!currentUserId) return null;
  if (appointment.customerUserId === currentUserId) return 'customer';
  if (appointment.storeUserId === currentUserId) return 'store';
  if (appointment.freeBarberUserId === currentUserId) return 'freeBarber';
  return null;
}

/** Tamamlanan randevuda katılımcı ve en az bir paylaşım hedefi varsa kartta buton göster. */
export function shouldShowAppointmentShareButton(
  appointment: AppointmentGetDto,
  currentUserId: string | null | undefined,
): boolean {
  if (appointment.status !== AppointmentStatus.Completed) return false;
  const role = getAppointmentShareRole(appointment, currentUserId);
  if (!role) return false;
  return resolveAppointmentShareMentionTargets(appointment, role).length > 0;
}

export function appointmentShareCounterpartyName(
  appointment: AppointmentGetDto,
  role: AppointmentShareRole,
): string {
  if (role === 'customer') {
    const parts: string[] = [];
    if (appointment.storeName?.trim()) parts.push(appointment.storeName.trim());
    if (appointment.freeBarberName?.trim()) parts.push(appointment.freeBarberName.trim());
    if (parts.length > 0) return parts.join(' & ');
    return appointmentShareFallbackName(appointment);
  }
  if (appointment.customerName?.trim()) return appointment.customerName.trim();
  if (appointment.storeName?.trim()) return appointment.storeName.trim();
  if (appointment.freeBarberName?.trim()) return appointment.freeBarberName.trim();
  return '';
}

function appointmentShareFallbackName(appointment: AppointmentGetDto): string {
  if (appointment.storeName?.trim()) return appointment.storeName.trim();
  if (appointment.freeBarberName?.trim()) return appointment.freeBarberName.trim();
  if (appointment.manuelBarberName?.trim()) return appointment.manuelBarberName.trim();
  return '';
}

export function appointmentShareServiceSummary(appointment: AppointmentGetDto): string {
  const names: string[] = [];
  appointment.services?.forEach((s) => {
    if (s.serviceName?.trim()) names.push(s.serviceName.trim());
  });
  appointment.packages?.forEach((p) => {
    if (p.packageName?.trim()) names.push(p.packageName.trim());
  });
  return names.slice(0, 3).join(', ');
}

/**
 * Paylaşan rolüne göre etiketlenecek taraflar (ikili / üçlü randevu).
 * - Müşteri: işletme + serbest berber (varsa ikisi)
 * - İşletme: müşteri + serbest berber (üçlü)
 * - Serbest berber: müşteri + işletme (üçlü veya işletme çağrısı)
 */
export function resolveAppointmentShareMentionTargets(
  appointment: AppointmentGetDto,
  role: AppointmentShareRole,
): AppointmentShareMentionTarget[] {
  const targets: AppointmentShareMentionTarget[] = [];

  if (role === 'customer') {
    if (appointment.barberStoreId) {
      targets.push({
        ownerType: SocialProfileOwnerType.BarberStore,
        ownerId: appointment.barberStoreId,
      });
    }
    if (appointment.freeBarberId) {
      targets.push({
        ownerType: SocialProfileOwnerType.FreeBarber,
        ownerId: appointment.freeBarberId,
      });
    }
    return targets;
  }

  if (role === 'store') {
    if (appointment.customerUserId) {
      targets.push({
        ownerType: SocialProfileOwnerType.Customer,
        ownerId: appointment.customerUserId,
      });
    }
    if (appointment.freeBarberId) {
      targets.push({
        ownerType: SocialProfileOwnerType.FreeBarber,
        ownerId: appointment.freeBarberId,
      });
    }
    return targets;
  }

  if (appointment.customerUserId) {
    targets.push({
      ownerType: SocialProfileOwnerType.Customer,
      ownerId: appointment.customerUserId,
    });
  }
  if (appointment.barberStoreId) {
    targets.push({
      ownerType: SocialProfileOwnerType.BarberStore,
      ownerId: appointment.barberStoreId,
    });
  }
  return targets;
}

export function appointmentShareCaptionKey(role: AppointmentShareRole): string {
  switch (role) {
    case 'store':
      return 'social.appointmentShareCaptionStore';
    case 'freeBarber':
      return 'social.appointmentShareCaptionBarber';
    default:
      return 'social.appointmentShareCaption';
  }
}

export function appointmentShareSubtitleKey(role: AppointmentShareRole): string {
  switch (role) {
    case 'store':
      return 'social.appointmentShareSubtitleStore';
    case 'freeBarber':
      return 'social.appointmentShareSubtitleBarber';
    default:
      return 'social.appointmentShareSubtitle';
  }
}
