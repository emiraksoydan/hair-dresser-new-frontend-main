import { router } from 'expo-router';
import {
  NotificationType,
  isSocialNotificationType,
  parseSocialNotificationPayload,
} from '../../types/notification';

/**
 * FCM data payload'ından sosyal bildirim deep link'i çözümler.
 * Başarılıysa true döner (doğrudan ekrana gitti).
 */
export function tryNavigateFromSocialPush(data: Record<string, string> | undefined): boolean {
  if (!data) return false;

  const payloadRaw = data.payload ?? data.payloadJson ?? '{}';
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(payloadRaw) as Record<string, unknown>;
  } catch {
    payload = {};
  }

  if (payload.kind === 'socialChat' && payload.threadId) {
    router.push({
      pathname: '/(screens)/chat/[threadId]',
      params: { threadId: String(payload.threadId), source: 'social' },
    } as never);
    return true;
  }

  const typeNum = Number(data.type);
  if (!Number.isFinite(typeNum) || !isSocialNotificationType(typeNum as NotificationType)) {
    return false;
  }

  const socialPayload = parseSocialNotificationPayload(payloadRaw);
  if (!socialPayload) return false;

  if (socialPayload.postId) {
    router.push({
      pathname: '/(screens)/social/post-detail',
      params: { postId: String(socialPayload.postId) },
    } as never);
    return true;
  }

  if (socialPayload.storyId && socialPayload.actorProfileId) {
    router.push({
      pathname: '/(screens)/social/profile-view',
      params: {
        profileId: String(socialPayload.actorProfileId),
        openStoryId: String(socialPayload.storyId),
      },
    } as never);
    return true;
  }

  if (socialPayload.actorProfileId) {
    router.push({
      pathname: '/(screens)/social/profile-view',
      params: { profileId: String(socialPayload.actorProfileId) },
    } as never);
    return true;
  }

  return false;
}
