import { useState } from 'react';
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation } from '../slices/categoryApiSlice';
import { useToast } from '../hooks/useToast';
import Spinner from '../components/common/Spinner';

const EMPTY = { name:'', imageUrl:'', basePrice:{ small:'', regular:'', large:'', binge:'' } };
const VARIANTS = [
  { key:'small',   label:'Small',   ml:'80ml'  },
  { key:'regular', label:'Regular', ml:'120ml' },
  { key:'large',   label:'Large',   ml:'160ml' },
  { key:'binge',   label:'Binge',   ml:'300ml' },
];

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const { showSuccess, showError } = useToast();

  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  const openEdit = (cat) => {
    setEditing(cat);
    setForm({ name:cat.name, imageUrl:cat.imageUrl||'', basePrice:{...cat.basePrice} });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editing) { await updateCategory({ id:editing._id, ...form }).unwrap(); showSuccess('Collection Updated'); }
      else         { await createCategory(form).unwrap(); showSuccess('New Collection Created'); }
      setShowModal(false);
    } catch (e) { showError(e?.data?.message || 'Action failed'); }
  };

  return (
    <div className='pb-20'>
      <div className='flex items-center justify-between mb-10'>
        <div>
          <h1 className='text-2xl font-black text-[#1B4332]'>Categories</h1>
          <p className='text-[11px] font-bold text-emerald-900/40 uppercase tracking-widest mt-1'>
            {categories.length} Flavor Collections
          </p>
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}
          className='bg-[#1B4332] text-white font-black px-6 py-3.5
                     rounded-2xl shadow-xl shadow-emerald-900/10 transition-all text-[11px] uppercase tracking-widest'>
          + Add Collection
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className='grid sm:grid-cols-2 lg:grid-cols-3 gap-6'>
          {categories.map((c) => (
            <div key={c._id} className='bg-white rounded-[32px] border border-green-50 shadow-sm overflow-hidden group hover:shadow-xl transition-all duration-500'>
              <div className='h-32 bg-[#F2F7F2] relative overflow-hidden'>
                {c.imageUrl
                  ? <img src={c.imageUrl} className='w-full h-full object-cover group-hover:scale-110 transition-transform duration-700' />
                  : <div className='w-full h-full flex items-center justify-center text-4xl grayscale opacity-20'>🍦</div>}
                <button onClick={() => openEdit(c)}
                  className='absolute top-4 right-4 bg-white/90 backdrop-blur text-[#1B4332]
                             text-[9px] font-black px-4 py-2 rounded-xl shadow-sm uppercase tracking-widest'>
                  Modify
                </button>
              </div>
              <div className='p-6'>
                <h3 className='font-black text-slate-800 text-[15px] mb-4'>{c.name}</h3>
                <div className='grid grid-cols-4 gap-2'>
                  {VARIANTS.map((v) => (
                    <div key={v.key} className='text-center bg-[#F2F7F2] rounded-2xl py-2.5 px-1'>
                      <p className='text-[8px] font-black text-emerald-500 uppercase tracking-tighter mb-0.5'>{v.label}</p>
                      <p className='text-[11px] font-black text-[#1B4332]'>₹{c.basePrice[v.key]}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-[#1B4332]/20 backdrop-blur-xl flex items-center justify-center z-50 p-4'>
          <div className='bg-white rounded-[40px] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in duration-300'>
            <div className='bg-[#1B4332] px-8 py-10 text-center relative'>
              <h2 className='text-2xl font-black text-white italic font-serif'>
                {editing ? 'Edit Collection' : 'New Collection'}
              </h2>
              <button onClick={() => setShowModal(false)} className="absolute top-6 right-6 text-white/30 hover:text-white font-black">✕</button>
            </div>
            <form onSubmit={handleSubmit} className='p-8 space-y-6'>
              <div>
                <label className='text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block'>Name</label>
                <input placeholder='e.g. Fruitylicious' value={form.name}
                  onChange={(e) => setForm({...form, name:e.target.value})}
                  className='w-full bg-[#F2F7F2] border-none rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500' required />
              </div>
              <div>
                <label className='text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-1.5 block'>Image Link</label>
                <input placeholder='https://...' value={form.imageUrl}
                  onChange={(e) => setForm({...form, imageUrl:e.target.value})}
                  className='w-full bg-[#F2F7F2] border-none rounded-2xl px-5 py-3.5 text-xs font-bold text-slate-700 focus:ring-2 focus:ring-emerald-500' />
              </div>
              <div>
                <label className='text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 mb-3 block'>Base Pricing (₹)</label>
                <div className='grid grid-cols-2 gap-4'>
                  {VARIANTS.map((v) => (
                    <div key={v.key} className="bg-[#F2F7F2] p-3 rounded-2xl">
                      <label className='text-[9px] font-black text-emerald-600 block mb-1 uppercase'>
                        {v.label} <span className='text-emerald-300'>({v.ml})</span>
                      </label>
                      <input type='number' placeholder='0' value={form.basePrice[v.key]}
                        onChange={(e) => setForm({...form, basePrice:{...form.basePrice, [v.key]:e.target.value}})}
                        className='w-full bg-transparent border-none p-0 text-sm font-black text-slate-700 focus:ring-0' required />
                    </div>
                  ))}
                </div>
              </div>
              <button type='submit'
                className='w-full bg-[#1B4332] text-white font-black py-4.5 rounded-[20px] 
                           transition-all shadow-xl shadow-emerald-900/10 text-[11px] uppercase tracking-[3px] mt-4'>
                Confirm
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}