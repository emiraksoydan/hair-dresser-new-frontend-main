/** Sosyal kullanıcı adı: küçük harf, rakam, alt çizgi, 3–30 karakter */
export const SOCIAL_USERNAME_PATTERN = /[a-z0-9_]{3,30}/i;

const MENTION_IN_TEXT = /@([a-z0-9_]{3,30})/gi;
const MENTION_QUERY_AT_END = /@([a-z0-9_]*)$/;

export function extractMentionUsernames(text: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_IN_TEXT.source, 'gi');
  while ((match = re.exec(text)) !== null) {
    const u = match[1]?.toLowerCase();
    if (!u || seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/** Yorum kutusunun sonundaki @sorgu parçasını döner (autocomplete için). */
export function getActiveMentionQuery(text: string): string | null {
  const match = text.match(MENTION_QUERY_AT_END);
  if (!match) return null;
  return match[1] ?? '';
}

export function insertMentionAtCursor(text: string, username: string): string {
  return text.replace(MENTION_QUERY_AT_END, `@${username.toLowerCase()} `);
}

export type MentionTextPart =
  | { type: 'text'; value: string }
  | { type: 'mention'; username: string };

export function splitTextByMentions(text: string): MentionTextPart[] {
  if (!text) return [];

  const parts: MentionTextPart[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_IN_TEXT.source, 'gi');

  while ((match = re.exec(text)) !== null) {
    const start = match.index ?? 0;
    if (start > lastIndex) {
      parts.push({ type: 'text', value: text.slice(lastIndex, start) });
    }
    parts.push({ type: 'mention', username: match[1].toLowerCase() });
    lastIndex = start + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push({ type: 'text', value: text.slice(lastIndex) });
  }

  return parts.length ? parts : [{ type: 'text', value: text }];
}
