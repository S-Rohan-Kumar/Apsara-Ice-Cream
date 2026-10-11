import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../slices/authSlice';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { useGetAdminOrderByIdQuery, useUpdateOrderStatusMutation } from '../slices/orderApiSlice';
import { STATUS_TRANSITIONS, STATUS_LABELS } from '../constants';
import { useToast } from '../hooks/useToast';
import { getDeliveryBoyMessage } from '../utils/deliveryMessage';
import StatusBadge from '../components/common/StatusBadge';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STEPS = ['placed', 'preparing', 'out_for_delivery', 'delivered'];

const ACTION_CONFIG = {
  preparing: { label: 'Start Preparing & Packing', btnClass: 'bg-[#1B4332] hover:bg-[#163829] text-white' },
  out_for_delivery: { label: 'Hand Over to Rider (Dispatch)', btnClass: 'bg-[#2563EB] hover:bg-[#1D4ED8] text-white' },
  delivered: { label: 'Confirm Delivered to Customer', btnClass: 'bg-[#15803D] hover:bg-[#166534] text-white' },
  cancelled: { label: 'Cancel Order', btnClass: 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200' },
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const userInfo = useSelector(selectUserInfo);
  const role = userInfo?.user?.role || userInfo?.role || 'owner';
  const isBiller = role === 'biller';

  const { data: order, isLoading } = useGetAdminOrderByIdQuery(id, { pollingInterval: 15000 });
  const [updateStatus, { isLoading: updating }] = useUpdateOrderStatusMutation();

  const handleUpdate = async (status) => {
    try {
      await updateStatus({ id, status }).unwrap();
      showSuccess(`Status updated to: ${STATUS_LABELS[status] || status}`);
    } catch (e) {
      showError(e?.data?.message || 'Update failed');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCopyDeliveryText = () => {
    if (!order) return;
    const text = getDeliveryBoyMessage(order, isBiller);
    navigator.clipboard.writeText(text);
    showSuccess('Delivery info copied for rider!');
  };

  const handleWhatsAppDelivery = () => {
    if (!order) return;
    const text = getDeliveryBoyMessage(order, isBiller);
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) return <Spinner />;
  if (!order) {
    return (
      <div className='flex flex-col items-center justify-center py-24 text-center'>
        <h2 className='text-base font-bold text-slate-800 uppercase tracking-wider'>Order Not Found</h2>
        <button
          onClick={() => navigate('/orders')}
          className='mt-4 px-6 py-2.5 bg-[#1B4332] text-white rounded-xl text-xs font-bold'
        >
          Return to Orders
        </button>
      </div>
    );
  }

  const nextStatuses = STATUS_TRANSITIONS[order.status] || [];
  const currentStep = STEPS.indexOf(order.status);
  const displayOrderNum = order.orderNumber || `#${order._id.slice(-4).toUpperCase()}`;
  const rawDigits = (order.customer?.phone || order.delivery?.phone || '').replace(/[^0-9]/g, '');
  const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
  const deliveryBoyText = getDeliveryBoyMessage(order);

  return (
    <div className='max-w-6xl mx-auto pb-24 space-y-6'>
      <div className='flex items-center justify-between gap-4 flex-wrap'>
        <button
          onClick={() => navigate('/orders')}
          className='flex items-center gap-2 text-gray-600 hover:text-slate-900 text-xs font-bold transition-colors'
        >
          <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
            <line x1='19' y1='12' x2='5' y2='12'></line>
            <polyline points='12 19 5 12 12 5'></polyline>
          </svg>
          <span>Back to Orders</span>
        </button>

        <div className='flex items-center gap-2'>
          <button
            onClick={handlePrint}
            className='flex items-center gap-2 px-4 py-2 bg-white hover:bg-gray-50 text-slate-700 rounded-xl text-xs font-bold border border-gray-200 shadow-xs transition-all'
          >
            <svg className='w-4 h-4 text-gray-500' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='6 9 6 2 18 2 18 9'></polyline>
              <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'></path>
              <rect x='6' y='14' width='12' height='8'></rect>
            </svg>
            <span>Print Delivery Slip</span>
          </button>
        </div>
      </div>

      <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100'>
          <div className='flex items-center gap-3.5 flex-wrap'>
            <div className='bg-[#1B4332] text-white font-mono font-bold px-3 py-1.5 rounded-xl text-sm'>
              {displayOrderNum}
            </div>
            <StatusBadge status={order.status} />
            <span className={`text-[10px] font-bold uppercase px-2.5 py-1 rounded-full border ${
              order.payment?.method === 'cod'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {order.payment?.method === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
            </span>
          </div>

          <p className='text-xs font-semibold text-gray-400'>
            Placed: {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
          </p>
        </div>

        {order.status !== 'cancelled' && (
          <div className='pt-6 overflow-x-auto'>
            <div className='flex items-center min-w-[340px] max-w-3xl mx-auto'>
              {STEPS.map((step, i) => (
                <div key={step} className='flex items-center flex-1 last:flex-none'>
                  <div className='flex flex-col items-center gap-1.5'>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                      i <= currentStep
                        ? 'bg-[#1B4332] text-white'
                        : 'bg-gray-100 text-gray-400'
                    }`}>
                      {i + 1}
                    </div>
                    <p className={`text-[10px] font-bold uppercase tracking-wider text-center whitespace-nowrap ${
                      i <= currentStep ? 'text-[#1B4332]' : 'text-gray-400'
                    }`}>
                      {STATUS_LABELS[step]}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={`flex-1 h-0.5 mx-3 rounded-full transition-all ${
                      i < currentStep ? 'bg-[#1B4332]' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6 items-start'>
        <div className='lg:col-span-2 space-y-6'>
          <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs'>
            <div className='flex items-center justify-between pb-4 border-b border-gray-100'>
              <h2 className='text-xs font-bold uppercase tracking-wider text-slate-800'>
                Items Ordered ({order.items?.length || 0})
              </h2>
              <span className='bg-emerald-50 text-emerald-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-100'>
                Standard Pack
              </span>
            </div>

            <div className='divide-y divide-gray-100'>
              {order.items?.map((item, idx) => (
                <div key={idx} className='py-4 flex items-center justify-between gap-4'>
                  <div className='flex-1 min-w-0'>
                    <p className='font-bold text-slate-800 text-sm mb-1 truncate'>
                      {item.productName}
                    </p>
                    <div className='flex items-center gap-2 flex-wrap text-xs text-gray-500'>
                      <span className='bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-[10px] font-bold uppercase'>
                        {item.variant}
                      </span>
                      {item.isZeroSugar && (
                        <span className='bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold'>
                          Zero Sugar
                        </span>
                      )}
                      <span>
                        {isBiller ? (
                          <strong className='text-slate-800 font-bold'>Qty: {item.quantity}</strong>
                        ) : (
                          `Qty: ${item.quantity} × ${currency(item.unitPrice || (item.totalPrice / item.quantity))}`
                        )}
                      </span>
                    </div>
                  </div>

                  {!isBiller && item.totalPrice != null && (
                    <p className='font-bold text-slate-800 text-sm shrink-0 font-mono'>
                      {currency(item.totalPrice)}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {isBiller ? (
              order.payment?.method === 'cod' ? (
                <div className='pt-6 border-t border-gray-100 bg-amber-50/70 -mx-6 -mb-6 p-6 rounded-b-2xl'>
                  <div className='flex items-center justify-between p-4 rounded-xl bg-white border border-amber-200 shadow-xs'>
                    <div>
                      <span className='inline-block px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 text-amber-800 border border-amber-200 mb-1'>
                        CASH ON DELIVERY
                      </span>
                      <p className='text-xs text-amber-900 font-bold'>
                        Collect cash upon delivery
                      </p>
                    </div>
                    <div className='text-right'>
                      <span className='text-[10px] font-bold text-gray-500 uppercase tracking-wider block'>
                        Amount to Collect
                      </span>
                      <span className='text-2xl font-black text-amber-950 font-mono'>
                        {currency(order.pricing?.total ?? order.totalAmount ?? 0)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='pt-6 border-t border-gray-100 bg-emerald-50/50 -mx-6 -mb-6 p-6 rounded-b-2xl'>
                  <div className='flex items-center gap-3 p-4 rounded-xl bg-white border border-emerald-200 shadow-xs'>
                    <div className='w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-lg shrink-0'>
                      ✓
                    </div>
                    <div>
                      <p className='text-xs font-black uppercase tracking-wider text-emerald-800'>
                        PRE-PAID ORDER (PAID ONLINE)
                      </p>
                      <p className='text-xs text-emerald-600 font-medium mt-0.5'>
                        Payment settled digitally. Do not collect any cash from customer.
                      </p>
                    </div>
                  </div>
                </div>
              )
            ) : (
              <div className='pt-6 border-t border-gray-100 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-2xl'>
                <div className='max-w-xs ml-auto space-y-2 text-xs'>
                  <div className='flex justify-between text-gray-600'>
                    <span>Subtotal</span>
                    <span className='font-mono'>{currency(order.pricing?.subtotal)}</span>
                  </div>

                  {order.pricing?.discountAmount > 0 && (
                    <div className='flex justify-between text-emerald-700 font-bold'>
                      <span>Discount</span>
                      <span className='font-mono'>-{currency(order.pricing.discountAmount)}</span>
                    </div>
                  )}

                  <div className='flex justify-between text-gray-600'>
                    <span>Delivery Fee</span>
                    <span className='font-mono'>{order.pricing?.deliveryCharge === 0 ? 'FREE' : currency(order.pricing?.deliveryCharge)}</span>
                  </div>

                  <div className='flex justify-between text-gray-600'>
                    <span>Packaging Fee</span>
                    <span className='font-mono'>{currency(order.pricing?.packagingFee ?? 5)}</span>
                  </div>

                  <div className='flex justify-between items-center pt-3 border-t border-gray-200 text-sm font-bold text-slate-900'>
                    <span>Total Amount</span>
                    <span className='text-lg font-black text-[#1B4332] font-mono'>
                      {currency(order.pricing?.total || order.totalAmount)}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className='bg-white rounded-2xl border border-emerald-200 p-6 shadow-xs'>
            <div className='flex items-center justify-between pb-3 border-b border-gray-100 mb-3'>
              <div className='flex items-center gap-2'>
                <span className='w-2 h-2 rounded-full bg-emerald-600'></span>
                <h3 className='text-xs font-bold uppercase tracking-wider text-[#1B4332]'>
                  Delivery Boy Message & Dispatch
                </h3>
              </div>
              <span className='text-[10px] text-gray-400 font-semibold'>Pre-formatted for Rider</span>
            </div>

            <pre className='bg-[#F7FBF9] p-4 rounded-xl border border-emerald-100 text-xs font-mono text-slate-800 whitespace-pre-wrap leading-relaxed mb-4'>
              {deliveryBoyText}
            </pre>

            <div className='grid grid-cols-1 sm:grid-cols-2 gap-3'>
              <button
                onClick={handleCopyDeliveryText}
                className='py-2.5 px-4 bg-white border border-gray-300 hover:border-emerald-600 hover:bg-emerald-50 text-slate-800 rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs'
              >
                <svg className='w-4 h-4 text-emerald-700' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <rect x='9' y='9' width='13' height='13' rx='2' ry='2'></rect>
                  <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>
                </svg>
                <span>Copy Message for Rider</span>
              </button>

              <button
                onClick={handleWhatsAppDelivery}
                className='py-2.5 px-4 bg-[#15803D] hover:bg-[#166534] text-white rounded-xl font-bold text-xs transition flex items-center justify-center gap-2 shadow-xs'
              >
                <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                  <path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'></path>
                </svg>
                <span>Share to Rider on WhatsApp</span>
              </button>
            </div>
          </div>
        </div>

        <div className='space-y-6'>
          <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs'>
            <h2 className='text-xs font-bold uppercase tracking-wider text-slate-800 mb-4 pb-2 border-b border-gray-100'>
              Customer & Address
            </h2>

            <div className='space-y-4'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1'>Customer</p>
                <p className='text-sm font-bold text-slate-800'>{order.customer?.name || 'Customer'}</p>
                <p className='text-xs font-mono text-gray-600 mt-0.5'>
                  {order.customer?.phone || order.delivery?.phone || 'No phone'}
                </p>
              </div>

              <div>
                <p className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1'>Delivery Address</p>
                <p className='text-xs font-semibold text-slate-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100'>
                  {order.delivery?.address || 'Pickup at store'}
                </p>
              </div>

              <div className='flex flex-col gap-2 pt-2'>
                {order.delivery?.googleMapsUrl && (
                  <a
                    href={order.delivery.googleMapsUrl}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition-all border border-emerald-200'
                  >
                    <svg className='w-4 h-4 text-emerald-700' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                      <path d='M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z'></path>
                      <circle cx='12' cy='10' r='3'></circle>
                    </svg>
                    <span>Open in Google Maps</span>
                  </a>
                )}

                {cleanPhone && (
                  <div className='grid grid-cols-2 gap-2'>
                    <a
                      href={`tel:${cleanPhone}`}
                      className='flex items-center justify-center gap-1.5 py-2 px-3 bg-gray-50 hover:bg-gray-100 text-slate-800 rounded-xl text-xs font-bold border border-gray-200'
                    >
                      <svg className='w-3.5 h-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z'></path>
                      </svg>
                      <span>Call Customer</span>
                    </a>
                    <a
                      href={`https://api.whatsapp.com/send?phone=${cleanPhone}`}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='flex items-center justify-center gap-1.5 py-2 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-200'
                    >
                      <svg className='w-3.5 h-3.5 text-emerald-600' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
                        <path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'></path>
                      </svg>
                      <span>WhatsApp</span>
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>

          {order.delivery?.location?.lat && order.delivery?.location?.lng && (
            <div className='bg-white rounded-2xl border border-gray-200 p-4 shadow-xs overflow-hidden'>
              <p className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-2'>
                Location Map
              </p>
              <div className='h-48 rounded-xl overflow-hidden border border-gray-100'>
                <MapContainer
                  center={[order.delivery.location.lat, order.delivery.location.lng]}
                  zoom={15}
                  scrollWheelZoom={false}
                  className='h-full w-full'
                >
                  <TileLayer url='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png' />
                  <Marker position={[order.delivery.location.lat, order.delivery.location.lng]} />
                </MapContainer>
              </div>
            </div>
          )}

          <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs'>
            <h2 className='text-xs font-bold uppercase tracking-wider text-slate-800 mb-3 pb-2 border-b border-gray-100'>
              Delivery & Order Status
            </h2>

            {order.status === 'placed' && (
              <div className='space-y-2.5'>
                <button
                  onClick={() => handleUpdate('preparing')}
                  disabled={updating}
                  className='w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-[#1B4332] hover:bg-[#163829] text-white transition-all flex items-center justify-center gap-2 shadow-xs disabled:opacity-50'
                >
                  <span>Start Preparing & Packing</span>
                </button>
                <button
                  onClick={() => handleUpdate('cancelled')}
                  disabled={updating}
                  className='w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50'
                >
                  <span>Cancel Order</span>
                </button>
              </div>
            )}

            {order.status === 'preparing' && (
              <div className='space-y-3'>
                <button
                  onClick={handleWhatsAppDelivery}
                  className='w-full py-3 px-4 rounded-xl text-xs font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white transition-all flex items-center justify-center gap-2 shadow-xs active:scale-[0.99]'
                >
                  <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                    <path d='M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z'></path>
                  </svg>
                  <span>📲 Share with Rider (WhatsApp)</span>
                </button>
                <p className='text-[10px] text-amber-900 bg-amber-50 p-2.5 rounded-xl border border-amber-200 leading-relaxed font-semibold'>
                  💡 Order transitions to <b>Out for Delivery</b> automatically when the rider taps <b>"Order Picked"</b> in their link and enables GPS.
                </p>
                <button
                  onClick={() => handleUpdate('cancelled')}
                  disabled={updating}
                  className='w-full py-2 px-3 rounded-xl text-xs font-bold uppercase tracking-wider bg-gray-50 hover:bg-red-50 text-gray-500 hover:text-red-600 border border-gray-200 transition-all'
                >
                  <span>Cancel Order</span>
                </button>
              </div>
            )}

            {order.status === 'out_for_delivery' && (
              <div className='p-4 rounded-xl bg-blue-50 border border-blue-200 space-y-2'>
                <div className='flex items-center gap-2 text-blue-900 font-black text-xs uppercase'>
                  <span className='w-2 h-2 rounded-full bg-blue-500 animate-pulse'></span>
                  <span>Out for Delivery</span>
                </div>
                <p className='text-xs text-blue-800 font-bold'>
                  Rider: {order.deliveryStaff?.name || order.delivery?.riderName || 'Assigned Staff'}
                  {order.deliveryStaff?.phone && ` (+91 ${order.deliveryStaff.phone})`}
                </p>
                <p className='text-[11px] text-blue-700 leading-relaxed font-medium'>
                  Delivery will complete automatically when the rider collects payment and enters the customer's 4-digit Delivery OTP.
                </p>
              </div>
            )}

            {order.status === 'delivered' && (
              <div className='p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-1'>
                <div className='text-emerald-800 font-black text-xs uppercase flex items-center justify-center gap-1.5'>
                  <span>✓ Order Delivered & Completed</span>
                </div>
                {order.deliveryStaff?.name && (
                  <p className='text-[11px] text-emerald-700 font-semibold'>
                    Delivered by {order.deliveryStaff.name}
                  </p>
                )}
                <p className='text-[10px] text-emerald-600 font-medium'>
                  Customer OTP verified successfully.
                </p>
              </div>
            )}

            {order.status === 'cancelled' && (
              <div className='p-4 rounded-xl bg-rose-50 border border-rose-200 text-center'>
                <p className='text-xs font-black uppercase text-rose-800'>Order Cancelled</p>
                <p className='text-[11px] text-rose-600 mt-1 font-medium'>
                  {order.cancellationReason || 'Cancelled'}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}