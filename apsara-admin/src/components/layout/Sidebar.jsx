import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { NAV_LINKS } from '../../constants';
import { selectIsConnected, selectNewOrderCount } from '../../slices/socketSlice';

const ICONS = { '/orders':'📦','/products':'🍦','/categories':'🗂️','/offers':'🏷️','/broadcast':'📢','/reports':'📊' };

export function Sidebar() {
  const newOrderCount = useSelector(selectNewOrderCount);
  const isConnected   = useSelector(selectIsConnected);

  return (
    <aside className='w-64 shrink-0 bg-[#0F3D2E] flex flex-col shadow-2xl'>
      {/* Logo Section */}
      <div className='px-8 py-10'>
        <div className='flex items-center gap-4'>
          <div className='w-12 h-12 bg-white/5 backdrop-blur-xl rounded-[20px] flex items-center justify-center text-2xl shadow-inner'>🍦</div>
          <div>
            <h1 className='text-white font-black text-[15px] tracking-tight leading-none'>Apsara</h1>
            <p className='text-emerald-400/40 text-[9px] font-black uppercase tracking-[2px] mt-1'>Admin Portal</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className='flex-1 px-4 space-y-1.5'>
        {NAV_LINKS.map((link) => (
          <NavLink key={link.path} to={link.path}
            className={({ isActive }) =>
              `flex items-center justify-between px-5 py-4 rounded-[20px] transition-all text-[11px] uppercase tracking-widest
               ${isActive
                 ? 'bg-emerald-500 text-white font-black shadow-lg shadow-emerald-900/40'
                 : 'text-emerald-100/40 hover:text-white hover:bg-white/5 font-bold'}`}>
            <div className='flex items-center gap-4'>
              <span className='text-lg grayscale group-hover:grayscale-0'>{ICONS[link.path]||'•'}</span>
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
      <div className='px-8 py-8'>
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