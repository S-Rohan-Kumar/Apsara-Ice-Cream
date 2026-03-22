import { useState } from 'react';
import { useBroadcastNotificationMutation } from '../slices/notificationApiSlice';
import { useToast } from '../hooks/useToast';
 
const TEMPLATES = [
  { icon:'🍦', title:'Weekend Special!',    body:'20% off all Kulfis this weekend only. Visit us today!' },
  { icon:'🎉', title:'Festival Offer!',     body:'Celebrate with Apsara — special prices today!' },
  { icon:'🆕', title:'New Flavour Alert!',  body:'Try our newest flavour — now available at the store!' },
  { icon:'☀️', title:'Summer Sale!',        body:'Beat the heat with Apsara. Great discounts all week.' },
];
 
export function BroadcastPage() {
  const [title,  setTitle]  = useState('');
  const [body,   setBody]   = useState('');
  const [result, setResult] = useState(null);
  const [broadcast, { isLoading }] = useBroadcastNotificationMutation();
  const { showSuccess, showError } = useToast();
 
  const handleSend = async () => {
    if (!title.trim() || !body.trim()) { showError('Both fields required'); return; }
    try {
      const res = await broadcast({ title, body, data:{ type:'promotional' } }).unwrap();
      setResult(res);
      showSuccess(`Sent to ${res.sent} users`);
      setTitle(''); setBody('');
    } catch (e) { showError(e?.data?.message || 'Failed'); }
  };
 
  return (
    <div className='max-w-xl'>
      <div className='mb-6'>
        <h1 className='text-2xl font-extrabold text-gray-800'>Broadcast</h1>
        <p className='text-sm text-gray-400 mt-0.5'>Send a push notification to all customers</p>
      </div>
 
      {/* Templates */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4'>
        <p className='text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-3'>
          Quick Templates
        </p>
        <div className='grid grid-cols-2 gap-2'>
          {TEMPLATES.map((t) => (
            <button key={t.title}
              onClick={() => { setTitle(t.title); setBody(t.body); }}
              className='flex items-center gap-2 text-left p-3 rounded-xl border border-gray-100
                         hover:border-[#1B5E4B]/30 hover:bg-[#F7FBF9] transition-all'>
              <span className='text-xl shrink-0'>{t.icon}</span>
              <span className='text-xs font-semibold text-gray-600 truncate'>{t.title}</span>
            </button>
          ))}
        </div>
      </div>
 
      {/* Compose */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4'>
        <p className='text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4'>
          Compose Message
        </p>
        <div className='space-y-3'>
          <div>
            <div className='flex justify-between mb-1'>
              <label className='text-xs font-semibold text-gray-500'>Title</label>
              <span className='text-[10px] text-gray-300'>{title.length}/50</span>
            </div>
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50}
              placeholder='e.g. Weekend Special 🍦'
              className='w-full border border-gray-200 rounded-xl px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                         focus:border-[#1B5E4B] bg-gray-50 text-sm' />
          </div>
          <div>
            <div className='flex justify-between mb-1'>
              <label className='text-xs font-semibold text-gray-500'>Message</label>
              <span className='text-[10px] text-gray-300'>{body.length}/150</span>
            </div>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={150}
              rows={3} placeholder='e.g. 20% off all Kulfis today only!'
              className='w-full border border-gray-200 rounded-xl px-4 py-3
                         focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                         focus:border-[#1B5E4B] bg-gray-50 resize-none text-sm' />
          </div>
        </div>
      </div>
 
      {/* Phone preview */}
      <div className='bg-gray-900 rounded-2xl p-4 mb-4'>
        <p className='text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-3'>
          📱 Notification Preview
        </p>
        <div className='bg-white/10 backdrop-blur rounded-xl p-3 flex items-start gap-3'>
          <div className='w-9 h-9 bg-[#1B5E4B] rounded-xl flex items-center justify-center
                          text-lg shrink-0'>🍦</div>
          <div>
            <p className='font-bold text-white text-sm'>{title || 'Your title here'}</p>
            <p className='text-gray-300 text-xs mt-0.5 line-clamp-2'>
              {body || 'Your message will appear here'}
            </p>
          </div>
          <span className='text-gray-500 text-[10px] shrink-0 ml-auto'>now</span>
        </div>
      </div>
 
      {/* Send */}
      <button onClick={handleSend} disabled={isLoading}
        className='w-full bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold py-4
                   rounded-2xl transition-all disabled:opacity-50 shadow-lg
                   shadow-[#1B5E4B]/20 flex items-center justify-center gap-2 text-sm'>
        {isLoading
          ? <><span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />Sending...</>
          : '📢 Send to All Customers'}
      </button>
 
      {/* Result */}
      {result && (
        <div className='mt-4 bg-[#F7FBF9] border border-[#1B5E4B]/20 rounded-2xl p-5'>
          <p className='font-bold text-[#1B5E4B] mb-4 flex items-center gap-2'>
            <span>✅</span> Broadcast sent successfully
          </p>
          <div className='grid grid-cols-3 gap-3'>
            {[
              { label:'Total Users', value:result.totalUsers, cls:'text-gray-800' },
              { label:'Delivered',   value:result.sent,       cls:'text-[#1B5E4B]' },
              { label:'Failed',      value:result.failed,     cls:'text-red-500'   },
            ].map((s) => (
              <div key={s.label} className='bg-white rounded-xl p-3 text-center border border-gray-100'>
                <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
                <p className='text-[10px] text-gray-400 mt-0.5 font-semibold uppercase tracking-wide'>
                  {s.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
 
export default BroadcastPage;