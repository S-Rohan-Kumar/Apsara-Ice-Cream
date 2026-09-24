import { useDispatch, useSelector } from 'react-redux';
import {
  selectIsConnected,
  selectSoundEnabled,
  toggleSound,
} from '../../slices/socketSlice';
import { selectUserInfo } from '../../slices/authSlice';
import { playOrderChime } from '../../utils/sound';

export function Topbar({ onMenuClick }) {
  const userInfo = useSelector(selectUserInfo);
  const isConnected = useSelector(selectIsConnected);
  const soundEnabled = useSelector(selectSoundEnabled);
  const dispatch = useDispatch();

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
        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-bold ${
          isConnected
            ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500 animate-pulse'}`} />
          <span>{isConnected ? 'Accepting Orders' : 'Connecting'}</span>
        </div>

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