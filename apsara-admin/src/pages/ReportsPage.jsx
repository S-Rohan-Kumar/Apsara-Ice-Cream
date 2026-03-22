import { useState } from 'react';
import { useGetMonthlyReportQuery } from '../slices/orderApiSlice';
import Spinner from '../components/common/Spinner';
 
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
 
const exportCSV = (orders) => {
  const headers = ['Order ID','Customer','Phone','Items','Total','Date'];
  const rows = orders.map((o) => [
    o._id.slice(-6).toUpperCase(),
    o.customer?.name || '',
    o.customer?.phone || '',
    o.items.map(i => `${i.productName} x${i.quantity}`).join(' | '),
    o.pricing.total,
    new Date(o.createdAt).toLocaleDateString('en-IN'),
  ]);
  const csv  = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob([csv], { type:'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = Object.assign(document.createElement('a'), { href:url, download:'apsara-report.csv' });
  a.click(); URL.revokeObjectURL(url);
};
 
export function ReportsPage() {
  const now   = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0,10);
  const today = now.toISOString().slice(0,10);
 
  const [from,      setFrom]      = useState(first);
  const [to,        setTo]        = useState(today);
  const [submitted, setSubmitted] = useState(false);
 
  const { data:report, isLoading, isFetching } =
    useGetMonthlyReportQuery({ from, to }, { skip:!submitted });
 
  const SUMMARY = report ? [
    { label:'Total Orders',   value:report.totalOrders,                icon:'📦', cls:'text-gray-800' },
    { label:'Total Revenue',  value:currency(report.totalRevenue),     icon:'💰', cls:'text-[#1B5E4B]' },
    { label:'Avg Order',      value:currency(report.avgOrderValue),    icon:'📊', cls:'text-[#F5A623]' },
  ] : [];
 
  return (
    <div>
      <div className='mb-6'>
        <h1 className='text-2xl font-extrabold text-gray-800'>Reports</h1>
        <p className='text-sm text-gray-400 mt-0.5'>Revenue & order analytics</p>
      </div>
 
      {/* Date picker */}
      <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5'>
        <p className='text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4'>
          Select Date Range
        </p>
        <div className='flex flex-wrap items-end gap-3'>
          {[['From', from, setFrom], ['To', to, setTo]].map(([label, val, set]) => (
            <div key={label}>
              <label className='text-xs font-semibold text-gray-400 block mb-1'>{label}</label>
              <input type='date' value={val} onChange={(e) => set(e.target.value)}
                className='border border-gray-200 rounded-xl px-4 py-2.5 text-sm
                           focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                           focus:border-[#1B5E4B] bg-gray-50' />
            </div>
          ))}
          <button onClick={() => setSubmitted(true)}
            className='bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold px-6 py-2.5
                       rounded-xl shadow-md shadow-[#1B5E4B]/20 transition-all text-sm'>
            Generate
          </button>
        </div>
      </div>
 
      {(isLoading || isFetching) && <Spinner />}
 
      {report && (
        <>
          {/* Summary */}
          <div className='grid grid-cols-1 sm:grid-cols-3 gap-4 mb-5'>
            {SUMMARY.map((s) => (
              <div key={s.label}
                className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5
                           flex items-center gap-4'>
                <div className='w-12 h-12 bg-[#F7FBF9] rounded-xl flex items-center
                                justify-center text-2xl border border-[#1B5E4B]/10'>
                  {s.icon}
                </div>
                <div>
                  <p className={`text-2xl font-extrabold ${s.cls}`}>{s.value}</p>
                  <p className='text-xs text-gray-400 font-semibold mt-0.5'>{s.label}</p>
                </div>
              </div>
            ))}
          </div>
 
          {/* Top products */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5'>
            <p className='text-xs font-extrabold text-gray-400 uppercase tracking-wider mb-4'>
              🏆 Top Products
            </p>
            <div className='space-y-3'>
              {report.topProducts.map((p, i) => {
                const pct = Math.round((p.totalSold / (report.topProducts[0]?.totalSold||1)) * 100);
                return (
                  <div key={p.productName} className='flex items-center gap-3'>
                    <span className={`w-7 h-7 rounded-lg flex items-center justify-center
                                      text-xs font-extrabold shrink-0
                      ${i===0 ? 'bg-yellow-100 text-yellow-600'
                        : i===1 ? 'bg-gray-100 text-gray-500'
                        : 'bg-[#F7FBF9] text-[#1B5E4B]'}`}>{i+1}</span>
                    <div className='flex-1 min-w-0'>
                      <div className='flex justify-between text-sm mb-1'>
                        <span className='font-semibold text-gray-700 truncate'>{p.productName}</span>
                        <span className='font-bold text-gray-500 shrink-0 ml-2'>{currency(p.revenue)}</span>
                      </div>
                      <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                        <div className='h-full bg-[#1B5E4B] rounded-full transition-all'
                             style={{ width:`${pct}%` }} />
                      </div>
                      <p className='text-[10px] text-gray-300 mt-1'>{p.totalSold} units</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
 
          {/* Orders table */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
            <div className='flex items-center justify-between px-5 py-4 border-b border-gray-50'>
              <p className='font-bold text-gray-700 text-sm'>
                Orders <span className='text-gray-300 font-normal'>({report.orders.length})</span>
              </p>
              <button onClick={() => exportCSV(report.orders)}
                className='flex items-center gap-1.5 text-[#1B5E4B] text-xs font-bold
                           border border-[#1B5E4B]/25 bg-[#1B5E4B]/5 hover:bg-[#1B5E4B]/10
                           px-3 py-1.5 rounded-lg transition'>
                📥 Export CSV
              </button>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full'>
                <thead>
                  <tr className='border-b border-gray-50'>
                    {['#','Customer','Items','Total','Date'].map(h => (
                      <th key={h} className='text-left px-5 py-3 text-xs font-extrabold
                                             text-gray-400 uppercase tracking-wider'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {report.orders.map((o) => (
                    <tr key={o._id} className='border-b border-gray-50 hover:bg-[#F7FBF9] transition'>
                      <td className='px-5 py-3.5'>
                        <span className='font-mono font-bold text-[#1B5E4B] text-xs
                                         bg-[#1B5E4B]/10 px-2 py-1 rounded-lg'>
                          #{o._id.slice(-6).toUpperCase()}
                        </span>
                      </td>
                      <td className='px-5 py-3.5'>
                        <p className='font-semibold text-gray-700 text-sm'>{o.customer?.name||'—'}</p>
                        <p className='text-xs text-gray-400'>{o.customer?.phone}</p>
                      </td>
                      <td className='px-5 py-3.5 text-xs text-gray-400 max-w-xs'>
                        <p className='truncate'>
                          {o.items.map(i => `${i.productName} ×${i.quantity}`).join(' · ')}
                        </p>
                      </td>
                      <td className='px-5 py-3.5 font-bold text-gray-800 text-sm'>
                        {currency(o.pricing.total)}
                      </td>
                      <td className='px-5 py-3.5 text-xs text-gray-400'>
                        {new Date(o.createdAt).toLocaleDateString('en-IN', {
                          day:'2-digit', month:'short', year:'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
 
      {submitted && !isLoading && !report && (
        <div className='text-center py-20 text-gray-300'>
          <span className='text-5xl block mb-3'>📊</span>
          <p className='text-gray-400'>No delivered orders in this range</p>
        </div>
      )}
    </div>
  );
}
 
export default ReportsPage;