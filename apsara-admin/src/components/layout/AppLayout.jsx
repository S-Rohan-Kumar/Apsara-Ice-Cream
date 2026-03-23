import { Outlet }    from 'react-router-dom';
import Sidebar        from './Sidebar';
import Topbar         from './Topbar';
import { useSocket }  from '../../hooks/useSocket';

export default function AppLayout() {
  useSocket();  

  return (
    <div className='flex h-screen bg-[#FBFCFB] font-sans text-slate-800'>
      <Sidebar />
      <div className='flex flex-col flex-1 overflow-hidden'>
        <Topbar />
        <main className='flex-1 overflow-y-auto p-10 no-scrollbar scroll-smooth'>
          <div className='max-w-7xl mx-auto'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}