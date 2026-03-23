import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logOut, selectUserInfo } from '../../slices/authSlice';

export function Topbar() {
  const userInfo = useSelector(selectUserInfo);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return (
    <header className='h-20 bg-white border-b border-green-50 flex items-center
                       justify-between px-8 shrink-0 relative z-10'>
      <div className='flex items-center gap-3'>
        <span className='font-black text-[13px] uppercase tracking-[3px] text-[#1B4332]'>Apsara Ice Creams</span>
        <span className='w-1 h-1 rounded-full bg-emerald-100' />
        <span className='text-emerald-900/30 text-[10px] font-black uppercase tracking-widest'>Mandya Unit</span>
      </div>
      <div className='flex items-center gap-4'>
        <div className='bg-[#F2F7F2] border border-emerald-100/50 px-4 py-2.5 rounded-[18px]
                        text-[10px] font-black text-[#1B4332] uppercase tracking-widest flex items-center gap-2'>
          <span className='opacity-40'>User:</span> {userInfo?.user?.phone}
        </div>
        <button onClick={() => { dispatch(logOut()); navigate('/login'); }}
          className='text-[10px] font-black uppercase tracking-widest text-red-400 hover:text-white
                     bg-red-50 hover:bg-red-500 px-5 py-2.5 rounded-[18px] transition-all duration-300'>
          Logout
        </button>
      </div>
    </header>
  );
}
export default Topbar;