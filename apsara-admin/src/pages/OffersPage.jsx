import { useState, useMemo } from 'react';
import { useGetCategoriesQuery } from '../slices/categoryApiSlice';
import { useGetAllOffersQuery, useCreateOfferMutation, useUpdateOfferMutation, useDeleteOfferMutation } from '../slices/offerApiSlice';
import { useToast } from '../hooks/useToast';
import { useDispatch } from 'react-redux';
import { showConfirm } from '../slices/uiSlice';
import { registerConfirmHandler } from '../components/common/ConfirmDialog';
import Spinner from '../components/common/Spinner';

const getStatus = (o) => {
  const now = new Date();
  if (!o.isActive) {
    return { label: 'Deactivated', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
  }
  if (now < new Date(o.startsAt)) {
    return { label: 'Upcoming', cls: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' };
  }
  if (now > new Date(o.expiresAt)) {
    return { label: 'Expired', cls: 'bg-rose-50 text-rose-500 border-rose-200', dot: 'bg-rose-400' };
  }
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
};

const fmtDate = (iso) => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const EMPTY_OFFER = {
  title: '',
  discountPercent: '',
  category: '',
  startsAt: '',
  expiresAt: '',
  minOrderAmount: 0
};

export default function OffersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const { showSuccess, showError } = useToast();
  const dispatch = useDispatch();

  const { data: offers = [], isLoading } = useGetAllOffersQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [createOffer] = useCreateOfferMutation();
  const [updateOffer] = useUpdateOfferMutation();
  const [deleteOffer] = useDeleteOfferMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        category: form.category || null,
        discountPercent: Number(form.discountPercent),
        minOrderAmount: Number(form.minOrderAmount) || 0
      };
      if (editing) {
        await updateOffer({ id: editing._id, ...payload }).unwrap();
        showSuccess('Offer updated successfully');
      } else {
        await createOffer(payload).unwrap();
        showSuccess('Campaign published successfully');
      }
      setShowModal(false);
    } catch (e) {
      showError(e?.data?.message || 'Failed to save offer');
    }
  };

  const handleDelete = (id) => {
    const key = `del_offer_${id}`;
    registerConfirmHandler(key, async () => {
      try {
        await deleteOffer(id).unwrap();
        showSuccess('Offer removed');
      } catch {
        showError('Delete failed');
      }
    });
    dispatch(showConfirm({ message: 'Are you sure you want to permanently delete this offer?', confirmKey: key }));
  };

  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const status = getStatus(o).label;
      if (activeTab === 'ACTIVE' && status !== 'Active') return false;
      if (activeTab === 'UPCOMING' && status !== 'Upcoming') return false;
      if (activeTab === 'EXPIRED' && status !== 'Expired' && status !== 'Deactivated') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (o.title || '').toLowerCase().includes(q);
        const matchesCat = (o.category?.name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat) return false;
      }
      return true;
    });
  }, [offers, activeTab, searchQuery]);

  const activeCount = offers.filter((o) => getStatus(o).label === 'Active').length;
  const upcomingCount = offers.filter((o) => getStatus(o).label === 'Upcoming').length;

  return (
    <div className='max-w-7xl mx-auto pb-24 space-y-6'>
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <span className='px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800'>
              Discount Matrix
            </span>
            <span className='text-xs font-semibold text-gray-500'>
              {activeCount} Active • {upcomingCount} Scheduled
            </span>
          </div>
          <h1 className='text-2xl sm:text-3xl font-black text-[#1B4332] tracking-tight'>
            Campaigns & Offers
          </h1>
          <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mt-1'>
            Manage Storewide Promo Codes and Time-Limited Discounts
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setForm(EMPTY_OFFER);
            setShowModal(true);
          }}
          className='bg-[#1B4332] hover:bg-[#163829] active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition text-xs uppercase tracking-wider flex items-center gap-2'
        >
          <span>＋</span>
          <span>Create New Promo</span>
        </button>
      </div>

      <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4'>
        <div className='flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar'>
          {[
            { id: 'ALL', label: 'All Offers', count: offers.length },
            { id: 'ACTIVE', label: 'Live Now', count: activeCount },
            { id: 'UPCOMING', label: 'Upcoming', count: upcomingCount },
            { id: 'EXPIRED', label: 'Past & Off', count: offers.length - activeCount - upcomingCount }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#1B4332] text-white shadow-xs'
                  : 'bg-gray-50 text-gray-600 hover:text-slate-900'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        <div className='w-full sm:w-72'>
          <input
            type='text'
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder='Search campaigns or categories...'
            className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs font-bold text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
          />
        </div>
      </div>

      {isLoading ? (
        <div className='py-20 text-center'><Spinner /></div>
      ) : filteredOffers.length === 0 ? (
        <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-16 text-center max-w-xl mx-auto'>
          <h3 className='text-base font-black text-slate-800 uppercase tracking-wider mb-1'>No campaigns match</h3>
          <p className='text-xs text-gray-400 mb-6'>
            {searchQuery ? `No offers found matching "${searchQuery}"` : 'Create your first promotional discount offer to boost store orders.'}
          </p>
          <button
            onClick={() => {
              setEditing(null);
              setForm(EMPTY_OFFER);
              setShowModal(true);
            }}
            className='bg-[#1B4332] text-white font-bold px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider'
          >
            Launch First Promo
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5'>
          {filteredOffers.map((o) => {
            const s = getStatus(o);
            return (
              <div
                key={o._id}
                className='bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md transition p-5 flex flex-col justify-between'
              >
                <div>
                  <div className='flex items-start justify-between gap-3 mb-4'>
                    <div className='flex items-center gap-3'>
                      <div className='w-12 h-12 bg-[#1B4332] rounded-xl flex flex-col items-center justify-center text-white shrink-0 shadow-xs'>
                        <span className='text-base font-black leading-none text-emerald-400'>{o.discountPercent}%</span>
                        <span className='text-[8px] font-bold tracking-wider uppercase opacity-70 mt-0.5'>OFF</span>
                      </div>
                      <div>
                        <h3 className='font-bold text-slate-800 text-sm leading-snug'>{o.title}</h3>
                        <span className='text-[10px] font-bold text-emerald-700 uppercase tracking-wider block mt-0.5'>
                          {o.category?.name || 'All Store Flavours'}
                        </span>
                      </div>
                    </div>

                    <span className={`flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${s.cls}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                      {s.label}
                    </span>
                  </div>

                  <div className='bg-gray-50 rounded-xl p-3 space-y-1.5 mb-4 text-xs'>
                    <div className='flex items-center justify-between'>
                      <span className='text-gray-400 font-medium'>Validity</span>
                      <span className='text-slate-700 font-bold text-[11px]'>
                        {fmtDate(o.startsAt)} → {fmtDate(o.expiresAt)}
                      </span>
                    </div>
                    <div className='flex items-center justify-between'>
                      <span className='text-gray-400 font-medium'>Min Order</span>
                      <span className='text-[#1B4332] font-bold text-[11px]'>
                        {o.minOrderAmount > 0 ? `₹${o.minOrderAmount}` : 'No Minimum Order'}
                      </span>
                    </div>
                  </div>
                </div>

                <div className='flex items-center gap-2 pt-2 border-t border-gray-100'>
                  <button
                    onClick={() => {
                      setEditing(o);
                      setForm({
                        title: o.title,
                        discountPercent: o.discountPercent,
                        category: o.category?._id || '',
                        startsAt: o.startsAt?.slice(0, 16) || '',
                        expiresAt: o.expiresAt?.slice(0, 16) || '',
                        minOrderAmount: o.minOrderAmount || 0
                      });
                      setShowModal(true);
                    }}
                    className='flex-1 py-2 bg-gray-50 hover:bg-gray-100 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors'
                  >
                    Edit
                  </button>

                  {o.isActive ? (
                    <button
                      onClick={() => updateOffer({ id: o._id, isActive: false })}
                      className='flex-1 py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors border border-amber-200'
                    >
                      Deactivate
                    </button>
                  ) : (
                    <button
                      onClick={() => updateOffer({ id: o._id, isActive: true })}
                      className='flex-1 py-2 bg-[#1B4332] hover:bg-[#163829] text-white rounded-xl text-xs font-bold uppercase tracking-wider transition-colors shadow-xs'
                    >
                      Activate
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(o._id)}
                    className='px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors'
                  >
                    Del
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className='fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
          <div className='bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto'>
            <div className='bg-[#1B4332] p-5 sm:p-6 flex items-center justify-between sticky top-0 z-10 text-white'>
              <h2 className='text-base font-bold uppercase tracking-wider'>
                {editing ? 'Refine Promotion' : 'New Campaign Offer'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className='text-white/60 hover:text-white font-bold text-lg'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className='p-6 space-y-4'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>Campaign Title</label>
                  <input
                    type='text'
                    placeholder='e.g. Summer Delight'
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                    required
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>Discount %</label>
                  <input
                    type='number'
                    min='1'
                    max='100'
                    placeholder='20'
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                    className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                    required
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>Applies To</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                  >
                    <option value=''>Storewide (All Flavours)</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>Min Order Spend (₹)</label>
                  <input
                    type='number'
                    min='0'
                    placeholder='0 for no minimum'
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                  />
                </div>
              </div>

              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>Start Date & Time</label>
                  <input
                    type='datetime-local'
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                    required
                  />
                </div>
                <div className='space-y-1'>
                  <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider'>Expiry Date & Time</label>
                  <input
                    type='datetime-local'
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className='w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                    required
                  />
                </div>
              </div>

              <div className='pt-2'>
                <button
                  type='submit'
                  className='w-full bg-[#1B4332] hover:bg-[#163829] text-white py-3 rounded-xl font-bold uppercase text-xs tracking-wider transition'
                >
                  Save Campaign
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}