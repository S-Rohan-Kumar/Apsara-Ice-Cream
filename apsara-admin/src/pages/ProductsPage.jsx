import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery } from '../slices/categoryApiSlice';
import {
  useGetProductsQuery,
  useToggleStockMutation,
  useDeleteProductMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateVariantAvailabilityMutation,
} from '../slices/productApiSlice';
import { useToast } from '../hooks/useToast';
import { useDispatch } from 'react-redux';
import { showConfirm } from '../slices/uiSlice';
import { registerConfirmHandler } from '../components/common/ConfirmDialog';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const VARIANT_META = {
  small  : { label:'Small',    ml:'80ml'  },
  regular: { label:'Regular',  ml:'120ml' },
  large  : { label:'Large',    ml:'160ml' },
  binge  : { label:'Binge',    ml:'300ml' },
  shareIt: { label:'Share-It', ml:'500ml' },
};

// ─── Variant Availability Modal ──────────────────────────────────────────────
function VariantAvailabilityModal({ product, onClose }) {
  const [updateVariantAvailability, { isLoading }] = useUpdateVariantAvailabilityMutation();
  const { showSuccess, showError } = useToast();

  const cat      = product.category;
  const variants = ['small','regular','large','binge'];
  if (cat?.hasShareIt) variants.push('shareIt');

  const [avail, setAvail] = useState(() => {
    const init = {};
    variants.forEach(v => { init[v] = product.variantAvailability?.[v] ?? true; });
    return init;
  });

  const handleSave = async () => {
    try {
      await updateVariantAvailability({ id: product._id, ...avail }).unwrap();
      showSuccess('Availability updated');
      onClose();
    } catch (e) { showError(e?.data?.message || 'Update failed'); }
  };

  return (
    <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center
                    justify-center z-50 p-0 sm:p-4'>
      <div className='bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm overflow-hidden'>
        <div className='bg-[#1B5E4B] px-5 py-4 flex items-center justify-between'>
          <div>
            <h2 className='text-sm font-extrabold text-white truncate max-w-[200px]'>{product.name}</h2>
            <p className='text-white/60 text-xs mt-0.5'>Set availability per size</p>
          </div>
          <button onClick={onClose} className='text-white/60 hover:text-white text-xl leading-none'>×</button>
        </div>

        <div className='p-4'>
          <div className='flex justify-between text-xs font-bold text-gray-400 uppercase
                          tracking-wider px-3 mb-2'>
            <span>Size</span>
            <span>Available</span>
          </div>
          <div className='space-y-2'>
            {variants.map((v) => {
              const meta = VARIANT_META[v];
              return (
                <div key={v}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl border transition-all
                    ${avail[v] ? 'bg-[#F7FBF9] border-[#1B5E4B]/20' : 'bg-gray-50 border-gray-100'}`}>
                  <div>
                    <p className='font-semibold text-gray-700 text-sm'>{meta.label}</p>
                    <p className='text-xs text-gray-400'>{meta.ml}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => setAvail(prev => ({ ...prev, [v]: !prev[v] }))}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200
                      ${avail[v] ? 'bg-[#1B5E4B]' : 'bg-gray-300'}`}>
                    <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow
                                      transition-all duration-200 flex items-center justify-center
                                      text-[9px] font-extrabold
                      ${avail[v] ? 'left-8 text-[#1B5E4B]' : 'left-1 text-gray-400'}`}>
                      {avail[v] ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {Object.values(avail).every(v => !v) && (
            <div className='mt-3 flex items-center gap-2 bg-red-50 border border-red-100
                            text-red-500 text-xs font-semibold px-3 py-2 rounded-xl'>
              ⚠️ Product will be hidden from customers — all variants off
            </div>
          )}
        </div>

        <div className='flex gap-3 px-4 pb-4 sm:pb-4 pb-safe'>
          <button onClick={onClose}
            className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold
                       text-gray-500 hover:bg-gray-50 transition text-sm'>
            Cancel
          </button>
          <button onClick={handleSave} disabled={isLoading}
            className='flex-1 bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold
                       py-3 rounded-xl transition shadow-md shadow-[#1B5E4B]/20 text-sm disabled:opacity-50'>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main ProductsPage ────────────────────────────────────────────────────────
export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const dispatch       = useDispatch();
  const { showSuccess, showError } = useToast();

  const preselectedCat  = searchParams.get('category') || '';
  const preselectedName = searchParams.get('name') || '';

  const [selectedCat, setSelectedCat] = useState(preselectedCat);
  const [showModal,   setShowModal]   = useState(false);
  const [editingId,   setEditingId]   = useState(null);
  const [form, setForm] = useState({ name:'', category:'', isZeroSugar:false });
  const [imageFile, setImageFile] = useState(null);
  const [preview,   setPreview]   = useState('');

  const [variantModalProduct, setVariantModalProduct] = useState(null);

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: products = [], isLoading } = useGetProductsQuery(
    { categoryId: selectedCat || undefined }
  );
  const [toggleStock]   = useToggleStockMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();

  const closeModal = () => {
    setShowModal(false); setEditingId(null);
    setForm({ name:'', category:'', isZeroSugar:false });
    setImageFile(null); setPreview('');
  };

  const handleDelete = (id) => {
    const key = `del_${id}`;
    registerConfirmHandler(key, async () => {
      try { await deleteProduct(id).unwrap(); showSuccess('Product deleted'); }
      catch { showError('Delete failed'); }
    });
    dispatch(showConfirm({ message:'Delete this product?', confirmKey:key }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('category', form.category || selectedCat);
    fd.append('isZeroSugar', form.isZeroSugar);
    if (imageFile) fd.append('image', imageFile);
    try {
      if (editingId) { await updateProduct({ id:editingId, formData:fd }).unwrap(); showSuccess('Updated'); }
      else           { await createProduct(fd).unwrap(); showSuccess('Created'); }
      closeModal();
    } catch (e) { showError(e?.data?.message || 'Save failed'); }
  };

  const selectedCatObj = categories.find(c => c._id === selectedCat);

  return (
    <div>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 mb-5 sm:mb-6'>
        <button onClick={() => navigate('/categories')}
          className='text-[#1B5E4B] hover:text-[#164e3e] font-semibold text-sm
                     flex items-center gap-1 hover:gap-2 transition-all self-start'>
          ← Categories
        </button>
        <div className='flex-1'>
          <h1 className='text-xl sm:text-2xl font-extrabold text-gray-800'>
            {preselectedName || 'All Products'}
          </h1>
          <p className='text-sm text-gray-400 mt-0.5'>{products.length} products</p>
        </div>
        <button onClick={() => { setShowModal(true); setEditingId(null); }}
          className='self-start sm:self-auto bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold px-4 sm:px-5 py-2 sm:py-2.5
                     rounded-xl shadow-md shadow-[#1B5E4B]/20 transition-all text-sm whitespace-nowrap'>
          + Add Product
        </button>
      </div>

      {/* Category filter tabs */}
      <div className='flex gap-2 mb-4 sm:mb-5 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar'>
        <button onClick={() => { setSelectedCat(''); navigate('/products'); }}
          className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap
                      transition-all shrink-0 border
            ${!selectedCat
              ? 'bg-[#1B5E4B] text-white border-[#1B5E4B] shadow-md'
              : 'bg-white text-gray-500 border-gray-200 hover:border-[#1B5E4B]/30'}`}>
          All
        </button>
        {categories.map((c) => (
          <button key={c._id}
            onClick={() => {
              setSelectedCat(c._id);
              navigate(`/products?category=${c._id}&name=${encodeURIComponent(c.name)}`);
            }}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold whitespace-nowrap
                        transition-all shrink-0 border
              ${selectedCat === c._id
                ? 'bg-[#1B5E4B] text-white border-[#1B5E4B] shadow-md'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[#1B5E4B]/30'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <>
          {/* Desktop table */}
          <div className='hidden sm:block bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[600px]'>
                <thead>
                  <tr className='border-b border-gray-100'>
                    {['Product', 'Category', 'Price', 'Availability', 'Actions'].map(h => (
                      <th key={h} className='text-left px-5 py-3.5 text-xs font-extrabold
                                             text-gray-400 uppercase tracking-wider'>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.length === 0 ? (
                    <tr><td colSpan={5} className='text-center py-16 text-gray-300'>
                      <span className='text-4xl block mb-2'>🍦</span>No products found
                    </td></tr>
                  ) : products.map((p) => {
                    const isIcecreamProduct = p.category?.productType === 'icecream';
                    const allVariantsOff    = isIcecreamProduct &&
                      !Object.values(p.variantAvailability || {}).some(Boolean);

                    return (
                      <tr key={p._id}
                        className={`border-b border-gray-50 hover:bg-[#F7FBF9] transition-colors
                          ${allVariantsOff ? 'opacity-60' : ''}`}>

                        <td className='px-5 py-4'>
                          <div className='flex items-center gap-3'>
                            {p.imageUrl
                              ? <img src={p.imageUrl} className='w-10 h-10 rounded-xl object-cover border border-gray-100' />
                              : <div className='w-10 h-10 rounded-xl bg-[#F7FBF9] border border-[#1B5E4B]/10
                                                flex items-center justify-center text-xl'>🍦</div>}
                            <div>
                              <p className='font-semibold text-gray-800 text-sm'>{p.name}</p>
                              {p.isZeroSugar && (
                                <span className='text-[10px] bg-green-100 text-green-700 px-2 py-0.5
                                                 rounded-full font-semibold'>Zero Sugar</span>
                              )}
                              {allVariantsOff && (
                                <span className='text-[10px] bg-red-100 text-red-600 px-2 py-0.5
                                                 rounded-full font-semibold ml-1'>Out of Stock</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className='px-5 py-4'>
                          <span className='text-xs bg-[#F7FBF9] text-[#1B5E4B] font-semibold
                                           px-2.5 py-1 rounded-lg border border-[#1B5E4B]/15'>
                            {p.category?.name}
                          </span>
                        </td>

                        <td className='px-5 py-4 font-bold text-gray-700 text-sm'>
                          {isIcecreamProduct
                            ? `₹${p.resolvedPrices?.small || 0} – ₹${p.resolvedPrices?.shareIt || p.resolvedPrices?.binge || 0}`
                            : currency(p.resolvedPrices?.regular || 0)}
                        </td>

                        <td className='px-5 py-4'>
                          {isIcecreamProduct ? (
                            <button
                              onClick={() => setVariantModalProduct(p)}
                              className='flex items-center gap-1.5 bg-[#1B5E4B]/10 hover:bg-[#1B5E4B]/20
                                         text-[#1B5E4B] font-bold text-xs px-3 py-2 rounded-xl
                                         transition border border-[#1B5E4B]/20'>
                              <div className='flex gap-0.5'>
                                {['small','regular','large','binge',
                                  ...(p.category?.hasShareIt ? ['shareIt'] : [])
                                ].map(v => (
                                  <div key={v}
                                    className={`w-2 h-2 rounded-full
                                      ${p.variantAvailability?.[v] !== false ? 'bg-[#1B5E4B]' : 'bg-gray-300'}`}
                                  />
                                ))}
                              </div>
                              <span>Sizes ▾</span>
                            </button>
                          ) : (
                            <button onClick={() => toggleStock(p._id)}
                              className={`relative w-11 h-6 rounded-full transition-colors duration-300
                                ${p.isAvailable ? 'bg-[#1B5E4B]' : 'bg-gray-200'}`}>
                              <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm
                                                transition-all duration-300
                                ${p.isAvailable ? 'left-5' : 'left-0.5'}`} />
                            </button>
                          )}
                        </td>

                        <td className='px-5 py-4'>
                          <div className='flex gap-1.5'>
                            <button onClick={() => {
                              setEditingId(p._id);
                              setForm({ name:p.name, category:p.category?._id||'', isZeroSugar:p.isZeroSugar });
                              setPreview(p.imageUrl||'');
                              setShowModal(true);
                            }} className='text-xs font-semibold text-[#1B5E4B] bg-[#1B5E4B]/10
                                          hover:bg-[#1B5E4B]/20 px-3 py-1.5 rounded-lg transition'>
                              Edit
                            </button>
                            <button onClick={() => handleDelete(p._id)}
                              className='text-xs font-semibold text-red-500 bg-red-50
                                         hover:bg-red-100 px-3 py-1.5 rounded-lg transition'>
                              Delete
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
          <div className='sm:hidden space-y-3'>
            {products.length === 0 ? (
              <div className='text-center py-16 text-gray-300'>
                <span className='text-4xl block mb-2'>🍦</span>
                <p className='text-sm font-bold'>No products found</p>
              </div>
            ) : products.map((p) => {
              const isIcecreamProduct = p.category?.productType === 'icecream';
              const allVariantsOff    = isIcecreamProduct &&
                !Object.values(p.variantAvailability || {}).some(Boolean);

              return (
                <div key={p._id}
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4
                    ${allVariantsOff ? 'opacity-60' : ''}`}>
                  <div className='flex items-start gap-3 mb-3'>
                    {p.imageUrl
                      ? <img src={p.imageUrl} className='w-12 h-12 rounded-xl object-cover border border-gray-100 shrink-0' />
                      : <div className='w-12 h-12 rounded-xl bg-[#F7FBF9] border border-[#1B5E4B]/10
                                        flex items-center justify-center text-2xl shrink-0'>🍦</div>}
                    <div className='flex-1 min-w-0'>
                      <p className='font-semibold text-gray-800 text-sm truncate'>{p.name}</p>
                      <div className='flex flex-wrap gap-1 mt-1'>
                        <span className='text-[10px] bg-[#F7FBF9] text-[#1B5E4B] font-semibold
                                         px-2 py-0.5 rounded-lg border border-[#1B5E4B]/15'>
                          {p.category?.name}
                        </span>
                        {p.isZeroSugar && (
                          <span className='text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold'>Zero Sugar</span>
                        )}
                        {allVariantsOff && (
                          <span className='text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-semibold'>Out of Stock</span>
                        )}
                      </div>
                    </div>
                    <p className='font-bold text-gray-700 text-sm shrink-0'>
                      {isIcecreamProduct
                        ? `₹${p.resolvedPrices?.small || 0}+`
                        : currency(p.resolvedPrices?.regular || 0)}
                    </p>
                  </div>

                  <div className='flex items-center justify-between gap-2'>
                    {isIcecreamProduct ? (
                      <button
                        onClick={() => setVariantModalProduct(p)}
                        className='flex items-center gap-1.5 bg-[#1B5E4B]/10 text-[#1B5E4B] font-bold text-xs px-3 py-2 rounded-xl border border-[#1B5E4B]/20'>
                        <div className='flex gap-0.5'>
                          {['small','regular','large','binge',
                            ...(p.category?.hasShareIt ? ['shareIt'] : [])
                          ].map(v => (
                            <div key={v}
                              className={`w-1.5 h-1.5 rounded-full
                                ${p.variantAvailability?.[v] !== false ? 'bg-[#1B5E4B]' : 'bg-gray-300'}`}
                            />
                          ))}
                        </div>
                        <span>Sizes ▾</span>
                      </button>
                    ) : (
                      <button onClick={() => toggleStock(p._id)}
                        className={`relative w-10 h-5 rounded-full transition-colors duration-300
                          ${p.isAvailable ? 'bg-[#1B5E4B]' : 'bg-gray-200'}`}>
                        <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm
                                          transition-all duration-300
                          ${p.isAvailable ? 'left-5' : 'left-0.5'}`} />
                      </button>
                    )}

                    <div className='flex gap-2 ml-auto'>
                      <button onClick={() => {
                        setEditingId(p._id);
                        setForm({ name:p.name, category:p.category?._id||'', isZeroSugar:p.isZeroSugar });
                        setPreview(p.imageUrl||'');
                        setShowModal(true);
                      }} className='text-xs font-semibold text-[#1B5E4B] bg-[#1B5E4B]/10
                                    hover:bg-[#1B5E4B]/20 px-3 py-2 rounded-lg transition'>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(p._id)}
                        className='text-xs font-semibold text-red-500 bg-red-50
                                   hover:bg-red-100 px-3 py-2 rounded-lg transition'>
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Variant availability popup */}
      {variantModalProduct && (
        <VariantAvailabilityModal
          product={variantModalProduct}
          onClose={() => setVariantModalProduct(null)}
        />
      )}

      {/* Add/Edit product modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-end sm:items-center
                        justify-center z-50 p-0 sm:p-4'>
          <div className='bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto'>
            <div className='bg-[#1B5E4B] px-5 sm:px-6 py-4 sm:py-5 sticky top-0 z-10'>
              <h2 className='text-base sm:text-lg font-extrabold text-white'>
                {editingId ? '✏️ Edit Product' : '🍦 New Product'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className='p-5 sm:p-6 space-y-4'>
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Product Name
                </label>
                <input placeholder='e.g. Belgian Bite' value={form.name}
                  onChange={(e) => setForm({...form, name:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50 text-sm' required />
              </div>

              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Category
                </label>
                <select value={form.category || selectedCat}
                  onChange={(e) => setForm({...form, category:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50 text-sm' required>
                  <option value=''>Select category</option>
                  {categories.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                </select>
              </div>

              <label className='flex items-center gap-3 cursor-pointer select-none'>
                <div className='relative'>
                  <input type='checkbox' className='sr-only' checked={form.isZeroSugar}
                    onChange={(e) => setForm({...form, isZeroSugar:e.target.checked})} />
                  <div className={`w-11 h-6 rounded-full transition-colors
                    ${form.isZeroSugar ? 'bg-[#1B5E4B]' : 'bg-gray-200'}`}>
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all
                      ${form.isZeroSugar ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </div>
                <span className='text-sm font-semibold text-gray-600'>Zero Added Sugar</span>
              </label>

              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Product Image
                </label>
                {preview && <img src={preview} className='w-full h-28 object-cover rounded-xl mb-2 border border-gray-100' />}
                <input type='file' accept='image/*'
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) { setImageFile(f); setPreview(URL.createObjectURL(f)); }
                  }}
                  className='w-full text-sm text-gray-400
                             file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0
                             file:text-sm file:font-semibold file:bg-[#1B5E4B]/10
                             file:text-[#1B5E4B] hover:file:bg-[#1B5E4B]/20' />
              </div>

              <div className='flex gap-3 pt-1 pb-2'>
                <button type='button' onClick={closeModal}
                  className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold
                             text-gray-500 hover:bg-gray-50 transition text-sm'>Cancel</button>
                <button type='submit'
                  className='flex-1 bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold
                             py-3 rounded-xl transition shadow-md shadow-[#1B5E4B]/20 text-sm'>
                  Save Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}