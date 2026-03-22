import { createSlice  } from '@reduxjs/toolkit';

const socketSlice = createSlice({
  name: 'socket',
  initialState: {
    isConnected  : false,
    newOrderCount: 0,
  },
  reducers: {
    setConnected   : (state) => { state.isConnected    = true;  },
    setDisconnected: (state) => { state.isConnected    = false; },
    incrementOrders: (state) => { state.newOrderCount += 1;     },
    clearOrders    : (state) => { state.newOrderCount  = 0;     },
  },
});
 
export const {
  setConnected, setDisconnected,
  incrementOrders, clearOrders,
} = socketSlice.actions;
 
export default socketSlice.reducer;
 
export const selectIsConnected   = (s) => s.socket.isConnected;
export const selectNewOrderCount = (s) => s.socket.newOrderCount;
