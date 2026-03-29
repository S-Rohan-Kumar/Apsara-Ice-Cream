import { useSelector } from 'react-redux';
import { selectToast } from '../../slices/uiSlice';

const T = {
  success:{ bg:'bg-[#1B4332]', icon:'🌿' },
  error:{ bg:'bg-red-600', icon:'⚠️' }
};

export function Toast() {
  const { visible, message, type } = useSelector(selectToast);
  if (!visible) return null;
  const s = T[type] || T.success;
  return (
    <div className={`fixed bottom-4 sm:bottom-8 left-4 right-4 sm:left-auto sm:right-8 z-[200]
                     ${s.bg} text-white px-5 sm:px-6 py-3.5 sm:py-4
                     rounded-[20px] sm:rounded-[24px] shadow-2xl flex items-center gap-3 sm:gap-4
                     text-[11px] font-black uppercase tracking-widest
                     animate-in slide-in-from-bottom-4 sm:slide-in-from-right-10 duration-500
                     border border-white/10 max-w-sm sm:max-w-none mx-auto sm:mx-0`}>
      <span className='text-base sm:text-lg shrink-0'>{s.icon}</span>
      <span className='truncate'>{message}</span>
    </div>
  );
}
export default Toast;