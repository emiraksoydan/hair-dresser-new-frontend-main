import i18n from "../../i18n/config";
import { ChatMessageItemDto, ChatMessageType } from "../../types/chat";
import { parseSocialShareMessage, socialSharePreviewFromText, socialShareVisibleLine } from "../social/socialShareMessage";

/**
 * RTK/Immer `updateQueryData` taslağından çıkan proxy, produce bitince geçersizlenir.
 * Önizleme için produce içinde bu fonksiyonla düz kopya alın; aksi halde "Proxy handler is null" oluşur.
 */
export function plainMessageSnapshot(m: ChatMessageItemDto): ChatMessageItemDto {
  return {
    messageId: m.messageId,
    senderUserId: m.senderUserId,
    text: m.text,
    createdAt: m.createdAt,
    messageType: m.messageType,
    mediaUrl: m.mediaUrl ?? null,
    fileName: m.fileName ?? null,
    replyToMessageId: m.replyToMessageId ?? null,
    replyToTextPreview: m.replyToTextPreview ?? null,
    isEdited: m.isEdited,
    isFullyRead: m.isFullyRead,
    waveformPeaks: m.waveformPeaks ?? null,
  };
}

/**
 * Thread satırındaki önizleme metnini, sohbet mesajı DTO'sundan türetir (i18n ile).
 */
export function lastMessagePreviewFromChatMessage(m: ChatMessageItemDto | null | undefined): string {
  if (!m) return "";
  const type = m.messageType ?? ChatMessageType.Text;
  const raw = (m.text ?? "").trim();

  if (type === ChatMessageType.Text) {
    if (parseSocialShareMessage(m.text)) {
      const visible = socialShareVisibleLine(m.text);
      if (visible) return visible.length > 60 ? visible.substring(0, 60) : visible;
      return socialSharePreviewFromText(m.text);
    }
    const t = m.text ?? "";
    return t.length > 60 ? t.substring(0, 60) : t;
  }

  if (raw.length > 0) {
    return raw.length > 60 ? raw.substring(0, 60) : raw;
  }

  switch (type) {
    case ChatMessageType.Image:
      return String(i18n.t("chat.photo"));
    case ChatMessageType.Location:
      return String(i18n.t("chat.locationShared"));
    case ChatMessageType.File:
      return (m.fileName ?? "").trim() || String(i18n.t("chat.file"));
    case ChatMessageType.Audio:
      return String(i18n.t("chat.audioMessage"));
    default:
      return "";
  }
}
