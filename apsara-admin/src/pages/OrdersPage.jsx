import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useGetAdminOrdersQuery } from '../slices/orderApiSlice';
import { clearOrders } from '../slices/socketSlice';
import StatusBadge from '../components/common/StatusBadge';
import Spinner from '../components/common/Spinner';

const shortId  = (id) => id?.slice(-6).toUpperCase();
const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const timeAgo  = (iso) => {
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

const FILTERS = [
  { label: 'Active Queue', value: 'placed,preparing', dot: 'bg-emerald-400' },
  { label: 'In Transit',   value: 'out_for_delivery', dot: 'bg-amber-400' },
  { label: 'Fulfilled',    value: 'delivered',         dot: 'bg-slate-400' },
  { label: 'All History',  value: '',                  dot: 'bg-slate-200' },
];

const CARD_ACCENT = {
  placed:           'border-l-blue-400',
  preparing:        'border-l-yellow-400',
  out_for_delivery: 'border-l-amber-400',
  delivered:        'border-l-emerald-500',
  cancelled:        'border-l-red-400',
};

export default function OrdersPage() {
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('placed,preparing');

  useEffect(() => { dispatch(clearOrders()); }, [dispatch]);

  const { data, isLoading, isFetching } = useGetAdminOrdersQuery(
    { status: filter },
    { pollingInterval: 30000 }
  );

  const orders = data?.orders || [];
  const total  = data?.total  || 0;

  return (
    <div className="min-h-screen bg-[#FBFCFB] pb-24">
      {/* --- ORGANIC HEADER --- */}
      <div className="px-8 pt-12 pb-20 bg-[#F2F7F2] rounded-b-[60px] border-b border-green-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 bg-white rounded-full text-[10px] font-black text-emerald-700 uppercase tracking-widest shadow-sm">
                Live Console
              </span>
              {isFetching && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />}
            </div>
            <h1 className="text-5xl font-black tracking-tight text-[#1B4332]">
              Incoming <span className="text-emerald-500/60 font-serif italic">Scoops</span>
            </h1>
            <p className="text-emerald-900/40 font-bold text-xs uppercase tracking-[3px] mt-4">
              Since 1971 • {total} Active Requests
            </p>
          </div>
          
          <div className="flex gap-2 bg-white/50 p-1.5 rounded-[24px] border border-green-100/50 backdrop-blur-md overflow-x-auto no-scrollbar">
            {FILTERS.map((f) => (
              <button 
                key={f.value} 
                onClick={() => setFilter(f.value)}
                className={`px-6 py-3 rounded-[20px] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap
                  ${filter === f.value ? 'bg-[#1B4332] text-white shadow-xl shadow-emerald-900/20' : 'text-emerald-800/50 hover:text-emerald-800'}`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-10">
        {isLoading ? (
          <div className="py-20 flex justify-center"><Spinner /></div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-[48px] p-20 text-center shadow-sm border border-green-50">
            <div className="text-6xl mb-6 opacity-30">🍦</div>
            <h2 className="text-2xl font-black text-[#1B4332]">Queue is currently empty</h2>
            <p className="text-gray-400 mt-2 font-medium">New orders will pop up here automatically.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <Link 
                key={order._id} 
                to={`/orders/${order._id}`}
                className={`group flex flex-col md:flex-row md:items-center gap-6 bg-white rounded-[32px] p-6 border border-transparent border-l-8 hover:border-emerald-100 hover:shadow-[0_20px_50px_rgba(27,67,50,0.05)] transition-all duration-500 ${CARD_ACCENT[order.status] || 'border-l-slate-200'}`}
              >
                <div className="flex items-center gap-6 flex-1 min-w-0">
                  <div className="w-14 h-14 bg-[#F2F7F2] rounded-[22px] flex flex-col items-center justify-center shrink-0 group-hover:bg-[#1B4332] transition-colors duration-500">
                    <span className="text-[8px] font-black text-slate-400 group-hover:text-emerald-200 uppercase mb-0.5">Order</span>
                    <span className="font-mono font-black text-[#1B4332] text-xs group-hover:text-white">
                      {shortId(order._id)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-black text-slate-800 truncate group-hover:text-emerald-700 transition-colors">
                        {order.customer?.name || order.customer?.phone}
                      </h3>
                      <StatusBadge status={order.status} />
                    </div>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide truncate">
                      {order.items?.map(i => `${i.productName} ×${i.quantity}`).join('  ·  ')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between md:justify-end gap-8 md:border-l md:border-slate-50 md:pl-8">
                  <div className="text-left md:text-right">
                    <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest mb-1">Total Amount</p>
                    <p className="text-xl font-black text-[#1B4332] leading-none">{currency(order.pricing?.total)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[11px] font-bold text-amber-500 mb-1">{timeAgo(order.createdAt)}</p>
                    <span className="px-2 py-0.5 bg-slate-100 rounded text-[9px] font-black text-slate-400 uppercase tracking-tighter">
                      {order.payment?.method === 'cod' ? '💵 COD' : '💳 Paid'}
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}