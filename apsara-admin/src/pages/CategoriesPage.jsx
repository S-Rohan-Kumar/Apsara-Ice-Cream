import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery, useCreateCategoryMutation, useUpdateCategoryMutation } from '../slices/categoryApiSlice';
import { useToast } from '../hooks/useToast';
import Spinner from '../components/common/Spinner';

const EMPTY = {
  name: '',
  imageUrl: '',
  productType: 'icecream',
  hasShareIt: false,
  basePrice: { small: '', regular: '', large: '', binge: '', shareIt: '' },
};

const SCOOP_VARIANTS = [
  { key: 'small', label: 'Small', ml: '80ml' },
  { key: 'regular', label: 'Regular', ml: '120ml' },
  { key: 'large', label: 'Large', ml: '160ml' },
  { key: 'binge', label: 'Binge Pack', ml: '300ml' },
  { key: 'shareIt', label: 'Share-It', ml: '500ml' },
];

export default function CategoriesPage() {
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const { showSuccess, showError } = useToast();
  const navigate = useNavigate();

  const { data: categories = [], isLoading } = useGetCategoriesQuery();
  const [createCategory] = useCreateCategoryMutation();
  const [updateCategory] = useUpdateCategoryMutation();

  const openEdit = (cat, e) => {
    e.stopPropagation();
    setEditing(cat);
    setForm({
      name: cat.name,
      imageUrl: cat.imageUrl || '',
      productType: cat.productType || 'icecream',
      hasShareIt: cat.hasShareIt || false,
      basePrice: { ...cat.basePrice },
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...form };
      if (form.productType === 'single') {
        payload.basePrice = { small: 0, regular: Number(form.basePrice.regular) || 0, large: 0, binge: 0, shareIt: 0 };
        payload.hasShareIt = false;
      } else {
        const bp = {};
        SCOOP_VARIANTS.forEach((v) => {
          bp[v.key] = Number(form.basePrice[v.key]) || 0;
        });
        payload.basePrice = bp;
      }
      if (editing) {
        await updateCategory({ id: editing._id, ...payload }).unwrap();
        showSuccess('Category updated successfully');
      } else {
        await createCategory(payload).unwrap();
        showSuccess('New category created');
      }
      setShowModal(false);
    } catch (e) {
      showError(e?.data?.message || 'Save failed');
    }
  };

  const displayVariants = (cat) => {
    if (cat.productType === 'single') return null;
    return SCOOP_VARIANTS.filter((v) => v.key !== 'shareIt' || cat.hasShareIt);
  };

  return (
    <div className='max-w-7xl mx-auto pb-24 space-y-6'>
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2.5'>
            <h1 className='text-2xl sm:text-3xl font-black text-slate-800 tracking-tight'>
              Menu Categories
            </h1>
            <span className='bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase px-2.5 py-1 rounded-full'>
              {categories.length} Collections
            </span>
          </div>
          <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mt-1'>
            Manage Store Menu Structure & Base Pricing Matrices
          </p>
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setForm(EMPTY);
            setShowModal(true);
          }}
          className='bg-[#1B4332] hover:bg-[#163829] active:scale-[0.98] text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition-all text-xs uppercase tracking-wider flex items-center gap-2 self-start sm:self-auto'
        >
          <span>＋</span>
          <span>Add New Category</span>
        </button>
      </div>

      {isLoading ? (
        <div className='flex flex-col items-center justify-center py-24'>
          <Spinner />
        </div>
      ) : categories.length === 0 ? (
        <div className='bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-xs'>
          <h3 className='text-base font-black text-slate-800 uppercase tracking-wider'>No Categories Configured</h3>
          <p className='text-xs text-gray-400 mt-1 max-w-sm mx-auto'>
            Create your first category like Natural Scoops, Kulfis, or Zero Sugar to start organizing flavors.
          </p>
        </div>
      ) : (
        <div className='grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5'>
          {categories.map((cat) => {
            const variants = displayVariants(cat);
            return (
              <div
                key={cat._id}
                onClick={() => navigate(`/products?category=${cat._id}&name=${encodeURIComponent(cat.name)}`)}
                className='bg-white rounded-2xl border border-gray-200 shadow-xs hover:shadow-md hover:border-emerald-300 transition-all duration-200 overflow-hidden cursor-pointer group flex flex-col'
              >
                <div className='h-32 bg-gray-100 overflow-hidden relative'>
                  {cat.imageUrl ? (
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className='w-full h-full object-cover group-hover:scale-105 transition-transform duration-300'
                    />
                  ) : (
                    <div className='w-full h-full flex items-center justify-center bg-gray-50 text-gray-400 text-xs font-bold uppercase tracking-wider'>
                      Apsara Collection
                    </div>
                  )}

                  <div className='absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent' />

                  <div className='absolute top-3 left-3'>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-1 rounded-full border shadow-xs ${
                      cat.productType === 'single'
                        ? 'bg-purple-600 text-white border-purple-500'
                        : 'bg-emerald-600 text-white border-emerald-500'
                    }`}>
                      {cat.productType === 'single' ? 'Single Fixed Unit' : 'Scoop Sizing'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => openEdit(cat, e)}
                    className='absolute top-3 right-3 bg-white/90 hover:bg-white text-slate-800 text-[11px] font-black uppercase px-3 py-1 rounded-xl shadow-xs transition-all'
                  >
                    Edit
                  </button>

                  <div className='absolute bottom-3 left-3 right-3 flex items-end justify-between text-white'>
                    <h3 className='font-bold text-base tracking-tight truncate drop-shadow-sm'>
                      {cat.name}
                    </h3>
                    <span className='text-[10px] font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1 shrink-0'>
                      Flavors →
                    </span>
                  </div>
                </div>

                <div className='p-4 sm:p-5 flex-1 flex flex-col justify-between bg-white'>
                  {cat.productType === 'single' ? (
                    <div className='bg-[#F7FBF9] rounded-xl p-3 text-center border border-emerald-100'>
                      <p className='text-[9px] font-bold text-emerald-700 uppercase tracking-widest'>
                        Fixed Unit Price
                      </p>
                      <p className='text-2xl font-black text-[#1B4332] mt-0.5'>
                        ₹{cat.basePrice?.regular || 0}
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className='text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2'>
                        Base Size Pricing
                      </p>
                      <div className='grid grid-cols-4 gap-1.5'>
                        {variants?.map((v) => (
                          <div
                            key={v.key}
                            className='text-center bg-gray-50 rounded-xl p-1.5 border border-gray-100'
                          >
                            <p className='text-[8px] font-bold text-gray-400 uppercase leading-none mb-1'>
                              {v.label}
                            </p>
                            <p className='text-xs font-bold text-slate-800'>
                              ₹{cat.basePrice?.[v.key] ?? '-'}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <div className='fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
          <div className='bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg overflow-hidden max-h-[92vh] flex flex-col animate-in slide-in-from-bottom duration-200'>
            <div className='bg-[#1B4332] px-6 py-5 flex items-center justify-between text-white shrink-0'>
              <h2 className='text-base font-bold uppercase tracking-wider'>
                {editing ? 'Edit Category' : 'Create Category'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className='text-white/60 hover:text-white transition-colors p-1'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className='p-6 space-y-4 overflow-y-auto no-scrollbar'>
              <div>
                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5'>
                  Category Name
                </label>
                <input
                  type='text'
                  placeholder='e.g. Fruitylicious'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 bg-gray-50 focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all'
                  required
                />
              </div>

              <div>
                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-1.5'>
                  Image URL
                </label>
                <input
                  type='url'
                  placeholder='https://res.cloudinary.com/...'
                  value={form.imageUrl}
                  onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
                  className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 bg-gray-50 focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332] transition-all'
                />
              </div>

              <div>
                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2'>
                  Category Type
                </label>
                <div className='grid grid-cols-2 gap-3'>
                  {[
                    { value: 'icecream', label: 'Scoop Sizing', desc: 'Small / Regular / Large / Binge' },
                    { value: 'single', label: 'Single Fixed Unit', desc: 'Flat fixed pricing' },
                  ].map((t) => (
                    <button
                      key={t.value}
                      type='button'
                      onClick={() => setForm({ ...form, productType: t.value })}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        form.productType === t.value
                          ? 'border-[#1B4332] bg-emerald-50/50'
                          : 'border-gray-100 hover:border-gray-200'
                      }`}
                    >
                      <p className='font-bold text-xs text-slate-800'>{t.label}</p>
                      <p className='text-[10px] font-medium text-gray-400 mt-0.5'>{t.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {form.productType === 'icecream' && (
                <div className='bg-gray-50 p-3.5 rounded-xl border border-gray-100 flex items-center justify-between'>
                  <div>
                    <p className='text-xs font-bold text-slate-800'>Enable Share-It Pack (500ml)</p>
                    <p className='text-[10px] font-medium text-gray-400'>Adds the 5th large sharing container</p>
                  </div>
                  <input
                    type='checkbox'
                    checked={form.hasShareIt}
                    onChange={(e) => setForm({ ...form, hasShareIt: e.target.checked })}
                    className='w-5 h-5 text-[#1B4332] rounded focus:ring-[#1B4332]'
                  />
                </div>
              )}

              <div>
                <label className='text-[10px] font-bold text-gray-500 uppercase tracking-wider block mb-2'>
                  {form.productType === 'single' ? 'Unit Price (₹)' : 'Base Sizes Pricing (₹)'}
                </label>

                {form.productType === 'single' ? (
                  <input
                    type='number'
                    placeholder='e.g. 60'
                    value={form.basePrice.regular}
                    onChange={(e) => setForm({ ...form, basePrice: { ...form.basePrice, regular: e.target.value } })}
                    className='w-full border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 bg-gray-50'
                    required
                  />
                ) : (
                  <div className='grid grid-cols-2 gap-2.5'>
                    {SCOOP_VARIANTS.filter((v) => v.key !== 'shareIt' || form.hasShareIt).map((v) => (
                      <div key={v.key}>
                        <label className='text-[10px] font-semibold text-gray-500 block mb-1'>
                          {v.label} ({v.ml})
                        </label>
                        <input
                          type='number'
                          placeholder='0'
                          value={form.basePrice[v.key] ?? ''}
                          onChange={(e) => setForm({ ...form, basePrice: { ...form.basePrice, [v.key]: e.target.value } })}
                          className='w-full border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 bg-gray-50'
                          required
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className='flex gap-3 pt-4'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='flex-1 border border-gray-200 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider text-gray-500 hover:bg-gray-50 transition-colors'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='flex-1 bg-[#1B4332] hover:bg-[#163829] text-white py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition-all'
                >
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}