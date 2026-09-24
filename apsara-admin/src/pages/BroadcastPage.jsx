import { useState, useEffect } from 'react';
import { useBroadcastNotificationMutation } from '../slices/notificationApiSlice';
import { useToast } from '../hooks/useToast';

const TEMPLATES = [
  { category: 'Weekend Special', title: 'Weekend Scoop Special!', body: 'Buy 2 Large Scoops & Get 20% off all artisanal kulfis this weekend only!' },
  { category: 'Festive', title: 'Festival Celebration Offer!', body: 'Celebrate with Apsara — fresh seasonal Alphonso Mango & Guava available today!' },
  { category: 'New Flavour', title: 'New Flavour Alert: Roasted Almond!', body: 'Indulge in our newest slow-roasted almond crunch. Now serving at Mandya store.' },
  { category: 'Summer Deal', title: 'Beat the Heat with Apsara!', body: 'Chilled delights delivered to your doorstep in 30 minutes. Order your tub now.' },
  { category: 'Zero Sugar', title: 'Guilt-Free Treats Available!', body: 'Craving natural sweetness? Try our sugar-free Malai and Kesar Pista varieties.' }
];

export function BroadcastPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetAudience, setTargetAudience] = useState('all');
  const [result, setResult] = useState(null);
  const [currentTime, setCurrentTime] = useState('12:45 PM');
  const [broadcast, { isLoading }] = useBroadcastNotificationMutation();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) {
      showError('Please provide both notification title and message');
      return;
    }
    try {
      const res = await broadcast({
        title: title.trim(),
        body: body.trim(),
        data: { type: 'promotional', audience: targetAudience }
      }).unwrap();
      setResult(res);
      showSuccess(`Broadcast delivered successfully to ${res.sent || res.totalUsers || 0} customers!`);
      setTitle('');
      setBody('');
    } catch (e) {
      showError(e?.data?.message || 'Failed to dispatch broadcast');
    }
  };

  return (
    <div className='max-w-7xl mx-auto pb-24 space-y-6'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <span className='px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800'>
              Push Engine v2.5
            </span>
            <span className='flex items-center gap-1.5 text-xs font-semibold text-gray-500'>
              <span className='w-2 h-2 rounded-full bg-emerald-500' />
              Firebase Cloud Gateway Connected
            </span>
          </div>
          <h1 className='text-2xl sm:text-3xl font-black text-[#1B4332] tracking-tight'>
            Customer Broadcast
          </h1>
          <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mt-1'>
            Push Delivery to Registered Customer Devices
          </p>
        </div>

        <div className='flex items-center gap-3 bg-white px-4 py-2 rounded-xl border border-gray-200 shadow-xs'>
          <div>
            <p className='text-[10px] font-bold text-gray-400 uppercase'>Channel</p>
            <p className='text-xs font-bold text-[#1B4332]'>Apsara Mobile App</p>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-12 gap-6 items-start'>
        <div className='lg:col-span-7 space-y-6'>
          <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-6'>
            <div className='flex items-center justify-between mb-3 border-b border-gray-100 pb-3'>
              <h3 className='text-xs font-bold text-slate-800 uppercase tracking-wider'>Templates</h3>
              <span className='text-[11px] text-gray-400'>Tap to auto-fill</span>
            </div>
            <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
              {TEMPLATES.map((t) => (
                <button
                  key={t.title}
                  type='button'
                  onClick={() => { setTitle(t.title); setBody(t.body); }}
                  className='p-3 rounded-xl border border-gray-200 hover:border-emerald-600 hover:bg-emerald-50/50 text-left transition group'
                >
                  <span className='text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1'>
                    {t.category}
                  </span>
                  <p className='text-xs font-bold text-slate-800 truncate'>
                    {t.title}
                  </p>
                  <p className='text-[11px] text-gray-500 line-clamp-1 mt-0.5'>
                    {t.body}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-6 space-y-4'>
            <div className='flex items-center justify-between border-b border-gray-100 pb-3'>
              <div>
                <h3 className='text-xs font-bold text-slate-800 uppercase tracking-wider'>Compose Notification</h3>
                <p className='text-xs text-gray-400'>Delivers to customer lock screens</p>
              </div>
              <div className='flex gap-1 bg-gray-100 p-1 rounded-xl text-xs'>
                <button
                  type='button'
                  onClick={() => setTargetAudience('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    targetAudience === 'all' ? 'bg-[#1B4332] text-white' : 'text-gray-600 hover:text-slate-900'
                  }`}
                >
                  All Users
                </button>
                <button
                  type='button'
                  onClick={() => setTargetAudience('active')}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition ${
                    targetAudience === 'active' ? 'bg-[#1B4332] text-white' : 'text-gray-600 hover:text-slate-900'
                  }`}
                >
                  Frequent Buyers
                </button>
              </div>
            </div>

            <div>
              <div className='flex justify-between items-center mb-1.5 px-1'>
                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>
                  Notification Title
                </label>
                <span className='text-[10px] font-bold text-gray-400'>
                  {title.length} / 50
                </span>
              </div>
              <input
                type='text'
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
                placeholder='e.g. Special Weekend Flavour Today at Apsara!'
                className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
              />
            </div>

            <div>
              <div className='flex justify-between items-center mb-1.5 px-1'>
                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>
                  Message Body
                </label>
                <span className='text-[10px] font-bold text-gray-400'>
                  {body.length} / 150
                </span>
              </div>
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={150}
                rows={3}
                placeholder='Enter your message for customers. Mention special discounts or fresh items.'
                className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] resize-none'
              />
            </div>

            <div className='pt-2'>
              <button
                type='button'
                onClick={handleSend}
                disabled={isLoading || !title.trim() || !body.trim()}
                className='w-full bg-[#1B4332] hover:bg-[#163829] active:scale-[0.99] text-white font-bold py-3 rounded-xl transition disabled:opacity-50 shadow-xs flex items-center justify-center gap-2 text-xs uppercase tracking-wider'
              >
                {isLoading ? (
                  <>
                    <span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />
                    <span>Broadcasting to Devices...</span>
                  </>
                ) : (
                  <span>Send Notification Now</span>
                )}
              </button>
            </div>
          </div>
        </div>

        <div className='lg:col-span-5 space-y-6'>
          <div className='bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden border border-slate-800'>
            <div className='flex items-center justify-between text-white/50 text-[11px] font-semibold mb-6'>
              <span>{currentTime}</span>
              <span>Online</span>
            </div>

            <div className='text-center mb-4'>
              <p className='text-[10px] font-bold text-emerald-400 uppercase tracking-wider'>
                Device Preview
              </p>
            </div>

            <div className='bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/10 shadow-lg'>
              <div className='flex items-start gap-3'>
                <div className='w-9 h-9 bg-[#1B4332] rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0 border border-emerald-500/30'>
                  A
                </div>
                <div className='flex-1 min-w-0'>
                  <div className='flex items-center justify-between mb-1'>
                    <span className='text-[10px] font-bold text-emerald-300 uppercase tracking-wider'>
                      Apsara Ice Creams
                    </span>
                    <span className='text-[9px] text-white/40'>now</span>
                  </div>
                  <h4 className='font-bold text-white text-xs'>
                    {title || 'Weekend Scoop Special!'}
                  </h4>
                  <p className='text-white/80 text-[11px] mt-1 leading-relaxed break-words'>
                    {body || 'Buy 2 Large Scoops & Get 20% off all artisanal kulfis this weekend only! Tap to view details.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {result && (
            <div className='bg-white rounded-2xl border border-emerald-200 shadow-xs p-5'>
              <h4 className='text-xs font-bold text-[#1B4332] uppercase tracking-wider mb-3'>Delivery Report</h4>
              <div className='grid grid-cols-3 gap-3 text-center'>
                <div className='bg-gray-50 rounded-xl p-3 border border-gray-100'>
                  <p className='text-lg font-black text-slate-800'>{result.totalUsers ?? result.sent ?? 0}</p>
                  <p className='text-[9px] font-bold text-gray-400 uppercase'>Total</p>
                </div>
                <div className='bg-emerald-50 rounded-xl p-3 border border-emerald-100'>
                  <p className='text-lg font-black text-emerald-700'>{result.sent ?? 0}</p>
                  <p className='text-[9px] font-bold text-emerald-800 uppercase'>Delivered</p>
                </div>
                <div className='bg-red-50 rounded-xl p-3 border border-red-100'>
                  <p className='text-lg font-black text-red-600'>{result.failed ?? 0}</p>
                  <p className='text-[9px] font-bold text-red-800 uppercase'>Failed</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BroadcastPage;