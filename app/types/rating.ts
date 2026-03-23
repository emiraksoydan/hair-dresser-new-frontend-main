/**
 * Rating-related types
 */

import { UserType, BarberType } from './index';

export type CreateRatingDto = {
  appointmentId: string;
  targetId: string;
  score: number; // 1-5
  comment?: string | null;
};

export type RatingGetDto = {
  id: string;
  targetId: string;
  ratedFromId: string;
  ratedFromName?: string | null;
  ratedFromImage?: string | null;
  ratedFromUserType?: UserType | null;
  ratedFromBarberType?: BarberType | null;
  score: number;
  comment?: string | null;
  createdAt: string;
  updatedAt: string;
  appointmentId: string;
};
