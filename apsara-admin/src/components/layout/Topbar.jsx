import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logOut, selectUserInfo } from '../../slices/authSlice';

export function Topbar({ onMenuClick }) {
  const userInfo = useSelector(selectUserInfo);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  return (
    <header className='h-16 sm:h-20 bg-white border-b border-green-50 flex items-center
                       justify-between px-4 sm:px-8 shrink-0 relative z-10 gap-3'>
      <div className='flex items-center gap-3'>
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          className='lg:hidden p-2 -ml-1 text-[#1B4332] hover:bg-[#F2F7F2] rounded-xl transition-colors'
          aria-label='Open menu'
        >
          <svg width='20' height='20' viewBox='0 0 20 20' fill='currentColor'>
            <path fillRule='evenodd' d='M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z' clipRule='evenodd' />
          </svg>
        </button>

        <div className='flex items-center gap-2 sm:gap-3'>
          <span className='font-black text-[11px] sm:text-[13px] uppercase tracking-[2px] sm:tracking-[3px] text-[#1B4332] hidden xs:block sm:block'>
            Apsara Ice Creams
          </span>
          <span className='font-black text-[11px] uppercase tracking-[2px] text-[#1B4332] xs:hidden sm:hidden'>
            Apsara
          </span>
          <span className='w-1 h-1 rounded-full bg-emerald-100 hidden sm:block' />
          <span className='text-emerald-900/30 text-[10px] font-black uppercase tracking-widest hidden sm:block'>Mandya Unit</span>
        </div>
      </div>

      <div className='flex items-center gap-2 sm:gap-4'>
        {/* User info — hidden on very small screens */}
        <div className='hidden sm:flex bg-[#F2F7F2] border border-emerald-100/50 px-3 sm:px-4 py-2 sm:py-2.5 rounded-[18px]
                        text-[10px] font-black text-[#1B4332] uppercase tracking-widest items-center gap-2'>
          <span className='opacity-40'>User:</span> {userInfo?.user?.phone}
        </div>

        <button onClick={() => { dispatch(logOut()); navigate('/login'); }}
          className='text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white
                     bg-red-50 hover:bg-red-500 px-3 sm:px-5 py-2 sm:py-2.5 rounded-[16px] sm:rounded-[18px] transition-all duration-300 whitespace-nowrap'>
          <span className='hidden sm:inline'>Logout</span>
          <span className='sm:hidden'>↩</span>
        </button>
      </div>
    </header>
  );
}
export default Topbar;