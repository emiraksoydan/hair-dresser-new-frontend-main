import { UserType } from "../types";

type StoreLike = { barberStoreOwnerId?: string; isOwnStore?: boolean };
type FreeBarberLike = { freeBarberUserId?: string; isOwnPanel?: boolean };

/** Dükkan favorileri: yalnızca serbest berber için başkalarının dükkanları. */
export function shouldFilterStoresToOthersOnly(userType: UserType | undefined): boolean {
  return userType === UserType.FreeBarber;
}

/** Serbest berber favorileri: müşteri tümünü görür; serbest berber / dükkan sahibi kendi profilini karşılaştırmaya dahil edemez. */
export function shouldFilterOwnFreeBarberFromCompare(userType: UserType | undefined): boolean {
  return userType === UserType.FreeBarber || userType === UserType.BarberStore;
}

export function isOtherUsersStore(store: StoreLike, currentUserId: string | undefined | null): boolean {
  if (!currentUserId) return true;
  if (store.isOwnStore) return false;
  if (store.barberStoreOwnerId && store.barberStoreOwnerId === currentUserId) return false;
  return true;
}

export function isOtherUsersFreeBarber(fb: FreeBarberLike, currentUserId: string | undefined | null): boolean {
  if (!currentUserId) return true;
  if (fb.isOwnPanel) return false;
  if (fb.freeBarberUserId && fb.freeBarberUserId === currentUserId) return false;
  return true;
}
