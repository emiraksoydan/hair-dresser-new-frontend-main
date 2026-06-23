import i18n from '../../i18n/config';

export type SocialSharePayload = {
  kind: 'post' | 'profile';
  id: string;
};

export function encodeSocialShareMessage(visibleLine: string, payload: SocialSharePayload): string {
  return `${visibleLine}\n${JSON.stringify({ _socialShare: payload })}`;
}

export function parseSocialShareMessage(text: string | null | undefined): SocialSharePayload | null {
  if (!text?.trim()) return null;
  const lines = text.trim().split('\n');
  for (let i = lines.length - 1; i >= 0; i--) {
    try {
      const parsed = JSON.parse(lines[i]!) as { _socialShare?: SocialSharePayload };
      const s = parsed?._socialShare;
      if (s?.kind && s?.id) return s;
    } catch {
      /* not json line */
    }
  }
  try {
    const parsed = JSON.parse(text) as { _socialShare?: SocialSharePayload };
    const s = parsed?._socialShare;
    if (s?.kind && s?.id) return s;
  } catch {
    /* ignore */
  }
  return null;
}

export function socialSharePreviewFromText(text: string | null | undefined): string {
  const payload = parseSocialShareMessage(text);
  if (!payload) return '';
  return payload.kind === 'post'
    ? String(i18n.t('social.sharedPostPreview'))
    : String(i18n.t('social.sharedProfilePreview'));
}

export function socialShareVisibleLine(text: string | null | undefined): string | null {
  if (!parseSocialShareMessage(text)) return null;
  const first = text?.trim().split('\n')[0];
  return first?.trim() || null;
}
