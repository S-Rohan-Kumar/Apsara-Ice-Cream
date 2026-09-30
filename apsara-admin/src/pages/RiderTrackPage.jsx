import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import { BASE_URL, SOCKET_URL } from '../constants';

export default function RiderTrackPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';

  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [currentCoords, setCurrentCoords] = useState(null);
  const [watchId, setWatchId] = useState(null);
  const [lastUpdateText, setLastUpdateText] = useState('Not started');

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
      setOrder(data.data);
    } catch (err) {
      setError(err.message || 'Unable to access order details');
    } finally {
      setLoading(false);
    }
  };

  const startSharing = () => {
    if (!navigator.geolocation) {
      alert('GPS is not supported on this browser/device.');
      return;
    }

    setIsSharing(true);

    const idWatch = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude, heading } = pos.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        setLastUpdateText(`Updated at ${new Date().toLocaleTimeString('en-IN')}`);

        if (socketRef.current && socketRef.current.connected) {
          socketRef.current.emit('rider_location', {
            orderId: id,
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
          });
        }

        fetch(`${BASE_URL}/orders/rider-track/${id}/location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lat: latitude,
            lng: longitude,
            heading: heading || 0,
          }),
        }).catch(() => {});
      },
      (err) => {
        setLastUpdateText(`GPS Error: ${err.message}`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-6 text-slate-700">
        <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="font-bold text-sm tracking-wide">Loading Delivery Assignment...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-[#F8FAF9] flex flex-col items-center justify-center p-6 text-slate-800 text-center">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 text-2xl mb-4 font-black">
          ✕
        </div>
        <h1 className="text-lg font-black text-slate-900 mb-1">Access Restricted</h1>
        <p className="text-xs text-gray-500 max-w-xs mb-6">{error || 'Order not found'}</p>
        <button
          onClick={fetchOrderDetails}
          className="px-6 py-2.5 bg-[#1B4332] text-white rounded-xl text-xs font-bold uppercase tracking-wider"
        >
          Retry
        </button>
      </div>
    );
  }

  const isDelivered = order.status === 'delivered';
  const isCancelled = order.status === 'cancelled';
  const mapsUrl = order.delivery?.googleMapsUrl ||
    (order.delivery?.location?.lat && order.delivery?.location?.lng
      ? `https://www.google.com/maps/search/?api=1&query=${order.delivery.location.lat},${order.delivery.location.lng}`
      : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.delivery?.address || '')}`);

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-slate-800 flex flex-col justify-between max-w-md mx-auto shadow-xl">
      <div className="bg-[#1B4332] text-white p-5 rounded-b-3xl shadow-md">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🍨</span>
            <div>
              <p className="text-xs uppercase tracking-widest text-emerald-300 font-black">Apsara Mandya</p>
              <h1 className="text-base font-black leading-tight">Rider Live Portal</h1>
            </div>
          </div>
          <span className="bg-emerald-800/80 px-3 py-1 rounded-full text-[10px] font-mono font-bold text-emerald-200">
            {order.orderNumber}
          </span>
        </div>

        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase font-bold text-emerald-200 tracking-wider">Status</p>
            <p className="text-xs font-black capitalize text-white">
              {order.status === 'out_for_delivery' ? '🛵 Out for Delivery' : order.status}
            </p>
          </div>
          {isSharing ? (
            <span className="flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-400/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              LIVE SHARING
            </span>
          ) : (
            <span className="bg-white/10 text-gray-300 text-[10px] font-bold px-2.5 py-1 rounded-full">
              GPS Standby
            </span>
          )}
        </div>
      </div>

      <div className="p-5 flex-1 space-y-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs space-y-3">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Customer</p>
              <h2 className="text-base font-black text-slate-800">{order.customer?.name || 'Customer'}</h2>
              <p className="text-xs font-mono text-slate-600 mt-0.5">{order.delivery?.phone || 'No phone'}</p>
            </div>
            {order.delivery?.phone && (
              <a
                href={`tel:${order.delivery.phone}`}
                className="w-10 h-10 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center font-bold shadow-xs border border-emerald-200"
              >
                📞
              </a>
            )}
          </div>

          <div className="border-t border-gray-100 pt-3">
            <p className="text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-1">Destination Address</p>
            <p className="text-xs font-semibold text-slate-700 leading-relaxed bg-gray-50 p-3 rounded-xl border border-gray-100">
              {order.delivery?.address || 'Pickup at store'}
            </p>
          </div>

          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 border border-emerald-200"
          >
            <span>📍 Open in Google Maps</span>
          </a>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-emerald-100 shadow-xs text-center space-y-3">
          <div className="w-14 h-14 bg-emerald-100/70 rounded-full mx-auto flex items-center justify-center text-2xl">
            {isSharing ? '🛰️' : '📡'}
          </div>

          <div>
            <h3 className="text-sm font-black text-slate-800">
              {isSharing ? 'Sharing Live GPS Position' : 'Enable Customer Tracking'}
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              {isSharing
                ? 'Keep this browser tab open while riding to transmit real-time location to the customer.'
                : 'Tap below when you start riding so the customer sees your bike on their live tracking screen.'}
            </p>
          </div>

          <div className="text-[11px] font-mono text-gray-400 bg-gray-50 py-1.5 px-3 rounded-lg inline-block">
            {lastUpdateText}
          </div>

          {!isDelivered && !isCancelled && (
            <button
              onClick={isSharing ? stopSharing : startSharing}
              className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-2 ${
                isSharing
                  ? 'bg-amber-500 hover:bg-amber-600 text-white'
                  : 'bg-[#1B4332] hover:bg-[#163829] text-white'
              }`}
            >
              <span>{isSharing ? '⏸️ Pause GPS Sharing' : '🚀 Start Live GPS Transmission'}</span>
            </button>
          )}

          {isDelivered && (
            <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-bold">
              🎉 Order marked as Delivered. Good job!
            </div>
          )}
        </div>
      </div>

      <div className="p-4 bg-white border-t border-gray-100 text-center text-[10px] text-gray-400 font-semibold">
        Apsara Mandya • Fresh Daily Delivery Fleet
      </div>
    </div>
  );
}
