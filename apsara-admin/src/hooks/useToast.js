import { useDispatch } from 'react-redux';
import { showToast, hideToast } from '../slices/uiSlice.js';
 
export function useToast() {
  const dispatch = useDispatch();
 
  const toast = (message, type = 'success') => {
    dispatch(showToast({ message, type }));
    setTimeout(() => dispatch(hideToast()), 3000);
  };
 
  return {
    showSuccess: (msg) => toast(msg, 'success'),
    showError  : (msg) => toast(msg, 'error'),
  };
}
