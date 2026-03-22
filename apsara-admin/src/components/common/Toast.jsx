import { useSelector } from 'react-redux';
import { selectToast } from '../../slices/uiSlice';
 
const T = { success:{ bg:'bg-[#1B5E4B]', icon:'✅' }, error:{ bg:'bg-red-500', icon:'❌' } };
 
export function Toast() {
  const { visible, message, type } = useSelector(selectToast);
  if (!visible) return null;
  const s = T[type] || T.success;
  return (
    <div className={`fixed bottom-5 right-5 z-[200] ${s.bg} text-white px-4 py-3
                     rounded-2xl shadow-xl flex items-center gap-2.5 text-sm font-semibold`}>
      <span>{s.icon}</span>{message}
    </div>
  );
}
export default Toast;