import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface SnackbarState {
    visible: boolean;
    message: string;
    isError: boolean;
}

const initialState: SnackbarState = {
    visible: false,
    message: '',
    isError: false,
};

const snackbarSlice = createSlice({
    name: 'snackbar',
    initialState,
    reducers: {
        showSnack: (state, action: PayloadAction<{ message: string; isError?: boolean }>) => {
            state.message = action.payload.message;
            state.isError = action.payload.isError ?? false;
            state.visible = true;
        },
        hideSnack: (state) => {
            state.visible = false;
        },
    },
});

export const { showSnack, hideSnack } = snackbarSlice.actions;
export default snackbarSlice.reducer;
