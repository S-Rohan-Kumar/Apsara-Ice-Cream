import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logOut, selectUserInfo } from '../../slices/authSlice';
 
export function Topbar() {
  const userInfo = useSelector(selectUserInfo);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  return (
    <header className='h-14 bg-white border-b border-gray-100 flex items-center
                       justify-between px-5 shrink-0'>
      <div className='flex items-center gap-2 text-sm'>
        <span className='font-bold text-[#1B5E4B]'>Apsara Ice Creams</span>
        <span className='text-gray-200'>·</span>
        <span className='text-gray-400 text-xs'>Mandya</span>
      </div>
      <div className='flex items-center gap-3'>
        <div className='bg-[#F7FBF9] border border-[#1B5E4B]/15 px-3 py-1.5 rounded-xl
                        text-xs font-semibold text-[#1B5E4B]'>
          👤 {userInfo?.user?.phone}
        </div>
        <button onClick={() => { dispatch(logOut()); navigate('/login'); }}
          className='text-xs font-semibold text-red-400 hover:text-red-600
                     bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-xl transition'>
          Logout
        </button>
      </div>
    </header>
  );
}
export default Topbar;