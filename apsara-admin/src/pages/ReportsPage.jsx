import { useState } from 'react';
import { useGetMonthlyReportQuery } from '../slices/orderApiSlice';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ReportsPage() {
  const now = new Date();
  const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const [from, setFrom] = useState(firstDayOfMonth);
  const [to, setTo] = useState(todayStr);
  const [queryRange, setQueryRange] = useState({ from: firstDayOfMonth, to: todayStr });
  const [ledgerSearch, setLedgerSearch] = useState('');

  const { data: report, isLoading, isFetching, refetch } = useGetMonthlyReportQuery(queryRange);

  const handleFetch = () => {
    setQueryRange({ from, to });
    refetch();
  };

  const setPreset = (presetType) => {
    const current = new Date();
    let start = new Date();
    let end = new Date();

    if (presetType === 'today') {
      start = current;
      end = current;
    } else if (presetType === '7days') {
      start = new Date(current.setDate(current.getDate() - 7));
      end = new Date();
    } else if (presetType === 'month') {
      start = new Date(current.getFullYear(), current.getMonth(), 1);
      end = new Date();
    } else if (presetType === 'lastMonth') {
      start = new Date(current.getFullYear(), current.getMonth() - 1, 1);
      end = new Date(current.getFullYear(), current.getMonth(), 0);
    }

    const sStr = start.toISOString().slice(0, 10);
    const eStr = end.toISOString().slice(0, 10);
    setFrom(sStr);
    setTo(eStr);
    setQueryRange({ from: sStr, to: eStr });
  };

  const topSoldBase = report?.topProducts?.[0]?.totalSold || 1;
  const filteredOrders = (report?.orders || []).filter((o) => {
    if (!ledgerSearch.trim()) return true;
    const q = ledgerSearch.toLowerCase();
    const num = (o.orderNumber || o._id || '').toLowerCase();
    const cust = (o.customer?.name || '').toLowerCase();
    const phone = (o.customer?.phone || '').toLowerCase();
    return num.includes(q) || cust.includes(q) || phone.includes(q);
  });

  const totalUnitsSold = (report?.topProducts || []).reduce((acc, p) => acc + (p.totalSold || 0), 0);

  return (
    <div className='max-w-7xl mx-auto pb-24 space-y-6'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <span className='px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800'>
              Financial Ledger
            </span>
            <span className='text-xs font-semibold text-gray-500'>
              Period: {queryRange.from} to {queryRange.to}
            </span>
          </div>
          <h1 className='text-2xl sm:text-3xl font-black text-[#1B4332] tracking-tight'>
            Sales Reports & Insights
          </h1>
          <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mt-1'>
            Revenue Performance, Order Volume Breakdown and Product Velocity
          </p>
        </div>

        <button
          onClick={() => window.print()}
          className='bg-white border border-gray-200 hover:border-gray-300 text-slate-700 font-bold px-4 py-2 rounded-xl shadow-xs transition text-xs uppercase tracking-wider flex items-center gap-2 self-start md:self-auto'
        >
          <svg className='w-4 h-4 text-gray-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <polyline points='6 9 6 2 18 2 18 9'></polyline>
            <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'></path>
            <rect x='6' y='14' width='12' height='8'></rect>
          </svg>
          <span>Print Financial Sheet</span>
        </button>
      </div>

      <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-5 space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 pb-3'>
          <h3 className='text-xs font-bold text-slate-700 uppercase tracking-wider'>Accounting Period</h3>
          <div className='flex flex-wrap gap-1.5'>
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'lastMonth', label: 'Last Month' }
            ].map((p) => (
              <button
                key={p.id}
                type='button'
                onClick={() => setPreset(p.id)}
                className='px-3 py-1 rounded-lg text-xs font-semibold bg-gray-50 hover:bg-gray-100 text-gray-600 transition'
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        <div className='flex flex-col sm:flex-row items-stretch sm:items-end gap-3'>
          <div className='flex-1'>
            <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block'>
              From Date
            </label>
            <input
              type='date'
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800'
            />
          </div>
          <div className='flex-1'>
            <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider ml-1 mb-1 block'>
              To Date
            </label>
            <input
              type='date'
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800'
            />
          </div>
          <button
            onClick={handleFetch}
            disabled={isLoading || isFetching}
            className='bg-[#1B4332] hover:bg-[#163829] active:scale-95 text-white font-bold px-6 py-2.5 rounded-xl shadow-xs transition text-xs uppercase tracking-wider disabled:opacity-60'
          >
            {isFetching ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {(isLoading || isFetching) && (
        <div className='py-20 text-center'><Spinner /></div>
      )}

      {report && (
        <div className='space-y-6 animate-in fade-in duration-300'>
          <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4'>
            <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-5'>
              <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Net Revenue</p>
              <p className='text-2xl font-black text-[#1B4332] mt-1 font-mono'>{currency(report.totalRevenue)}</p>
            </div>

            <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-5'>
              <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Orders Delivered</p>
              <p className='text-2xl font-black text-slate-800 mt-1 font-mono'>{report.totalOrders || 0}</p>
            </div>

            <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-5'>
              <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Avg Order Value</p>
              <p className='text-2xl font-black text-slate-800 mt-1 font-mono'>{currency(report.avgOrderValue)}</p>
            </div>

            <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-5'>
              <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wider'>Total Units Sold</p>
              <p className='text-2xl font-black text-slate-800 mt-1 font-mono'>{totalUnitsSold} items</p>
            </div>
          </div>

          <div className='grid grid-cols-1 lg:grid-cols-12 gap-6'>
            <div className='lg:col-span-5 bg-white rounded-2xl border border-gray-200 shadow-xs p-6 flex flex-col justify-between'>
              <div>
                <div className='flex items-center justify-between mb-4 pb-3 border-b border-gray-100'>
                  <div>
                    <h3 className='text-xs font-bold text-[#1B4332] uppercase tracking-wider'>Top Flavours</h3>
                    <p className='text-xs text-gray-400'>By sales velocity</p>
                  </div>
                  <span className='px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800'>
                    Ranked
                  </span>
                </div>

                <div className='space-y-4'>
                  {(report.topProducts || []).length === 0 ? (
                    <div className='py-8 text-center text-gray-400 text-xs font-semibold'>
                      No flavour sales recorded in this interval
                    </div>
                  ) : (
                    report.topProducts.map((p, index) => {
                      const percentage = Math.min(100, Math.round(((p.totalSold || 0) / topSoldBase) * 100));
                      return (
                        <div key={p.productName} className='space-y-1.5'>
                          <div className='flex items-center justify-between text-xs'>
                            <div className='flex items-center gap-2 min-w-0'>
                              <span className='w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center font-bold text-[10px] text-gray-600 shrink-0'>
                                {index + 1}
                              </span>
                              <span className='font-bold text-slate-800 truncate'>{p.productName}</span>
                            </div>
                            <div className='text-right shrink-0 pl-2'>
                              <span className='font-bold text-[#1B4332] font-mono'>{currency(p.revenue)}</span>
                              <span className='text-gray-400 text-[10px] ml-1'>({p.totalSold} sold)</span>
                            </div>
                          </div>
                          <div className='h-1.5 bg-gray-100 rounded-full overflow-hidden'>
                            <div
                              className='h-full bg-emerald-600 rounded-full transition-all duration-500'
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className='mt-6 pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400'>
                <span>Delivered Orders Only</span>
                <span className='font-bold text-emerald-800'>Apsara Mandya</span>
              </div>
            </div>

            <div className='lg:col-span-7 bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden flex flex-col justify-between'>
              <div>
                <div className='p-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
                  <div>
                    <h3 className='text-xs font-bold text-[#1B4332] uppercase tracking-wider'>Order Ledger</h3>
                    <p className='text-xs text-gray-400'>{filteredOrders.length} records in this period</p>
                  </div>
                  <div className='w-full sm:w-56'>
                    <input
                      type='text'
                      value={ledgerSearch}
                      onChange={(e) => setLedgerSearch(e.target.value)}
                      placeholder='Search order # or phone...'
                      className='w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-semibold text-slate-800 placeholder-gray-400'
                    />
                  </div>
                </div>

                <div className='overflow-x-auto'>
                  <table className='w-full text-left'>
                    <thead className='bg-gray-50'>
                      <tr>
                        {['Order #', 'Customer', 'Date', 'Amount'].map((h) => (
                          <th key={h} className='px-5 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider'>
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className='divide-y divide-gray-100'>
                      {filteredOrders.length === 0 ? (
                        <tr>
                          <td colSpan={4} className='py-12 text-center text-gray-400 text-xs font-semibold'>
                            No orders found
                          </td>
                        </tr>
                      ) : (
                        filteredOrders.map((o) => (
                          <tr key={o._id} className='hover:bg-gray-50/80 transition-colors'>
                            <td className='px-5 py-3.5'>
                              <span className='font-mono font-bold text-xs text-[#1B4332]'>
                                {o.orderNumber || `#${o._id.slice(-4).toUpperCase()}`}
                              </span>
                            </td>
                            <td className='px-5 py-3.5'>
                              <p className='font-bold text-slate-800 text-xs'>{o.customer?.name || 'Customer'}</p>
                              <p className='text-[10px] font-mono text-gray-400'>{o.customer?.phone || '—'}</p>
                            </td>
                            <td className='px-5 py-3.5'>
                              <span className='text-xs text-gray-500 font-medium'>
                                {new Date(o.createdAt).toLocaleDateString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </td>
                            <td className='px-5 py-3.5'>
                              <span className='font-bold text-slate-900 text-xs font-mono'>
                                {currency(o.pricing?.total ?? o.totalAmount ?? 0)}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className='p-4 bg-gray-50 border-t border-gray-100 text-right'>
                <span className='text-xs font-bold text-slate-700'>
                  Ledger Total: {currency(filteredOrders.reduce((sum, ord) => sum + (ord.pricing?.total ?? ord.totalAmount ?? 0), 0))}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}