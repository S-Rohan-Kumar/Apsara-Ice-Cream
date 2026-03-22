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
      if (editing) { await updateCategory({ id:editing._id, ...form }).unwrap(); showSuccess('Category updated'); }
      else         { await createCategory(form).unwrap(); showSuccess('Category created'); }
      setShowModal(false);
    } catch (e) { showError(e?.data?.message || 'Save failed'); }
  };

  return (
    <div>
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-extrabold text-gray-800'>Categories</h1>
          <p className='text-sm text-gray-400 mt-0.5'>{categories.length} categories</p>
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}
          className='bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold px-5 py-2.5
                     rounded-xl shadow-md shadow-[#1B5E4B]/20 transition-all text-sm'>
          + Add Category
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className='grid sm:grid-cols-2 xl:grid-cols-3 gap-4'>
          {categories.map((c) => (
            <div key={c._id}
              className='bg-white rounded-2xl border border-gray-100 shadow-sm
                         hover:shadow-md hover:border-[#1B5E4B]/20 transition-all overflow-hidden'>
              {/* image / placeholder */}
              <div className='h-28 bg-gradient-to-br from-[#1B5E4B]/5 to-[#F5A623]/10
                              flex items-center justify-center overflow-hidden relative'>
                {c.imageUrl
                  ? <img src={c.imageUrl} className='w-full h-full object-cover' />
                  : <span className='text-5xl'>🍦</span>}
                <button onClick={() => openEdit(c)}
                  className='absolute top-2 right-2 bg-white/90 hover:bg-white text-[#1B5E4B]
                             text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm transition'>
                  Edit
                </button>
              </div>
              <div className='p-4'>
                <h3 className='font-extrabold text-gray-800 mb-3'>{c.name}</h3>
                <div className='grid grid-cols-4 gap-1.5'>
                  {VARIANTS.map((v) => (
                    <div key={v.key} className='text-center bg-[#F7FBF9] rounded-xl py-2
                                                border border-[#1B5E4B]/10'>
                      <p className='text-[9px] font-bold text-[#1B5E4B]/60 uppercase'>{v.label}</p>
                      <p className='text-sm font-extrabold text-[#1B5E4B]'>₹{c.basePrice[v.key]}</p>
                      <p className='text-[9px] text-gray-300'>{v.ml}</p>
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
        <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center
                        justify-center z-50 p-4'>
          <div className='bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden'>
            <div className='bg-[#1B5E4B] px-6 py-5'>
              <h2 className='text-lg font-extrabold text-white'>
                {editing ? '✏️ Edit Category' : '🍦 New Category'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className='p-6 space-y-4'>
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Name
                </label>
                <input placeholder='e.g. Fruitylicious' value={form.name}
                  onChange={(e) => setForm({...form, name:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50' required />
              </div>
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Image URL (Cloudinary)
                </label>
                <input placeholder='https://res.cloudinary.com/...' value={form.imageUrl}
                  onChange={(e) => setForm({...form, imageUrl:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50' />
              </div>
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2'>
                  Base Prices (₹)
                </label>
                <div className='grid grid-cols-2 gap-3'>
                  {VARIANTS.map((v) => (
                    <div key={v.key}>
                      <label className='text-xs text-gray-400 block mb-1'>
                        {v.label} <span className='text-gray-300'>({v.ml})</span>
                      </label>
                      <input type='number' placeholder='0' value={form.basePrice[v.key]}
                        onChange={(e) => setForm({...form, basePrice:{...form.basePrice, [v.key]:e.target.value}})}
                        className='w-full border border-gray-200 rounded-xl px-3 py-2.5
                                   focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                                   focus:border-[#1B5E4B] bg-gray-50' required />
                    </div>
                  ))}
                </div>
              </div>
              <div className='flex gap-3 pt-1'>
                <button type='button' onClick={() => setShowModal(false)}
                  className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold
                             text-gray-500 hover:bg-gray-50 transition text-sm'>Cancel</button>
                <button type='submit'
                  className='flex-1 bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold
                             py-3 rounded-xl transition shadow-md shadow-[#1B5E4B]/20 text-sm'>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}