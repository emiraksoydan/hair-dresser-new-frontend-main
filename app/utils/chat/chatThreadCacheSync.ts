import type { ChatThreadListItemDto } from '../../types';
import { buildSocialChatThreadsQuery, type SocialChatThreadsQueryArgs } from './chatThreadStrip';
import type { RootState, AppDispatch } from '../../store/redux-store';
import { api } from '../../store/api';

export type { SocialChatThreadsQueryArgs };
export { buildSocialChatThreadsQuery, buildDeletedSocialChatThreadsQuery } from './chatThreadStrip';

export function patchSocialThreadPreviewInDraft(
  draft: ChatThreadListItemDto[] | undefined,
  threadId: string,
  preview: string,
  lastMessageAt: string,
) {
  if (!draft) return;
  const thread = draft.find((t) => t.threadId === threadId);
  if (!thread) return;
  thread.lastMessagePreview = preview;
  thread.lastMessageAt = lastMessageAt;
  draft.sort((a, b) => {
    const aTs = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTs = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTs - aTs;
  });
}

export function upsertSocialThreadInDraft(
  draft: ChatThreadListItemDto[] | undefined,
  dto: ChatThreadListItemDto,
) {
  if (!draft) return;
  const index = draft.findIndex((t) => t.threadId === dto.threadId);
  if (index >= 0) draft[index] = dto;
  else draft.unshift(dto);
  draft.sort((a, b) => {
    const aTs = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTs = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTs - aTs;
  });
}

export function removeSocialThreadInDraft(
  draft: ChatThreadListItemDto[] | undefined,
  threadId: string,
) {
  if (!draft) return;
  const index = draft.findIndex((t) => t.threadId === threadId);
  if (index >= 0) draft.splice(index, 1);
}

export function markSocialThreadReadInDraft(
  draft: ChatThreadListItemDto[] | undefined,
  threadId: string,
) {
  if (!draft) return;
  const row = draft.find((t) => t.threadId === threadId);
  if (row) row.unreadCount = 0;
}

/** Sosyal inbox cache slot'u (profileId ile). */
export function socialChatThreadsCacheArg(profileId: string): SocialChatThreadsQueryArgs {
  return buildSocialChatThreadsQuery(profileId);
}

/** ThreadId içeren tüm sosyal inbox cache slotlarını günceller. */
export function patchSocialCachesForThread(
  getState: () => RootState,
  dispatch: AppDispatch,
  threadId: string,
  mutator: (draft: ChatThreadListItemDto[]) => void,
) {
  const queries = getState().api.queries;
  for (const entry of Object.values(queries)) {
    if (entry?.endpointName !== 'getSocialChatThreads') continue;
    const data = entry.data as ChatThreadListItemDto[] | undefined;
    if (!data?.some((t) => t.threadId === threadId)) continue;
    const args = entry.originalArgs as SocialChatThreadsQueryArgs | undefined;
    if (!args?.profileId) continue;
    dispatch(api.util.updateQueryData('getSocialChatThreads', args, mutator));
  }
}

/** viewerSocialProfileId bilinen thread push'ları için tek slot güncelleme. */
export function patchSocialCacheForProfile(
  dispatch: AppDispatch,
  profileId: string | null | undefined,
  mutator: (draft: ChatThreadListItemDto[]) => void,
) {
  if (!profileId) return;
  dispatch(api.util.updateQueryData('getSocialChatThreads', buildSocialChatThreadsQuery(profileId), mutator));
}
