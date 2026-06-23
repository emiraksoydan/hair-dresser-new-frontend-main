import type { SocialPostDto } from '../../types/social';

let nextFeedMergeFullReplace = false;
let nextReelsMergeFullReplace = false;

export function requestSocialFeedFullCacheReplace(): void {
  nextFeedMergeFullReplace = true;
}

export function requestSocialReelsFullCacheReplace(): void {
  nextReelsMergeFullReplace = true;
}

function consumeFullReplace(kind: 'feed' | 'reels'): boolean {
  const flag = kind === 'feed' ? nextFeedMergeFullReplace : nextReelsMergeFullReplace;
  if (!flag) return false;
  if (kind === 'feed') nextFeedMergeFullReplace = false;
  else nextReelsMergeFullReplace = false;
  return true;
}

function normId(id: string | undefined): string {
  return (id ?? '').replace(/-/g, '').toLowerCase();
}

export function compareSocialPostsDesc(a: SocialPostDto, b: SocialPostDto): number {
  const ta = a.createdAt ?? '';
  const tb = b.createdAt ?? '';
  if (ta !== tb) return ta > tb ? 1 : -1;
  const ia = normId(a.id);
  const ib = normId(b.id);
  if (ia === ib) return 0;
  return ia > ib ? 1 : -1;
}

function mergeSocialPostListCachePages(
  kind: 'feed' | 'reels',
  currentCache: SocialPostDto[],
  newItems: SocialPostDto[],
  arg: unknown,
): SocialPostDto[] {
  const before = (arg as { before?: string } | undefined)?.before;
  if (before) {
    const seen = new Set(currentCache.map((p) => p.id));
    return [...currentCache, ...newItems.filter((p) => !seen.has(p.id))];
  }

  if (consumeFullReplace(kind) || !currentCache?.length) {
    return newItems;
  }

  if (!newItems?.length) {
    return newItems;
  }

  const oldestLoaded = currentCache[currentCache.length - 1];
  const tail = currentCache.filter((p) => compareSocialPostsDesc(oldestLoaded, p) > 0);
  return [...newItems, ...tail];
}

export function mergeSocialFeedCachePages(
  currentCache: SocialPostDto[],
  newItems: SocialPostDto[],
  arg: unknown,
): SocialPostDto[] {
  return mergeSocialPostListCachePages('feed', currentCache, newItems, arg);
}

export function mergeSocialReelsCachePages(
  currentCache: SocialPostDto[],
  newItems: SocialPostDto[],
  arg: unknown,
): SocialPostDto[] {
  return mergeSocialPostListCachePages('reels', currentCache, newItems, arg);
}

export function socialPostListCursorForceRefetch({
  currentArg,
  previousArg,
}: {
  currentArg: unknown;
  previousArg: unknown;
}): boolean {
  const cTs = (currentArg as { before?: string } | undefined)?.before ?? null;
  const pTs = (previousArg as { before?: string } | undefined)?.before ?? null;
  const cId = (currentArg as { beforeId?: string } | undefined)?.beforeId ?? null;
  const pId = (previousArg as { beforeId?: string } | undefined)?.beforeId ?? null;
  return cTs !== pTs || cId !== pId;
}
