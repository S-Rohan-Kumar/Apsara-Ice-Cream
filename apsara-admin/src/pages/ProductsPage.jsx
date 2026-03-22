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

  const handleDelete = (id) => {
    const key = `del_${id}`;
    registerConfirmHandler(key, async () => {
      try { await deleteProduct(id).unwrap(); showSuccess('Product deleted'); }
      catch { showError('Delete failed'); }
    });
    dispatch(showConfirm({ message:'Delete this product? This action cannot be undone.', confirmKey:key }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('category', form.category);
    fd.append('isZeroSugar', form.isZeroSugar);
    if (imageFile) fd.append('image', imageFile);
    try {
      if (editingId) { await updateProduct({ id:editingId, formData:fd }).unwrap(); showSuccess('Updated'); }
      else           { await createProduct(fd).unwrap(); showSuccess('Product created'); }
      closeModal();
    } catch (e) { showError(e?.data?.message || 'Save failed'); }
  };

  return (
    <div>
      {/* Header */}
      <div className='flex items-center justify-between mb-6'>
        <div>
          <h1 className='text-2xl font-extrabold text-gray-800'>Products</h1>
          <p className='text-sm text-gray-400 mt-0.5'>{products.length} items in catalog</p>
        </div>
        <button onClick={() => setShowModal(true)}
          className='bg-[#1B5E4B] hover:bg-[#164e3e] text-white font-bold px-5 py-2.5
                     rounded-xl shadow-md shadow-[#1B5E4B]/20 transition-all text-sm'>
          + Add Product
        </button>
      </div>

      {/* Category tabs */}
      <div className='flex gap-2 mb-5 overflow-x-auto pb-1'>
        {[{ _id:'', name:'All' }, ...categories].map((c) => (
          <button key={c._id} onClick={() => setSelectedCat(c._id)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap
                        transition-all shrink-0 border
              ${selectedCat === c._id
                ? 'bg-[#1B5E4B] text-white border-[#1B5E4B] shadow-md shadow-[#1B5E4B]/20'
                : 'bg-white text-gray-500 border-gray-200 hover:border-[#1B5E4B]/30'}`}>
            {c.name}
          </button>
        ))}
      </div>

      {isLoading ? <Spinner /> : (
        <div className='bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden'>
          <table className='w-full'>
            <thead>
              <tr className='border-b border-gray-100'>
                {['Product','Category','Regular Price','Stock','Actions'].map(h => (
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
              ) : products.map((p) => (
                <tr key={p._id} className='border-b border-gray-50 hover:bg-[#F7FBF9] transition-colors'>
                  <td className='px-5 py-4'>
                    <div className='flex items-center gap-3'>
                      {p.imageUrl
                        ? <img src={p.imageUrl} className='w-10 h-10 rounded-xl object-cover
                                                            border border-gray-100' />
                        : <div className='w-10 h-10 rounded-xl bg-[#F7FBF9] border border-[#1B5E4B]/10
                                          flex items-center justify-center text-xl'>🍦</div>}
                      <div>
                        <p className='font-semibold text-gray-800 text-sm'>{p.name}</p>
                        {p.isZeroSugar && (
                          <span className='text-[10px] bg-green-100 text-green-700 px-2 py-0.5
                                           rounded-full font-semibold'>Zero Sugar</span>
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
                    {currency(p.resolvedPrices?.regular || 0)}
                  </td>
                  <td className='px-5 py-4'>
                    <button onClick={() => toggleStock(p._id)}
                      className={`relative w-11 h-6 rounded-full transition-colors duration-300
                        ${p.isAvailable ? 'bg-[#1B5E4B]' : 'bg-gray-200'}`}>
                      <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow-sm
                                        transition-all duration-300
                        ${p.isAvailable ? 'left-5' : 'left-0.5'}`} />
                    </button>
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
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className='fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center
                        justify-center z-50 p-4'>
          <div className='bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden'>
            <div className='bg-[#1B5E4B] px-6 py-5'>
              <h2 className='text-lg font-extrabold text-white'>
                {editingId ? '✏️ Edit Product' : '🍦 New Product'}
              </h2>
            </div>
            <form onSubmit={handleSubmit} className='p-6 space-y-4'>
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Product Name
                </label>
                <input placeholder='e.g. Belgian Bite' value={form.name}
                  onChange={(e) => setForm({...form, name:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50' required />
              </div>
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Category
                </label>
                <select value={form.category} onChange={(e) => setForm({...form, category:e.target.value})}
                  className='w-full border border-gray-200 rounded-xl px-4 py-3
                             focus:outline-none focus:ring-2 focus:ring-[#1B5E4B]/25
                             focus:border-[#1B5E4B] bg-gray-50' required>
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
                    <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full
                                     shadow transition-all
                      ${form.isZeroSugar ? 'left-5' : 'left-0.5'}`} />
                  </div>
                </div>
                <span className='text-sm font-semibold text-gray-600'>Zero Added Sugar</span>
              </label>
              <div>
                <label className='text-xs font-bold text-gray-500 uppercase tracking-wide block mb-1.5'>
                  Product Image
                </label>
                {preview && (
                  <img src={preview} className='w-full h-28 object-cover rounded-xl mb-2
                                                border border-gray-100' />
                )}
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
              <div className='flex gap-3 pt-1'>
                <button type='button' onClick={closeModal}
                  className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold
                             text-gray-500 hover:bg-gray-50 transition text-sm'>
                  Cancel
                </button>
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