import { useEffect, useState, useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import {
  useGetAdminOrdersQuery,
  useUpdateOrderStatusMutation,
} from '../slices/orderApiSlice';
import { clearOrders, addOrderAlert } from '../slices/socketSlice';
import { useToast } from '../hooks/useToast';
import { getDeliveryBoyMessage } from '../utils/deliveryMessage';
import { playOrderChime } from '../utils/sound';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const formatTime = (iso) => {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
};

export function OrdersPage() {
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('placed');
  const [searchQuery, setSearchQuery] = useState('');
  const { showSuccess, showError } = useToast();

  const [updateOrderStatus] = useUpdateOrderStatusMutation();
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  const knownOrdersRef = useRef(new Set());
  const initialLoadRef = useRef(true);

  useEffect(() => {
    dispatch(clearOrders());
  }, [dispatch]);

  const { data, isLoading, isFetching, refetch } = useGetAdminOrdersQuery(
    { status: '', page: 1 },
    { pollingInterval: 10000 }
  );

  const rawOrders = useMemo(() => data?.orders || [], [data]);

  useEffect(() => {
    if (rawOrders.length === 0) return;

    if (initialLoadRef.current) {
      rawOrders.forEach((o) => knownOrdersRef.current.add(o._id));
      initialLoadRef.current = false;
      return;
    }

    const newPlaced = rawOrders.filter(
      (o) => o.status === 'placed' && !knownOrdersRef.current.has(o._id)
    );

    newPlaced.forEach((newOrd) => {
      knownOrdersRef.current.add(newOrd._id);
      dispatch(addOrderAlert(newOrd));
      playOrderChime();
    });

    rawOrders.forEach((o) => knownOrdersRef.current.add(o._id));
  }, [rawOrders, dispatch]);

  const filteredOrders = useMemo(() => {
    let list = rawOrders;

    if (activeTab === 'placed') {
      list = list.filter((o) => o.status === 'placed');
    } else if (activeTab === 'preparing') {
      list = list.filter((o) => o.status === 'preparing');
    } else if (activeTab === 'out_for_delivery') {
      list = list.filter((o) => o.status === 'out_for_delivery');
    } else if (activeTab === 'delivered') {
      list = list.filter((o) => o.status === 'delivered');
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((ord) => {
        const num = (ord.orderNumber || '').toLowerCase();
        const id = (ord._id || '').toLowerCase();
        const name = (ord.customer?.name || '').toLowerCase();
        const phone = (ord.customer?.phone || '').toLowerCase();
        const address = (ord.delivery?.address || '').toLowerCase();
        const hasItem = (ord.items || []).some((it) =>
          (it.productName || '').toLowerCase().includes(q)
        );
        return (
          num.includes(q) ||
          id.includes(q) ||
          name.includes(q) ||
          phone.includes(q) ||
          address.includes(q) ||
          hasItem
        );
      });
    }

    return list;
  }, [rawOrders, activeTab, searchQuery]);

  const counts = useMemo(() => {
    const res = { placed: 0, preparing: 0, out_for_delivery: 0, delivered: 0, all: rawOrders.length };
    rawOrders.forEach((o) => {
      if (res[o.status] !== undefined) {
        res[o.status] += 1;
      }
    });
    return res;
  }, [rawOrders]);

  const handleAdvanceStatus = async (orderId, orderNumber, nextStatus) => {
    try {
      setUpdatingOrderId(orderId);
      await updateOrderStatus({ id: orderId, status: nextStatus }).unwrap();
      showSuccess(`Order ${orderNumber || ''} moved to ${nextStatus.replace(/_/g, ' ')}!`);
    } catch (err) {
      showError(err?.data?.message || 'Could not update order status');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const handleCopyDeliveryInfo = (order) => {
    const text = getDeliveryBoyMessage(order);
    navigator.clipboard.writeText(text);
    showSuccess('Delivery info copied for rider!');
  };

  const handleShareWhatsApp = (order) => {
    const text = getDeliveryBoyMessage(order);
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div className='max-w-7xl mx-auto pb-24 space-y-6'>
      <div className='flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div className='flex-1 max-w-xl'>
          <div className='relative'>
            <span className='absolute left-4 top-1/2 -translate-y-1/2 text-gray-400'>
              <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                <circle cx='11' cy='11' r='8'></circle>
                <line x1='21' y1='21' x2='16.65' y2='16.65'></line>
              </svg>
            </span>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Look for orders by ID, food item or customer name'
              className='w-full bg-white border border-gray-200 rounded-2xl pl-11 pr-10 py-3 text-xs font-semibold text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] shadow-xs transition-all'
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className='absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600'
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className='flex items-center gap-3'>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className='bg-white border border-gray-200 hover:border-gray-300 p-2.5 rounded-xl text-gray-600 transition shadow-xs flex items-center gap-1.5 text-xs font-bold'
          >
            <svg className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='23 4 23 10 17 10'></polyline>
              <polyline points='1 20 1 14 7 14'></polyline>
              <path d='M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15'></path>
            </svg>
            <span className='hidden sm:inline'>Refresh</span>
          </button>
        </div>
      </div>

      <div className='flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar border-b border-gray-200'>
        {[
          { id: 'placed', label: 'Incoming', count: counts.placed, badgeCls: 'bg-red-100 text-red-800' },
          { id: 'preparing', label: 'Preparing', count: counts.preparing, badgeCls: 'bg-amber-100 text-amber-800' },
          { id: 'out_for_delivery', label: 'Rollout', count: counts.out_for_delivery, badgeCls: 'bg-blue-100 text-blue-800' },
          { id: 'delivered', label: 'Delivered', count: counts.delivered, badgeCls: 'bg-emerald-100 text-emerald-800' },
          { id: 'all', label: 'All Orders', count: counts.all, badgeCls: 'bg-gray-100 text-gray-700' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 border-b-2 text-xs font-bold transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'border-[#1B4332] text-[#1B4332] font-black'
                : 'border-transparent text-gray-500 hover:text-slate-800 hover:border-gray-300'
            }`}
          >
            <span>{tab.label}</span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${tab.badgeCls}`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className='py-24 text-center'>
          <Spinner />
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className='bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-xs'>
          <div className='w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400'>
            <svg className='w-6 h-6' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <circle cx='12' cy='12' r='10'></circle>
              <line x1='12' y1='8' x2='12' y2='12'></line>
              <line x1='12' y1='16' x2='12.01' y2='16'></line>
            </svg>
          </div>
          <h3 className='text-sm font-black text-slate-800 uppercase tracking-wider mb-1'>No orders in this stage</h3>
          <p className='text-xs text-gray-400 font-medium'>Orders will appear here in real time as customers order.</p>
        </div>
      ) : (
        <div className='space-y-4'>
          {filteredOrders.map((order) => {
            const orderNum = order.orderNumber || `#${order._id.slice(-4).toUpperCase()}`;
            const cleanPhone = (order.customer?.phone || order.delivery?.phone || '').replace(/[^0-9]/g, '');

            let actionLabel = 'Order ready';
            let nextStatus = 'out_for_delivery';
            let btnClass = 'bg-[#1B4332] hover:bg-[#163829] text-white';

            if (order.status === 'placed') {
              actionLabel = 'Accept Order';
              nextStatus = 'preparing';
              btnClass = 'bg-[#1B4332] hover:bg-[#163829] text-white';
            } else if (order.status === 'preparing') {
              actionLabel = 'Order ready (Rollout to Rider)';
              nextStatus = 'out_for_delivery';
              btnClass = 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white';
            } else if (order.status === 'out_for_delivery') {
              actionLabel = 'Mark Delivered';
              nextStatus = 'delivered';
              btnClass = 'bg-[#15803D] hover:bg-[#166534] text-white';
            }

            return (
              <div
                key={order._id}
                className='bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition-shadow p-5 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch'
              >
                <div className='lg:col-span-3 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-100 pb-4 lg:pb-0 lg:pr-6'>
                  <div>
                    <div className='mb-2'>
                      <span className='inline-block px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-100'>
                        Apsara Delivery
                      </span>
                    </div>

                    <h3 className='font-black text-slate-800 text-sm'>Apsara Ice Creams</h3>
                    <p className='text-[11px] text-gray-400 font-medium mb-3'>Mandya Outlet</p>

                    <div className='space-y-1 mb-3'>
                      <p className='font-mono font-black text-slate-900 text-xs tracking-tight'>
                        ID: {orderNum}
                      </p>
                      <div className='flex items-center gap-2'>
                        <span className='font-bold text-xs text-slate-700 truncate'>
                          {order.customer?.name || 'Customer'}
                        </span>
                        {cleanPhone && (
                          <a
                            href={`tel:${cleanPhone}`}
                            className='text-[#2563EB] hover:text-[#1D4ED8] p-1 rounded-md hover:bg-blue-50'
                            title='Call Customer'
                          >
                            <svg className='w-3.5 h-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                              <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'></path>
                            </svg>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className='space-y-1.5 pt-2 border-t border-gray-100 text-[10px] text-gray-500 font-medium'>
                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5 text-emerald-700 font-bold'>
                        <svg className='w-3 h-3 text-emerald-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
                          <polyline points='20 6 9 17 4 12'></polyline>
                        </svg>
                        <span>Placed</span>
                      </div>
                      <span className='font-mono'>{formatTime(order.createdAt)}</span>
                    </div>

                    <div className='flex items-center justify-between'>
                      <div className='flex items-center gap-1.5 text-emerald-700 font-bold'>
                        <svg className='w-3 h-3 text-emerald-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='3' strokeLinecap='round' strokeLinejoin='round'>
                          <polyline points='20 6 9 17 4 12'></polyline>
                        </svg>
                        <span>Status</span>
                      </div>
                      <span className='font-bold uppercase text-[9px] text-[#1B4332]'>
                        {order.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='lg:col-span-5 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-gray-100 pb-4 lg:pb-0 lg:pr-6'>
                  <div className='space-y-2 mb-4'>
                    {(order.items || []).map((it, idx) => (
                      <div key={idx} className='flex items-center justify-between text-xs'>
                        <div className='flex items-center gap-2 min-w-0 pr-2'>
                          <span className='w-3 h-3 border border-emerald-600 rounded-sm flex items-center justify-center shrink-0'>
                            <span className='w-1.5 h-1.5 rounded-full bg-emerald-600'></span>
                          </span>
                          <span className='font-bold text-slate-800 truncate'>
                            {it.quantity} x {it.productName}
                          </span>
                          {it.variant && (
                            <span className='text-[10px] text-gray-400 font-medium shrink-0'>
                              ({it.variant})
                            </span>
                          )}
                        </div>
                        <span className='font-mono font-bold text-slate-700 shrink-0'>
                          {currency(it.totalPrice)}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className='pt-3 border-t border-gray-100'>
                    <div className='flex items-center justify-between mb-3'>
                      <div className='flex items-center gap-2'>
                        <span className='text-xs font-bold text-gray-500'>Total bill</span>
                        <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-md ${
                          order.payment?.method === 'cod'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {order.payment?.method === 'cod' ? 'CASH' : 'PAID'}
                        </span>
                        <span className='font-black text-sm text-slate-900'>
                          {currency(order.pricing?.total ?? order.totalAmount ?? 0)}
                        </span>
                      </div>

                      <Link
                        to={`/orders/${order._id}`}
                        className='text-[11px] font-bold text-[#2563EB] hover:underline flex items-center gap-1'
                      >
                        <svg className='w-3.5 h-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                          <polyline points='6 9 6 2 18 2 18 9'></polyline>
                          <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'></path>
                          <rect x='6' y='14' width='12' height='8'></rect>
                        </svg>
                        <span>Print bill</span>
                      </Link>
                    </div>

                    {order.status !== 'delivered' && order.status !== 'cancelled' ? (
                      <button
                        onClick={() => handleAdvanceStatus(order._id, order.orderNumber, nextStatus)}
                        disabled={updatingOrderId === order._id}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition shadow-sm active:scale-[0.99] disabled:opacity-75 flex items-center justify-center gap-2 ${btnClass}`}
                      >
                        {updatingOrderId === order._id ? (
                          <>
                            <svg className='w-3.5 h-3.5 animate-spin' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                              <circle cx='12' cy='10' r='10'></circle>
                              <path d='M12 2a10 10 0 0 1 10 10'></path>
                            </svg>
                            <span>Updating...</span>
                          </>
                        ) : (
                          actionLabel
                        )}
                      </button>
                    ) : (
                      <div className='w-full py-2 text-center text-xs font-bold text-emerald-800 bg-emerald-50 rounded-xl border border-emerald-200'>
                        {order.status === 'delivered' ? 'Completed & Delivered' : 'Cancelled'}
                      </div>
                    )}
                  </div>
                </div>

                <div className='lg:col-span-4 flex flex-col justify-between space-y-3'>
                  <div>
                    <p className='text-[11px] font-bold text-gray-400 mb-1'>Delivery address</p>
                    <p className='text-xs font-bold text-slate-800 leading-relaxed break-words'>
                      {order.delivery?.address || 'Pickup at store'}
                    </p>
                  </div>

                  <div className='pt-2 border-t border-gray-100 flex items-center justify-between gap-2'>
                    <div className='flex items-center gap-1.5'>
                      <button
                        onClick={() => handleCopyDeliveryInfo(order)}
                        title='Copy delivery boy dispatch text'
                        className='p-2 rounded-xl border border-gray-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 transition'
                      >
                        <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                          <rect x='9' y='9' width='13' height='13' rx='2' ry='2'></rect>
                          <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>
                        </svg>
                      </button>

                      {order.delivery?.googleMapsUrl && (
                        <a
                          href={order.delivery.googleMapsUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          title='Open in Google Maps'
                          className='p-2 rounded-xl border border-gray-200 hover:border-emerald-600 hover:bg-emerald-50 text-slate-600 hover:text-emerald-800 transition'
                        >
                          <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                            <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'></path>
                            <circle cx='12' cy='10' r='3'></circle>
                          </svg>
                        </a>
                      )}

                      <button
                        onClick={() => handleShareWhatsApp(order)}
                        title='Send delivery boy details via WhatsApp'
                        className='p-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition font-bold text-xs flex items-center gap-1'
                      >
                        <svg className='w-4 h-4 text-emerald-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                          <path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'></path>
                        </svg>
                        <span className='hidden sm:inline'>WhatsApp</span>
                      </button>
                    </div>

                    <Link
                      to={`/orders/${order._id}`}
                      className='text-xs font-bold text-gray-500 hover:text-[#1B4332] flex items-center gap-1'
                    >
                      <span>Details</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default OrdersPage;