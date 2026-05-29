import { configureStore } from '@reduxjs/toolkit'
import { api } from './api';
import snackbarReducer from './snackbarSlice';
import alertReducer from './alertSlice';
import signalrReducer from './signalrSlice';
import bookingSwipeReducer from './bookingSwipeSlice';
import subscriptionReducer from './subscriptionSlice';
import bannedReducer from './bannedSlice';
import appointmentUiReducer from './appointmentUiSlice';

export const store = configureStore({
    reducer: {
        [api.reducerPath]: api.reducer,
        snackbar: snackbarReducer,
        alert: alertReducer,
        signalr: signalrReducer,
        bookingSwipe: bookingSwipeReducer,
        subscription: subscriptionReducer,
        banned: bannedReducer,
        appointmentUi: appointmentUiReducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                // Alert button'larındaki onPress callback'leri için serializable check'i devre dışı bırak
                ignoredActions: ['alert/showAlert'],
                ignoredPaths: ['alert.buttons'],
            },
        }).concat(api.middleware),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch