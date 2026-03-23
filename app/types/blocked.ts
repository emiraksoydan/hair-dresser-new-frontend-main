/**
 * Blocked (Engelleme) related types
 */

import { UserType } from './auth';

export type CreateBlockedDto = {
  blockedToUserId: string;
  blockReason?: string;
};

export type UnblockDto = {
  blockedToUserId: string;
};

export type BlockedGetDto = {
  id: string;
  blockedFromUserId: string;
  blockedToUserId: string;
  blockReason: string;
  createdAt: string;
  targetUserName?: string | null;
  targetUserImage?: string | null;
  targetUserType?: UserType | null;
};

export type BlockStatusDto = {
  isBlocked: boolean;
  isBlockedBy: boolean;
};
