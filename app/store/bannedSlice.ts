import { createSlice } from '@reduxjs/toolkit';

/**
 * Admin bir kullanıcıyı engellediğinde backend 403 + banned:true döner.
 * baseQuery bu durumu yakalar ve bu slice'a yazar.
 * BanDetector (_layout) flag'i izleyip hesap geçişi veya giriş sayfasına yönlendirme yapar.
 */
const bannedSlice = createSlice({
  name: 'banned',
  initialState: { triggered: false },
  reducers: {
    triggerUserBanned: (state) => {
      state.triggered = true;
    },
    resetUserBanned: (state) => {
      state.triggered = false;
    },
  },
});

export const { triggerUserBanned, resetUserBanned } = bannedSlice.actions;
export default bannedSlice.reducer;
