import type { SocialPostDto, SocialPostMediaDto, SocialProfileDto } from '../../types/social';
import { SocialPostType } from '../../types/social';
import { normalizeSocialProfileDto } from './normalizeSocialProfile';
export function normalizeSocialPostType(raw: unknown): SocialPostType {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return raw as SocialPostType;
  }
  if (typeof raw === 'string') {
    const key = raw.trim();
    const byName: Record<string, SocialPostType> = {
      Photo: SocialPostType.Photo,
      photo: SocialPostType.Photo,
      Carousel: SocialPostType.Carousel,
      carousel: SocialPostType.Carousel,
      Video: SocialPostType.Video,
      video: SocialPostType.Video,
      Reel: SocialPostType.Reel,
      reel: SocialPostType.Reel,
    };
    if (key in byName) return byName[key];
    const num = Number(key);
    if (Number.isFinite(num)) return num as SocialPostType;
  }
  return SocialPostType.Photo;
}

function normalizeMedia(raw: unknown): SocialPostMediaDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? o.Id ?? '').trim();
  const mediaUrl = String(o.mediaUrl ?? o.MediaUrl ?? '').trim();
  if (!id && !mediaUrl) return null;
  return {
    id: id || mediaUrl,
    sortOrder: Number(o.sortOrder ?? o.SortOrder ?? 0),
    mediaUrl,
    thumbnailUrl: (o.thumbnailUrl ?? o.ThumbnailUrl ?? null) as string | null,
    durationSec: (o.durationSec ?? o.DurationSec ?? null) as number | null,
  };
}

/** API yanıtındaki eksik/hatalı alanları düzeltir (profil grid, tab filtreleri). */
export function normalizeSocialPostDto(raw: unknown): SocialPostDto | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = String(o.id ?? o.Id ?? '').trim();
  if (!id) return null;

  const mediaRaw = o.media ?? o.Media;
  const media = Array.isArray(mediaRaw)
    ? mediaRaw.map(normalizeMedia).filter((m): m is SocialPostMediaDto => m != null)
    : [];

  const profileRaw = o.profile ?? o.Profile;
  const profile = profileRaw ? normalizeSocialProfileDto(profileRaw) : undefined;

  return {
    ...(o as unknown as SocialPostDto),
    id,
    profileId: String(o.profileId ?? o.ProfileId ?? ''),
    type: normalizeSocialPostType(o.type ?? o.Type),
    media,
    profile: profile ?? (o.profile as unknown as SocialProfileDto),
    viewCount: Number(o.viewCount ?? o.ViewCount ?? 0),
    likeCount: Number(o.likeCount ?? o.LikeCount ?? 0),
    commentCount: Number(o.commentCount ?? o.CommentCount ?? 0),
    isLiked: Boolean(o.isLiked ?? o.IsLiked ?? false),
    isSaved: Boolean(o.isSaved ?? o.IsSaved ?? false),
    isOwnPost: Boolean(o.isOwnPost ?? o.IsOwnPost ?? false),
    createdAt: String(o.createdAt ?? o.CreatedAt ?? ''),
  };
}

export function normalizeSocialPostList(raw: unknown): SocialPostDto[] {
  if (!Array.isArray(raw)) return [];
  return raw.map(normalizeSocialPostDto).filter((p): p is SocialPostDto => p != null);
}

export function isSocialReelType(type: SocialPostType): boolean {
  return normalizeSocialPostType(type) === SocialPostType.Reel;
}

export function isSocialVideoType(type: SocialPostType): boolean {
  return normalizeSocialPostType(type) === SocialPostType.Video;
}

export function isSocialPhotoTabType(type: SocialPostType): boolean {
  const t = normalizeSocialPostType(type);
  return t === SocialPostType.Photo || t === SocialPostType.Carousel;
}
