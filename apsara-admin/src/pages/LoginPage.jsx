import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { SetCredentials } from '../slices/authSlice';
import { useAdminLoginMutation } from '../slices/authApiSlice';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error,    setError]    = useState('');
  const [adminLogin, { isLoading }] = useAdminLoginMutation();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await adminLogin({ username, password }).unwrap();
      dispatch(SetCredentials({ token: res.accessToken, user: res.user }));
      navigate('/orders');
    } catch (err) {
      setError(err?.data?.message || 'Invalid credentials');
    }
  };

  return (
    <div className='min-h-screen flex bg-[#FBFCFB]'>
      {/* Branding panel */}
      <div className='hidden lg:flex w-[480px] shrink-0 bg-[#1B4332] flex-col justify-between p-16 relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl' />
        <div className='absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl' />

        <div className='relative flex items-center gap-4'>
          <div className='w-14 h-14 bg-white/5 backdrop-blur-xl rounded-[22px] flex items-center
                          justify-center text-3xl shadow-2xl'>🍦</div>
          <div>
            <p className='text-emerald-400/60 text-[10px] font-black tracking-[4px] uppercase'>Admin Portal</p>
            <h1 className='text-white text-2xl font-black tracking-tight'>Apsara Ice Creams</h1>
          </div>
        </div>

        <div className='relative'>
          <p className='text-emerald-400 text-[11px] font-black tracking-[3px] uppercase mb-4'>Since 1971</p>
          <h2 className='text-white text-4xl font-black leading-tight tracking-tight'>
            Manage your store<br />
            <span className='text-emerald-500/60 font-serif italic font-light'>with grace.</span>
          </h2>
          <div className='mt-12 space-y-5'>
            {[
              'Live Order Dashboard',
              'Inventory Control',
              'Growth Analytics',
              'Customer Broadcast'
            ].map((text) => (
              <div key={text} className='flex items-center gap-4 group'>
                <div className='w-2 h-2 rounded-full bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors' />
                <p className='text-white/60 text-xs font-bold tracking-wide'>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className='relative text-white/20 text-[10px] font-bold uppercase tracking-widest'>© 2024 Apsara · Mandya</p>
      </div>

      {/* Form area */}
      <div className='flex-1 flex items-center justify-center p-12'>
        <div className='w-full max-w-[360px] animate-in fade-in slide-in-from-right-8 duration-700'>
          <div className='lg:hidden mb-12 flex justify-center'>
            <div className='w-16 h-16 bg-[#1B4332] rounded-[24px] flex items-center justify-center text-3xl shadow-xl'>🍦</div>
          </div>

          <h2 className='text-3xl font-black text-slate-800 tracking-tight mb-2'>Welcome Back</h2>
          <p className='text-slate-400 text-xs font-bold mb-10 uppercase tracking-widest'>Secure Dashboard Access</p>

          {error && (
            <div className='bg-red-50 text-red-500 text-[11px] font-bold rounded-2xl px-5 py-4 mb-8 border border-red-100 flex items-center gap-3'>
              <span className='text-lg'>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-6'>
            <div>
              <label className='text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block'>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder='admin_apsara'
                className='w-full bg-[#F2F7F2] border-none rounded-2xl px-6 py-4.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 transition-all' required />
            </div>
            <div>
              <label className='text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block'>Password</label>
              <div className='relative'>
                <input type={showPass ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className='w-full bg-[#F2F7F2] border-none rounded-2xl px-6 py-4.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 transition-all' required />
                <button type='button' onClick={() => setShowPass(!showPass)}
                  className='absolute right-6 top-1/2 -translate-y-1/2 text-slate-300 hover:text-emerald-500 transition-colors'>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type='submit' disabled={isLoading}
              className='w-full bg-[#1B4332] text-white font-black py-5 rounded-[24px] 
                         transition-all shadow-2xl shadow-emerald-900/10 hover:scale-[1.02] active:scale-[0.98]
                         disabled:opacity-50 flex items-center justify-center gap-3 text-[11px] uppercase tracking-[3px] mt-4'>
              {isLoading ? 'Processing...' : 'Access Dashboard'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}