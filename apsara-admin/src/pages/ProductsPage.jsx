import { useState } from 'react';
import { useGetCategoriesQuery } from '../slices/categoryApiSlice';
import { useGetProductsQuery, useToggleStockMutation, useDeleteProductMutation,
         useCreateProductMutation, useUpdateProductMutation } from '../slices/productApiSlice';
import { useToast } from '../hooks/useToast';
import { useDispatch } from 'react-redux';
import { showConfirm } from '../slices/uiSlice';
import { registerConfirmHandler } from '../components/common/ConfirmDialog';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export default function ProductsPage() {
  const [selectedCat, setSelectedCat] = useState('');
  const [showModal,   setShowModal]   = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [form, setForm] = useState({ name:'', category:'', isZeroSugar:false });
  const [imageFile, setImageFile] = useState(null);
  const [preview,   setPreview]   = useState('');
  const { showSuccess, showError } = useToast();
  const dispatch = useDispatch();

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: products = [], isLoading } = useGetProductsQuery(selectedCat || undefined);
  const [toggleStock]   = useToggleStockMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const closeModal = () => {
    setShowModal(false); setEditingId(null);
    setForm({ name:'', category:'', isZeroSugar:false });
    setImageFile(null); setPreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('category', form.category);
    fd.append('isZeroSugar', form.isZeroSugar);
    if (imageFile) fd.append('image', imageFile);
    try {
      if (editingId) { await updateProduct({ id:editingId, formData:fd }).unwrap(); showSuccess('Flavor Refined'); }
      else           { await createProduct(fd).unwrap(); showSuccess('New Flavor Added'); }
      closeModal();
    } catch (e) { showError(e?.data?.message || 'Action failed'); }
  };

  const handleDelete = (id) => {
    const key = `del_${id}`;
    registerConfirmHandler(key, async () => {
      try { await deleteProduct(id).unwrap(); showSuccess('Removed from Menu'); }
      catch { showError('Delete failed'); }
    });
    dispatch(showConfirm({ message:'Remove this flavor from the catalog permanently?', confirmKey:key }));
  };

  return (
    <div className="min-h-screen bg-[#FBFCFB] pb-24">
      {/* --- HEADER --- */}
      <div className="px-8 pt-12 pb-20 bg-[#F2F7F2] rounded-b-[60px] border-b border-green-50">
        <div className="max-w-7xl mx-auto flex items-end justify-between">
          <div>
            <h1 className="text-5xl font-black tracking-tight text-[#1B4332]">
              Menu <span className="text-emerald-500/60 font-serif italic">Vault</span>
            </h1>
            <p className="text-emerald-900/40 font-bold text-xs uppercase tracking-[3px] mt-4">
              Catalog • {products.length} Signature Offerings
            </p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#1B4332] text-white font-black px-10 py-5 rounded-[24px] shadow-2xl shadow-emerald-900/20 hover:-translate-y-1 transition-all text-xs uppercase tracking-widest"
          >
            + New Creation
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 -mt-10">
        {/* --- CATEGORY SELECTOR --- */}
        <div className="flex gap-2 mb-10 overflow-x-auto pb-4 no-scrollbar">
          {[{ _id:'', name:'Full Menu' }, ...categories].map((c) => (
            <button 
              key={c._id} 
              onClick={() => setSelectedCat(c._id)}
              className={`px-8 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap border
                ${selectedCat === c._id ? 'bg-[#1B4332] text-white border-[#1B4332] shadow-lg shadow-emerald-900/10' : 'bg-white text-emerald-800/40 border-green-50 hover:border-emerald-200'}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {isLoading ? <Spinner /> : (
          <div className="bg-white rounded-[40px] border border-green-50 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#F2F7F2]/50">
                  <tr>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px]">Product Info</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px]">Collection</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px]">Regular Price</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px]">Availability</th>
                    <th className="px-8 py-5 text-[10px] font-black text-emerald-900/40 uppercase tracking-[2px] text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-50/50">
                  {products.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest">No flavors found in this collection</td>
                    </tr>
                  ) : products.map((p) => (
                    <tr key={p._id} className="group hover:bg-[#F2F7F2]/20 transition-colors">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-[20px] overflow-hidden bg-[#F2F7F2] shrink-0 border border-green-50">
                            {p.imageUrl ? (
                              <img src={p.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-2xl">🍃</div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 text-[15px]">{p.name}</p>
                            {p.isZeroSugar && (
                              <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 text-[8px] font-black uppercase tracking-widest rounded-md">
                                Sugar Free
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-xl">
                          {p.category?.name}
                        </span>
                      </td>
                      <td className="px-8 py-5 font-black text-[#1B4332] text-lg">
                        {currency(p.resolvedPrices?.regular)}
                      </td>
                      <td className="px-8 py-5">
                         <label className="relative inline-flex items-center cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="sr-only peer" 
                              checked={p.isAvailable} 
                              onChange={() => toggleStock(p._id)} 
                            />
                            <div className="w-11 h-6 bg-slate-100 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
                         </label>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            onClick={() => {
                              setEditingId(p._id);
                              setForm({ name:p.name, category:p.category?._id||'', isZeroSugar:p.isZeroSugar });
                              setPreview(p.imageUrl||'');
                              setShowModal(true);
                            }}
                            className="p-3 bg-[#F2F7F2] text-emerald-600 rounded-2xl hover:bg-[#1B4332] hover:text-white transition-all shadow-sm"
                          >
                            <span className="text-[10px] font-black uppercase tracking-widest px-1">Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(p._id)}
                            className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                          >
                             <span className="text-[10px] font-black uppercase tracking-widest px-1">Del</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* --- FORM MODAL (Consistency maintained) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-[#1B4332]/20 backdrop-blur-xl flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-[50px] shadow-2xl w-full max-w-xl overflow-hidden animate-in fade-in zoom-in duration-500">
            <div className="bg-[#1B4332] p-12 text-center relative">
              <button onClick={closeModal} className="absolute top-8 right-8 text-white/30 hover:text-white font-black">✕</button>
              <h2 className="text-3xl font-black text-white italic font-serif">
                {editingId ? 'Refine Flavor' : 'New Creation'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className="p-12 space-y-8">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Flavor Name</label>
                  <input value={form.name} onChange={(e) => setForm({...form, name:e.target.value})} className="w-full bg-[#F2F7F2] border-none rounded-[20px] px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800" required />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Collection</label>
                  <select value={form.category} onChange={(e) => setForm({...form, category:e.target.value})} className="w-full bg-[#F2F7F2] border-none rounded-[20px] px-6 py-4 focus:ring-2 focus:ring-emerald-500 font-bold text-slate-800 appearance-none" required>
                    <option value="">Select...</option>
                    {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-between bg-[#F2F7F2] p-6 rounded-[24px]">
                <span className="text-xs font-black text-emerald-800 uppercase tracking-widest">Natural Sugar Free</span>
                <input type="checkbox" checked={form.isZeroSugar} onChange={(e) => setForm({...form, isZeroSugar:e.target.checked})} className="w-6 h-6 rounded-lg text-emerald-600 focus:ring-emerald-500 border-none bg-white" />
              </div>

              <button type="submit" className="w-full bg-[#1B4332] text-white py-6 rounded-[24px] font-black uppercase text-xs tracking-[4px] shadow-xl shadow-emerald-900/20 hover:scale-[1.02] transition-transform">
                Save to Catalog
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}