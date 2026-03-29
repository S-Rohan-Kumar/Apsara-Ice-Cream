import { useState } from 'react';
import { Outlet }    from 'react-router-dom';
import Sidebar        from './Sidebar';
import Topbar         from './Topbar';
import { useSocket }  from '../../hooks/useSocket';

export default function AppLayout() {
  useSocket();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className='flex h-screen bg-[#FBFCFB] font-sans text-slate-800'>
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-50 lg:relative lg:translate-x-0 lg:z-auto
        transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      <div className='flex flex-col flex-1 overflow-hidden min-w-0'>
        <Topbar onMenuClick={() => setSidebarOpen(true)} />
        <main className='flex-1 overflow-y-auto p-4 sm:p-6 lg:p-10 no-scrollbar scroll-smooth'>
          <div className='max-w-7xl mx-auto'>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}