import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsConnected,
  selectSoundEnabled,
  toggleSound,
} from '../../slices/socketSlice';
import { selectUserInfo } from '../../slices/authSlice';
import { useGetStoreStatusQuery, useUpdateStoreStatusMutation } from '../../slices/storeApiSlice';
import { useToast } from '../../hooks/useToast';
import { playOrderChime } from '../../utils/sound';

export function Topbar({ onMenuClick }) {
  const userInfo = useSelector(selectUserInfo);
  const isConnected = useSelector(selectIsConnected);
  const soundEnabled = useSelector(selectSoundEnabled);
  const dispatch = useDispatch();
  const { showSuccess, showError } = useToast();

  const { data: storeData } = useGetStoreStatusQuery(undefined, { pollingInterval: 10000 });
  const [updateStoreStatus, { isLoading: isUpdatingStore }] = useUpdateStoreStatusMutation();

  const isStoreOpen = storeData?.isStoreOpen ?? true;

  const handleToggleStore = async () => {
    try {
      const nextState = !isStoreOpen;
      await updateStoreStatus({ isStoreOpen: nextState }).unwrap();
      if (nextState) {
        showSuccess('Store is now OPEN and accepting orders!');
      } else {
        showSuccess('Store is now CLOSED. Customers cannot place new orders.');
      }
    } catch (err) {
      showError(err?.data?.message || 'Failed to update store status');
    }
  };

  const handleSoundToggle = () => {
    dispatch(toggleSound());
    if (!soundEnabled) {
      playOrderChime();
    }
  };

  return (
    <header className='h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-8 shrink-0 relative z-10 gap-3'>
      <div className='flex items-center gap-3'>
        <button
          onClick={onMenuClick}
          className='lg:hidden p-2 text-slate-700 hover:bg-gray-100 rounded-xl transition-colors'
          aria-label='Open menu'
        >
          <svg width='20' height='20' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <line x1='3' y1='12' x2='21' y2='12'></line>
            <line x1='3' y1='6' x2='21' y2='6'></line>
            <line x1='3' y1='18' x2='21' y2='18'></line>
          </svg>
        </button>

        <div className='flex items-center gap-2'>
          <span className='font-bold text-sm text-[#1B4332]'>
            Apsara Ice Creams
          </span>
          <span className='text-gray-300'>•</span>
          <span className='text-xs text-gray-500 font-medium hidden sm:inline'>
            Mandya Central Store
          </span>
        </div>
      </div>

      <div className='flex items-center gap-2 sm:gap-4'>
        <button
          onClick={handleToggleStore}
          disabled={isUpdatingStore}
          title={isStoreOpen ? 'Click to digitally CLOSE store' : 'Click to digitally OPEN store'}
          className={`flex items-center gap-2.5 px-3 py-1.5 rounded-full border text-xs font-bold transition-all shadow-xs ${
            isStoreOpen
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100 hover:border-emerald-400'
              : 'bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 hover:border-rose-400'
          }`}
        >
          <span className='flex items-center gap-1.5'>
            <span className={`w-2 h-2 rounded-full ${isStoreOpen ? 'bg-emerald-500 shadow-sm' : 'bg-rose-500 animate-pulse'}`} />
            <span className='font-black tracking-tight text-[11px] sm:text-xs'>
              {isStoreOpen ? 'STORE OPEN' : 'STORE CLOSED'}
            </span>
          </span>

          <span className={`w-7 h-4 rounded-full transition-colors relative flex items-center p-0.5 ${
            isStoreOpen ? 'bg-emerald-600' : 'bg-gray-300'
          }`}>
            <span className={`w-3 h-3 rounded-full bg-white shadow-xs transition-transform duration-200 ${
              isStoreOpen ? 'translate-x-3' : 'translate-x-0'
            }`} />
          </span>
        </button>

        <button
          onClick={handleSoundToggle}
          title={soundEnabled ? 'Mute Kitchen Chime' : 'Turn On Kitchen Chime'}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
            soundEnabled
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'
          }`}
        >
          <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'></path>
            <path d='M13.73 21a2 2 0 0 1-3.46 0'></path>
          </svg>
          <span className='hidden sm:inline'>{soundEnabled ? 'Chime ON' : 'Chime Muted'}</span>
        </button>

        <div className='hidden md:flex items-center gap-2 pl-2 border-l border-gray-200 text-xs font-bold text-gray-600'>
          <span className='w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-black text-xs'>
            A
          </span>
          <span>{userInfo?.user?.phone || 'Store Admin'}</span>
        </div>
      </div>
    </header>
  );
}

export default Topbar;