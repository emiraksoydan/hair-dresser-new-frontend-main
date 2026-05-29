/**
 * "Tümünü okundu" optimistic patch ile backend `NotificationMarkAllReadExclusion` aynı kurallar.
 * UI: `NotificationItemOptimized` → `canShowButtons`. Değişince backend C# helper ile birlikte güncelleyin.
 */

import type { NotificationDto, NotificationPayload } from '../types';
import {
  NotificationType,
  AppointmentStatus,
  DecisionStatus,
  StoreSelectionType,
  UserType,
} from '../types';

function normalizeDecision(v: unknown): DecisionStatus | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number') return v as DecisionStatus;
  return null;
}

function getMyDecision(
  userType: UserType | null,
  recipientRole: string | undefined,
  storeDecision: DecisionStatus | null,
  freeBarberDecision: DecisionStatus | null,
  customerDecision: DecisionStatus | null,
): DecisionStatus | null {
  const role =
    recipientRole ??
    (userType === UserType.BarberStore
      ? 'store'
      : userType === UserType.FreeBarber
        ? 'freebarber'
        : userType === UserType.Customer
          ? 'customer'
          : null);

  if (role === 'store') return storeDecision;
  if (role === 'freebarber') return freeBarberDecision;
  if (role === 'customer') return customerDecision;
  return null;
}

function parsePayload(json: string): NotificationPayload | null {
  try {
    if (json && json.trim() !== '' && json !== '{}') {
      return JSON.parse(json) as NotificationPayload;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function hasBlockingStatusRibbon(
  finalStatus: AppointmentStatus,
  itemType: NotificationType,
  hasMyDecision: boolean,
  myDecision: DecisionStatus | null,
): boolean {
  if (finalStatus === AppointmentStatus.Approved) return true;
  if (finalStatus === AppointmentStatus.Rejected) return true;
  if (finalStatus === AppointmentStatus.Cancelled) return true;
  if (finalStatus === AppointmentStatus.Completed) return true;
  if (finalStatus === AppointmentStatus.Unanswered) return true;

  if (itemType === NotificationType.AppointmentApproved) return true;
  if (itemType === NotificationType.AppointmentRejected) return true;
  if (itemType === NotificationType.AppointmentCancelled) return true;
  if (itemType === NotificationType.AppointmentCompleted) return true;
  if (itemType === NotificationType.AppointmentUnanswered) return true;

  if (finalStatus === AppointmentStatus.Pending && hasMyDecision) {
    if (myDecision === DecisionStatus.Approved) return true;
    if (myDecision === DecisionStatus.Rejected) return true;
    if (myDecision === DecisionStatus.NoAnswer) return true;
  }

  return false;
}

function computeIsExpired(
  payload: NotificationPayload | null,
  appointmentStatus: AppointmentStatus,
  createdAtIso: string,
  userType: UserType | null,
  storeDecision: DecisionStatus | null,
  nowMs: number,
): boolean {
  if (payload?.pendingExpiresAt) {
    let dateStr = payload.pendingExpiresAt;
    if (typeof dateStr === 'string' && !dateStr.endsWith('Z') && !dateStr.includes('+')) {
      dateStr += 'Z';
    }
    return nowMs > new Date(dateStr).getTime();
  }

  if (appointmentStatus !== AppointmentStatus.Pending) return false;

  let createdStr = createdAtIso;
  if (typeof createdStr === 'string' && !createdStr.endsWith('Z') && !createdStr.includes('+')) {
    createdStr += 'Z';
  }
  const createdAt = new Date(createdStr).getTime();

  const isStoreSelectionFlow = payload?.storeSelectionType === StoreSelectionType.StoreSelection;
  const isCustomerWaitingForStore =
    isStoreSelectionFlow &&
    userType === UserType.Customer &&
    !!payload?.store &&
    storeDecision === DecisionStatus.Approved;

  const timeoutMinutes = isCustomerWaitingForStore ? 30 : 5;
  return nowMs > createdAt + timeoutMinutes * 60 * 1000;
}

function freeBarberCanAct(
  payload: NotificationPayload | null,
  storeDecision: DecisionStatus | null,
  freeBarberDecision: DecisionStatus | null,
): boolean {
  if (payload?.storeSelectionType === StoreSelectionType.StoreSelection) {
    if (payload?.store && storeDecision === DecisionStatus.Pending) return false;
    if (!payload?.store) {
      return freeBarberDecision === null || freeBarberDecision === DecisionStatus.Pending;
    }
    if (storeDecision === DecisionStatus.Approved) return false;
  }
  return freeBarberDecision === null || freeBarberDecision === DecisionStatus.Pending;
}

function customerCanAct(
  payload: NotificationPayload | null,
  storeDecision: DecisionStatus | null,
  customerDecision: DecisionStatus | null,
): boolean {
  if (payload?.storeSelectionType === StoreSelectionType.StoreSelection) {
    return (
      !!payload?.store &&
      storeDecision === DecisionStatus.Approved &&
      (customerDecision === null || customerDecision === DecisionStatus.Pending)
    );
  }
  return customerDecision === null || customerDecision === DecisionStatus.Pending;
}

/** true = bu bildirim toplu okundu listesine dahil edilmemeli (kabul/red bekliyor). */
export function shouldKeepNotificationUnreadForMarkAll(
  item: NotificationDto,
  userType: UserType | null,
  nowMs: number = Date.now(),
): boolean {
  if (
    item.type !== NotificationType.AppointmentCreated &&
    item.type !== NotificationType.StoreApprovedSelection
  ) {
    return false;
  }

  const payload = parsePayload(item.payloadJson);
  const storeDecision = normalizeDecision(payload?.storeDecision);
  const freeBarberDecision = normalizeDecision(payload?.freeBarberDecision);
  const customerDecision = normalizeDecision(payload?.customerDecision);

  let appointmentStatus: AppointmentStatus;
  if (payload?.status !== undefined && payload.status !== null) {
    appointmentStatus = payload.status as AppointmentStatus;
  } else {
    appointmentStatus = AppointmentStatus.Pending;
  }

  const isExpiredCheck = computeIsExpired(
    payload,
    appointmentStatus,
    item.createdAt,
    userType,
    storeDecision,
    nowMs,
  );

  const finalAppointmentStatus =
    isExpiredCheck && appointmentStatus === AppointmentStatus.Pending
      ? AppointmentStatus.Unanswered
      : appointmentStatus;

  if (finalAppointmentStatus !== AppointmentStatus.Pending) return false;

  const myDecision = getMyDecision(
    userType,
    payload?.recipientRole,
    storeDecision,
    freeBarberDecision,
    customerDecision,
  );
  const hasMyDecision = myDecision !== null && myDecision !== DecisionStatus.Pending;

  if (hasBlockingStatusRibbon(finalAppointmentStatus, item.type, hasMyDecision, myDecision)) {
    return false;
  }

  if (hasMyDecision) return false;

  if (
    storeDecision === DecisionStatus.Rejected ||
    freeBarberDecision === DecisionStatus.Rejected ||
    customerDecision === DecisionStatus.Rejected
  ) {
    return false;
  }

  if (
    storeDecision === DecisionStatus.NoAnswer ||
    freeBarberDecision === DecisionStatus.NoAnswer ||
    customerDecision === DecisionStatus.NoAnswer
  ) {
    return false;
  }

  if (userType === UserType.BarberStore) {
    return storeDecision === null || storeDecision === DecisionStatus.Pending;
  }
  if (userType === UserType.FreeBarber) {
    return freeBarberCanAct(payload, storeDecision, freeBarberDecision);
  }
  if (userType === UserType.Customer) {
    return customerCanAct(payload, storeDecision, customerDecision);
  }

  return false;
}
