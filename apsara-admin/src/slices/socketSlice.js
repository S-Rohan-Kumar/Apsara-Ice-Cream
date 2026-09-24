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
    clearAllAlerts: (state) => {
      state.orderAlerts = [];
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
  clearAllAlerts,
} = socketSlice.actions;

export default socketSlice.reducer;

export const selectIsConnected = (s) => s.socket.isConnected;
export const selectNewOrderCount = (s) => s.socket.newOrderCount;
export const selectSoundEnabled = (s) => s.socket.soundEnabled;
export const selectOrderAlerts = (s) => s.socket.orderAlerts;
