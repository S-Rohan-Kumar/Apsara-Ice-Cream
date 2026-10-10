import { createSlice } from '@reduxjs/toolkit';

const initialSound = typeof window !== 'undefined'
  ? localStorage.getItem('apsara_admin_sound') !== 'false'
  : true;

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    isConnected: false,
    newOrderCount: 0,
    soundEnabled: initialSound,
    orderAlerts: [],
    cancellationAlerts: [],
  },
  reducers: {
    setConnected: (state) => {
      state.isConnected = true;
    },
    setDisconnected: (state) => {
      state.isConnected = false;
    },
    incrementOrders: (state) => {
      state.newOrderCount += 1;
    },
    clearOrders: (state) => {
      state.newOrderCount = 0;
    },
    toggleSound: (state) => {
      state.soundEnabled = !state.soundEnabled;
      if (typeof window !== 'undefined') {
        localStorage.setItem('apsara_admin_sound', String(state.soundEnabled));
      }
    },
    addOrderAlert: (state, action) => {
      if (!action.payload) return;
      const order = action.payload;
      state.newOrderCount += 1;
      const filtered = state.orderAlerts.filter((o) => o._id !== order._id);
      state.orderAlerts = [order, ...filtered].slice(0, 3);
    },
    dismissOrderAlert: (state, action) => {
      state.orderAlerts = state.orderAlerts.filter((o) => o._id !== action.payload);
    },
    addCancellationAlert: (state, action) => {
      if (!action.payload) return;
      const alert = action.payload;
      const alertId = (alert._id || alert.orderId)?.toString?.();
      // Remove from new order alerts if it was pending
      state.orderAlerts = state.orderAlerts.filter((o) => (o._id || o.orderId)?.toString?.() !== alertId);
      const filtered = state.cancellationAlerts.filter((o) => (o._id || o.orderId)?.toString?.() !== alertId);
      state.cancellationAlerts = [alert, ...filtered].slice(0, 3);
    },
    dismissCancellationAlert: (state, action) => {
      state.cancellationAlerts = state.cancellationAlerts.filter(
        (o) => (o._id || o.orderId)?.toString?.() !== action.payload?.toString?.()
      );
    },
    clearAllAlerts: (state) => {
      state.orderAlerts = [];
      state.cancellationAlerts = [];
    },
  },
});

export const {
  setConnected,
  setDisconnected,
  incrementOrders,
  clearOrders,
  toggleSound,
  addOrderAlert,
  dismissOrderAlert,
  addCancellationAlert,
  dismissCancellationAlert,
  clearAllAlerts,
} = socketSlice.actions;

export default socketSlice.reducer;

export const selectIsConnected = (s) => s.socket.isConnected;
export const selectNewOrderCount = (s) => s.socket.newOrderCount;
export const selectSoundEnabled = (s) => s.socket.soundEnabled;
export const selectOrderAlerts = (s) => s.socket.orderAlerts;
export const selectCancellationAlerts = (s) => s.socket.cancellationAlerts || [];
