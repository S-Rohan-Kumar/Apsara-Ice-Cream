import { useDispatch, useSelector } from 'react-redux';
import { selectConfirm, hideConfirm } from '../../slices/uiSlice';

const handlers = {};
export function registerConfirmHandler(key, fn) { handlers[key] = fn; }

export function ConfirmDialog() {
  const { visible, message, confirmKey } = useSelector(selectConfirm);
  const dispatch = useDispatch();

  const handleConfirm = () => {
    handlers[confirmKey]?.(); delete handlers[confirmKey]; dispatch(hideConfirm());
  };

  if (!visible) return null;

  return (
    <div className='fixed inset-0 bg-[#1B4332]/20 backdrop-blur-md flex items-end sm:items-center
                    justify-center z-[200] p-4 animate-in fade-in duration-300'>
      <div className='bg-white rounded-t-[32px] sm:rounded-[40px] shadow-2xl w-full sm:max-w-sm
                      overflow-hidden border border-green-50'>
        <div className='p-8 sm:p-10 text-center'>
          <div className='w-14 h-14 sm:w-16 sm:h-16 bg-red-50 rounded-[20px] sm:rounded-[24px] flex items-center justify-center
                          text-2xl sm:text-3xl mx-auto mb-4 sm:mb-6'>⚠️</div>
          <h3 className='text-lg sm:text-xl font-black text-slate-800 mb-2'>Wait a moment</h3>
          <p className='text-[11px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed'>{message}</p>
        </div>
        <div className='flex gap-3 px-6 sm:px-10 pb-8 sm:pb-10'>
          <button onClick={() => dispatch(hideConfirm())}
            className='flex-1 bg-slate-50 py-3.5 sm:py-4 rounded-2xl font-black
                       text-slate-400 hover:bg-slate-100 transition text-[10px] uppercase tracking-widest'>
            Cancel
          </button>
          <button onClick={handleConfirm}
            className='flex-1 bg-red-500 hover:bg-red-600 text-white font-black
                       py-3.5 sm:py-4 rounded-2xl transition shadow-xl shadow-red-900/20 text-[10px] uppercase tracking-widest'>
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
export default ConfirmDialog;