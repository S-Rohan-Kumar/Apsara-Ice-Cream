import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUserInfo } from '../slices/authSlice';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import {
  useGetAdminOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useAssignRiderToOrderMutation,
} from '../slices/orderApiSlice';
import { useGetActiveStaffQuery } from '../slices/staffApiSlice';
import { STATUS_TRANSITIONS, STATUS_LABELS } from '../constants';
import { useToast } from '../hooks/useToast';
import { getDeliveryBoyMessage } from '../utils/deliveryMessage';
import StatusBadge from '../components/common/StatusBadge';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const STEPS = ['placed', 'preparing', 'out_for_delivery', 'delivered'];

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { showSuccess, showError } = useToast();

  const userInfo = useSelector(selectUserInfo);
  const role = userInfo?.user?.role || userInfo?.role || 'owner';
  const isBiller = role === 'biller';

  const { data: order, isLoading } = useGetAdminOrderByIdQuery(id, { pollingInterval: 15000 });
  const [updateStatus, { isLoading: updating }] = useUpdateOrderStatusMutation();
  const [assignRiderToOrder] = useAssignRiderToOrderMutation();
  const [assigningRider, setAssigningRider] = useState(false);

  const { data: activeStaffList = [] } = useGetActiveStaffQuery(undefined, { pollingInterval: 10000 });

  const handleUpdate = async (status) => {
    try {
      await updateStatus({ id, status }).unwrap();
      showSuccess(`Status updated to: ${STATUS_LABELS[status] || status}`);
    } catch (e) {
      showError(e?.data?.message || 'Update failed');
    }
  };

  const handleAssignRider = async (staff) => {
    try {
      setAssigningRider(true);
      await assignRiderToOrder({
        id,
        staffId: staff._id,
        name: staff.name,
        phone: staff.phone,
      }).unwrap();
      showSuccess(`🛵 Assigned rider ${staff.name} to this order!`);
    } catch (e) {
      showError(e?.data?.message || 'Failed to assign rider');
    } finally {
      setAssigningRider(false);
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
    const phone = (order.deliveryStaff?.phone || order.delivery?.riderPhone || '').replace(/[^0-9]/g, '');
    const phoneParam = phone ? `phone=91${phone.slice(-10)}&` : '';
    const url = `https://api.whatsapp.com/send?${phoneParam}text=${encodeURIComponent(text)}`;
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

  const currentStep = STEPS.indexOf(order.status);
  const displayOrderNum = order.orderNumber || `#${order._id.slice(-4).toUpperCase()}`;
  const rawDigits = (order.customer?.phone || order.delivery?.phone || '').replace(/[^0-9]/g, '');
  const cleanPhone = rawDigits.length === 10 ? `91${rawDigits}` : rawDigits;
  const deliveryBoyText = getDeliveryBoyMessage(order, isBiller);
  const assignedRider = order.deliveryStaff?.name || order.delivery?.riderName || null;
  const assignedPhone = order.deliveryStaff?.phone || order.delivery?.riderPhone || null;

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
          <span>Back to All Orders</span>
        </button>

        <div className='flex items-center gap-2'>
          <button
            onClick={handleCopyDeliveryText}
            className='flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition'
          >
            <svg className='w-3.5 h-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <rect x='9' y='9' width='13' height='13' rx='2' ry='2'></rect>
              <path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1'></path>
            </svg>
            <span>Copy Dispatch Note</span>
          </button>

          <button
            onClick={handlePrint}
            className='flex items-center gap-1.5 px-3.5 py-2 bg-white border border-gray-200 hover:border-gray-300 rounded-xl text-xs font-bold text-slate-700 shadow-xs transition'
          >
            <svg className='w-3.5 h-3.5' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2' strokeLinecap='round' strokeLinejoin='round'>
              <polyline points='6 9 6 2 18 2 18 9'></polyline>
              <path d='M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2'></path>
              <rect x='6' y='14' width='12' height='8'></rect>
            </svg>
            <span>Print Invoice</span>
          </button>
        </div>
      </div>

      <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-3 mb-2 flex-wrap'>
            <span className='px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200'>
              Apsara Delivery
            </span>
            <span className='text-xs font-mono font-bold text-gray-500'>
              {new Date(order.createdAt).toLocaleString('en-IN', {
                dateStyle: 'medium',
                timeStyle: 'short',
              })}
            </span>
          </div>

          <h1 className='text-2xl font-black text-slate-900 tracking-tight flex items-center gap-3'>
            <span>Order {displayOrderNum}</span>
            <StatusBadge status={order.status} />
          </h1>
        </div>

        <div className='text-right'>
          <p className='text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-0.5'>
            {isBiller && order.payment?.method === 'cod' ? 'Cash to Collect' : 'Order Bill'}
          </p>
          <p className={`text-2xl font-black font-mono ${
            isBiller && order.payment?.method === 'cod' ? 'text-amber-800' : 'text-slate-900'
          }`}>
            {currency(order.pricing?.total ?? order.totalAmount ?? 0)}
          </p>
          <span className={`inline-block text-[9px] font-black uppercase px-2 py-0.5 rounded-full mt-1 ${
            order.payment?.method === 'cod'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-emerald-100 text-emerald-800'
          }`}>
            {order.payment?.method === 'cod' ? 'Cash on Delivery' : 'Paid Online'}
          </span>
        </div>
      </div>

      {order.status !== 'cancelled' && (
        <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs'>
          <p className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-6'>
            Live Kitchen & Delivery Progress
          </p>
          <div className='relative flex items-center justify-between'>
            <div className='absolute top-1/2 left-0 right-0 h-1 bg-gray-100 -translate-y-1/2 z-0' />
            <div
              className='absolute top-1/2 left-0 h-1 bg-[#1B4332] -translate-y-1/2 z-0 transition-all duration-500'
              style={{
                width: currentStep >= 0 ? `${(currentStep / (STEPS.length - 1)) * 100}%` : '0%',
              }}
            />

            {STEPS.map((st, i) => {
              const isPast = i <= currentStep;
              const isCurrent = i === currentStep;
              return (
                <div key={st} className='relative z-10 flex flex-col items-center'>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                      isPast
                        ? 'bg-[#1B4332] text-white shadow-xs'
                        : 'bg-white border-2 border-gray-200 text-gray-400'
                    } ${isCurrent ? 'ring-4 ring-emerald-100' : ''}`}
                  >
                    {isPast ? '✓' : i + 1}
                  </div>
                  <span
                    className={`text-[11px] font-bold mt-2 whitespace-nowrap capitalize ${
                      isCurrent
                        ? 'text-[#1B4332] font-black'
                        : isPast
                        ? 'text-slate-700'
                        : 'text-gray-400'
                    }`}
                  >
                    {STATUS_LABELS[st] || st.replace(/_/g, ' ')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
        {/* Left Column: Items */}
        <div className='lg:col-span-2 space-y-6'>
          <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-gray-100'>
              Items in this Order ({order.items?.length || 0})
            </h2>

            <div className='divide-y divide-gray-100'>
              {(order.items || []).map((it, idx) => (
                <div key={idx} className='py-3.5 flex items-center justify-between text-xs gap-3'>
                  <div className='flex items-center gap-3 min-w-0'>
                    <div className='w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0'>
                      {it.quantity}x
                    </div>
                    <div className='min-w-0'>
                      <p className='font-bold text-slate-900 truncate'>{it.productName}</p>
                      {it.variant && (
                        <p className='text-[11px] text-gray-400 font-medium'>Size: {it.variant}</p>
                      )}
                    </div>
                  </div>

                  {!isBiller && it.totalPrice != null && (
                    <div className='text-right shrink-0'>
                      <p className='font-mono font-bold text-slate-800'>
                        {currency(it.totalPrice)}
                      </p>
                      <p className='text-[10px] text-gray-400 font-mono'>
                        {currency(it.price)} each
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className='pt-4 border-t border-gray-100 space-y-1.5 text-xs'>
              {!isBiller && (
                <>
                  <div className='flex justify-between text-gray-500'>
                    <span>Items Subtotal</span>
                    <span className='font-mono'>{currency(order.pricing?.subtotal ?? 0)}</span>
                  </div>
                  {order.pricing?.discount > 0 && (
                    <div className='flex justify-between text-emerald-700 font-semibold'>
                      <span>Special Discount</span>
                      <span className='font-mono'>-{currency(order.pricing.discount)}</span>
                    </div>
                  )}
                  <div className='flex justify-between text-gray-500'>
                    <span>Delivery Fee</span>
                    <span className='font-mono'>
                      {(order.pricing?.deliveryCharge ?? 0) === 0 ? 'FREE' : currency(order.pricing?.deliveryCharge)}
                    </span>
                  </div>
                </>
              )}
              <div className='flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-gray-100'>
                <span>Grand Total</span>
                <span className='font-mono'>
                  {currency(order.pricing?.total ?? order.totalAmount ?? 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Customer, Rider & Actions */}
        <div className='space-y-6'>
          {/* Customer Card */}
          <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-4'>
            <h2 className='text-xs font-bold uppercase tracking-wider text-slate-800 pb-2 border-b border-gray-100'>
              Customer Information
            </h2>
            <div className='space-y-3'>
              <div>
                <p className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5'>Name</p>
                <p className='text-sm font-bold text-slate-900'>{order.customer?.name || 'Customer'}</p>
              </div>

              {cleanPhone && (
                <div>
                  <p className='text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-0.5'>Phone</p>
                  <a href={`tel:${cleanPhone}`} className='text-xs font-bold text-[#2563EB] hover:underline font-mono'>
                    +91 {rawDigits.slice(-10)}
                  </a>
                </div>
              )}

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
                      <span>Call</span>
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

          {/* Delivery Rider Assignment Box (Biller & Admin) */}
          <div className='bg-white rounded-2xl border border-gray-200 p-6 shadow-xs space-y-3'>
            <div className='flex items-center justify-between pb-2 border-b border-gray-100'>
              <div className='flex items-center gap-1.5'>
                <span className='text-sm'>🛵</span>
                <h3 className='text-xs font-black uppercase tracking-wider text-slate-800'>
                  Assigned Rider
                </h3>
              </div>
              {assignedRider ? (
                <span className='text-[9px] font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 uppercase'>
                  Assigned
                </span>
              ) : (
                <span className='text-[9px] font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 uppercase'>
                  Needs Rider
                </span>
              )}
            </div>

            {assignedRider ? (
              <div className='flex items-center justify-between bg-gray-50 p-3 rounded-xl border border-emerald-200'>
                <div>
                  <p className='text-xs font-black text-slate-800'>{assignedRider}</p>
                  <p className='text-[11px] text-gray-500 font-mono'>
                    {assignedPhone ? `+91 ${assignedPhone}` : 'No phone registered'}
                  </p>
                </div>
                <span className='text-[10px] font-black uppercase px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200'>
                  ✓ Assigned
                </span>
              </div>
            ) : (
              ['placed', 'preparing'].includes(order.status) && (
                <div>
                  <label className='block text-[10px] font-bold uppercase text-gray-400 mb-1.5'>
                    Select Available Rider:
                  </label>
                  <select
                    onChange={(e) => {
                      const selected = activeStaffList.find((s) => s._id === e.target.value);
                      if (selected) handleAssignRider(selected);
                    }}
                    defaultValue=''
                    disabled={assigningRider}
                    className='w-full text-xs font-bold bg-white text-slate-800 rounded-xl px-3 py-2.5 border border-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:outline-none cursor-pointer'
                  >
                    <option value='' disabled>
                      Choose from active staff...
                    </option>
                    {activeStaffList.map((st) => (
                      <option key={st._id} value={st._id}>
                        {st.name} — {st.isOnDelivery ? '🟡 On Bike' : '🟢 Ready / Available'}
                      </option>
                    ))}
                  </select>
                </div>
              )
            )}
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
                  <span>
                    {assignedRider ? `📲 Send Token to ${assignedRider} (WhatsApp)` : '📲 Share with Rider (WhatsApp)'}
                  </span>
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
                  Rider: {assignedRider || 'Assigned Staff'}
                  {assignedPhone && ` (+91 ${assignedPhone})`}
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
                {assignedRider && (
                  <p className='text-[11px] text-emerald-700 font-semibold'>
                    Delivered by {assignedRider}
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
