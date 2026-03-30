import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type BookingSwipeState = {
  storeIds: string[] | null;
  freeBarberIds: string[] | null;
};

const initialState: BookingSwipeState = {
  storeIds: null,
  freeBarberIds: null,
};

const bookingSwipeSlice = createSlice({
  name: "bookingSwipe",
  initialState,
  reducers: {
    setStoreSwipeIds: (state, action: PayloadAction<string[] | null>) => {
      state.storeIds = action.payload;
    },
    setFreeBarberSwipeIds: (state, action: PayloadAction<string[] | null>) => {
      state.freeBarberIds = action.payload;
    },
    clearStoreSwipeIds: (state) => {
      state.storeIds = null;
    },
    clearFreeBarberSwipeIds: (state) => {
      state.freeBarberIds = null;
    },
  },
});

export const {
  setStoreSwipeIds,
  setFreeBarberSwipeIds,
  clearStoreSwipeIds,
  clearFreeBarberSwipeIds,
} = bookingSwipeSlice.actions;

export default bookingSwipeSlice.reducer;
