import type { SocialProfileDto, SocialPostDto } from '../../types/social';
import { normalizeSocialProfileDto } from './normalizeSocialProfile';

/** Gönderi kartında yazar satırı — kendi içeriğinde güncel aktif profili kullan. */
export function resolveSocialPostAuthorProfile(
  post: SocialPostDto,
  activeProfile?: SocialProfileDto | null,
): SocialProfileDto {
  if (post.isOwnPost && activeProfile && post.profileId === activeProfile.id) {
    return activeProfile;
  }
  if (post.profile) {
    const normalized = normalizeSocialProfileDto(post.profile);
    if (normalized) return normalized;
  }
  return post.profile;
}
