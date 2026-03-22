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
      setError(err?.data?.message || 'Invalid username or password');
    }
  };

  return (
    <div className='min-h-screen flex bg-[#F7FBF9]'>

      {/* Left branding panel */}
      <div className='hidden lg:flex w-[460px] shrink-0 bg-gradient-to-br from-[#1B5E4B] to-[#2a7a60]
                      flex-col justify-between p-12 relative overflow-hidden'>
        <div className='absolute -top-20 -left-20 w-72 h-72 rounded-full bg-white/5' />
        <div className='absolute -bottom-12 -right-12 w-56 h-56 rounded-full bg-white/5' />

        <div className='relative flex items-center gap-3'>
          <div className='w-12 h-12 bg-[#F5A623] rounded-2xl flex items-center
                          justify-center text-2xl shadow-lg shadow-black/20'>🍦</div>
          <div>
            <p className='text-white/50 text-[10px] font-bold tracking-widest uppercase'>Admin Portal</p>
            <h1 className='text-white text-xl font-extrabold leading-none'>Apsara Ice Creams</h1>
          </div>
        </div>

        <div className='relative space-y-8'>
          <div>
            <p className='text-[#F5A623] text-xs font-bold tracking-widest uppercase mb-3'>
              Scooping Happiness Since 1971
            </p>
            <h2 className='text-white text-3xl font-extrabold leading-snug'>
              Manage your store<br />from one place.
            </h2>
          </div>
          <div className='space-y-3'>
            {[
              ['📦','Live order tracking & updates'],
              ['🍦','Product & category management'],
              ['📊','Revenue reports & analytics'],
              ['📢','Push notifications to all customers'],
            ].map(([icon, text]) => (
              <div key={text} className='flex items-center gap-3'>
                <div className='w-8 h-8 bg-white/10 rounded-xl flex items-center justify-center text-sm shrink-0'>{icon}</div>
                <p className='text-white/75 text-sm'>{text}</p>
              </div>
            ))}
          </div>
        </div>

        <p className='relative text-white/25 text-xs'>© 2024 Apsara Ice Creams · Mandya</p>
      </div>

      {/* Right login form */}
      <div className='flex-1 flex items-center justify-center p-8'>
        <div className='w-full max-w-[400px]'>
          <div className='lg:hidden flex items-center gap-3 mb-8'>
            <div className='w-10 h-10 bg-[#1B5E4B] rounded-xl flex items-center justify-center text-xl'>🍦</div>
            <h1 className='font-extrabold text-[#1B5E4B] text-xl'>Apsara Admin</h1>
          </div>

          <h2 className='text-2xl font-extrabold text-gray-800 mb-1'>Welcome back</h2>
          <p className='text-gray-400 text-sm mb-8'>Sign in to your admin dashboard</p>

          {error && (
            <div className='flex items-center gap-2 bg-red-50 border border-red-100
                            text-red-600 text-sm rounded-2xl px-4 py-3 mb-5'>
              <span>⚠️</span><span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className='space-y-4'>
            <div>
              <label className='text-sm font-semibold text-gray-600 block mb-1.5'>Username</label>
              <input value={username} onChange={(e) => setUsername(e.target.value)}
                placeholder='Enter username' autoComplete='username'
                className='w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5
                           focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                           focus:border-[#1B5E4B] transition placeholder-gray-300' required />
            </div>
            <div>
              <label className='text-sm font-semibold text-gray-600 block mb-1.5'>Password</label>
              <div className='relative'>
                <input type={showPass ? 'text' : 'password'}
                  value={password} onChange={(e) => setPassword(e.target.value)}
                  placeholder='Enter password' autoComplete='current-password'
                  className='w-full bg-white border border-gray-200 rounded-2xl px-4 py-3.5 pr-12
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] transition placeholder-gray-300' required />
                <button type='button' onClick={() => setShowPass(!showPass)}
                  className='absolute right-4 top-1/2 -translate-y-1/2 text-gray-300
                             hover:text-gray-500 transition text-sm'>
                  {showPass ? '🙈' : '👁️'}
                </button>
              </div>
            </div>
            <button type='submit' disabled={isLoading}
              className='w-full bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold
                         py-3.5 rounded-2xl transition-all shadow-lg shadow-[#1B5E4B]/20
                         disabled:opacity-50 flex items-center justify-center gap-2 mt-2'>
              {isLoading
                ? <><span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />Signing in...</>
                : 'Sign In →'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}