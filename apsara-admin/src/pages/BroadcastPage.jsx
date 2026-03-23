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
    <div className='max-w-4xl mx-auto pb-20'>
      <div className='mb-8'>
        <h1 className='text-2xl font-black text-[#1B4332]'>Broadcast</h1>
        <p className='text-[11px] font-bold text-emerald-900/40 uppercase tracking-widest mt-1'>
          Reach all customers instantly
        </p>
      </div>

      <div className='grid lg:grid-cols-2 gap-8'>
        <div className='space-y-6'>
          {/* Templates */}
          <div className='bg-white rounded-[32px] border border-green-50 shadow-sm p-6'>
            <p className='text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4'>
              Quick Templates
            </p>
            <div className='grid grid-cols-1 gap-2'>
              {TEMPLATES.map((t) => (
                <button key={t.title}
                  onClick={() => { setTitle(t.title); setBody(t.body); }}
                  className='flex items-center gap-3 text-left p-3 rounded-2xl border border-transparent
                             hover:border-emerald-100 hover:bg-[#F2F7F2] transition-all group'>
                  <span className='text-lg grayscale group-hover:grayscale-0 transition-all'>{t.icon}</span>
                  <span className='text-[11px] font-bold text-slate-600 truncate'>{t.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Compose */}
          <div className='bg-white rounded-[32px] border border-green-50 shadow-sm p-6'>
            <p className='text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4'>
              Compose Message
            </p>
            <div className='space-y-4'>
              <div>
                <div className='flex justify-between mb-1.5 px-1'>
                  <label className='text-[10px] font-black text-slate-400 uppercase'>Title</label>
                  <span className='text-[9px] font-bold text-slate-300'>{title.length}/50</span>
                </div>
                <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={50}
                  placeholder='Enter headline...'
                  className='w-full bg-[#F2F7F2] border-none rounded-2xl px-4 py-3 text-xs font-bold text-slate-700
                             focus:ring-2 focus:ring-emerald-500 transition-all' />
              </div>
              <div>
                <div className='flex justify-between mb-1.5 px-1'>
                  <label className='text-[10px] font-black text-slate-400 uppercase'>Message</label>
                  <span className='text-[9px] font-bold text-slate-300'>{body.length}/150</span>
                </div>
                <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={150}
                  rows={3} placeholder='Write your message here...'
                  className='w-full bg-[#F2F7F2] border-none rounded-2xl px-4 py-3 text-xs font-bold text-slate-700
                             focus:ring-2 focus:ring-emerald-500 transition-all resize-none' />
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-6'>
          {/* Phone preview */}
          <div className='bg-slate-900 rounded-[40px] p-6 shadow-2xl relative overflow-hidden'>
            <div className='absolute top-0 left-1/2 -translate-x-1/2 w-24 h-5 bg-slate-800 rounded-b-xl' />
            <p className='text-[9px] font-black text-slate-500 uppercase tracking-widest mb-6 mt-2 text-center'>
              Preview on Device
            </p>
            <div className='bg-white/10 backdrop-blur-md rounded-2xl p-4 flex items-start gap-3 border border-white/5'>
              <div className='w-10 h-10 bg-[#1B4332] rounded-xl flex items-center justify-center
                              text-lg shrink-0'>🍦</div>
              <div className='flex-1 min-w-0'>
                <p className='font-black text-white text-[12px] truncate'>{title || 'Notification Title'}</p>
                <p className='text-slate-400 text-[11px] mt-0.5 line-clamp-2 leading-relaxed'>
                  {body || 'The content of your notification will appear here for customers...'}
                </p>
              </div>
              <span className='text-slate-500 text-[9px] font-bold shrink-0'>now</span>
            </div>
          </div>

          <button onClick={handleSend} disabled={isLoading}
            className='w-full bg-[#1B4332] text-white font-black py-5 rounded-[24px]
                       transition-all disabled:opacity-50 shadow-xl shadow-emerald-900/20
                       flex items-center justify-center gap-2 text-[11px] uppercase tracking-[2px]'>
            {isLoading
              ? <><span className='w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin' />Sending...</>
              : '📢 Blast to All Customers'}
          </button>

          {result && (
            <div className='bg-emerald-50 rounded-[32px] p-6 border border-emerald-100 animate-in fade-in slide-in-from-bottom-4'>
              <div className='grid grid-cols-3 gap-3'>
                {[
                  { label:'Reach', value:result.totalUsers, cls:'text-slate-800' },
                  { label:'Sent',  value:result.sent,       cls:'text-emerald-600' },
                  { label:'Err',   value:result.failed,     cls:'text-red-400' },
                ].map((s) => (
                  <div key={s.label} className='bg-white rounded-2xl p-3 text-center'>
                    <p className={`text-lg font-black ${s.cls}`}>{s.value}</p>
                    <p className='text-[8px] text-slate-400 font-black uppercase tracking-tighter'>
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default BroadcastPage;