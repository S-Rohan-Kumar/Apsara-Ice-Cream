import { useState, useEffect } from 'react';
import { useUpdateStoreStatusMutation } from '../../slices/storeApiSlice';
import { useToast } from '../../hooks/useToast';

export default function DeliverySettingsModal({ isOpen, onClose, storeData }) {
  const [updateStoreStatus, { isLoading: isUpdating }] = useUpdateStoreStatusMutation();
  const { showSuccess, showError } = useToast();

  const [basePrice, setBasePrice] = useState(30);
  const [threshold, setThreshold] = useState(599);

  useEffect(() => {
    if (storeData) {
      setBasePrice(storeData.baseDeliveryPrice ?? 30);
      setThreshold(storeData.freeDeliveryThreshold ?? 599);
    }
  }, [storeData, isOpen]);

  if (!isOpen) return null;

  const currentBase = Number(basePrice) || 0;
  const tier23 = Math.round(currentBase * 1.25);
  const tier34 = Math.round(currentBase * 1.30);
  const tier45 = Math.round(currentBase * 1.35);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await updateStoreStatus({
        baseDeliveryPrice: currentBase,
        freeDeliveryThreshold: Number(threshold) || 0,
      }).unwrap();
      showSuccess('Delivery settings updated successfully!');
      onClose();
    } catch (err) {
      showError(err?.data?.message || 'Failed to update delivery settings');
    }
  };

  return (
    <div className='fixed inset-0 bg-[#1B4332]/40 backdrop-blur-xs flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-gray-100'>
        {/* Modal Header */}
        <div className='bg-[#1B4332] px-6 py-5 flex items-center justify-between text-white'>
          <div className='flex items-center gap-3'>
            <div className='w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-lg'>
              🛵
            </div>
            <div>
              <h2 className='text-base font-extrabold tracking-tight'>Delivery Pricing & Range</h2>
              <p className='text-xs text-emerald-200/80 font-medium'>Configure base fee and distance-based tiers</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className='text-white/60 hover:text-white p-1 rounded-lg text-xl leading-none'
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSave} className='p-6 space-y-5'>
          {/* Key Rules Highlights */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-2.5'>
            <div className='bg-emerald-50 border border-emerald-200/60 rounded-2xl p-3 flex items-start gap-2.5'>
              <span className='text-emerald-700 text-sm mt-0.5'>⚡</span>
              <div>
                <p className='text-xs font-black text-emerald-900'>UPI / Online Orders</p>
                <p className='text-[11px] font-semibold text-emerald-700 mt-0.5'>100% Free delivery across all distances</p>
              </div>
            </div>

            <div className='bg-rose-50 border border-rose-200/60 rounded-2xl p-3 flex items-start gap-2.5'>
              <span className='text-rose-600 text-sm mt-0.5'>🛑</span>
              <div>
                <p className='text-xs font-black text-rose-900'>Strict 5 km Limit</p>
                <p className='text-[11px] font-semibold text-rose-700 mt-0.5'>Orders &gt; 5 km cannot be placed</p>
              </div>
            </div>
          </div>

          {/* Form Inputs */}
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <div>
              <label className='block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5'>
                Base Delivery Fee (0–2 km)
              </label>
              <div className='relative'>
                <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm'>
                  ₹
                </span>
                <input
                  type='number'
                  min='0'
                  step='1'
                  required
                  value={basePrice}
                  onChange={(e) => setBasePrice(e.target.value)}
                  className='w-full bg-[#F2F7F2] border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]'
                  placeholder='30'
                />
              </div>
              <p className='text-[10px] text-gray-400 font-medium mt-1'>Applied to 0–2 km (tiers scale dynamically)</p>
            </div>

            <div>
              <label className='block text-xs font-black text-slate-800 uppercase tracking-wider mb-1.5'>
                Free Delivery Order Min
              </label>
              <div className='relative'>
                <span className='absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-sm'>
                  ₹
                </span>
                <input
                  type='number'
                  min='0'
                  step='1'
                  required
                  value={threshold}
                  onChange={(e) => setThreshold(e.target.value)}
                  className='w-full bg-[#F2F7F2] border border-gray-200 rounded-xl pl-8 pr-3 py-2.5 text-sm font-black text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]'
                  placeholder='599'
                />
              </div>
              <p className='text-[10px] text-gray-400 font-medium mt-1'>Cart subtotal where delivery fee becomes ₹0</p>
            </div>
          </div>

          {/* Live Calculated Tiers Table */}
          <div className='bg-gray-50 rounded-2xl border border-gray-200/80 p-4'>
            <div className='flex items-center justify-between mb-3'>
              <h3 className='text-xs font-black text-slate-800 uppercase tracking-wider'>
                Live Distance Pricing Tiers (COD)
              </h3>
              <span className='text-[10px] font-bold text-gray-400 uppercase'>Auto-calculated</span>
            </div>

            <div className='space-y-2 text-xs'>
              <div className='flex items-center justify-between py-1.5 px-3 bg-white rounded-xl border border-gray-100 shadow-2xs'>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-emerald-500'></span>
                  <span className='font-bold text-slate-700'>0 to 2 km</span>
                </div>
                <span className='font-black text-slate-900 font-mono'>₹{currentBase} <span className='text-[10px] text-gray-400 font-medium'>(Base)</span></span>
              </div>

              <div className='flex items-center justify-between py-1.5 px-3 bg-white rounded-xl border border-gray-100 shadow-2xs'>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-blue-500'></span>
                  <span className='font-bold text-slate-700'>2 to 3 km</span>
                </div>
                <span className='font-black text-slate-900 font-mono'>₹{tier23} <span className='text-[10px] text-gray-400 font-medium'>(+25%)</span></span>
              </div>

              <div className='flex items-center justify-between py-1.5 px-3 bg-white rounded-xl border border-gray-100 shadow-2xs'>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-amber-500'></span>
                  <span className='font-bold text-slate-700'>3 to 4 km</span>
                </div>
                <span className='font-black text-slate-900 font-mono'>₹{tier34} <span className='text-[10px] text-gray-400 font-medium'>(+30%)</span></span>
              </div>

              <div className='flex items-center justify-between py-1.5 px-3 bg-white rounded-xl border border-gray-100 shadow-2xs'>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-purple-500'></span>
                  <span className='font-bold text-slate-700'>4 to 5 km</span>
                </div>
                <span className='font-black text-slate-900 font-mono'>₹{tier45} <span className='text-[10px] text-gray-400 font-medium'>(+35%)</span></span>
              </div>

              <div className='flex items-center justify-between py-1.5 px-3 bg-rose-50/60 rounded-xl border border-rose-200 shadow-2xs text-rose-700'>
                <div className='flex items-center gap-2'>
                  <span className='w-2 h-2 rounded-full bg-rose-500'></span>
                  <span className='font-bold text-rose-900'>Above 5 km</span>
                </div>
                <span className='font-black text-rose-700 text-[11px] uppercase tracking-wider'>
                  ❌ Blocked / Not Allowed
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className='flex items-center justify-end gap-3 pt-2'>
            <button
              type='button'
              onClick={onClose}
              disabled={isUpdating}
              className='px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100 transition'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={isUpdating}
              className='px-6 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#163829] text-white text-xs font-black uppercase tracking-wider shadow-md transition disabled:opacity-50'
            >
              {isUpdating ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
