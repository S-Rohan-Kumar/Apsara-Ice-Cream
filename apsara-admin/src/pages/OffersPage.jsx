import { useState } from 'react';
import { useGetCategoriesQuery } from '../slices/categoryApiSlice';
import { useGetAllOffersQuery, useCreateOfferMutation, useUpdateOfferMutation, useDeleteOfferMutation } from '../slices/offerApiSlice';
import { useToast } from '../hooks/useToast';
import { useDispatch } from 'react-redux';
import { showConfirm } from '../slices/uiSlice';
import { registerConfirmHandler } from '../components/common/ConfirmDialog';
import Spinner from '../components/common/Spinner';

const getStatus = (o) => {
  const now = new Date();
  if (!o.isActive)                return { label:'Deactivated', cls:'bg-gray-100 text-gray-500',   dot:'bg-gray-300'   };
  if (now < new Date(o.startsAt)) return { label:'Upcoming',    cls:'bg-blue-50 text-blue-600',    dot:'bg-blue-400'   };
  if (now > new Date(o.expiresAt))return { label:'Expired',     cls:'bg-red-50 text-red-500',      dot:'bg-red-400'    };
  return                                 { label:'Active',      cls:'bg-[#1B5E4B]/10 text-[#1B5E4B]', dot:'bg-[#1B5E4B]' };
};

const fmt = (iso) => new Date(iso).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' });
const EMPTY = { title:'', discountPercent:'', category:'', startsAt:'', expiresAt:'', minOrderAmount:0 };

export default function OffersPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const { showSuccess, showError } = useToast();
  const dispatch = useDispatch();

  const { data: offers = [], isLoading } = useGetAllOffersQuery();
  const { data: categories = [] }         = useGetCategoriesQuery();
  const [createOffer] = useCreateOfferMutation();
  const [updateOffer] = useUpdateOfferMutation();
  const [deleteOffer] = useDeleteOfferMutation();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form, category:form.category||null, discountPercent:Number(form.discountPercent) };
      if (editing) { await updateOffer({ id:editing._id, ...payload }).unwrap(); showSuccess('Offer updated'); }
      else         { await createOffer(payload).unwrap(); showSuccess('Offer created'); }
      setShowModal(false);
    } catch (e) { showError(e?.data?.message || 'Save failed'); }
  };

  const handleDelete = (id) => {
    const key = `del_offer_${id}`;
    registerConfirmHandler(key, async () => {
      try { await deleteOffer(id).unwrap(); showSuccess('Offer deleted'); }
      catch { showError('Delete failed'); }
    });
    dispatch(showConfirm({ message:'Delete this offer?', confirmKey:key }));
  };

  const activeCount = offers.filter(o => getStatus(o).label === 'Active').length;

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-extrabold text-gray-800'>Offers</h1>
          <p className='text-sm text-gray-400 mt-0.5'>
            {activeCount} active · {offers.length} total
          </p>
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}
          className='bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold px-5 py-2.5
                     rounded-xl shadow-md shadow-[#1B5E4B]/20 transition-all text-sm'>
          + Create Offer
        </button>
      </div>

      {isLoading ? <Spinner /> : offers.length === 0 ? (
        <div className='text-center py-20 text-gray-300'>
          <span className='text-6xl block mb-3'>🏷️</span>
          <p className='text-gray-400 font-medium'>No offers yet</p>
        </div>
      ) : (
        <div className='space-y-3'>
          {offers.map((o) => {
            const s = getStatus(o);
            return (
              <div key={o._id} className='bg-white rounded-2xl border border-gray-100
                                          shadow-sm hover:shadow-md transition-all p-5'>
                <div className='flex items-center justify-between gap-4'>
                  <div className='flex items-center gap-4'>
                    {/* Discount badge */}
                    <div className='w-16 h-16 bg-[#1B5E4B] rounded-2xl flex flex-col
                                    items-center justify-center shrink-0'>
                      <span className='text-[#F5A623] font-extrabold text-xl leading-none'>
                        {o.discountPercent}%
                      </span>
                      <span className='text-white/60 text-[10px] font-semibold'>OFF</span>
                    </div>
                    <div>
                      <div className='flex items-center gap-2 mb-1'>
                        <h3 className='font-bold text-gray-800'>{o.title}</h3>
                        <span className={`flex items-center gap-1.5 text-xs font-semibold
                                          px-2.5 py-1 rounded-full ${s.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </div>
                      <p className='text-xs text-gray-400'>
                        {o.category?.name || 'All Categories'}
                        <span className='mx-2'>·</span>
                        📅 {fmt(o.startsAt)} → {fmt(o.expiresAt)}
                        {o.minOrderAmount > 0 && <span className='ml-2'>· Min ₹{o.minOrderAmount}</span>}
                      </p>
                    </div>
                  </div>

                  <div className='flex gap-2 shrink-0'>
                    <button onClick={() => {
                      setEditing(o);
                      setForm({ title:o.title, discountPercent:o.discountPercent,
                        category:o.category?._id||'',
                        startsAt:o.startsAt?.slice(0,16), expiresAt:o.expiresAt?.slice(0,16),
                        minOrderAmount:o.minOrderAmount });
                      setShowModal(true);
                    }} className='text-xs font-semibold text-[#1B5E4B] bg-[#1B5E4B]/10
                                  hover:bg-[#1B5E4B]/20 px-3 py-1.5 rounded-lg transition'>
                      Edit
                    </button>
                    {o.isActive && (
                      <button onClick={() => updateOffer({ id:o._id, isActive:false })}
                        className='text-xs font-semibold text-[#F5A623] bg-yellow-50
                                   hover:bg-yellow-100 px-3 py-1.5 rounded-lg transition border
                                   border-yellow-200'>
                        Deactivate
                      </button>
                    )}
                    <button onClick={() => handleDelete(o._id)}
                      className='text-xs font-semibold text-red-500 bg-red-50
                                 hover:bg-red-100 px-3 py-1.5 rounded-lg transition'>
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center
                        justify-center z-50 p-4'>
          <div className='bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden'>
            <div className='bg-[#1B5E4B] px-6 py-5'>
              <h2 className='text-lg font-extrabold text-white'>
                {editing ? '✏️ Edit Offer' : '🏷️ Create Offer'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className='p-6 space-y-4'>
              <input placeholder='Offer title (e.g. Weekend Special)' value={form.title}
                onChange={(e) => setForm({...form, title:e.target.value})}
                className='w-full border border-gray-200 rounded-xl px-4 py-3
                           focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                           focus:border-[#1B5E4B] bg-gray-50' required />

              <div className='relative'>
                <input type='number' min='1' max='100' placeholder='Discount %'
                  value={form.discountPercent}
                  onChange={(e) => setForm({...form, discountPercent:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3 pr-10
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50' required />
                <span className='absolute right-4 top-1/2 -translate-y-1/2 font-bold
                                 text-gray-300 text-sm'>%</span>
              </div>

              <select value={form.category}
                onChange={(e) => setForm({...form, category:e.target.value})}
                className='w-full border border-gray-200 rounded-xl px-4 py-3
                           focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                           focus:border-[#1B5E4B] bg-gray-50'>
                <option value=''>All Categories</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
              </select>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='text-xs text-gray-400 font-semibold block mb-1'>Start</label>
                  <input type='datetime-local' value={form.startsAt}
                    onChange={(e) => setForm({...form, startsAt:e.target.value})}
                    className='w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                               focus:border-[#1B5E4B] bg-gray-50' required />
                </div>
                <div>
                  <label className='text-xs text-gray-400 font-semibold block mb-1'>End</label>
                  <input type='datetime-local' value={form.expiresAt}
                    onChange={(e) => setForm({...form, expiresAt:e.target.value})}
                    className='w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm
                               focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                               focus:border-[#1B5E4B] bg-gray-50' required />
                </div>
              </div>

              <div className='flex gap-3'>
                <button type='button' onClick={() => setShowModal(false)}
                  className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold
                             text-gray-500 hover:bg-gray-50 transition text-sm'>Cancel</button>
                <button type='submit'
                  className='flex-1 bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold
                             py-3 rounded-xl transition shadow-md shadow-[#1B5E4B]/20 text-sm'>
                  Save Offer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}