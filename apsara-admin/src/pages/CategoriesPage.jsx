import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation } from '../slices/categoryApiSlice';
import { useToast } from '../hooks/useToast';
import Spinner from '../components/common/Spinner';

const EMPTY = {
  name:'', imageUrl:'', productType:'icecream', hasShareIt:false,
  basePrice:{ small:'', regular:'', large:'', binge:'', shareIt:'' },
};

const SCOOP_VARIANTS = [
  { key:'small',   label:'Small',      ml:'80ml'  },
  { key:'regular', label:'Regular',    ml:'120ml' },
  { key:'large',   label:'Large',      ml:'160ml' },
  { key:'binge',   label:'Binge Pack', ml:'300ml' },
  { key:'shareIt', label:'Share-It',   ml:'500ml' },
];

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing,   setEditing]   = useState(null);
  const [form,      setForm]      = useState(EMPTY);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  const openEdit = (cat, e) => {
    e.stopPropagation();
    setEditing(cat);
    setForm({
      name       : cat.name,
      imageUrl   : cat.imageUrl || '',
      productType: cat.productType || 'icecream',
      hasShareIt : cat.hasShareIt || false,
      basePrice  : { ...cat.basePrice },
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (form.productType === 'single') {
        payload.basePrice = { small:0, regular:form.basePrice.regular, large:0, binge:0, shareIt:0 };
        payload.hasShareIt = false;
      }
      if (editing) {
        await updateCategory({ id:editing._id, ...payload }).unwrap();
        showSuccess('Category updated');
      } else {
        await createCategory(payload).unwrap();
        showSuccess('Category created');
      }
      setShowModal(false);
    } catch (e) { showError(e?.data?.message || 'Save failed'); }
  };

  const displayVariants = (cat) => {
    if (cat.productType === 'single') return null;
    return SCOOP_VARIANTS.filter(v => v.key !== 'shareIt' || cat.hasShareIt);
  };

  return (
    <div className='px-0 sm:px-0'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-5 sm:mb-6'>
        <div>
          <h1 className='text-xl sm:text-2xl font-extrabold text-gray-800'>Categories</h1>
          <p className='text-sm text-gray-400 mt-0.5'>
            Click a category to manage its products
          </p>
        </div>
        <button onClick={() => { setEditing(null); setForm(EMPTY); setShowModal(true); }}
          className='self-start sm:self-auto bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5
                     rounded-xl shadow-md shadow-[#1B5E4B]/20 transition-all text-sm whitespace-nowrap'>
          + Add Category
        </button>
      </div>

      {isLoading ? <Spinner /> : (
        <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4'>
          {categories.map((cat) => {
            const variants = displayVariants(cat);
            return (
              <div
                key={cat._id}
                onClick={() => navigate(`/products?category=${cat._id}&name=${encodeURIComponent(cat.name)}`)}
                className='bg-white rounded-2xl border border-gray-100 shadow-sm
                           hover:shadow-lg hover:border-[#1B5E4B]/30 transition-all
                           overflow-hidden cursor-pointer group'>

                <div className='h-24 sm:h-28 bg-gradient-to-br from-[#1B5E4B]/5 to-[#F5A623]/10
                                overflow-hidden relative'>
                  {cat.imageUrl
                    ? <img src={cat.imageUrl} className='w-full h-full object-cover
                                                          group-hover:scale-105 transition-transform duration-300' />
                    : <div className='w-full h-full flex items-center justify-center text-4xl sm:text-5xl'>🍦</div>}

                  <div className={`absolute top-2 left-2 text-[10px] font-bold px-2 py-0.5
                                   rounded-full ${cat.productType === 'single'
                                     ? 'bg-purple-100 text-purple-700'
                                     : 'bg-[#1B5E4B]/90 text-white'}`}>
                    {cat.productType === 'single' ? 'Single Unit' : 'Scoops'}
                  </div>

                  <button
                    onClick={(e) => openEdit(cat, e)}
                    className='absolute top-2 right-2 bg-white/90 hover:bg-white text-[#1B5E4B]
                               text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm transition
                               opacity-0 group-hover:opacity-100'>
                    Edit
                  </button>
                </div>

                <div className='p-3 sm:p-4'>
                  <div className='flex items-center justify-between mb-2 sm:mb-3'>
                    <h3 className='font-extrabold text-gray-800 text-sm sm:text-base truncate mr-2'>{cat.name}</h3>
                    <span className='text-xs text-[#1B5E4B] font-semibold flex items-center gap-1 shrink-0'>
                      View →
                    </span>
                  </div>

                  {cat.productType === 'single' ? (
                    <div className='bg-[#F7FBF9] rounded-xl py-2.5 sm:py-3 text-center border border-[#1B5E4B]/10'>
                      <p className='text-[10px] font-bold text-[#1B5E4B]/60 uppercase tracking-wide'>
                        Fixed Price
                      </p>
                      <p className='text-lg sm:text-xl font-extrabold text-[#1B5E4B]'>
                        ₹{cat.basePrice?.regular}
                      </p>
                    </div>
                  ) : (
                    <div className={`grid gap-1 sm:gap-1.5 ${variants?.length > 4 ? 'grid-cols-5' : 'grid-cols-4'}`}>
                      {variants?.map((v) => (
                        <div key={v.key}
                          className='text-center bg-[#F7FBF9] rounded-xl py-1 sm:py-1.5
                                     border border-[#1B5E4B]/10'>
                          <p className='text-[7px] sm:text-[8px] font-bold text-[#1B5E4B]/50 uppercase leading-none mb-0.5'>
                            {v.label}
                          </p>
                          <p className='text-[11px] sm:text-xs font-extrabold text-[#1B5E4B]'>
                            ₹{cat.basePrice?.[v.key] || '-'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center
                        justify-center z-50 p-0 sm:p-4 overflow-y-auto'>
          <div className='bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden
                          max-h-[90vh] overflow-y-auto sm:my-4'>
            <div className='bg-[#1B5E4B] px-5 sm:px-6 py-4 sm:py-5 sticky top-0 z-10'>
              <h2 className='text-base sm:text-lg font-extrabold text-white'>
                {editing ? '✏️ Edit Category' : '🍦 New Category'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className='p-5 sm:p-6 space-y-4 sm:space-y-5'>

              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Category Name
                </label>
                <input placeholder='e.g. Fruitylicious' value={form.name}
                  onChange={(e) => setForm({...form, name:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50 text-sm' required />
              </div>

              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Image URL (Cloudinary)
                </label>
                <input placeholder='https://res.cloudinary.com/...' value={form.imageUrl}
                  onChange={(e) => setForm({...form, imageUrl:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50 text-sm' />
              </div>

              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2'>
                  Product Type
                </label>
                <div className='grid grid-cols-2 gap-2 sm:gap-3'>
                  {[
                    { value:'icecream', label:'🍦 Ice Cream Scoops', desc:'Small / Regular / Large / Binge' },
                    { value:'single',   label:'🍡 Single Unit',       desc:'Fixed price, qty based'         },
                  ].map((t) => (
                    <button key={t.value} type='button'
                      onClick={() => setForm({...form, productType:t.value})}
                      className={`p-2.5 sm:p-3 rounded-xl border-2 text-left transition-all
                        ${form.productType === t.value
                          ? 'border-[#1B5E4B] bg-[#1B5E4B]/5'
                          : 'border-gray-100 hover:border-[#1B5E4B]/30'}`}>
                      <p className='font-bold text-xs sm:text-sm text-gray-700'>{t.label}</p>
                      <p className='text-[9px] sm:text-[10px] text-gray-400 mt-0.5'>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.productType === 'icecream' && (
                <label className='flex items-center gap-3 cursor-pointer'>
                  <div className='relative'>
                    <input type='checkbox' className='sr-only' checked={form.hasShareIt}
                      onChange={(e) => setForm({...form, hasShareIt:e.target.checked})} />
                    <div className={`w-11 h-6 rounded-full transition-colors
                      ${form.hasShareIt ? 'bg-[#1B5E4B]' : 'bg-gray-200'}`}>
                      <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
                        ${form.hasShareIt ? 'left-5' : 'left-0.5'}`} />
                    </div>
                  </div>
                  <div>
                    <p className='text-sm font-semibold text-gray-600'>Has Share-It Pack (500ml)</p>
                    <p className='text-xs text-gray-400'>For normal ice cream only — not Zero Added Sugar</p>
                  </div>
                </label>
              )}

              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-2'>
                  {form.productType === 'single' ? 'Price (₹)' : 'Base Prices (₹)'}
                </label>

                {form.productType === 'single' ? (
                  <input type='number' placeholder='e.g. 55' value={form.basePrice.regular}
                    onChange={(e) => setForm({...form, basePrice:{...form.basePrice, regular:e.target.value}})}
                    className='w-full border border-gray-200 rounded-xl px-4 py-3
                               focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                               focus:border-[#1B5E4B] bg-gray-50 text-sm' required />
                ) : (
                  <div className='grid grid-cols-2 gap-2 sm:gap-3'>
                    {SCOOP_VARIANTS
                      .filter(v => v.key !== 'shareIt' || form.hasShareIt)
                      .map((v) => (
                        <div key={v.key}>
                          <label className='text-xs text-gray-400 block mb-1'>
                            {v.label} <span className='text-gray-300'>({v.ml})</span>
                          </label>
                          <input type='number' placeholder='0' value={form.basePrice[v.key] || ''}
                            onChange={(e) => setForm({...form, basePrice:{...form.basePrice, [v.key]:e.target.value}})}
                            className='w-full border border-gray-200 rounded-xl px-3 py-2.5
                                       focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                                       focus:border-[#1B5E4B] bg-gray-50 text-sm' required />
                        </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='flex gap-3 pb-2'>
                <button type='button' onClick={() => setShowModal(false)}
                  className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold
                             text-gray-500 hover:bg-gray-50 transition text-sm'>
                  Cancel
                </button>
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