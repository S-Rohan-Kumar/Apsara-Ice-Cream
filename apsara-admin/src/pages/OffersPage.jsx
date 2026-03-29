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
  if (!o.isActive)                return { label:'Deactivated', cls:'bg-slate-100 text-slate-500',    dot:'bg-slate-300'    };
  if (now < new Date(o.startsAt)) return { label:'Upcoming',    cls:'bg-blue-50 text-blue-600',       dot:'bg-blue-400'    };
  if (now > new Date(o.expiresAt))return { label:'Expired',     cls:'bg-red-50 text-red-500',         dot:'bg-red-400'     };
  return                                 { label:'Active',      cls:'bg-emerald-50 text-emerald-700', dot:'bg-emerald-500' };
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
      const payload = { ...form, category:form.category || null, discountPercent:Number(form.discountPercent) };
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
    <div className="min-h-screen bg-[#FBFCFB] pb-24">
      {/* Header */}
      <div className="px-4 sm:px-8 pt-8 sm:pt-12 pb-16 sm:pb-20 bg-[#F2F7F2] rounded-b-[40px] sm:rounded-b-[60px] border-b border-green-50">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-end justify-between gap-4 sm:gap-0">
          <div>
            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-[#1B4332]">
              Promo <span className="text-emerald-500/60 font-serif italic">Studio</span>
            </h1>
            <p className="text-emerald-900/40 font-bold text-xs uppercase tracking-[3px] mt-3 sm:mt-4">
               {activeCount} Active • {offers.length} Total Campaigns
            </p>
          </div>
          <button
            onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}
            className="self-start sm:self-auto bg-[#1B4332] text-white font-black px-7 sm:px-10 py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] shadow-2xl shadow-emerald-900/20 hover:-translate-y-1 transition-all text-xs uppercase tracking-widest"
          >
            + New Campaign
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 -mt-8 sm:-mt-10">
        {isLoading ? <Spinner /> : offers.length === 0 ? (
          <div className="bg-white rounded-[36px] sm:rounded-[48px] p-12 sm:p-20 text-center shadow-sm border border-green-50">
             <span className="text-6xl block mb-6 opacity-30">🏷️</span>
             <h2 className="text-xl sm:text-2xl font-black text-[#1B4332]">No campaigns yet</h2>
             <p className="text-gray-400 mt-2 font-medium">Create your first offer to drive sales.</p>
          </div>
        ) : (
          /* Desktop: table | Mobile: cards */
          <>
            {/* Desktop table */}
            <div className="hidden md:block bg-white rounded-[40px] border border-green-50 shadow-sm overflow-hidden">
              <div className="overflow-x-auto no-scrollbar">
                <table className="w-full text-left">
                  <thead className="bg-[#F2F7F2]/50">
                    <tr>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px]">Offer Details</th>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px]">Timeline</th>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px]">Requirements</th>
                      <th className="px-6 lg:px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px] text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-green-50/50">
                    {offers.map((o) => {
                      const s = getStatus(o);
                      return (
                        <tr key={o._id} className="group hover:bg-[#F2F7F2]/20 transition-colors">
                          <td className="px-6 lg:px-8 py-5 lg:py-6">
                            <div className="flex items-center gap-4 lg:gap-5">
                              <div className="w-12 h-12 lg:w-14 lg:h-14 bg-[#1B4332] rounded-[18px] lg:rounded-[22px] flex flex-col items-center justify-center shrink-0 shadow-lg shadow-emerald-900/10">
                                <span className="text-emerald-400 font-black text-sm leading-none">{o.discountPercent}%</span>
                                <span className="text-white/40 text-[8px] font-black uppercase mt-0.5">Off</span>
                              </div>
                              <div>
                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                  <p className="font-black text-slate-800 text-[13px] lg:text-[14px]">{o.title}</p>
                                  <span className={`flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full ${s.cls}`}>
                                    <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                                    {s.label}
                                  </span>
                                </div>
                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                                  {o.category?.name || 'Storewide Access'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-5 lg:py-6">
                            <div className="flex flex-col gap-1">
                              <p className="text-xs font-bold text-slate-600">{fmt(o.startsAt)}</p>
                              <p className="text-[9px] font-black text-slate-300 uppercase">to {fmt(o.expiresAt)}</p>
                            </div>
                          </td>
                          <td className="px-6 lg:px-8 py-5 lg:py-6">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                              {o.minOrderAmount > 0 ? `Min Order: ₹${o.minOrderAmount}` : 'No Minimum'}
                            </p>
                          </td>
                          <td className="px-6 lg:px-8 py-5 lg:py-6 text-right">
                            <div className="flex justify-end gap-2 flex-wrap">
                              <button onClick={() => {
                                  setEditing(o);
                                  setForm({
                                    title:o.title,
                                    discountPercent:o.discountPercent,
                                    category:o.category?._id || '',
                                    startsAt:o.startsAt?.slice(0,16),
                                    expiresAt:o.expiresAt?.slice(0,16),
                                    minOrderAmount:o.minOrderAmount
                                  });
                                  setShowModal(true);
                                }}
                                className="p-2.5 lg:p-3 bg-emerald-50 text-emerald-600 rounded-2xl hover:bg-[#1B4332] hover:text-white transition-all shadow-sm"
                              >
                                <span className="text-[9px] font-black uppercase tracking-widest px-1">Edit</span>
                              </button>

                              {o.isActive ? (
                                <button onClick={() => updateOffer({ id:o._id, isActive:false })}
                                  className="p-2.5 lg:p-3 bg-amber-50 text-amber-600 rounded-2xl hover:bg-amber-500 hover:text-white transition-all shadow-sm border border-amber-100"
                                >
                                  <span className="text-[9px] font-black uppercase tracking-widest px-1">Deactivate</span>
                                </button>
                              ) : (
                                <button onClick={() => updateOffer({ id:o._id, isActive:true })}
                                  className="p-2.5 lg:p-3 bg-emerald-50 text-emerald-700 rounded-2xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm border border-emerald-100"
                                >
                                  <span className="text-[9px] font-black uppercase tracking-widest px-1">Activate</span>
                                </button>
                              )}

                              <button onClick={() => handleDelete(o._id)}
                                className="p-2.5 lg:p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                              >
                                 <span className="text-[9px] font-black uppercase tracking-widest px-1">Del</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden space-y-3">
              {offers.map((o) => {
                const s = getStatus(o);
                return (
                  <div key={o._id} className="bg-white rounded-[24px] border border-green-50 shadow-sm p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="w-12 h-12 bg-[#1B4332] rounded-[18px] flex flex-col items-center justify-center shrink-0 shadow-lg shadow-emerald-900/10">
                        <span className="text-emerald-400 font-black text-sm leading-none">{o.discountPercent}%</span>
                        <span className="text-white/40 text-[8px] font-black uppercase mt-0.5">Off</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                          <p className="font-black text-slate-800 text-sm">{o.title}</p>
                          <span className={`flex items-center gap-1 text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${s.cls}`}>
                            <span className={`w-1 h-1 rounded-full ${s.dot}`} />
                            {s.label}
                          </span>
                        </div>
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest truncate">
                          {o.category?.name || 'Storewide Access'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 mb-3 px-1">
                      <span>{fmt(o.startsAt)} → {fmt(o.expiresAt)}</span>
                      <span>{o.minOrderAmount > 0 ? `Min ₹${o.minOrderAmount}` : 'No Min'}</span>
                    </div>

                    <div className="flex gap-2">
                      <button onClick={() => {
                          setEditing(o);
                          setForm({
                            title:o.title, discountPercent:o.discountPercent,
                            category:o.category?._id || '',
                            startsAt:o.startsAt?.slice(0,16), expiresAt:o.expiresAt?.slice(0,16),
                            minOrderAmount:o.minOrderAmount
                          });
                          setShowModal(true);
                        }}
                        className="flex-1 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                      >Edit</button>

                      {o.isActive ? (
                        <button onClick={() => updateOffer({ id:o._id, isActive:false })}
                          className="flex-1 py-2.5 bg-amber-50 text-amber-600 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-100"
                        >Deactivate</button>
                      ) : (
                        <button onClick={() => updateOffer({ id:o._id, isActive:true })}
                          className="flex-1 py-2.5 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100"
                        >Activate</button>
                      )}

                      <button onClick={() => handleDelete(o._id)}
                        className="px-4 py-2.5 bg-red-50 text-red-500 rounded-xl text-[10px] font-black uppercase tracking-widest"
                      >Del</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1B4332]/20 backdrop-blur-xl flex items-end sm:items-center justify-center z-50 p-0 sm:p-6">
          <div className="bg-white rounded-t-[40px] sm:rounded-[50px] shadow-2xl w-full sm:max-w-xl overflow-hidden animate-in fade-in zoom-in duration-500 max-h-[90vh] overflow-y-auto">
            <div className="bg-[#1B4332] p-7 sm:p-10 text-center relative sticky top-0 z-10">
               <button onClick={() => setShowModal(false)} className="absolute top-5 sm:top-8 right-5 sm:right-8 text-white/30 hover:text-white font-black text-lg">✕</button>
               <h2 className="text-xl sm:text-3xl font-black text-white italic font-serif">
                 {editing ? 'Refine Offer' : 'New Campaign'}
               </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-6 sm:p-10 space-y-5 sm:space-y-6">
              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Title</label>
                  <input placeholder="Weekend Joy" value={form.title}
                    onChange={(e) => setForm({...form, title:e.target.value})}
                    className="w-full bg-[#F2F7F2] border-none rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Discount %</label>
                  <input type="number" min="1" max="100" value={form.discountPercent}
                    onChange={(e) => setForm({...form, discountPercent:e.target.value})}
                    className="w-full bg-[#F2F7F2] border-none rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500" required />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Collection</label>
                  <select value={form.category} onChange={(e) => setForm({...form, category:e.target.value})}
                    className="w-full bg-[#F2F7F2] border-none rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 appearance-none">
                    <option value="">All Categories</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Min Order (₹)</label>
                  <input type="number" value={form.minOrderAmount} onChange={(e) => setForm({...form, minOrderAmount:e.target.value})}
                    className="w-full bg-[#F2F7F2] border-none rounded-2xl px-4 sm:px-5 py-3 sm:py-3.5 text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Starts At</label>
                  <input type="datetime-local" value={form.startsAt} onChange={(e) => setForm({...form, startsAt:e.target.value})}
                    className="w-full bg-[#F2F7F2] border-none rounded-2xl px-4 sm:px-5 py-3 text-[11px] font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Expires At</label>
                  <input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({...form, expiresAt:e.target.value})}
                    className="w-full bg-[#F2F7F2] border-none rounded-2xl px-4 sm:px-5 py-3 text-[11px] font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500" required />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#1B4332] text-white py-4 sm:py-5 rounded-[20px] sm:rounded-[24px] font-black uppercase text-xs tracking-[4px] shadow-xl shadow-emerald-900/20 hover:scale-[1.01] transition-transform">
                Save Campaign
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}