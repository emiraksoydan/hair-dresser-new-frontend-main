import type { ChatThreadListItemDto } from '../../types';
import { AppointmentStatus } from '../../types/appointment';

export const SOCIAL_CHAT_THREADS_PAGE_SIZE = 50;

/** Normal mod mesaj listesi / detay şeridi — MessageThreadList ile aynı. */
export const CHAT_THREADS_PAGE_SIZE = 30;

export type SocialChatThreadsQueryArgs = {
  profileId: string;
  before?: string;
  beforeId?: string;
  limit?: number;
};

/** Aktif sosyal profile göre inbox sorgusu. */
export function buildSocialChatThreadsQuery(profileId: string): SocialChatThreadsQueryArgs {
  return { profileId, limit: SOCIAL_CHAT_THREADS_PAGE_SIZE };
}

export function buildDeletedSocialChatThreadsQuery(profileId: string): SocialChatThreadsQueryArgs {
  return { profileId, limit: SOCIAL_CHAT_THREADS_PAGE_SIZE };
}

/** Normal mod thread listesi / detay şeridi ilk sayfa. */
export const CHAT_THREADS_QUERY = { limit: CHAT_THREADS_PAGE_SIZE } as const;

/** Normal mod mesaj listesi / detay şeridi — MessageThreadList ile aynı. */
export function mergeChatThreadsForStrip(
  mainThreads?: ChatThreadListItemDto[] | null,
  socialThreads?: ChatThreadListItemDto[] | null,
): ChatThreadListItemDto[] {
  const map = new Map<string, ChatThreadListItemDto>();

  for (const thread of [...(socialThreads ?? []), ...(mainThreads ?? [])]) {
    const existing = map.get(thread.threadId);
    if (!existing) {
      map.set(thread.threadId, thread);
      continue;
    }
    const existingTs = existing.lastMessageAt ? Date.parse(existing.lastMessageAt) : 0;
    const nextTs = thread.lastMessageAt ? Date.parse(thread.lastMessageAt) : 0;
    if (nextTs >= existingTs) map.set(thread.threadId, thread);
  }

  return Array.from(map.values()).sort((a, b) => {
    const aTs = a.lastMessageAt ? Date.parse(a.lastMessageAt) : 0;
    const bTs = b.lastMessageAt ? Date.parse(b.lastMessageAt) : 0;
    return bTs - aTs;
  });
}

export function getThreadStripParticipant(thread: ChatThreadListItemDto) {
  return thread.participants?.[0] ?? null;
}

/** Normal mod şerit/liste: randevu (pending/approved) + favori; sosyal thread'ler hariç. */
export function isThreadVisibleInMainList(thread: ChatThreadListItemDto): boolean {
  if (thread.isSocialThread) return false;
  if (thread.isFavoriteThread) return true;
  return (
    thread.status === AppointmentStatus.Pending ||
    thread.status === AppointmentStatus.Approved
  );
}

export function filterThreadsForDetailStrip(
  threads: ChatThreadListItemDto[],
  socialContext: boolean,
): ChatThreadListItemDto[] {
  const filtered = socialContext ? threads : threads.filter(isThreadVisibleInMainList);
  return filtered.filter((t) => getThreadStripParticipant(t));
}
