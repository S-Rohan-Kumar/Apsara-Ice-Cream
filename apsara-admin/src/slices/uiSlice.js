import { createSlice } from '@reduxjs/toolkit';
 
const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    toast  : { visible: false, message: '', type: 'success' },
    confirm: { visible: false, message: '', confirmKey: null },
  },
  reducers: {
    showToast: (state, { payload }) => {
      state.toast = { visible: true, ...payload };
    },
    hideToast: (state) => {
      state.toast.visible = false;
    },
    showConfirm: (state, { payload }) => {
      state.confirm = { visible: true, ...payload };
    },
    hideConfirm: (state) => {
      state.confirm.visible = false;
    },
  },
});
 
export const { showToast, hideToast, showConfirm, hideConfirm } =
  uiSlice.actions;
 
export default uiSlice.reducer;
 
export const selectToast   = (s) => s.ui.toast;
export const selectConfirm = (s) => s.ui.confirm;
