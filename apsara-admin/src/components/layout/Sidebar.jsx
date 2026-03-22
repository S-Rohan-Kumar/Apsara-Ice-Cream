import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { NAV_LINKS } from '../../constants';
import { selectIsConnected, selectNewOrderCount } from '../../slices/socketSlice';
 
const ICONS = { '/orders':'📦','/products':'🍦','/categories':'🗂️','/offers':'🏷️','/broadcast':'📢','/reports':'📊' };
 
export function Sidebar() {
  const newOrderCount = useSelector(selectNewOrderCount);
  const isConnected   = useSelector(selectIsConnected);
 
  return (
    <aside className='w-60 shrink-0 bg-[#0F3D2E] flex flex-col'>
      {/* Logo */}
      <div className='px-5 py-5 border-b border-white/5'>
        <div className='flex items-center gap-3'>
          <div className='w-9 h-9 bg-[#F5A623] rounded-xl flex items-center justify-center text-lg'>🍦</div>
          <div>
            <h1 className='text-white font-extrabold text-sm leading-none'>Apsara</h1>
            <p className='text-white/30 text-[10px] mt-0.5'>Admin Portal</p>
          </div>
        </div>
      </div>
 
      {/* Nav */}
      <nav className='flex-1 px-3 py-3 space-y-0.5'>
        {NAV_LINKS.map((link) => (
          <NavLink key={link.path} to={link.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-3 py-2.5 rounded-xl transition-all text-sm
               ${isActive
                 ? 'bg-[#1B5E4B] text-white font-bold shadow-md'
                 : 'text-white/50 hover:text-white hover:bg-white/5 font-medium'}`}>
            <div className='flex items-center gap-2.5'>
              <span className='text-base'>{ICONS[link.path]||'•'}</span>
              <span>{link.label}</span>
            </div>
            {link.path === '/orders' && newOrderCount > 0 && (
              <span className='bg-red-500 text-white text-[10px] font-extrabold rounded-full
                               min-w-[18px] h-[18px] flex items-center justify-center px-1'>
                {newOrderCount > 9 ? '9+' : newOrderCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>
 
      {/* Status */}
      <div className='px-5 py-4 border-t border-white/5'>
        <div className='flex items-center gap-2'>
          <div className={`w-2 h-2 rounded-full shrink-0
            ${isConnected ? 'bg-green-400 shadow-[0_0_6px_#4ade80]' : 'bg-red-400'}`} />
          <span className='text-[11px] text-white/30 font-medium'>
            {isConnected ? 'Live · Receiving orders' : 'Offline'}
          </span>
        </div>
      </div>
    </aside>
  );
}
export default Sidebar;
 