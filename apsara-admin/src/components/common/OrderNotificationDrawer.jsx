import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  selectOrderAlerts,
  dismissOrderAlert,
} from '../../slices/socketSlice';
import { useUpdateOrderStatusMutation } from '../../slices/orderApiSlice';
import { useToast } from '../../hooks/useToast';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function OrderNotificationDrawer() {
  const alerts = useSelector(selectOrderAlerts);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const { showSuccess, showError } = useToast();

  useEffect(() => {
    if (alerts.length === 0) return;
    const latestAlert = alerts[0];
    const timer = setTimeout(() => {
      dispatch(dismissOrderAlert(latestAlert._id));
    }, 16000);
    return () => clearTimeout(timer);
  }, [alerts, dispatch]);

  if (alerts.length === 0) return null;

  const handleStartPreparing = async (orderId, orderNumber) => {
    try {
      await updateOrderStatus({ id: orderId, status: 'preparing' }).unwrap();
      dispatch(dismissOrderAlert(orderId));
      showSuccess(`Order ${orderNumber || ''} moved to Preparing`);
    } catch (err) {
      showError(err?.data?.message || 'Failed to update order status');
    }
  };

  const handleViewOrder = (orderId) => {
    dispatch(dismissOrderAlert(orderId));
    navigate(`/orders/${orderId}`);
  };

  return (
    <div className='fixed top-4 sm:top-6 right-4 sm:right-6 z-[9999] flex flex-col gap-3 pointer-events-auto max-w-[94vw] sm:max-w-[400px] w-full'>
      {alerts.map((order) => (
        <div
          key={order._id}
          className='bg-white border-2 border-emerald-600 rounded-2xl p-5 shadow-2xl text-slate-800 animate-in slide-in-from-right duration-300 relative'
        >
          <div className='flex items-center justify-between mb-3'>
            <div className='flex items-center gap-2'>
              <span className='relative flex h-2.5 w-2.5'>
                <span className='animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75'></span>
                <span className='relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-600'></span>
              </span>
              <span className='text-[10px] font-black uppercase tracking-wider text-[#1B4332]'>
                New Incoming Order
              </span>
            </div>

            <button
              onClick={() => dispatch(dismissOrderAlert(order._id))}
              className='text-gray-400 hover:text-gray-700 p-1 rounded-lg'
              aria-label='Dismiss notification'
            >
              <svg width='16' height='16' viewBox='0 0 20 20' fill='currentColor'>
                <path fillRule='evenodd' d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z' clipRule='evenodd' />
              </svg>
            </button>
          </div>

          <div className='flex items-start justify-between gap-3 mb-3'>
            <div>
              <div className='flex items-center gap-2'>
                <span className='font-mono font-black text-base text-[#1B4332]'>
                  {order.orderNumber || `#${order._id.slice(-4).toUpperCase()}`}
                </span>
                <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded ${
                  order.payment?.method === 'cod'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-emerald-100 text-emerald-800'
                }`}>
                  {order.payment?.method === 'cod' ? 'COD' : 'PAID'}
                </span>
              </div>

              <p className='text-xs font-bold text-slate-800 mt-1'>
                {order.customer?.name || 'Customer'}{' '}
                {order.customer?.phone && (
                  <span className='text-gray-400 text-[11px] font-medium ml-1'>
                    ({order.customer.phone})
                  </span>
                )}
              </p>
            </div>

            <div className='text-right'>
              <span className='text-lg font-black text-slate-900 font-mono'>
                {currency(order.pricing?.total || order.totalAmount)}
              </span>
              <p className='text-[9px] font-bold text-gray-400 uppercase mt-0.5'>
                {order.items?.length || 1} {order.items?.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {order.items && order.items.length > 0 && (
            <div className='bg-gray-50 rounded-xl p-2.5 mb-4 border border-gray-100'>
              <p className='text-[11px] text-gray-600 font-medium line-clamp-2'>
                {order.items.map((it) => `${it.quantity}x ${it.productName || 'Ice Cream'} (${it.variant || 'Regular'})`).join(', ')}
              </p>
            </div>
          )}

          <div className='flex items-center gap-2'>
            <button
              onClick={() => handleStartPreparing(order._id, order.orderNumber)}
              disabled={isUpdating}
              className='flex-1 bg-[#1B4332] hover:bg-[#163829] text-white font-bold py-2.5 px-3 rounded-xl text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-50'
            >
              <span>Accept & Prepare</span>
            </button>

            <button
              onClick={() => handleViewOrder(order._id)}
              className='bg-gray-100 hover:bg-gray-200 text-slate-700 font-bold py-2.5 px-3.5 rounded-xl text-xs uppercase tracking-wider transition-all'
            >
              Details
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
