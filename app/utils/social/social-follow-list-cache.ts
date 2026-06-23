import type { SocialFollowListItemDto } from '../../types/social';

type FollowListArgs = {
  profileId: string;
  kind: 'followers' | 'following';
  before?: string;
  beforeId?: string;
};

let nextMergeFullReplaceKey: string | null = null;

export function requestSocialFollowListFullCacheReplace(profileId: string, kind: 'followers' | 'following'): void {
  nextMergeFullReplaceKey = `${kind}:${profileId}`;
}

function consumeFullReplace(profileId: string, kind: 'followers' | 'following'): boolean {
  const key = `${kind}:${profileId}`;
  if (nextMergeFullReplaceKey !== key) return false;
  nextMergeFullReplaceKey = null;
  return true;
}

export function serializeSocialFollowListArgs(args: FollowListArgs): string {
  return `${args.kind}:${args.profileId}`;
}

export function mergeSocialFollowListCachePages(
  currentCache: SocialFollowListItemDto[],
  newItems: SocialFollowListItemDto[],
  arg: FollowListArgs,
): SocialFollowListItemDto[] {
  const before = arg.before;
  if (before) {
    const seen = new Set(currentCache.map((x) => x.followId));
    return [...currentCache, ...newItems.filter((x) => !seen.has(x.followId))];
  }

  if (consumeFullReplace(arg.profileId, arg.kind) || !currentCache?.length) {
    return newItems;
  }

  if (!newItems?.length) {
    return newItems;
  }

  const oldest = currentCache[currentCache.length - 1];
  const tail = currentCache.filter(
    (x) =>
      x.followedAt < oldest.followedAt ||
      (x.followedAt === oldest.followedAt && x.followId < oldest.followId),
  );
  return [...newItems, ...tail];
}

type MutualListArgs = {
  profileId: string;
  before?: string;
  beforeId?: string;
};

export function serializeSocialMutualListArgs(args: MutualListArgs): string {
  return `mutual:${args.profileId}`;
}

export function mergeSocialMutualListCachePages(
  currentCache: SocialFollowListItemDto[],
  newItems: SocialFollowListItemDto[],
  arg: MutualListArgs,
): SocialFollowListItemDto[] {
  if (arg.before) {
    const seen = new Set(currentCache.map((x) => x.followId));
    return [...currentCache, ...newItems.filter((x) => !seen.has(x.followId))];
  }
  return newItems;
}
