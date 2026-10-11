import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { BASE_URL, SOCKET_URL } from '../constants';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function RiderTrackPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [order, setOrder] = useState(null);
  const [activeStaffList, setActiveStaffList] = useState([]);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // GPS tracking state
  const [isSharing, setIsSharing] = useState(false);
  const [watchId, setWatchId] = useState(null);
  const [lastUpdateText, setLastUpdateText] = useState('GPS Standby');

  // OTP delivery state
  const [otpInput, setOtpInput] = useState('');
  const [otpError, setOtpError] = useState('');
  const [isSubmittingOtp, setIsSubmittingOtp] = useState(false);
  const [isStartingDelivery, setIsStartingDelivery] = useState(false);
  const [deliverySuccess, setDeliverySuccess] = useState(false);

  const socketRef = useRef(null);

  useEffect(() => {
    fetchOrderDetails();

    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 20,
    });
    socketRef.current = socket;

    socket.emit('join_order', id);

    socket.on('status_update', (newStatus) => {
      setOrder((prev) => (prev ? { ...prev, status: newStatus } : prev));
      if (newStatus === 'delivered' || newStatus === 'cancelled') {
        stopSharing();
      }
    });

    return () => {
      if (socket) {
        socket.emit('leave_order', id);
        socket.disconnect();
      }
    };
  }, [id]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await fetch(`${BASE_URL}/orders/rider-track/${id}?token=${encodeURIComponent(token)}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to load order');
      }

      const ord = data.data?.order || data.data;
      const staffList = data.data?.activeStaff || [];
      setOrder(ord);
      setActiveStaffList(staffList);

      // Restore saved rider from localStorage or current order assignment
      const savedStaffId = localStorage.getItem('apsara_rider_id');
      const assignedStaffId = ord.deliveryStaff?.staffId;

      if (assignedStaffId) {
        const matching = staffList.find((s) => s._id === assignedStaffId);
        setSelectedStaff(matching || { _id: assignedStaffId, name: ord.deliveryStaff.name, phone: ord.deliveryStaff.phone });
      } else if (savedStaffId) {
        const matching = staffList.find((s) => s._id === savedStaffId);
        if (matching) setSelectedStaff(matching);
        else if (staffList.length > 0) setSelectedStaff(staffList[0]);
      } else if (staffList.length > 0) {
        setSelectedStaff(staffList[0]);
      }

      // If order is already out_for_delivery and not sharing GPS, auto-start GPS if rider returns to page
      if (ord.status === 'out_for_delivery' && !isSharing) {
        startSharing();
      }
      if (ord.status === 'delivered') {
        setDeliverySuccess(true);
      }
    } catch (err) {
      setError(err.message || 'Unable to access order details');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    localStorage.setItem('apsara_rider_id', staff._id);
    localStorage.setItem('apsara_rider_name', staff.name);
  };

  const startSharing = () => {
    if (!navigator.geolocation) {
      setLastUpdateText('GPS not supported on device');
      return;
    }

    setIsSharing(true);

    const idWatch = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
        setLastUpdateText(`Live GPS • ${new Date().toLocaleTimeString('en-IN')}`);

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('rider_location', {
            orderId: id,
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
          });
        }

        fetch(`${BASE_URL}/orders/rider-track/${id}/location?token=${encodeURIComponent(token)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
            token,
          }),
        }).catch(() => {});
      },
      (err) => {
        setLastUpdateText(`GPS signal searching: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 3000,
      }
    );

    setWatchId(idWatch);
  };

  const stopSharing = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setIsSharing(false);
  };

  const launchGoogleMapsBikeNavigation = () => {
    const lat = order?.delivery?.location?.lat;
    const lng = order?.delivery?.location?.lng;
    const addr = order?.delivery?.address || '';

    let destinationQuery = '';
    if (lat && lng) {
      destinationQuery = `${lat},${lng}`;
    } else if (addr) {
      destinationQuery = encodeURIComponent(addr);
    }

    // Google Maps Two-Wheeler / Bike Navigation URL
    const mapsBikeUrl = `https://www.google.com/maps/dir/?api=1&destination=${destinationQuery}&travelmode=two_wheeler`;
    window.open(mapsBikeUrl, '_blank');
  };

  const handleStartDelivery = async () => {
    if (!selectedStaff) {
      alert('Please tap your name (Ramesh / Suresh) before picking up the order.');
      return;
    }

    try {
      setIsStartingDelivery(true);
      setError('');

      const res = await fetch(`${BASE_URL}/orders/rider-track/${id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          staffId: selectedStaff._id,
          name: selectedStaff.name,
          phone: selectedStaff.phone,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to start delivery');
      }

      setOrder((prev) => ({
        ...prev,
        status: 'out_for_delivery',
        deliveryStaff: data.data?.deliveryStaff,
      }));

      // Automatically activate GPS
      startSharing();

      // Automatically launch Bike Navigation in Google Maps
      launchGoogleMapsBikeNavigation();
    } catch (err) {
      alert(err.message || 'Could not start delivery');
    } finally {
      setIsStartingDelivery(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setOtpError('');

    const cleanOtp = otpInput.trim();
    if (cleanOtp.length !== 4) {
      setOtpError('Please enter the 4-digit Delivery OTP given by the customer');
      return;
    }

    try {
      setIsSubmittingOtp(true);
      const res = await fetch(`${BASE_URL}/orders/rider-track/${id}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token,
          otp: cleanOtp,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'OTP verification failed');
      }

      stopSharing();
      setDeliverySuccess(true);
      setOrder((prev) => ({ ...prev, status: 'delivered' }));
    } catch (err) {
      setOtpError(err.message || 'Invalid Delivery OTP');
    } finally {
      setIsSubmittingOtp(false);
    }
  };

  if (loading) {
    return (
      <div className='min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-6 text-slate-700'>
        <div className='w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4' />
        <p className='font-black text-sm tracking-wide text-[#1B4332]'>Loading Delivery Details...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className='min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-6 text-slate-800 text-center max-w-sm mx-auto'>
        <div className='w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-2xl mb-4 font-black'>
          ✕
        </div>
        <h1 className='text-lg font-black text-slate-900 mb-1'>Unable to Open Order</h1>
        <p className='text-xs text-gray-500 mb-6'>{error || 'Invalid or expired order link.'}</p>
        <button
          onClick={fetchOrderDetails}
          className='px-6 py-2.5 bg-[#1B4332] text-white rounded-xl text-xs font-bold uppercase tracking-wider'
        >
          Try Again
        </button>
      </div>
    );
  }

  const isCod = order.payment?.method === 'cod';
  const orderAmount = order.pricing?.total ?? order.totalAmount ?? 0;
  const custPhone = order.customer?.phone || order.delivery?.phone || '';

  return (
    <div className='min-h-screen bg-[#F4F7F5] text-slate-800 flex flex-col justify-between max-w-md mx-auto shadow-2xl'>
      {/* Top Banner */}
      <div className='bg-[#1B4332] text-white p-5 rounded-b-3xl shadow-md'>
        <div className='flex items-center justify-between mb-3'>
          <div className='flex items-center gap-2.5'>
            <span className='text-2xl'>🍨</span>
            <div>
              <p className='text-[10px] uppercase tracking-widest text-emerald-300 font-black'>Apsara Ice Creams</p>
              <h1 className='text-base font-black leading-tight'>Rider Delivery Portal</h1>
            </div>
          </div>
          <span className='bg-emerald-900/90 px-3 py-1 rounded-full text-xs font-mono font-black text-emerald-200 border border-emerald-700'>
            {order.orderNumber}
          </span>
        </div>

        {/* Status Pill */}
        <div className='bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between'>
          <div>
            <p className='text-[10px] uppercase font-bold text-emerald-200 tracking-wider'>Current Status</p>
            <p className='text-xs font-black capitalize text-white'>
              {order.status === 'placed' && '⏳ Order Placed (Waiting Packing)'}
              {order.status === 'preparing' && '📦 Packed & Ready for Pickup'}
              {order.status === 'out_for_delivery' && '🛵 Out for Delivery'}
              {order.status === 'delivered' && '✅ Delivered Successfully'}
              {order.status === 'cancelled' && '❌ Order Cancelled'}
            </p>
          </div>
          {isSharing ? (
            <span className='flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/30'>
              <span className='w-2 h-2 rounded-full bg-emerald-400 animate-ping' />
              GPS ACTIVE
            </span>
          ) : (
            <span className='bg-white/10 text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-full'>
              GPS Standby
            </span>
          )}
        </div>
      </div>

      <div className='p-4 flex-1 space-y-4'>
        {/* Rider Profile Selector */}
        <div className='bg-white rounded-2xl p-4 border border-gray-200 shadow-xs'>
          <p className='text-[10px] uppercase font-black text-gray-400 tracking-wider mb-2'>
            Who is delivering this order? (Select Rider)
          </p>
          <div className='grid grid-cols-2 gap-2'>
            {activeStaffList.map((staff) => {
              const isSelected = selectedStaff?._id === staff._id;
              return (
                <button
                  key={staff._id}
                  type='button'
                  onClick={() => handleSelectStaff(staff)}
                  className={`py-2.5 px-3 rounded-xl border text-xs font-black transition-all flex items-center justify-center gap-2 ${
                    isSelected
                      ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-sm'
                      : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  <span>{isSelected ? '✓' : '👤'}</span>
                  <span>{staff.name}</span>
                </button>
              );
            })}
          </div>
          {selectedStaff && (
            <p className='text-[10px] text-gray-400 mt-2 text-center font-medium'>
              Rider: <strong className='text-gray-700'>{selectedStaff.name}</strong> • +91 {selectedStaff.phone}
            </p>
          )}
        </div>

        {/* Payment Amount Card - HIGH VISIBILITY FOR RIDER */}
        <div className={`rounded-2xl p-4 border shadow-xs ${
          isCod
            ? 'bg-amber-50 border-amber-300 text-amber-950'
            : 'bg-emerald-50 border-emerald-300 text-emerald-950'
        }`}>
          <div className='flex items-center justify-between'>
            <div>
              <span className={`text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                isCod ? 'bg-amber-200 text-amber-900' : 'bg-emerald-200 text-emerald-900'
              }`}>
                {isCod ? 'Cash on Delivery (COD)' : 'Prepaid (Paid Online)'}
              </span>
              <h3 className='text-sm font-black mt-1'>
                {isCod ? '⚠️ COLLECT CASH FROM CUSTOMER' : '✅ DO NOT COLLECT CASH'}
              </h3>
            </div>
            <div className='text-right'>
              <span className='text-[10px] font-bold text-gray-500 uppercase block'>Order Amount</span>
              <span className='text-xl font-black font-mono'>
                {currency(orderAmount)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer & Address Details */}
        <div className='bg-white rounded-2xl p-4 border border-gray-200 shadow-xs space-y-3'>
          <div className='flex items-start justify-between'>
            <div>
              <p className='text-[10px] uppercase font-bold text-gray-400 tracking-wider'>Customer</p>
              <h2 className='text-base font-black text-slate-800'>{order.customer?.name || 'Customer'}</h2>
              <p className='text-xs font-mono text-slate-600 mt-0.5'>{custPhone || 'No phone'}</p>
            </div>
            {custPhone && (
              <a
                href={`tel:${custPhone}`}
                className='w-11 h-11 bg-emerald-50 text-emerald-700 rounded-2xl flex items-center justify-center text-lg font-bold shadow-xs border border-emerald-200 active:scale-95'
                title='Call Customer'
              >
                📞
              </a>
            )}
          </div>

          <div className='border-t border-gray-100 pt-3'>
            <p className='text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1'>Delivery Address</p>
            <p className='text-xs font-semibold text-slate-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100'>
              {order.delivery?.address || 'Pickup at store'}
            </p>
          </div>

          {/* Quick Bike Maps Button */}
          <button
            type='button'
            onClick={launchGoogleMapsBikeNavigation}
            className='w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-emerald-200 active:scale-98'
          >
            <span>🏍️ Open Bike Direction (Google Maps)</span>
          </button>
        </div>

        {/* Step 1: Order Picked Trigger (When Status is preparing or placed) */}
        {order.status !== 'out_for_delivery' && order.status !== 'delivered' && order.status !== 'cancelled' && (
          <div className='bg-white rounded-2xl p-5 border border-emerald-200 shadow-md text-center space-y-3'>
            <div className='w-14 h-14 bg-emerald-100 text-emerald-800 rounded-full mx-auto flex items-center justify-center text-2xl'>
              🛵
            </div>
            <div>
              <h3 className='text-sm font-black text-slate-800'>Ready to Deliver?</h3>
              <p className='text-xs text-gray-500 mt-1 max-w-xs mx-auto'>
                Tap below when you take the packed order and start your bike. This will notify the customer, activate GPS, and open Google Maps navigation.
              </p>
            </div>

            <button
              onClick={handleStartDelivery}
              disabled={isStartingDelivery}
              className='w-full py-4 px-4 bg-[#1B4332] hover:bg-[#143427] text-white rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2'
            >
              {isStartingDelivery ? (
                <span>Starting Delivery...</span>
              ) : (
                <>
                  <span>🚀 Order Picked & Out for Delivery</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Step 2: Doorstep OTP Verification (When status is out_for_delivery) */}
        {order.status === 'out_for_delivery' && !deliverySuccess && (
          <div className='bg-white rounded-2xl p-5 border border-blue-200 shadow-md space-y-4'>
            <div className='flex items-center gap-3'>
              <div className='w-10 h-10 bg-blue-100 text-blue-700 rounded-xl flex items-center justify-center text-xl shrink-0'>
                🔑
              </div>
              <div>
                <h3 className='text-sm font-black text-slate-900'>Customer Delivery OTP</h3>
                <p className='text-[11px] text-gray-500'>
                  Ask customer for the 4-digit code shown in their app.
                </p>
              </div>
            </div>

            {otpError && (
              <div className='p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold'>
                ⚠️ {otpError}
              </div>
            )}

            <form onSubmit={handleVerifyOtp} className='space-y-3'>
              <div>
                <input
                  type='tel'
                  maxLength='4'
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                  placeholder='• • • •'
                  className='w-full text-center text-2xl font-mono font-black tracking-widest py-3 rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-gray-50'
                  required
                />
              </div>

              <button
                type='submit'
                disabled={isSubmittingOtp || otpInput.length !== 4}
                className='w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md active:scale-95 transition-all disabled:opacity-40'
              >
                {isSubmittingOtp ? 'Verifying OTP...' : '✓ Verify OTP & Complete Delivery'}
              </button>
            </form>

            <div className='text-center pt-1'>
              <span className='text-[10px] font-mono text-gray-400 bg-gray-50 py-1 px-3 rounded-md'>
                {lastUpdateText}
              </span>
            </div>
          </div>
        )}

        {/* Step 3: Success Screen */}
        {deliverySuccess && (
          <div className='bg-emerald-500 text-white rounded-3xl p-6 shadow-xl text-center space-y-3 animate-in zoom-in-95 duration-200'>
            <div className='w-16 h-16 bg-white/20 rounded-full mx-auto flex items-center justify-center text-3xl font-black'>
              🎉
            </div>
            <h2 className='text-lg font-black'>Delivery Completed!</h2>
            <p className='text-xs text-emerald-100 max-w-xs mx-auto'>
              Order {order.orderNumber} has been verified and marked as delivered.
              GPS tracking has stopped. Thank you!
            </p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className='p-4 bg-white border-t border-gray-100 text-center text-[10px] text-gray-400 font-semibold'>
        Apsara Mandya • Fresh Daily Delivery Fleet
      </div>
    </div>
  );
}
