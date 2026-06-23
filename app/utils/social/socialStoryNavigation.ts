import type { Router } from 'expo-router';

type StoryNavPayload = {
  storyId?: string | null;
  actorProfileId?: string | null;
};

/** Hikaye bildirimlerinden ilgili profile + story viewer açılışı. */
export function navigateToSocialStory(
  router: Pick<Router, 'push'>,
  payload: StoryNavPayload,
): boolean {
  const storyId = payload.storyId?.trim();
  const profileId = payload.actorProfileId?.trim();
  if (!storyId || !profileId) return false;

  router.push({
    pathname: '/(screens)/social/profile-view',
    params: { profileId, openStoryId: storyId },
  } as never);
  return true;
}
