import { useState } from 'react';
import { useGetMonthlyReportQuery } from '../slices/orderApiSlice';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ReportsPage() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const today = now.toISOString().slice(0,10);

  const [from,      setFrom]      = useState(first);
  const [to,        setTo]        = useState(today);
  const [submitted, setSubmitted] = useState(false);

  const { data:report, isLoading, isFetching } = useGetMonthlyReportQuery({ from, to }, { skip:!submitted });

  const SUMMARY = report ? [
    { label:'Orders',  value:report.totalOrders,            icon:'📦' },
    { label:'Revenue', value:currency(report.totalRevenue), icon:'💰' },
    { label:'Average', value:currency(report.avgOrderValue), icon:'📊' },
  ] : [];

  return (
    <div className='max-w-7xl mx-auto pb-20'>
      <div className='mb-10'>
        <h1 className='text-2xl font-black text-[#1B4332]'>Analytics</h1>
        <p className='text-[11px] font-bold text-emerald-900/40 uppercase tracking-widest mt-1'>Revenue Performance & Insight</p>
      </div>

      <div className='bg-white rounded-[40px] border border-green-50 shadow-sm p-8 mb-10'>
        <div className='flex flex-wrap items-end gap-6'>
          {[ ['From', from, setFrom], ['To', to, setTo] ].map(([label, val, set]) => (
            <div key={label} className='flex-1 min-w-[150px]'>
              <label className='text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-2 block'>{label} Date</label>
              <input type='date' value={val} onChange={(e) => set(e.target.value)}
                className='w-full bg-[#F2F7F2] border-none rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500' />
            </div>
          ))}
          <button onClick={() => setSubmitted(true)}
            className='bg-[#1B4332] text-white font-black px-10 py-4
                       rounded-2xl shadow-xl shadow-emerald-900/10 transition-all text-[11px] uppercase tracking-widest'>
            Fetch Data
          </button>
        </div>
      </div>

      {(isLoading || isFetching) && <div className='py-20'><Spinner /></div>}

      {report && (
        <div className='animate-in fade-in duration-700'>
          {/* Summary Metrics */}
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6 mb-10'>
            {SUMMARY.map((s) => (
              <div key={s.label} className='bg-white rounded-[32px] border border-green-50 shadow-sm p-6 flex items-center gap-6'>
                <div className='w-14 h-14 bg-[#F2F7F2] rounded-[22px] flex items-center justify-center text-2xl group'>
                  {s.icon}
                </div>
                <div>
                  <p className='text-2xl font-black text-[#1B4332]'>{s.value}</p>
                  <p className='text-[10px] text-slate-400 font-black uppercase tracking-widest'>{s.label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className='grid lg:grid-cols-3 gap-8'>
            {/* Top Products - List Layout */}
            <div className='bg-white rounded-[40px] border border-green-50 shadow-sm p-8'>
              <h2 className='text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-8'>Top Sellers</h2>
              <div className='space-y-6'>
                {report.topProducts.map((p, i) => (
                  <div key={p.productName} className='flex items-center gap-4'>
                    <span className='text-[11px] font-black text-[#1B4332] bg-[#F2F7F2] w-8 h-8 flex items-center justify-center rounded-xl shrink-0'>
                      {i+1}
                    </span>
                    <div className='flex-1 min-w-0'>
                      <div className='flex justify-between mb-1'>
                        <span className='font-black text-slate-700 text-xs truncate mr-2'>{p.productName}</span>
                        <span className='font-black text-slate-400 text-xs'>{currency(p.revenue)}</span>
                      </div>
                      <div className='h-1.5 bg-[#F2F7F2] rounded-full overflow-hidden'>
                        <div className='h-full bg-emerald-500 rounded-full' 
                             style={{ width:`${Math.round((p.totalSold / report.topProducts[0].totalSold) * 100)}%` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* List Layout for Orders */}
            <div className='lg:col-span-2 bg-white rounded-[40px] border border-green-50 shadow-sm overflow-hidden'>
              <div className='px-8 py-6 border-b border-slate-50 flex justify-between items-center'>
                <h2 className='text-[10px] font-black text-[#1B4332] uppercase tracking-widest'>Order Ledger</h2>
                <span className='text-[10px] font-black text-slate-300 uppercase'>{report.orders.length} Deliveries</span>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead className='bg-[#F2F7F2]/30'>
                    <tr>
                      {['ID','Customer','Revenue','Date'].map(h => (
                        <th key={h} className='text-left px-8 py-4 text-[9px] font-black text-emerald-900/40 uppercase tracking-widest'>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-50'>
                    {report.orders.map((o) => (
                      <tr key={o._id} className='hover:bg-[#F2F7F2]/50 transition-colors'>
                        <td className='px-8 py-5'>
                          <span className='font-mono font-black text-[#1B4332] text-[11px]'>#{o._id.slice(-6).toUpperCase()}</span>
                        </td>
                        <td className='px-8 py-5'>
                          <p className='font-black text-slate-700 text-xs'>{o.customer?.name || 'Guest'}</p>
                          <p className='text-[9px] font-bold text-slate-300'>{o.customer?.phone}</p>
                        </td>
                        <td className='px-8 py-5'>
                          <span className='font-black text-slate-800 text-xs'>{currency(o.pricing.total)}</span>
                        </td>
                        <td className='px-8 py-5'>
                          <span className='text-[10px] font-bold text-slate-400 uppercase whitespace-nowrap'>
                            {new Date(o.createdAt).toLocaleDateString('en-IN', { day:'2-digit', month:'short' })}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}