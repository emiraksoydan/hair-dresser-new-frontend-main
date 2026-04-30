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

// Reset SignalR state (logout / hesap geçişi)
// Snapshot-first: module referansları SYNC olarak nullanır, sonra async stop.
// Böylece await sırasında useSignalRV2 effect yeni bir bağlantı kurup
// globalConnection'a yazarsa, biz döndüğümüzde onu yanlışlıkla nullamayız.
// Eski kod "globalConnection = null" atamasını await'ten SONRA yapıyordu ve
// hesap geçişinde duplicate connection üretebiliyordu.
export const resetSignalRState = async () => {
  const conn = globalConnection;
  globalConnection = null;
  globalConnectionUserId = null;

  if (conn) {
    try {
      conn.off('notification.received');
      conn.off('notification.updated');
      conn.off('chat.message');
      conn.off('chat.threadCreated');
      conn.off('chat.threadUpdated');
      conn.off('chat.threadRemoved');
      conn.off('chat.messagesRead');
      conn.off('chat.typing');
      conn.off('appointment.updated');
      conn.off('badge.updated');
      conn.off('image.updated');
      conn.off('image.removed');
      conn.off('group.joined');
      conn.off('store.availability.changed');

      await conn.stop();
    } catch (e) {
      // Silent fail
    }
  }
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
