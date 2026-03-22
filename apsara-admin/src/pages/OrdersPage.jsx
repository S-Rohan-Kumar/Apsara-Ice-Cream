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
  { label: 'Active',       value: 'placed,preparing', dot: 'bg-red-400' },
  { label: 'Out for Del.', value: 'out_for_delivery',  dot: 'bg-[#F5A623]' },
  { label: 'Delivered',    value: 'delivered',          dot: 'bg-[#1B5E4B]' },
  { label: 'All Orders',   value: '',                   dot: 'bg-gray-400' },
];

const CARD_ACCENT = {
  placed:           'border-l-blue-400',
  preparing:        'border-l-yellow-400',
  out_for_delivery: 'border-l-[#F5A623]',
  delivered:        'border-l-[#1B5E4B]',
  cancelled:        'border-l-red-400',
};

export default function OrdersPage() {
  const dispatch = useDispatch();
  const [filter, setFilter] = useState('placed,preparing');

  useEffect(() => { dispatch(clearOrders()); }, []);

  const { data, isLoading, isFetching } = useGetAdminOrdersQuery(
    { status: filter },
    { pollingInterval: 30000 }
  );

  // ✅ backend returns { orders:[], total, currentPage, totalPages }
  const orders = data?.orders || [];
  const total  = data?.total  || 0;

  return (
    <div>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-extrabold text-gray-800'>Live Orders</h1>
          <p className='text-sm text-gray-400 mt-0.5'>
            {total} order{total !== 1 ? 's' : ''} · auto-refreshes every 30s
          </p>
        </div>
        {isFetching && (
          <div className='flex items-center gap-2 text-[#1B5E4B] text-xs font-semibold
                          bg-[#1B5E4B]/10 px-3 py-1.5 rounded-full border border-[#1B5E4B]/20'>
            <span className='w-3 h-3 border-2 border-[#1B5E4B]/30 border-t-[#1B5E4B]
                             rounded-full animate-spin' />
            Updating
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div className='flex gap-2 mb-6 flex-wrap'>
        {FILTERS.map((f) => (
          <button key={f.value} onClick={() => setFilter(f.value)}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold
                        transition-all border
              ${filter === f.value
                ? 'bg-[#1B5E4B] text-white border-[#1B5E4B] shadow-md shadow-[#1B5E4B]/20'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[#1B5E4B]/30'}`}>
            <span className={`w-2 h-2 rounded-full ${f.dot}`} />
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : orders.length === 0 ? (
        <div className='flex flex-col items-center justify-center py-24 text-gray-300'>
          <span className='text-7xl mb-4'>🍦</span>
          <p className='text-lg font-semibold text-gray-400'>No orders right now</p>
          <p className='text-sm mt-1 text-gray-300'>New orders will appear here instantly</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {orders.map((order) => (
            <Link key={order._id} to={`/orders/${order._id}`}
              className={`flex items-center gap-5 bg-white rounded-2xl p-4 border-l-4
                          border border-gray-100 hover:shadow-md hover:-translate-y-px
                          transition-all block ${CARD_ACCENT[order.status] || 'border-l-gray-300'}`}>

              {/* Left — ID + meta */}
              <div className='shrink-0'>
                <div className='w-12 h-12 bg-[#F7FBF9] rounded-xl flex items-center
                                justify-center border border-[#1B5E4B]/10'>
                  <span className='font-mono font-extrabold text-[#1B5E4B] text-xs'>
                    {shortId(order._id)}
                  </span>
                </div>
              </div>

              {/* Middle — customer + items */}
              <div className='flex-1 min-w-0'>
                <div className='flex items-center gap-2 mb-1'>
                  <p className='font-bold text-gray-800 text-sm truncate'>
                    {order.customer?.name || order.customer?.phone}
                  </p>
                  <StatusBadge status={order.status} />
                </div>
                <p className='text-xs text-gray-400 truncate'>
                  {order.items?.map(i => `${i.productName} ×${i.quantity}`).join('  ·  ')}
                </p>
              </div>

              {/* Right — price + time */}
              <div className='text-right shrink-0'>
                <p className='font-extrabold text-gray-800'>{currency(order.pricing?.total)}</p>
                <p className='text-xs text-gray-300 mt-0.5'>{timeAgo(order.createdAt)}</p>
                <p className='text-[10px] text-gray-300 mt-0.5'>
                  {order.payment?.method === 'cod' ? '💵 COD' : '💳 Online'}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}