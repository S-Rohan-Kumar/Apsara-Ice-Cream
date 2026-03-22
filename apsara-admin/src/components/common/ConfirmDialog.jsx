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
    <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center
                    justify-center z-[200] p-4'>
      <div className='bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden'>
        <div className='p-6 text-center'>
          <div className='w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center
                          text-2xl mx-auto mb-4'>⚠️</div>
          <h3 className='font-extrabold text-gray-800 mb-2'>Are you sure?</h3>
          <p className='text-gray-400 text-sm'>{message}</p>
        </div>
        <div className='flex gap-3 px-6 pb-6'>
          <button onClick={() => dispatch(hideConfirm())}
            className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold
                       text-gray-500 hover:bg-gray-50 transition text-sm'>
            Cancel
          </button>
          <button onClick={handleConfirm}
            className='flex-1 bg-red-500 hover:bg-red-600 text-white font-bold
                       py-3 rounded-xl transition shadow-md text-sm'>
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
export default ConfirmDialog;