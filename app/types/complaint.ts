/**
 * Complaint (Şikayet) related types
 */

import { UserType } from './auth';

export type CreateComplaintDto = {
  complaintToUserId: string;
  appointmentId?: string | null;
  complaintReason: string;
};

export type ComplaintGetDto = {
  id: string;
  complaintFromUserId: string;
  complaintToUserId: string;
  appointmentId?: string | null;
  complaintReason: string;
  createdAt: string;
  targetUserName?: string | null;
  targetUserImage?: string | null;
  targetUserType?: UserType | null;
};
