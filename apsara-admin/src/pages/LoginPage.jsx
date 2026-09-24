import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { SetCredentials } from '../slices/authSlice';
import { useAdminLoginMutation } from '../slices/authApiSlice';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
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
      setError(err?.data?.message || 'Invalid credentials or unauthorized');
    }
  };

  return (
    <div className='min-h-screen flex flex-col lg:flex-row bg-[#FBFCFB]'>
      <div className='hidden lg:flex w-[480px] shrink-0 bg-[#0A1F18] flex-col justify-between p-16 relative overflow-hidden'>
        <div className='absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl' />
        <div className='absolute bottom-0 left-0 w-64 h-64 bg-emerald-400/5 rounded-full translate-y-1/2 -translate-x-1/2 blur-2xl' />

        <div className='relative flex items-center gap-4'>
          <img
            src='/logo.png'
            alt='Apsara Ice Creams'
            className='w-14 h-14 rounded-full object-contain bg-white p-0.5 shadow-xl border border-white/20'
          />
          <div>
            <p className='text-emerald-400/80 text-[10px] font-bold tracking-[3px] uppercase'>Merchant Partner</p>
            <h1 className='text-white text-2xl font-black tracking-tight'>Apsara Ice Creams</h1>
          </div>
        </div>

        <div className='relative'>
          <div className='inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-[2px] uppercase mb-4'>
            <span className='w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse' />
            Store Management Portal
          </div>
          <h2 className='text-white text-3xl font-black leading-tight tracking-tight'>
            Manage your store orders<br />
            <span className='text-emerald-400/70 font-serif italic font-light'>with speed and precision.</span>
          </h2>
          <div className='mt-8 space-y-3.5'>
            {[
              'Real-Time Kitchen Order Pipeline',
              'Smart Flavour Stock & Variant Matrix',
              'Instant Delivery Partner Dispatch',
              'Sales Intelligence & Insights'
            ].map((text) => (
              <div key={text} className='flex items-center gap-3 group'>
                <div className='w-1.5 h-1.5 rounded-full bg-emerald-400' />
                <p className='text-white/70 text-xs font-semibold tracking-wide'>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <div className='relative flex items-center justify-between text-white/30 text-[10px] font-semibold uppercase tracking-wider'>
          <span>Apsara Mandya Store</span>
          <span>SSL Encrypted</span>
        </div>
      </div>

      <div className='lg:hidden bg-[#0A1F18] px-6 py-5 flex items-center gap-3 border-b border-emerald-900/30'>
        <img
          src='/logo.png'
          alt='Apsara Ice Creams'
          className='w-11 h-11 rounded-full object-contain bg-white p-0.5 shadow-md border border-white/20'
        />
        <div>
          <p className='text-emerald-400 text-[9px] font-bold tracking-[2px] uppercase'>Merchant Partner</p>
          <h1 className='text-white text-base font-black tracking-tight'>Apsara Ice Creams</h1>
        </div>
      </div>

      <div className='flex-1 flex items-center justify-center p-6 sm:p-12'>
        <div className='w-full max-w-[360px] animate-in fade-in duration-300'>
          <div className='mb-8'>
            <span className='px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800 inline-block mb-3'>
              Store Sign In
            </span>
            <h2 className='text-2xl font-black text-slate-900 tracking-tight'>Partner Login</h2>
            <p className='text-slate-400 text-xs font-semibold mt-1'>
              Enter your credentials to access store dashboard
            </p>
          </div>

          {error && (
            <div className='bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl px-4 py-3 mb-6 border border-rose-200 flex items-center gap-2.5'>
              <svg className='w-4 h-4 text-rose-600 shrink-0' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='12' cy='12' r='10'></circle>
                <line x1='12' y1='8' x2='12' y2='12'></line>
                <line x1='12' y1='16' x2='12.01' y2='16'></line>
              </svg>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1.5 block'>
                Username or Email
              </label>
              <input
                type='text'
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder='admin'
                className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all'
                required
              />
            </div>
            <div>
              <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1.5 block'>
                Password
              </label>
              <div className='relative'>
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder='••••••••'
                  className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all'
                  required
                />
                <button
                  type='button'
                  onClick={() => setShowPass(!showPass)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-slate-600 text-xs font-bold'
                >
                  {showPass ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <button
              type='submit'
              disabled={isLoading}
              className='w-full bg-[#1B4332] hover:bg-[#163829] active:scale-[0.99] text-white font-bold py-3.5 rounded-xl transition shadow-xs disabled:opacity-50 flex items-center justify-center gap-2 text-xs uppercase tracking-wider mt-4'
            >
              {isLoading ? (
                <>
                  <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                  <span>Logging In...</span>
                </>
              ) : (
                'Access Dashboard'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}