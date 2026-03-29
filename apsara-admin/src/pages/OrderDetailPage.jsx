import { useParams, useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGetAdminOrderByIdQuery, useUpdateOrderStatusMutation } from '../slices/orderApiSlice';
import { STATUS_TRANSITIONS, STATUS_LABELS } from '../constants';
import { useToast } from '../hooks/useToast';
import StatusBadge from '../components/common/StatusBadge';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const shortId  = (id) => id?.slice(-6).toUpperCase();

const STEPS = ['placed','preparing','out_for_delivery','delivered'];
const STEP_ICONS = { placed:'📋', preparing:'👨‍🍳', out_for_delivery:'🛵', delivered:'✅' };
const BTN_LABELS = { preparing:'Confirm Order', out_for_delivery:'Dispatch Now', delivered:'Complete Order', cancelled:'Cancel Request' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const { data: order, isLoading } = useGetAdminOrderByIdQuery(id, { pollingInterval: 15000 });
  const [updateStatus, { isLoading: updating }] = useUpdateOrderStatusMutation();

  const handleUpdate = async (status) => {
    try {
      await updateStatus({ id, status }).unwrap();
      showSuccess(`Status: ${STATUS_LABELS[status]}`);
    } catch (e) { showError(e?.data?.message || 'Update failed'); }
  };

  if (isLoading) return <Spinner />;
  if (!order) return <p className='text-center py-20 text-slate-400 font-bold'>Order Not Found</p>;

  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];
  const currentStep  = STEPS.indexOf(order.status);

  return (
    <div className='max-w-6xl mx-auto pb-20 px-4 sm:px-6'>
      <button onClick={() => navigate('/orders')}
        className='flex items-center gap-2 text-[#1B4332] text-[10px] font-black uppercase tracking-widest mb-6 sm:mb-8 hover:gap-3 transition-all'>
        ← Return to Queue
      </button>

      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-6 mb-6 sm:mb-10'>
        <div className='flex items-center gap-3 sm:gap-4 flex-wrap'>
          <div className='bg-[#1B4332] text-white font-mono font-black px-4 sm:px-5 py-2 sm:py-2.5 rounded-2xl text-[11px] sm:text-[12px] tracking-widest'>
            #{shortId(order._id)}
          </div>
          <StatusBadge status={order.status} />
        </div>
        <p className='text-slate-400 text-[10px] font-black uppercase tracking-widest'>
          Received: {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}
        </p>
      </div>

      {/* Stepper — horizontal on md+, condensed on mobile */}
      {order.status !== 'cancelled' && (
        <div className='bg-white rounded-[28px] sm:rounded-[40px] border border-green-50 p-5 sm:p-8 mb-6 sm:mb-8 shadow-sm overflow-x-auto'>
          <div className='flex items-center min-w-[320px] max-w-4xl mx-auto'>
            {STEPS.map((step, i) => (
              <div key={step} className='flex items-center flex-1 last:flex-none'>
                <div className='flex flex-col items-center gap-2 sm:gap-3'>
                  <div className={`w-9 h-9 sm:w-12 sm:h-12 rounded-[14px] sm:rounded-[20px] flex items-center justify-center text-base sm:text-xl transition-all duration-500
                    ${i <= currentStep ? 'bg-[#1B4332] text-white shadow-xl shadow-emerald-900/10' : 'bg-[#F2F7F2] text-emerald-200'}`}>
                    {STEP_ICONS[step]}
                  </div>
                  <p className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-center whitespace-nowrap transition-colors
                    ${i <= currentStep ? 'text-[#1B4332]' : 'text-slate-300'}`}>
                    {STATUS_LABELS[step]}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-1 sm:h-1.5 mx-2 sm:mx-4 rounded-full transition-all duration-1000
                    ${i < currentStep ? 'bg-emerald-500' : 'bg-[#F2F7F2]'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8'>
        <div className='lg:col-span-2 space-y-6 sm:space-y-8'>
          {/* Items */}
          <div className='bg-white rounded-[28px] sm:rounded-[40px] border border-green-50 shadow-sm overflow-hidden'>
            <div className='px-5 sm:px-8 py-4 sm:py-6 border-b border-slate-50'>
              <h2 className='text-[11px] font-black text-[#1B4332] uppercase tracking-[3px]'>Detailed Items</h2>
            </div>
            <div className='divide-y divide-slate-50'>
              {order.items.map((item, i) => (
                <div key={i} className='px-5 sm:px-8 py-4 sm:py-5 flex items-center justify-between gap-4 sm:gap-6 hover:bg-[#F2F7F2]/30 transition-colors'>
                  <div className='flex-1 min-w-0'>
                    <p className='font-black text-slate-800 text-sm mb-0.5 truncate'>{item.productName}</p>
                    <p className='text-[10px] font-bold text-slate-400 uppercase tracking-tight'>
                      {item.variant} {item.isZeroSugar && '· Zero Sugar'} · Qty: {item.quantity}
                    </p>
                  </div>
                  <p className='font-black text-slate-700 text-sm shrink-0'>{currency(item.totalPrice)}</p>
                </div>
              ))}
            </div>

            <div className='p-5 sm:p-8 bg-[#F2F7F2]/40'>
              <div className='max-w-xs ml-auto space-y-3'>
                <div className='flex justify-between text-[11px] font-bold text-slate-400 uppercase'>
                  <span>Subtotal</span><span>{currency(order.pricing.subtotal)}</span>
                </div>
                {order.pricing.discountAmount > 0 && (
                  <div className='flex justify-between text-[11px] font-black text-emerald-600 uppercase'>
                    <span>🏷 Discount</span><span>-{currency(order.pricing.discountAmount)}</span>
                  </div>
                )}
                <div className='flex justify-between text-[11px] font-bold text-slate-400 uppercase'>
                  <span>🛵 Logistics</span><span>{currency(order.pricing.deliveryCharge)}</span>
                </div>
                <div className='flex justify-between items-center pt-4 border-t border-emerald-100'>
                  <span className='text-[11px] font-black text-[#1B4332] uppercase tracking-widest'>Total Amount</span>
                  <span className='text-xl sm:text-2xl font-black text-[#1B4332]'>{currency(order.pricing.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='space-y-6 sm:space-y-8'>
          {/* Customer & Delivery */}
          <div className='bg-white rounded-[28px] sm:rounded-[40px] border border-green-50 shadow-sm p-5 sm:p-8'>
            <h2 className='text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 sm:mb-6'>Logistics Details</h2>
            <div className='space-y-4 sm:space-y-6'>
              {[
                { label: 'Recipient', val: order.customer?.name || 'Guest' },
                { label: 'Contact', val: order.customer?.phone },
                { label: 'Destination', val: order.delivery?.address }
              ].map(row => (
                <div key={row.label}>
                  <p className='text-[9px] font-black text-slate-300 uppercase tracking-tighter mb-1'>{row.label}</p>
                  <p className='text-xs font-bold text-slate-700 leading-relaxed'>{row.val}</p>
                </div>
              ))}
              <div className={`inline-block px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest
                ${order.payment?.method === 'cod' ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'}`}>
                {order.payment?.method === 'cod' ? '💵 Cash on Delivery' : '💳 Online Paid'}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className='bg-white rounded-[28px] sm:rounded-[40px] border border-green-50 shadow-sm p-5 sm:p-8'>
            <h2 className='text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-4 sm:mb-6'>Update Progress</h2>
            {nextStatuses.length === 0 ? (
              <div className='text-center py-4'>
                <p className='text-xs font-black text-slate-300 uppercase italic'>Final State Reached</p>
              </div>
            ) : (
              <div className='space-y-3'>
                {nextStatuses.map((s) => (
                  <button key={s} onClick={() => handleUpdate(s)} disabled={updating}
                    className={`w-full py-4 rounded-[22px] font-black text-[11px] uppercase tracking-widest transition-all
                      ${s === 'cancelled'
                        ? 'bg-red-50 text-red-400 hover:bg-red-100'
                        : 'bg-[#1B4332] text-white shadow-xl shadow-emerald-900/10 hover:scale-[1.02]'}`}>
                    {updating ? 'Processing...' : `${STEP_ICONS[s]} ${BTN_LABELS[s] || STATUS_LABELS[s]}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}