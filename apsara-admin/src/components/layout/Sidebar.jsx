import { useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { NAV_LINKS } from '../../constants';
import { selectIsConnected } from '../../slices/socketSlice';
import { useGetAdminOrdersQuery } from '../../slices/orderApiSlice';
import { useGetStoreStatusQuery } from '../../slices/storeApiSlice';
import { logOut } from '../../slices/authSlice';

function Icon({ name, className = 'w-4 h-4' }) {
  if (name === '/orders') {
    return (
      <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z'></path>
        <line x1='3' y1='6' x2='21' y2='6'></line>
        <path d='M16 10a4 4 0 0 1-8 0'></path>
      </svg>
    );
  }
  if (name === '/products') {
    return (
      <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M12 2a4 4 0 0 0-4 4c0 2 2 3 4 5 2-2 4-3 4-5a4 4 0 0 0-4-4z'></path>
        <path d='M8 13v7a2 2 0 0 0 2 2h4a2 2 0 0 0 2-2v-7'></path>
      </svg>
    );
  }
  if (name === '/categories') {
    return (
      <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <rect x='3' y='3' width='7' height='7'></rect>
        <rect x='14' y='3' width='7' height='7'></rect>
        <rect x='14' y='14' width='7' height='7'></rect>
        <rect x='3' y='14' width='7' height='7'></rect>
      </svg>
    );
  }
  if (name === '/offers') {
    return (
      <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z'></path>
        <line x1='7' y1='7' x2='7.01' y2='7'></line>
      </svg>
    );
  }
  if (name === '/broadcast') {
    return (
      <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <path d='M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9'></path>
        <path d='M13.73 21a2 2 0 0 1-3.46 0'></path>
      </svg>
    );
  }
  if (name === '/reports') {
    return (
      <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
        <line x1='18' y1='20' x2='18' y2='10'></line>
        <line x1='12' y1='20' x2='12' y2='4'></line>
        <line x1='6' y1='20' x2='6' y2='14'></line>
      </svg>
    );
  }
  return (
    <svg className={className} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
      <circle cx='12' cy='12' r='3'></circle>
    </svg>
  );
}

export function Sidebar({ onClose }) {
  const isConnected = useSelector(selectIsConnected);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { data } = useGetAdminOrdersQuery(
    { status: '', page: 1 },
    { pollingInterval: 10000 }
  );

  const { data: storeData } = useGetStoreStatusQuery(undefined, { pollingInterval: 10000 });
  const isStoreOpen = storeData?.isStoreOpen ?? true;

  const pendingCount = useMemo(() => {
    const list = data?.orders || [];
    return list.filter((o) => ['placed', 'preparing', 'out_for_delivery'].includes(o.status)).length;
  }, [data]);

  return (
    <aside className='w-64 h-full shrink-0 bg-white border-r border-gray-200 flex flex-col relative select-none'>
      <div className='px-5 py-4 border-b border-gray-100 flex items-center justify-between'>
        <div className='flex items-center gap-3'>
          <img
            src='/logo.png'
            alt='Apsara Ice Creams'
            className='w-11 h-11 rounded-full object-contain border border-emerald-100 shadow-xs bg-white'
          />
          <div>
            <div className='flex items-center gap-1.5'>
              <span className='font-black text-base text-[#1B4332] tracking-tight'>
                Apsara
              </span>
              <span className='w-1.5 h-1.5 rounded-full bg-emerald-500'></span>
            </div>
            <p className='text-[9px] font-bold text-gray-400 tracking-wider mt-0.5 uppercase'>
              restaurant partner
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className='lg:hidden text-gray-400 hover:text-gray-700 p-1 rounded-lg'
          aria-label='Close menu'
        >
          <svg width='18' height='18' viewBox='0 0 20 20' fill='currentColor'>
            <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
          </svg>
        </button>
      </div>

      <nav className='flex-1 px-3 py-4 space-y-1 overflow-y-auto no-scrollbar'>
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all text-xs font-bold tracking-wide
               ${isActive
                 ? 'bg-[#1B4332] text-white shadow-xs'
                 : 'text-gray-600 hover:text-slate-900 hover:bg-gray-50'}`}
          >
            <div className='flex items-center gap-3'>
              <Icon name={link.path} className='w-4 h-4 shrink-0' />
              <span>{link.label}</span>
            </div>

            {link.path === '/orders' && pendingCount > 0 && (
              <span className='bg-red-500 text-white text-[10px] font-black rounded-full min-w-[20px] h-[20px] flex items-center justify-center px-1.5'>
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </NavLink>
        ))}

        <div className='pt-4 border-t border-gray-100 my-2'>
          <button
            onClick={() => {
              dispatch(logOut());
              navigate('/login');
            }}
            className='w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-bold tracking-wide text-gray-500 hover:text-red-600 hover:bg-red-50 transition-colors'
          >
            <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <path d='M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4'></path>
              <polyline points='16 17 21 12 16 7'></polyline>
              <line x1='21' y1='12' x2='9' y2='12'></line>
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <div className='p-4 border-t border-gray-100'>
        <div className='bg-gray-50 rounded-xl p-3 border border-gray-100 flex items-center justify-between'>
          <div className='flex items-center gap-2'>
            <div className={`w-2 h-2 rounded-full ${!isConnected ? 'bg-amber-500 animate-pulse' : (isStoreOpen ? 'bg-emerald-500' : 'bg-rose-500')}`} />
            <div>
              <p className='text-[10px] font-bold text-slate-800'>
                {!isConnected ? 'Connecting...' : (isStoreOpen ? 'Store Online' : 'Store Offline')}
              </p>
              <p className='text-[9px] text-gray-400'>
                {isStoreOpen ? 'Accepting Orders' : 'Store Closed'}
              </p>
            </div>
          </div>
          <span className='text-[9px] font-bold text-gray-300'>v2.5</span>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;