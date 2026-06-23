/** Backend `SocialPostController.GetByProfile` max page size. */
export const SOCIAL_PROFILE_POSTS_PAGE_SIZE = 50;

/** Backend `SocialInteractionController.GetComments` default page size. */
export const SOCIAL_COMMENTS_PAGE_SIZE = 50;

/** Backend `SocialStoryController` viewers — max per request. */
export const SOCIAL_STORY_VIEWERS_PAGE_SIZE = 50;

/** @deprecated use SOCIAL_STORY_VIEWERS_PAGE_SIZE */
export const SOCIAL_STORY_VIEWERS_MAX = 100;

export function socialStoryViewersQuery(storyId: string) {
  return { storyId, limit: SOCIAL_STORY_VIEWERS_PAGE_SIZE } as const;
}

export function socialProfilePostsQuery(profileId: string) {
  return { profileId, limit: SOCIAL_PROFILE_POSTS_PAGE_SIZE } as const;
}

export function socialCommentsQuery(postId: string, parentCommentId?: string) {
  return {
    postId,
    ...(parentCommentId ? { parentCommentId } : {}),
    limit: SOCIAL_COMMENTS_PAGE_SIZE,
  } as const;
}
