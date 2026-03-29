import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { NAV_LINKS } from '../../constants';
import { selectIsConnected, selectNewOrderCount } from '../../slices/socketSlice';

const ICONS = { '/orders':'📦','/products':'🍦','/categories':'🗂️','/offers':'🏷️','/broadcast':'📢','/reports':'📊' };

export function Sidebar({ onClose }) {
  const newOrderCount = useSelector(selectNewOrderCount);
  const isConnected   = useSelector(selectIsConnected);

  return (
    <aside className='w-64 h-full shrink-0 bg-[#0F3D2E] flex flex-col shadow-2xl'>
      {/* Logo + mobile close button */}
      <div className='px-6 sm:px-8 py-8 sm:py-10 flex items-center justify-between'>
        <div className='flex items-center gap-3 sm:gap-4'>
          <div className='w-10 h-10 sm:w-12 sm:h-12 bg-white/5 backdrop-blur-xl rounded-[18px] sm:rounded-[20px] flex items-center justify-center text-xl sm:text-2xl shadow-inner'>🍦</div>
          <div>
            <h1 className='text-white font-black text-[14px] sm:text-[15px] tracking-tight leading-none'>Apsara</h1>
            <p className='text-emerald-400/40 text-[9px] font-black uppercase tracking-[2px] mt-1'>Admin Portal</p>
          </div>
        </div>
        {/* Close button — mobile only */}
        <button
          onClick={onClose}
          className='lg:hidden text-white/30 hover:text-white transition-colors p-1'
          aria-label='Close menu'
        >
          <svg width='20' height='20' viewBox='0 0 20 20' fill='currentColor'>
            <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className='flex-1 px-3 sm:px-4 space-y-1 sm:space-y-1.5 overflow-y-auto'>
        {NAV_LINKS.map((link) => (
          <NavLink key={link.path} to={link.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-4 sm:px-5 py-3.5 sm:py-4 rounded-[18px] sm:rounded-[20px] transition-all text-[11px] uppercase tracking-widest
               ${isActive
                 ? 'bg-emerald-500 text-white font-black shadow-lg shadow-emerald-900/40'
                 : 'text-emerald-100/40 hover:text-white hover:bg-white/5 font-bold'}`}>
            <div className='flex items-center gap-3 sm:gap-4'>
              <span className='text-base sm:text-lg grayscale group-hover:grayscale-0'>{ICONS[link.path]||'•'}</span>
              <span>{link.label}</span>
            </div>
            {link.path === '/orders' && newOrderCount > 0 && (
              <span className='bg-red-500 text-white text-[9px] font-black rounded-full
                               min-w-[20px] h-[20px] flex items-center justify-center px-1 shadow-lg'>
                {newOrderCount > 9 ? '9+' : newOrderCount}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Connection Status */}
      <div className='px-6 sm:px-8 py-6 sm:py-8'>
        <div className='bg-black/20 rounded-2xl px-4 py-3 flex items-center gap-3 border border-white/5'>
          <div className={`w-2 h-2 rounded-full shrink-0 animate-pulse
            ${isConnected ? 'bg-emerald-400 shadow-[0_0_8px_#10b981]' : 'bg-red-400 shadow-[0_0_8px_#ef4444]'}`} />
          <span className='text-[9px] text-white/30 font-black uppercase tracking-widest'>
            {isConnected ? 'System Live' : 'Offline Mode'}
          </span>
        </div>
      </div>
    </aside>
  );
}
export default Sidebar;