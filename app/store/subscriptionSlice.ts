import { createSlice } from '@reduxjs/toolkit';

/**
 * Abonelik süresi dolduğunda veya kullanıcı banlandığında backend 403 döner.
 * baseQuery bu durumu yakalar ve bu slice'a yazar.
 * BaseTabLayout (FreeBarber / BarberStore) flag'i izleyip subscription sayfasına yönlendirir.
 */
const subscriptionSlice = createSlice({
    name: 'subscription',
    initialState: { expired: false },
    reducers: {
        triggerSubscriptionExpired: (state) => {
            state.expired = true;
        },
        resetSubscriptionExpired: (state) => {
            state.expired = false;
        },
    },
});

export const { triggerSubscriptionExpired, resetSubscriptionExpired } =
    subscriptionSlice.actions;
export default subscriptionSlice.reducer;
