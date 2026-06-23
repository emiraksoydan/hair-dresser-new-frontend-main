import { SOCIAL_ACCENT, SOCIAL_PAIR_BLUE, SOCIAL_PAIR_ORANGE } from '../../constants/socialTheme';

export const BIO_MAX_LENGTH = 500;

export const BIO_TEXT_COLORS = [
  { key: 'gold', hex: SOCIAL_ACCENT },
  { key: 'orange', hex: SOCIAL_PAIR_ORANGE },
  { key: 'blue', hex: SOCIAL_PAIR_BLUE },
  { key: 'green', hex: '#22c55e' },
  { key: 'pink', hex: '#ec4899' },
  { key: 'purple', hex: '#a855f7' },
] as const;

export type BioInlinePart =
  | { type: 'text'; value: string; color?: string }
  | { type: 'bold'; value: string; color?: string };

export function bioColorHex(key: string): string | undefined {
  return BIO_TEXT_COLORS.find((c) => c.key === key)?.hex;
}

/** Eski özel işaretlemeyi HTML'e çevirir (geriye dönük uyumluluk). */
export function legacyBioToHtml(text: string): string {
  if (!text?.trim()) return '<p></p>';
  if (text.trim().startsWith('<')) return text;

  let html = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/\{\{c:(\w+)\}\}([\s\S]*?)\{\{\/c\}\}/g, (_, key, inner) => {
    const hex = bioColorHex(key) ?? '#000000';
    return `<span style="color:${hex}">${inner}</span>`;
  });
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\n/g, '<br/>');

  return `<p>${html}</p>`;
}

export function isBioHtml(text: string): boolean {
  const t = text?.trim() ?? '';
  return t.startsWith('<') && (t.includes('<p') || t.includes('<div') || t.includes('<span') || t.includes('<strong'));
}

/** HTML veya düz metinden yaklaşık karakter sayısı. */
export function bioPlainLength(text: string): number {
  if (!text) return 0;
  if (isBioHtml(text)) {
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .trim().length;
  }
  return text.replace(/\{\{c:\w+\}\}|\{\{\/c\}\}|\*\*/g, '').length;
}

/** Eski özel işaretlemeyi çözümler (salt metin biyografiler için). */
export function parseFormattedBioText(text: string, parentColor?: string): BioInlinePart[] {
  if (!text) return [];

  const parts: BioInlinePart[] = [];
  let i = 0;

  while (i < text.length) {
    const rest = text.slice(i);
    const colorOpen = rest.match(/^\{\{c:(\w+)\}\}/);
    if (colorOpen) {
      const key = colorOpen[1]!;
      const closeIdx = text.indexOf('{{/c}}', i + colorOpen[0].length);
      if (closeIdx !== -1) {
        const inner = text.slice(i + colorOpen[0].length, closeIdx);
        parts.push(...parseFormattedBioText(inner, bioColorHex(key) ?? parentColor));
        i = closeIdx + 6;
        continue;
      }
    }

    const boldOpen = rest.match(/^\*\*([^*]+)\*\*/);
    if (boldOpen) {
      parts.push({ type: 'bold', value: boldOpen[1]!, color: parentColor });
      i += boldOpen[0].length;
      continue;
    }

    const nextSpecial = rest.search(/\{\{c:|\*\*/);
    const end = nextSpecial === -1 ? text.length : i + nextSpecial;
    if (end > i) {
      parts.push({ type: 'text', value: text.slice(i, end), color: parentColor });
      i = end;
    } else {
      parts.push({ type: 'text', value: text[i]!, color: parentColor });
      i += 1;
    }
  }

  return parts;
}

export function normalizeBioForEditor(value: string): string {
  if (!value?.trim()) return '<p></p>';
  if (isBioHtml(value)) return value;
  return legacyBioToHtml(value);
}

export function emptyBioHtml(): string {
  return '<p></p>';
}

export function isEmptyBio(value: string | null | undefined): boolean {
  if (!value?.trim()) return true;
  return bioPlainLength(value) === 0;
}

/** Editör fallback (Expo Go) için HTML → düz metin. */
export function bioToPlainDisplay(text: string): string {
  if (!text?.trim()) return '';
  if (isBioHtml(text)) {
    return text
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  return text.replace(/\{\{c:\w+\}\}/g, '').replace(/\{\{\/c\}\}/g, '').replace(/\*\*/g, '');
}

/** Düz metin → basit HTML (Expo Go fallback). */
export function plainToBioHtml(text: string): string {
  if (!text.trim()) return emptyBioHtml();
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<p>${escaped.replace(/\n/g, '<br/>')}</p>`;
}
