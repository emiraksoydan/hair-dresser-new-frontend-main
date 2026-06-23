import type { SocialPostDto } from '../../types/social';

/** Verilen profil, şu an seçili aktif sosyal profil mi? */
export function isActiveSocialProfile(
  profileId: string | null | undefined,
  activeProfileId: string | null | undefined,
): boolean {
  return Boolean(profileId && activeProfileId && profileId === activeProfileId);
}

/** Gönderi / reel düzenleme-silme yalnızca aktif profile ait içerikte. */
export function isPostManagedByActiveProfile(
  post: Pick<SocialPostDto, 'profileId'>,
  activeProfileId: string | null | undefined,
): boolean {
  return isActiveSocialProfile(post.profileId, activeProfileId);
}

/** Hikâye silme / öne çıkarma yalnızca aktif profile ait hikâyede. */
export function isStoryManagedByActiveProfile(
  story: { profileId?: string },
  activeProfileId: string | null | undefined,
): boolean {
  return Boolean(story.profileId && isActiveSocialProfile(story.profileId, activeProfileId));
}
