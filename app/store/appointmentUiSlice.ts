import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { AppointmentFilter } from "../types/appointment";

export type AppointmentListTabRequest = {
  filter: AppointmentFilter;
  nonce: number;
};

type AppointmentUiState = {
  /** Randevu listesi ekranı bu isteği uygulayınca `nonce` ile idempotent kalır. */
  listTabRequest: AppointmentListTabRequest | null;
};

const initialState: AppointmentUiState = {
  listTabRequest: null,
};

const appointmentUiSlice = createSlice({
  name: "appointmentUi",
  initialState,
  reducers: {
    requestAppointmentListTab: (
      state,
      action: PayloadAction<{ filter: AppointmentFilter }>,
    ) => {
      const prev = state.listTabRequest?.nonce ?? 0;
      state.listTabRequest = {
        filter: action.payload.filter,
        nonce: prev + 1,
      };
    },
  },
});

export const { requestAppointmentListTab } = appointmentUiSlice.actions;
export default appointmentUiSlice.reducer;
