import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import i18n from '../i18n/config';

export interface AlertButton {
  text: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

export interface AlertState {
  visible: boolean;
  title: string;
  message: string;
  buttons: AlertButton[];
  type: 'info' | 'success' | 'error' | 'warning';
}

const initialState: AlertState = {
  visible: false,
  title: '',
  message: '',
  buttons: [],
  type: 'info',
};

const alertSlice = createSlice({
  name: 'alert',
  initialState,
  reducers: {
    showAlert: (
      state,
      action: PayloadAction<{
        title: string;
        message: string;
        buttons?: AlertButton[];
        type?: 'info' | 'success' | 'error' | 'warning';
      }>
    ) => {
      state.title = action.payload.title;
      state.message = action.payload.message;
      state.buttons = action.payload.buttons || [{ text: i18n.t('common.ok') }];
      state.type = action.payload.type || 'info';
      state.visible = true;
    },
    hideAlert: (state) => {
      state.visible = false;
    },
  },
});

export const { showAlert, hideAlert } = alertSlice.actions;
export default alertSlice.reducer;
