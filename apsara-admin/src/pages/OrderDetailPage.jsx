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
const BTN_LABELS = { preparing:'Mark Preparing', out_for_delivery:'Out for Delivery', delivered:'Mark Delivered', cancelled:'Cancel Order' };

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const { data: order, isLoading } = useGetAdminOrderByIdQuery(id, { pollingInterval: 15000 });
  const [updateStatus, { isLoading: updating }] = useUpdateOrderStatusMutation();

  const handleUpdate = async (status) => {
    try {
      await updateStatus({ id, status }).unwrap();
      showSuccess(`Marked as ${STATUS_LABELS[status]}`);
    } catch (e) { showError(e?.data?.message || 'Update failed'); }
  };

  if (isLoading) return <Spinner />;
  if (!order)    return <p className='text-center text-gray-400 py-20'>Order not found</p>;

  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];
  const currentStep  = STEPS.indexOf(order.status);

  return (
    <div className='max-w-5xl mx-auto'>
      {/* Back */}
      <button onClick={() => navigate('/orders')}
        className='flex items-center gap-2 text-[#1B5E4B] text-sm font-semibold mb-5
                   hover:gap-3 transition-all'>
        ← Back to Orders
      </button>

      {/* Title row */}
      <div className='flex items-center gap-3 mb-5'>
        <div className='bg-[#1B5E4B] text-white font-mono font-extrabold px-4 py-2
                        rounded-xl text-sm tracking-wider'>
          #{shortId(order._id)}
        </div>
        <StatusBadge status={order.status} />
        <span className='text-gray-300 text-sm ml-auto'>
          {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle:'medium', timeStyle:'short' })}
        </span>
      </div>

      {/* Stepper */}
      {order.status !== 'cancelled' && (
        <div className='bg-white rounded-2xl border border-gray-100 p-5 mb-5 shadow-sm'>
          <div className='flex items-center'>
            {STEPS.map((step, i) => (
              <div key={step} className='flex items-center flex-1 last:flex-none'>
                <div className='flex flex-col items-center gap-1.5'>
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center
                                   text-lg border-2 transition-all
                    ${i <= currentStep
                      ? 'bg-[#1B5E4B] border-[#1B5E4B] text-white shadow-md shadow-[#1B5E4B]/20'
                      : 'bg-white border-gray-200 text-gray-300'}`}>
                    {STEP_ICONS[step]}
                  </div>
                  <p className={`text-[10px] font-semibold text-center whitespace-nowrap
                    ${i <= currentStep ? 'text-[#1B5E4B]' : 'text-gray-300'}`}>
                    {STATUS_LABELS[step]}
                  </p>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 rounded-full
                    ${i < currentStep ? 'bg-[#1B5E4B]' : 'bg-gray-100'}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className='grid lg:grid-cols-2 gap-5'>
        {/* Left col */}
        <div className='space-y-4'>

          {/* Items */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
            <h2 className='text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-4'>
              🛒 Order Items
            </h2>
            <div className='space-y-3'>
              {order.items.map((item, i) => (
                <div key={i} className='flex items-start justify-between gap-3 pb-3
                                        border-b border-dashed border-gray-100 last:border-0 last:pb-0'>
                  <div>
                    <p className='font-semibold text-gray-800 text-sm'>{item.productName}</p>
                    <p className='text-xs text-gray-400 capitalize mt-0.5'>
                      {item.variant} {item.isZeroSugar && '· Zero Sugar'} · qty {item.quantity}
                    </p>
                  </div>
                  <p className='font-bold text-gray-700 shrink-0'>{currency(item.totalPrice)}</p>
                </div>
              ))}
            </div>

            {/* Pricing */}
            <div className='mt-4 pt-4 border-t border-gray-100 space-y-2'>
              {[
                { label:'Subtotal',  value: currency(order.pricing.subtotal), cls:'text-gray-500' },
                order.pricing.discountAmount > 0 && { label:'🏷 Discount', value:`-${currency(order.pricing.discountAmount)}`, cls:'text-green-600 font-semibold' },
                { label:'🛵 Delivery', value: currency(order.pricing.deliveryCharge), cls:'text-gray-500' },
                order.pricing.codCharge > 0 && { label:'💵 COD Charge', value: currency(order.pricing.codCharge), cls:'text-gray-500' },
              ].filter(Boolean).map((row) => (
                <div key={row.label} className={`flex justify-between text-sm ${row.cls}`}>
                  <span>{row.label}</span><span>{row.value}</span>
                </div>
              ))}
              <div className='flex justify-between font-extrabold text-base pt-2
                              border-t border-gray-100'>
                <span className='text-gray-800'>Total</span>
                <span className='text-[#1B5E4B]'>{currency(order.pricing.total)}</span>
              </div>
            </div>
          </div>

          {/* Customer */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
            <h2 className='text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-4'>
              👤 Customer
            </h2>
            <div className='space-y-3 text-sm'>
              {[
                ['Name',    order.customer?.name || '—'],
                ['Phone',   order.customer?.phone],
                ['Address', order.delivery?.address],
              ].map(([label, val]) => (
                <div key={label} className='flex gap-3'>
                  <span className='text-gray-400 w-16 shrink-0'>{label}</span>
                  <span className='font-medium text-gray-700'>{val}</span>
                </div>
              ))}
              <div className='flex gap-3'>
                <span className='text-gray-400 w-16 shrink-0'>Payment</span>
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full
                  ${order.payment?.method === 'cod'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-green-100 text-green-700'}`}>
                  {order.payment?.method === 'cod' ? '💵 Cash on Delivery' : '💳 Online Paid'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right col */}
        <div className='space-y-4'>
          {/* Map */}
          {order.delivery?.location?.lat && (
            <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
              <MapContainer
                center={[order.delivery.location.lat, order.delivery.location.lng]}
                zoom={15} style={{ height: 220 }}>
                <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                <Marker position={[order.delivery.location.lat, order.delivery.location.lng]} />
              </MapContainer>
              <button
                onClick={() => window.open(`https://maps.google.com/?daddr=${order.delivery.location.lat},${order.delivery.location.lng}`, '_blank')}
                className='w-full py-3 text-[#1B5E4B] font-semibold text-sm
                           hover:bg-[#F7FBF9] transition flex items-center justify-center gap-2
                           border-t border-gray-100'>
                🗺 Open in Google Maps
              </button>
            </div>
          )}

          {/* Actions */}
          <div className='bg-white rounded-2xl border border-gray-100 shadow-sm p-5'>
            <h2 className='text-sm font-extrabold text-gray-500 uppercase tracking-wider mb-4'>
              ⚡ Update Status
            </h2>
            {nextStatuses.length === 0 ? (
              <div className='text-center py-6'>
                <span className='text-4xl block mb-2'>{order.status === 'delivered' ? '🎉' : '❌'}</span>
                <p className='text-gray-400 text-sm'>Order is {STATUS_LABELS[order.status]}</p>
              </div>
            ) : (
              <div className='space-y-2'>
                {nextStatuses.map((s) => (
                  <button key={s} onClick={() => handleUpdate(s)} disabled={updating}
                    className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all
                                disabled:opacity-50 flex items-center justify-center gap-2
                      ${s === 'cancelled'
                        ? 'bg-red-50 text-red-500 border border-red-200 hover:bg-red-100'
                        : 'bg-[#1B5E4B] text-white hover:bg-[#164e3e] shadow-md shadow-[#1B5E4B]/20'}`}>
                    {updating
                      ? <><span className='w-4 h-4 border-2 border-current/30 border-t-current rounded-full animate-spin' />Updating...</>
                      : <>{STEP_ICONS[s]} {BTN_LABELS[s] || STATUS_LABELS[s]}</>}
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