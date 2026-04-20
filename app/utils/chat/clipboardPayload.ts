import { ChatMessageType } from "../../types/chat";

/** Kopyala menüsünden gelen pano JSON'u (klavye yapıştırması dahil) */
export type ChatClipboardPayload = {
  _chatClip: true;
  messageType: ChatMessageType;
  text?: string | null;
  mediaUrl?: string | null;
  fileName?: string | null;
  waveformPeaks?: number[] | null;
};

export function parseChatClipboardPayload(raw: string): ChatClipboardPayload | null {
  const t = raw.trim();
  if (!t.startsWith("{")) return null;
  try {
    const j = JSON.parse(t) as Record<string, unknown>;
    if (j && j._chatClip === true && typeof j.messageType === "number") {
      return {
        _chatClip: true,
        messageType: j.messageType as ChatMessageType,
        text: typeof j.text === "string" || j.text === null ? (j.text as string | null) : null,
        mediaUrl: typeof j.mediaUrl === "string" || j.mediaUrl === null ? (j.mediaUrl as string | null) : null,
        fileName: typeof j.fileName === "string" || j.fileName === null ? (j.fileName as string | null) : null,
        waveformPeaks: Array.isArray(j.waveformPeaks) ? (j.waveformPeaks as number[]) : null,
      };
    }
  } catch {
    return null;
  }
  return null;
}
