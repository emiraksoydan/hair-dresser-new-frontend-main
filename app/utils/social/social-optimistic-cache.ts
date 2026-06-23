import type { SocialCommentDto, SocialPostDto, SocialProfileDto } from '../../types/social';
import { api } from '../../store/api';
import type { AppDispatch } from '../../store/redux-store';
import { socialCommentsQuery } from './social-pagination';

type ApiState = {
  api?: {
    queries?: Record<string, { endpointName?: string; originalArgs?: unknown; data?: unknown }>;
  };
};

function patchCachedEndpoint<T>(
  getState: () => unknown,
  dispatch: AppDispatch,
  endpointName: string,
  patchFn: (draft: T) => void,
): { undo: () => void }[] {
  const patches: { undo: () => void }[] = [];
  const queries = (getState() as ApiState).api?.queries ?? {};
  Object.values(queries).forEach((q) => {
    if (q?.endpointName !== endpointName || q.data === undefined) return;
    try {
      const patch = dispatch(
        api.util.updateQueryData(endpointName as never, q.originalArgs as never, patchFn as never),
      );
      if (patch && typeof (patch as { undo?: () => void }).undo === 'function') {
        patches.push(patch as { undo: () => void });
      }
    } catch {
      /* ignore */
    }
  });
  return patches;
}

function undoAll(patches: { undo: () => void }[]): void {
  patches.forEach((p) => {
    try {
      p.undo();
    } catch {
      /* ignore */
    }
  });
}

function toggleLikeOnPost(post: SocialPostDto): void {
  const next = !post.isLiked;
  post.isLiked = next;
  post.likeCount = Math.max(0, post.likeCount + (next ? 1 : -1));
}

function toggleLikeOnComment(comment: SocialCommentDto): void {
  const next = !comment.isLiked;
  comment.isLiked = next;
  comment.likeCount = Math.max(0, comment.likeCount + (next ? 1 : -1));
}

export function applyOptimisticSocialPostLike(
  getState: () => unknown,
  dispatch: AppDispatch,
  postId: string,
): { undo: () => void }[] {
  const patches = [
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialFeed', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleLikeOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialReelsFeed', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleLikeOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialProfilePosts', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleLikeOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'discoverSocialPosts', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleLikeOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSavedSocialPosts', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleLikeOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto>(getState, dispatch, 'getSocialPost', (draft) => {
      if (draft?.id === postId) toggleLikeOnPost(draft);
    }),
  ];
  return patches;
}

function toggleSaveOnPost(post: SocialPostDto): void {
  post.isSaved = !post.isSaved;
}

export function applyOptimisticSocialPostSave(
  getState: () => unknown,
  dispatch: AppDispatch,
  postId: string,
): { undo: () => void }[] {
  const patches = [
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialFeed', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleSaveOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialReelsFeed', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleSaveOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialProfilePosts', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleSaveOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'discoverSocialPosts', (draft) => {
      const post = draft.find((p) => p.id === postId);
      if (post) toggleSaveOnPost(post);
    }),
    ...patchCachedEndpoint<SocialPostDto>(getState, dispatch, 'getSocialPost', (draft) => {
      if (draft?.id === postId) toggleSaveOnPost(draft);
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSavedSocialPosts', (draft) => {
      const idx = draft.findIndex((p) => p.id === postId);
      if (idx >= 0) draft.splice(idx, 1);
    }),
  ];
  return patches;
}

export function applyOptimisticSocialCommentLike(
  getState: () => unknown,
  dispatch: AppDispatch,
  commentId: string,
): { undo: () => void }[] {
  return patchCachedEndpoint<SocialCommentDto[]>(getState, dispatch, 'getSocialComments', (draft) => {
    const comment = draft.find((c) => c.id === commentId);
    if (comment) toggleLikeOnComment(comment);
  });
}

export function applyOptimisticSocialFollow(
  getState: () => unknown,
  dispatch: AppDispatch,
  profileId: string,
  following: boolean,
): { undo: () => void }[] {
  const adjust = (profile: SocialProfileDto) => {
    profile.isFollowing = following;
    profile.followerCount = Math.max(0, profile.followerCount + (following ? 1 : -1));
  };

  return [
    ...patchCachedEndpoint<SocialProfileDto>(getState, dispatch, 'getSocialProfile', (draft) => {
      if (draft?.id === profileId) adjust(draft);
    }),
    ...patchCachedEndpoint<SocialProfileDto>(getState, dispatch, 'getSocialProfileByOwner', (draft) => {
      if (draft?.id === profileId) adjust(draft);
    }),
  ];
}

export function applyOptimisticSocialCommentAdded(
  getState: () => unknown,
  dispatch: AppDispatch,
  args: {
    postId: string;
    parentCommentId?: string;
    text: string;
    profile: SocialProfileDto;
    tempId: string;
  },
): { undo: () => void }[] {
  const optimistic: SocialCommentDto = {
    id: args.tempId,
    postId: args.postId,
    profile: args.profile,
    parentCommentId: args.parentCommentId ?? null,
    text: args.text,
    likeCount: 0,
    replyCount: 0,
    isLiked: false,
    createdAt: new Date().toISOString(),
  };

  const commentQueryArgs = args.parentCommentId
    ? socialCommentsQuery(args.postId, args.parentCommentId)
    : socialCommentsQuery(args.postId);

  const patches = [
    ...patchCachedEndpoint<SocialPostDto>(getState, dispatch, 'getSocialPost', (draft) => {
      if (draft?.id === args.postId) draft.commentCount += 1;
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialFeed', (draft) => {
      const post = draft.find((p) => p.id === args.postId);
      if (post) post.commentCount += 1;
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialReelsFeed', (draft) => {
      const post = draft.find((p) => p.id === args.postId);
      if (post) post.commentCount += 1;
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'getSocialProfilePosts', (draft) => {
      const post = draft.find((p) => p.id === args.postId);
      if (post) post.commentCount += 1;
    }),
    ...patchCachedEndpoint<SocialPostDto[]>(getState, dispatch, 'discoverSocialPosts', (draft) => {
      const post = draft.find((p) => p.id === args.postId);
      if (post) post.commentCount += 1;
    }),
  ];

  // getSocialComments may have multiple cache entries; patch the specific one
  try {
    const patch = dispatch(
      api.util.updateQueryData('getSocialComments', commentQueryArgs, (draft) => {
        draft.unshift(optimistic);
      }),
    );
    patches.push(patch);
  } catch {
    /* ignore */
  }

  if (args.parentCommentId) {
    try {
      const parentPatch = dispatch(
        api.util.updateQueryData('getSocialComments', socialCommentsQuery(args.postId), (draft) => {
          const parent = draft.find((c) => c.id === args.parentCommentId);
          if (parent) parent.replyCount += 1;
        }),
      );
      patches.push(parentPatch);
    } catch {
      /* ignore */
    }
  }

  return patches;
}

export function replaceOptimisticSocialComment(
  dispatch: AppDispatch,
  postId: string,
  parentCommentId: string | undefined,
  tempId: string,
  real: SocialCommentDto,
): void {
  const commentQueryArgs = parentCommentId
    ? socialCommentsQuery(postId, parentCommentId)
    : socialCommentsQuery(postId);

  try {
    dispatch(
      api.util.updateQueryData('getSocialComments', commentQueryArgs, (draft) => {
        const idx = draft.findIndex((c) => c.id === tempId);
        if (idx !== -1) draft[idx] = real;
        else draft.unshift(real);
      }),
    );
  } catch {
    /* ignore */
  }
}

export { undoAll };
