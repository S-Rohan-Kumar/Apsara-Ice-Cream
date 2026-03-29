import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { useGetAdminOrdersQuery } from '../slices/orderApiSlice';
import { clearOrders } from '../slices/socketSlice';
import StatusBadge from '../components/common/StatusBadge';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const timeAgo = (iso) => {
  if (!iso) return '';
  const m = Math.floor((Date.now() - new Date(iso)) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  if (m < 1440) return `${Math.floor(m / 60)}h ago`;
  return `${Math.floor(m / 1440)}d ago`;
};

const FILTERS = [
  { label: 'Active',       value: 'placed,preparing', dot: 'bg-red-400'     },
  { label: 'Out for Del.', value: 'out_for_delivery',  dot: 'bg-[#F5A623]'  },
  { label: 'Delivered',    value: 'delivered',          dot: 'bg-[#1B5E4B]' },
  { label: 'All Orders',   value: '',                   dot: 'bg-gray-400'  },
];

const CARD_ACCENT = {
  placed: 'border-l-blue-400',
  preparing: 'border-l-yellow-400',
  out_for_delivery: 'border-l-[#F5A623]',
  delivered: 'border-l-[#1B5E4B]',
  cancelled: 'border-l-red-400',
};

export function OrdersPage() {
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('placed,preparing');

  useEffect(() => {
    dispatch(clearOrders());
  }, [dispatch]);

  const { data, isLoading, isFetching, refetch } = useGetAdminOrdersQuery(
    { status: filter },
    { pollingInterval: 30000 }
  );

  const orders = useMemo(() => data?.orders || [], [data]);
  const total = data?.total || 0;

  return (
    <div className='animate-in fade-in duration-500'>
      <div className='flex items-center justify-between mb-5 sm:mb-6'>
        <div>
          <h1 className='text-xl sm:text-2xl font-extrabold text-gray-800 tracking-tight'>Live Orders</h1>
          <p className='text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5'>
            {total} Total Collections {isFetching && <span className="animate-pulse">· Syncing...</span>}
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className='p-2 hover:bg-gray-100 rounded-full transition-colors group'
        >
          <span className={`block ${isFetching ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`}>
            🔄
          </span>
        </button>
      </div>

      {/* Filter tabs — scrollable on small screens */}
      <div className='flex gap-2 mb-5 sm:mb-6 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar'>
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-[10px] sm:text-[11px] uppercase tracking-wider font-black
                        transition-all border shadow-sm whitespace-nowrap shrink-0
              ${filter === f.value
                ? 'bg-[#1B5E4B] text-white border-[#1B5E4B] shadow-emerald-900/20'
                : 'bg-white text-gray-500 border-gray-100 hover:border-emerald-200'}`}
          >
            <span className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${f.dot}`} />
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20"><Spinner /></div>
      ) : orders.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-16 sm:py-24 text-gray-300'>
          <span className='text-6xl sm:text-7xl mb-4 grayscale opacity-30'>🍨</span>
          <p className='text-xs font-black uppercase tracking-[3px] text-gray-400'>No orders in queue</p>
        </div>
      ) : (
        <div className='space-y-3 sm:space-y-4'>
          {orders.map((order) => (
            <Link
              key={order._id}
              to={`/orders/${order._id}`}
              className={`flex items-center gap-3 sm:gap-5 bg-white rounded-[24px] sm:rounded-[32px] p-3.5 sm:p-5 border-l-[6px]
                          border border-gray-50 hover:shadow-xl hover:shadow-emerald-900/5
                          hover:-translate-y-1 transition-all duration-300 block
                          ${CARD_ACCENT[order.status] || 'border-l-gray-200'}`}
            >
              {/* Order number */}
              <div className='shrink-0'>
                <div className='min-w-[72px] sm:min-w-[84px] bg-[#F7FBF9] rounded-[16px] sm:rounded-[20px] px-2 sm:px-3 py-2 sm:py-3 text-center
                                border border-emerald-50'>
                  <p className='font-mono font-black text-[#1B5E4B] text-[11px] sm:text-[13px] tracking-tighter leading-none'>
                    {order.orderNumber || `#${order._id.slice(-4).toUpperCase()}`}
                  </p>
                  <p className='text-[7px] sm:text-[8px] font-black text-emerald-300 uppercase mt-1'>Order ID</p>
                </div>
              </div>

              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 sm:gap-3 mb-1 sm:mb-1.5 flex-wrap'>
                  <p className='font-black text-slate-800 text-sm sm:text-[15px] truncate'>
                    {order.customer?.name || order.customer?.phone || 'Guest'}
                  </p>
                  <StatusBadge status={order.status} />
                </div>
                <p className='text-[10px] font-bold text-gray-400 uppercase tracking-wide truncate'>
                  {order.items?.map(i => `${i.productName} (${i.variant})`).join(' · ')}
                </p>
              </div>

              <div className='text-right shrink-0'>
                <p className='font-black text-slate-800 text-base sm:text-lg tracking-tight'>
                  {currency(order.pricing?.total)}
                </p>
                <div className='flex flex-col items-end gap-1 mt-1'>
                  <span className='text-[9px] font-black text-gray-300 uppercase tracking-widest bg-gray-50 px-1.5 sm:px-2 py-0.5 rounded-md'>
                    {timeAgo(order.createdAt)}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-tighter
                                  ${order.payment?.method === 'cod' ? 'text-orange-500' : 'text-emerald-500'}`}>
                    {order.payment?.method === 'cod' ? '💵 COD' : '💳 Paid'}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;