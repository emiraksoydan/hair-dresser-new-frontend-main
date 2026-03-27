import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type * as SignalR from '@microsoft/signalr';

interface SignalRState {
  isConnected: boolean;
  connectedUserId: string | null;
}

const initialState: SignalRState = {
  isConnected: false,
  connectedUserId: null,
};

// Single global connection (one user per device)
let globalConnection: SignalR.HubConnection | null = null;
let globalConnectionUserId: string | null = null;

export const setGlobalConnection = (connection: SignalR.HubConnection | null, userId?: string | null) => {
  globalConnection = connection;
  globalConnectionUserId = userId ?? null;
};

export const getGlobalConnection = () => globalConnection;

export const getConnectionUserId = () => globalConnectionUserId;

// Reset SignalR state (called on logout)
export const resetSignalRState = async () => {

  if (globalConnection) {
    try {
      globalConnection.off('notification.received');
      globalConnection.off('notification.updated');
      globalConnection.off('chat.message');
      globalConnection.off('chat.threadCreated');
      globalConnection.off('chat.threadUpdated');
      globalConnection.off('chat.threadRemoved');
      globalConnection.off('chat.messagesRead');
      globalConnection.off('chat.typing');
      globalConnection.off('appointment.updated');
      globalConnection.off('badge.updated');
      globalConnection.off('image.updated');
      globalConnection.off('image.removed');
      globalConnection.off('group.joined');

      await globalConnection.stop();
    } catch (e) {
      // Silent fail
    }
  }

  globalConnection = null;
  globalConnectionUserId = null;

};

const signalrSlice = createSlice({
  name: 'signalr',
  initialState,
  reducers: {
    setConnected: (state, action: PayloadAction<{ connected: boolean; userId?: string | null }>) => {
      state.isConnected = action.payload.connected;
      state.connectedUserId = action.payload.userId ?? null;
    },
    resetConnection: (state) => {
      state.isConnected = false;
      state.connectedUserId = null;
    },
  },
});

export const { setConnected, resetConnection } = signalrSlice.actions;
export default signalrSlice.reducer;
