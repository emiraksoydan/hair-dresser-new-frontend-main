/**
 * Request (İstek) related types
 */

export type CreateRequestDto = {
  requestTitle: string;
  requestMessage: string;
};

export type RequestGetDto = {
  id: string;
  requestFromUserId: string;
  requestTitle: string;
  requestMessage: string;
  createdAt: string;
  isProcessed: boolean;
};
