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
    <div className={`fixed bottom-8 right-8 z-[200] ${s.bg} text-white px-6 py-4
                     rounded-[24px] shadow-2xl flex items-center gap-4 text-[11px] font-black uppercase tracking-widest
                     animate-in slide-in-from-right-10 duration-500 border border-white/10`}>
      <span className='text-lg'>{s.icon}</span>
      {message}
    </div>
  );
}
export default Toast;