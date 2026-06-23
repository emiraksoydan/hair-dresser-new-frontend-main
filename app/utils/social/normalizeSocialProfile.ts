import { UserType } from '../../types';
import type { SocialProfileDto } from '../../types/social';
import { SocialProfileOwnerType } from '../../types/social';

export function normalizeSocialProfileOwnerType(raw: unknown): SocialProfileOwnerType {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw as SocialProfileOwnerType;
  }
  if (typeof raw === 'string') {
    const key = raw.trim();
    const byName: Record<string, SocialProfileOwnerType> = {
      Customer: SocialProfileOwnerType.Customer,
      customer: SocialProfileOwnerType.Customer,
      '0': SocialProfileOwnerType.Customer,
      FreeBarber: SocialProfileOwnerType.FreeBarber,
      freeBarber: SocialProfileOwnerType.FreeBarber,
      '1': SocialProfileOwnerType.FreeBarber,
      BarberStore: SocialProfileOwnerType.BarberStore,
      barberStore: SocialProfileOwnerType.BarberStore,
      '2': SocialProfileOwnerType.BarberStore,
    };
    if (key in byName) return byName[key];
    const num = Number(key);
    if (Number.isFinite(num)) return num as SocialProfileOwnerType;
  }
  return SocialProfileOwnerType.Customer;
}

export function userTypeToSocialOwnerType(userType: UserType | null): SocialProfileOwnerType | null {
  if (userType === UserType.FreeBarber) return SocialProfileOwnerType.FreeBarber;
  if (userType === UserType.BarberStore) return SocialProfileOwnerType.BarberStore;
  if (userType === UserType.Customer) return SocialProfileOwnerType.Customer;
  return null;
}

export function normalizeSocialProfileDto(raw: unknown): SocialProfileDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? o.Id ?? '').trim();
  if (!id) return null;
  return {
    ...(o as unknown as SocialProfileDto),
    id,
    ownerType: normalizeSocialProfileOwnerType(o.ownerType ?? o.OwnerType),
    ownerId: String(o.ownerId ?? o.OwnerId ?? ''),
    userId: String(o.userId ?? o.UserId ?? ''),
    username: String(o.username ?? o.Username ?? ''),
    postCount: Number(o.postCount ?? o.PostCount ?? 0),
    followerCount: Number(o.followerCount ?? o.FollowerCount ?? 0),
    followingCount: Number(o.followingCount ?? o.FollowingCount ?? 0),
    isPrivate: Boolean(o.isPrivate ?? o.IsPrivate ?? false),
    isFollowing: Boolean(o.isFollowing ?? o.IsFollowing ?? false),
    isOwnProfile: Boolean(o.isOwnProfile ?? o.IsOwnProfile ?? false),
  };
}

export function normalizeSocialProfileList(raw: unknown): SocialProfileDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSocialProfileDto).filter((p): p is SocialProfileDto => p != null);
}

export function pickPreferredSocialProfile(
  profiles: SocialProfileDto[],
  userType: UserType | null,
  storedProfileId?: string | null,
): SocialProfileDto | undefined {
  if (!profiles.length) return undefined;

  if (storedProfileId) {
    const stored = profiles.find((p) => p.id === storedProfileId);
    if (stored) return stored;
  }

  const preferredOwner = userTypeToSocialOwnerType(userType);
  if (preferredOwner != null) {
    const match = profiles.find(
      (p) => normalizeSocialProfileOwnerType(p.ownerType) === preferredOwner,
    );
    if (match) return match;
  }

  return profiles[0];
}

export function socialActiveProfileStorageKey(userId: string | null | undefined): string {
  const uid = (userId ?? '').trim().toLowerCase();
  return uid ? `social:activeProfileId:${uid}` : 'social:activeProfileId';
}
