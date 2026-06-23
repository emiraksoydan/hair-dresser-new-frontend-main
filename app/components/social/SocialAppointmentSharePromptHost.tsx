import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { useAuth } from '../../hook/useAuth';
import { useActiveSocialProfile } from '../../hook/useActiveSocialProfile';
import { useBottomSheet } from '../../hook/useBottomSheet';
import { useLanguage } from '../../hook/useLanguage';
import {
  api,
  useGetAllBlockedUserIdsQuery,
} from '../../store/api';
import { useAppDispatch } from '../../store/hook';
import { showSnack } from '../../store/snackbarSlice';
import type { AppointmentGetDto } from '../../types/appointment';
import type { SocialProfileDto } from '../../types/social';
import { SocialProfileOwnerType } from '../../types/social';
import { normalizeSocialProfileOwnerType } from '../../utils/social/normalizeSocialProfile';
import { getSocialProfileRequiredMessage } from '../../utils/social/socialNoProfileMessage';
import {
  appointmentShareCaptionKey,
  appointmentShareCounterpartyName,
  appointmentShareServiceSummary,
  appointmentShareSubtitleKey,
  getAppointmentShareRole,
  resolveAppointmentShareMentionTargets,
  subscribeAppointmentSharePrompt,
  type AppointmentShareRole,
} from '../../utils/social/social-appointment-share-prompt';
import {
  AppointmentSharePromptPayload,
  SocialAppointmentSharePromptSheet,
} from './SocialAppointmentSharePromptSheet';

function pickPosterProfileId(
  appointment: AppointmentGetDto,
  role: AppointmentShareRole,
  profiles: SocialProfileDto[],
  activeProfileId: string | null,
): string | null {
  if (!profiles.length) return null;

  if (role === 'customer') {
    const customer = profiles.find(
      (p) => normalizeSocialProfileOwnerType(p.ownerType) === SocialProfileOwnerType.Customer,
    );
    return customer?.id ?? profiles[0]?.id;
  }

  if (role === 'store' && appointment.barberStoreId) {
    const match = profiles.find(
      (p) =>
        normalizeSocialProfileOwnerType(p.ownerType) === SocialProfileOwnerType.BarberStore &&
        p.ownerId === appointment.barberStoreId,
    );
    if (match) return match.id;
    const anyStore = profiles.find(
      (p) => normalizeSocialProfileOwnerType(p.ownerType) === SocialProfileOwnerType.BarberStore,
    );
    if (anyStore) return anyStore.id;
  }

  if (role === 'freeBarber' && appointment.freeBarberId) {
    const match = profiles.find(
      (p) =>
        normalizeSocialProfileOwnerType(p.ownerType) === SocialProfileOwnerType.FreeBarber &&
        p.ownerId === appointment.freeBarberId,
    );
    if (match) return match.id;
    const anyBarber = profiles.find(
      (p) => normalizeSocialProfileOwnerType(p.ownerType) === SocialProfileOwnerType.FreeBarber,
    );
    if (anyBarber) return anyBarber.id;
  }

  if (activeProfileId && profiles.some((p) => p.id === activeProfileId)) return activeProfileId;
  return profiles[0]?.id ?? null;
}

export const SocialAppointmentSharePromptHost: React.FC = () => {
  const { userId, userType } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { profiles, activeProfileId } = useActiveSocialProfile();
  const { data: blockedUserIds = [] } = useGetAllBlockedUserIdsQuery(undefined, {
    skip: !userId,
  });
  const blockedIdSet = useMemo(
    () => new Set(blockedUserIds.map(String)),
    [blockedUserIds],
  );
  const sheet = useBottomSheet({ snapPoints: ['58%'] });
  const [payload, setPayload] = useState<AppointmentSharePromptPayload | null>(null);
  const inFlightRef = useRef(false);
  const pendingQueueRef = useRef<AppointmentGetDto[]>([]);

  const presentPrompt = useCallback(
    async (appointment: AppointmentGetDto) => {
      if (inFlightRef.current) {
        pendingQueueRef.current.push(appointment);
        return;
      }

      const role = getAppointmentShareRole(appointment, userId);
      if (!role) return;

      try {
        const sharedIds = await dispatch(
          api.endpoints.getAppointmentSocialShareStatus.initiate(
            { appointmentIds: [appointment.id] },
            { subscribe: false },
          ),
        ).unwrap();
        if (sharedIds.includes(appointment.id)) return;
      } catch {
        /* paylaşım durumu alınamazsa sheet yine açılabilir */
      }

      const mentionTargets = resolveAppointmentShareMentionTargets(appointment, role);
      if (mentionTargets.length === 0) return;

      const posterProfileId = pickPosterProfileId(appointment, role, profiles, activeProfileId);
      if (!posterProfileId) {
        dispatch(showSnack({ message: getSocialProfileRequiredMessage(t, userType), isError: true }));
        return;
      }

      inFlightRef.current = true;
      try {
        const resolvedProfiles = (
          await Promise.all(
            mentionTargets.map(async (target) => {
              try {
                return await dispatch(
                  api.endpoints.getSocialProfileByOwner.initiate(
                    { ownerType: target.ownerType, ownerId: target.ownerId },
                    { subscribe: false },
                  ),
                ).unwrap();
              } catch {
                return null;
              }
            }),
          )
        )
          .filter((p): p is SocialProfileDto => p?.username != null)
          .filter((p) => !blockedIdSet.has(String(p.userId)));

        const mentions =
          resolvedProfiles.length > 0
            ? resolvedProfiles.map((p) => `@${p.username}`).join(' ')
            : '';
        const counterpartyName = appointmentShareCounterpartyName(appointment, role);
        const services = appointmentShareServiceSummary(appointment);
        const caption = mentions
          ? t(appointmentShareCaptionKey(role), { mentions, name: counterpartyName, services })
          : t('social.appointmentShareCaptionNoMentions', {
              name: counterpartyName,
              services,
            });
        const subtitle = mentions
          ? t(appointmentShareSubtitleKey(role), { name: counterpartyName, mentions })
          : t('social.appointmentShareSubtitleNoMentions', { name: counterpartyName });

        setPayload({
          appointmentId: appointment.id,
          counterpartyName,
          mentions,
          caption,
          subtitle,
          profileId: posterProfileId,
        });
        sheet.open();
      } finally {
        inFlightRef.current = false;
      }
    },
    [userId, profiles, activeProfileId, dispatch, t, sheet, blockedIdSet],
  );

  useEffect(() => {
    return subscribeAppointmentSharePrompt((appointment) => {
      void presentPrompt(appointment);
    });
  }, [presentPrompt]);

  const drainQueue = useCallback(() => {
    const next = pendingQueueRef.current.shift();
    if (next) void presentPrompt(next);
  }, [presentPrompt]);

  const handleSheetClosed = useCallback(() => {
    setPayload(null);
    drainQueue();
  }, [drainQueue]);

  const handleClose = useCallback(() => {
    sheet.dismiss();
  }, [sheet]);

  const handleCreatePost = useCallback(() => {
    if (!payload) return;
    sheet.dismiss();
    router.push({
      pathname: '/(screens)/social/create-post',
      params: {
        profileId: payload.profileId,
        caption: payload.caption,
        appointmentId: payload.appointmentId,
      },
    } as any);
    setPayload(null);
    drainQueue();
  }, [payload, sheet, router, drainQueue]);

  const handleCreateStory = useCallback(() => {
    if (!payload) return;
    sheet.dismiss();
    router.push({
      pathname: '/(screens)/social/create-story',
      params: {
        profileId: payload.profileId,
        appointmentId: payload.appointmentId,
      },
    } as any);
    setPayload(null);
    drainQueue();
  }, [payload, sheet, router, drainQueue]);

  return (
    <SocialAppointmentSharePromptSheet
      sheet={sheet}
      payload={payload}
      onCreatePost={handleCreatePost}
      onCreateStory={handleCreateStory}
      onClose={handleClose}
      onSheetClosed={handleSheetClosed}
    />
  );
};
