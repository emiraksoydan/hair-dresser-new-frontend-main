import type { SocialProfileDto } from '../../types/social';
import { SocialProfileOwnerType } from '../../types/social';
import { normalizeSocialProfileOwnerType } from './normalizeSocialProfile';
import { socialProfileOwnerLabel } from './socialProfileOwnerLabel';

export function socialProfileOwnerIcon(ownerType: SocialProfileOwnerType | unknown): string {
  switch (normalizeSocialProfileOwnerType(ownerType)) {
    case SocialProfileOwnerType.BarberStore:
      return 'store';
    case SocialProfileOwnerType.FreeBarber:
      return 'scissors-cutting';
    default:
      return 'account';
  }
}

/** Switcher / liste satırı için birincil başlık */
export function socialProfilePrimaryLabel(profile: SocialProfileDto): string {
  const name = profile.ownerDisplayName?.trim();
  if (name) return name;
  return `@${profile.username}`;
}

/** Switcher pill alt satırı */
export function socialProfileSecondaryLabel(
  profile: SocialProfileDto,
  t: (key: string) => string,
): string {
  const parts: string[] = [];
  parts.push(`@${profile.username}`);
  const typeLabel = socialProfileOwnerLabel(profile.ownerType, t);
  if (typeLabel) parts.push(typeLabel);
  if (profile.ownerNumber) parts.push(`#${profile.ownerNumber}`);
  return parts.join(' · ');
}
