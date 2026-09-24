import { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useGetCategoriesQuery } from '../slices/categoryApiSlice';
import {
  useGetProductsQuery,
  useToggleStockMutation,
  useDeleteProductMutation,
  useCreateProductMutation,
  useUpdateProductMutation,
  useUpdateVariantAvailabilityMutation,
  useSnoozeProductMutation,
} from '../slices/productApiSlice';
import { useToast } from '../hooks/useToast';
import { useDispatch } from 'react-redux';
import { showConfirm } from '../slices/uiSlice';
import { registerConfirmHandler } from '../components/common/ConfirmDialog';
import Spinner from '../components/common/Spinner';

const currency = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const VARIANT_META = {
  small: { label: 'Small', ml: '80ml' },
  regular: { label: 'Regular', ml: '120ml' },
  large: { label: 'Large', ml: '160ml' },
  binge: { label: 'Binge', ml: '300ml' },
  shareIt: { label: 'Share-It', ml: '500ml' },
};

const formatSnooze = (iso) => {
  if (!iso) return null;
  const target = new Date(iso);
  const diffMs = target - new Date();
  if (diffMs <= 0) return null;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  if (hours > 24) {
    return `till ${target.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
  }
  const mins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
};

function VariantAvailabilityModal({ product, onClose, onSnooze }) {
  const [updateVariantAvailability, { isLoading }] = useUpdateVariantAvailabilityMutation();
  const [snoozeProduct] = useSnoozeProductMutation();
  const { showSuccess, showError } = useToast();

  const cat = product.category;
  const variants = ['small', 'regular', 'large', 'binge'];
  if (cat?.hasShareIt) variants.push('shareIt');

  const [avail, setAvail] = useState(() => {
    const init = {};
    variants.forEach((v) => {
      const isSnoozed = product.variantSnoozedUntil?.[v] && new Date(product.variantSnoozedUntil[v]) > new Date();
      init[v] = isSnoozed ? false : (product.variantAvailability?.[v] ?? true);
    });
    return init;
  });

  const handleToggleVariant = (v) => {
    if (avail[v]) {
      onSnooze?.(product, v);
    } else {
      snoozeProduct({ id: product._id, variant: v, hours: 0 })
        .unwrap()
        .then(() => {
          setAvail((prev) => ({ ...prev, [v]: true }));
          showSuccess(`${VARIANT_META[v]?.label || v} turned back on`);
        })
        .catch((e) => showError(e?.data?.message || 'Failed to update'));
    }
  };

  const handleSave = async () => {
    try {
      await updateVariantAvailability({ id: product._id, ...avail }).unwrap();
      showSuccess('Availability updated');
      onClose();
    } catch (e) {
      showError(e?.data?.message || 'Update failed');
    }
  };

  return (
    <div className='fixed inset-0 bg-[#1B4332]/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
      <div className='bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full sm:max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
        <div className='bg-[#1B4332] px-5 py-4 flex items-center justify-between'>
          <div>
            <h2 className='text-sm font-extrabold text-white truncate max-w-[200px]'>{product.name}</h2>
            <p className='text-white/60 text-xs mt-0.5'>Set availability per size</p>
          </div>
          <button onClick={onClose} className='text-white/60 hover:text-white text-xl leading-none'>×</button>
        </div>

        <div className='p-4'>
          <div className='flex justify-between text-xs font-bold text-gray-400 uppercase tracking-wider px-3 mb-2'>
            <span>Size</span>
            <span>Available</span>
          </div>
          <div className='space-y-2'>
            {variants.map((v) => {
              const meta = VARIANT_META[v];
              const isSnoozed = product.variantSnoozedUntil?.[v] && new Date(product.variantSnoozedUntil[v]) > new Date();
              return (
                <div
                  key={v}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl border transition-all ${
                    avail[v] ? 'bg-[#F2F7F2] border-emerald-200' : 'bg-gray-50 border-gray-100'
                  }`}
                >
                  <div>
                    <div className='flex items-center gap-1.5'>
                      <p className='font-bold text-gray-800 text-sm'>{meta.label}</p>
                      {isSnoozed && (
                        <span className='text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded-full font-bold'>
                          Snoozed ({formatSnooze(product.variantSnoozedUntil[v])})
                        </span>
                      )}
                    </div>
                    <p className='text-xs text-gray-400 font-medium'>{meta.ml}</p>
                  </div>
                  <button
                    type='button'
                    onClick={() => handleToggleVariant(v)}
                    className={`relative w-14 h-7 rounded-full transition-colors duration-200 ${
                      avail[v] ? 'bg-[#1B4332]' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-all duration-200 flex items-center justify-center text-[9px] font-extrabold ${
                        avail[v] ? 'left-8 text-[#1B4332]' : 'left-1 text-gray-400'
                      }`}
                    >
                      {avail[v] ? 'ON' : 'OFF'}
                    </span>
                  </button>
                </div>
              );
            })}
          </div>

          {Object.values(avail).every((v) => !v) && (
            <div className='mt-3 flex items-center gap-2 bg-rose-50 border border-rose-100 text-rose-600 text-xs font-semibold px-3 py-2 rounded-xl'>
              Product will be hidden from customers — all variants off
            </div>
          )}

          <div className='mt-4 pt-3 border-t border-gray-100'>
            <button
              type='button'
              onClick={() => onSnooze?.(product, null)}
              className='w-full py-2.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs transition'
            >
              Timed Off / Snooze Flavour
            </button>
          </div>
        </div>

        <div className='flex gap-3 px-4 pb-4 sm:pb-4 pb-safe'>
          <button
            onClick={onClose}
            className='flex-1 border border-gray-200 py-3 rounded-xl font-semibold text-gray-500 hover:bg-gray-50 transition text-sm'
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className='flex-1 bg-[#1B4332] hover:bg-[#163829] text-white font-bold py-3 rounded-xl transition shadow-md shadow-emerald-900/15 text-sm disabled:opacity-50'
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SnoozeModal({ product, variant, onClose }) {
  const [snoozeProduct, { isLoading }] = useSnoozeProductMutation();
  const { showSuccess, showError } = useToast();
  const [dateMode, setDateMode] = useState(false);
  const [startsAt, setStartsAt] = useState(() => new Date().toISOString().slice(0, 16));
  const [expiresAt, setExpiresAt] = useState('');

  const handleSnooze = async (hours) => {
    try {
      await snoozeProduct({ id: product._id, hours, variant }).unwrap();
      const targetName = variant ? `${VARIANT_META[variant]?.label || variant}` : 'Product';
      if (hours > 0) {
        showSuccess(`${targetName} turned off for ${hours} hours`);
      } else if (hours === -1) {
        showSuccess(`${targetName} turned off until you mark it on`);
      } else {
        showSuccess(`${targetName} turned back on`);
      }
      onClose();
    } catch (e) {
      showError(e?.data?.message || 'Failed to update stock');
    }
  };

  const handleDateSnooze = async (e) => {
    e.preventDefault();
    if (!expiresAt) {
      showError('Please pick an end date/time');
      return;
    }
    if (new Date(expiresAt) <= new Date(startsAt)) {
      showError('End date must be after start date');
      return;
    }
    try {
      await snoozeProduct({
        id: product._id,
        variant,
        startsAt,
        expiresAt,
      }).unwrap();
      const targetName = variant ? `${VARIANT_META[variant]?.label || variant}` : 'Product';
      showSuccess(`${targetName} snoozed until ${new Date(expiresAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`);
      onClose();
    } catch (e) {
      showError(e?.data?.message || 'Failed to set date snooze');
    }
  };

  const isVariantOff = variant && (
    product.variantAvailability?.[variant] === false ||
    (product.variantSnoozedUntil?.[variant] && new Date(product.variantSnoozedUntil[variant]) > new Date())
  );
  const isProductOff = !product.isAvailable || (product.snoozedUntil && new Date(product.snoozedUntil) > new Date());
  const isOff = variant ? isVariantOff : isProductOff;

  const titleLabel = variant ? `${product.name} (${VARIANT_META[variant]?.label || variant})` : product.name;

  return (
    <div className='fixed inset-0 bg-[#1B4332]/30 backdrop-blur-sm flex items-center justify-center z-50 p-4'>
      <div className='bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200'>
        <div className='bg-[#1B4332] px-5 py-4 flex items-center justify-between'>
          <div>
            <h2 className='text-sm font-extrabold text-white truncate max-w-[240px]'>{titleLabel}</h2>
            <p className='text-white/60 text-xs mt-0.5'>Stock Timer</p>
          </div>
          <button onClick={onClose} className='text-white/60 hover:text-white text-xl leading-none'>×</button>
        </div>

        <div className='p-4 space-y-3'>
          <div className='flex gap-1 p-1 bg-[#F2F7F2] rounded-xl'>
            <button
              type='button'
              onClick={() => setDateMode(false)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                !dateMode ? 'bg-[#1B4332] text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Quick Hours
            </button>
            <button
              type='button'
              onClick={() => setDateMode(true)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition ${
                dateMode ? 'bg-[#1B4332] text-white shadow-sm' : 'text-gray-500'
              }`}
            >
              Date to Date
            </button>
          </div>

          {!dateMode ? (
            <>
              <p className='text-xs font-bold text-gray-400 uppercase tracking-wider px-1'>
                {variant ? `Turn off ${VARIANT_META[variant]?.label || ''} for:` : 'Turn off for:'}
              </p>

              <div className='grid grid-cols-2 gap-2'>
                {[
                  { label: '2 Hours', hours: 2 },
                  { label: '5 Hours', hours: 5 },
                  { label: '10 Hours', hours: 10 },
                  { label: '24 Hours', hours: 24 },
                ].map(({ label, hours }) => (
                  <button
                    key={hours}
                    disabled={isLoading}
                    onClick={() => handleSnooze(hours)}
                    className='py-2.5 px-3 rounded-xl border border-gray-200 hover:border-[#1B4332] hover:bg-[#F2F7F2] text-gray-700 hover:text-[#1B4332] font-bold text-xs transition active:scale-95 disabled:opacity-50'
                  >
                    {label}
                  </button>
                ))}
              </div>

              <button
                disabled={isLoading}
                onClick={() => handleSnooze(-1)}
                className='w-full py-2.5 px-3 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs transition active:scale-95 disabled:opacity-50'
              >
                Until I mark it on
              </button>
            </>
          ) : (
            <form onSubmit={handleDateSnooze} className='space-y-3 pt-1'>
              <div className='space-y-1'>
                <label className='text-[10px] font-black text-gray-400 uppercase tracking-wider'>Starts At</label>
                <input
                  type='datetime-local'
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className='w-full bg-[#F2F7F2] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B4332]'
                  required
                />
              </div>
              <div className='space-y-1'>
                <label className='text-[10px] font-black text-gray-400 uppercase tracking-wider'>Expires At (Turn On)</label>
                <input
                  type='datetime-local'
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className='w-full bg-[#F2F7F2] border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#1B4332]'
                  required
                />
              </div>
              <button
                type='submit'
                disabled={isLoading}
                className='w-full py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#163829] text-white font-bold text-xs shadow-md shadow-emerald-900/15 transition active:scale-95 disabled:opacity-50'
              >
                {isLoading ? 'Saving...' : 'Apply Date Snooze'}
              </button>
            </form>
          )}

          {isOff && (
            <button
              disabled={isLoading}
              onClick={() => handleSnooze(0)}
              className='w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition active:scale-95 disabled:opacity-50'
            >
              Turn On Now
            </button>
          )}

          <button
            onClick={onClose}
            className='w-full py-1.5 text-center text-xs text-gray-400 hover:text-gray-600 font-semibold'
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { showSuccess, showError } = useToast();

  const preselectedCat = searchParams.get('category') || '';
  const preselectedName = searchParams.get('name') || '';

  const [selectedCat, setSelectedCat] = useState(preselectedCat);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: '', category: '', isZeroSugar: false });
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');

  const [variantModalProduct, setVariantModalProduct] = useState(null);
  const [snoozeModalData, setSnoozeModalData] = useState(null);

  const { data: categories = [] } = useGetCategoriesQuery();
  const { data: products = [], isLoading } = useGetProductsQuery(
    { categoryId: selectedCat || undefined }
  );
  const [toggleStock] = useToggleStockMutation();
  const [deleteProduct] = useDeleteProductMutation();
  const [createProduct] = useCreateProductMutation();
  const [updateProduct] = useUpdateProductMutation();
  const [snoozeProduct] = useSnoozeProductMutation();

  const handleToggleClick = async (p) => {
    if (p.isAvailable) {
      setSnoozeModalData({ product: p, variant: null });
    } else {
      try {
        await snoozeProduct({ id: p._id, hours: 0 }).unwrap();
        showSuccess('Product turned back on');
      } catch (e) {
        showError(e?.data?.message || 'Failed to update stock');
      }
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm({ name: '', category: '', isZeroSugar: false });
    setImageFile(null);
    setPreview('');
  };

  const handleDelete = (id) => {
    const key = `del_${id}`;
    registerConfirmHandler(key, async () => {
      try {
        await deleteProduct(id).unwrap();
        showSuccess('Product deleted');
      } catch {
        showError('Delete failed');
      }
    });
    dispatch(showConfirm({ message: 'Delete this product?', confirmKey: key }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData();
    fd.append('name', form.name);
    fd.append('category', form.category || selectedCat);
    fd.append('isZeroSugar', form.isZeroSugar);
    if (imageFile) fd.append('image', imageFile);
    try {
      if (editingId) {
        await updateProduct({ id: editingId, formData: fd }).unwrap();
        showSuccess('Updated successfully');
      } else {
        await createProduct(fd).unwrap();
        showSuccess('Product created successfully');
      }
      closeModal();
    } catch (e) {
      showError(e?.data?.message || 'Save failed');
    }
  };

  const filteredProducts = useMemo(() => {
    if (!searchTerm.trim()) return products;
    const q = searchTerm.toLowerCase();
    return products.filter((p) => (p.name || '').toLowerCase().includes(q));
  }, [products, searchTerm]);

  return (
    <div className='max-w-7xl mx-auto pb-24 px-4 sm:px-8'>
      <div className='mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <button
              onClick={() => navigate('/categories')}
              className='text-emerald-700 hover:text-emerald-900 font-bold text-xs flex items-center gap-1 transition'
            >
              ← Back to Categories
            </button>
            <span className='text-slate-300'>•</span>
            <span className='px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800'>
              Flavour Registry
            </span>
          </div>
          <h1 className='text-3xl sm:text-4xl font-black text-[#1B4332] tracking-tight'>
            {preselectedName ? `${preselectedName} Flavours` : 'Menu Catalog'}
          </h1>
          <p className='text-xs font-bold text-emerald-900/40 uppercase tracking-[2px] mt-1.5'>
            {filteredProducts.length} items available in active view
          </p>
        </div>

        <button
          onClick={() => {
            setShowModal(true);
            setEditingId(null);
          }}
          className='self-start md:self-auto bg-[#1B4332] hover:bg-[#163829] active:scale-95 text-white font-black px-6 sm:px-8 py-3.5 sm:py-4 rounded-2xl shadow-xl shadow-emerald-900/15 transition-all text-xs uppercase tracking-[2px] flex items-center gap-2'
        >
          <span>＋</span>
          <span>Add New Flavour</span>
        </button>
      </div>

      <div className='bg-white rounded-[28px] border border-green-50 shadow-sm p-4 sm:p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-4'>
        <div className='flex items-center gap-2 overflow-x-auto w-full md:w-auto no-scrollbar pb-1 md:pb-0'>
          <button
            onClick={() => {
              setSelectedCat('');
              navigate('/products');
            }}
            className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap ${
              !selectedCat
                ? 'bg-[#1B4332] text-white shadow-sm'
                : 'bg-[#F2F7F2] text-slate-600 hover:text-slate-900'
            }`}
          >
            All Collections
          </button>
          {categories.map((c) => (
            <button
              key={c._id}
              onClick={() => {
                setSelectedCat(c._id);
                navigate(`/products?category=${c._id}&name=${encodeURIComponent(c.name)}`);
              }}
              className={`px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition whitespace-nowrap ${
                selectedCat === c._id
                  ? 'bg-[#1B4332] text-white shadow-sm'
                  : 'bg-[#F2F7F2] text-slate-600 hover:text-slate-900'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>

        <div className='w-full md:w-72'>
          <input
            type='text'
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder='Quick search flavour name...'
            className='w-full bg-[#F2F7F2] border-none rounded-xl px-4 py-2.5 text-xs font-bold text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-emerald-500'
          />
        </div>
      </div>

      {isLoading ? (
        <div className='py-20 text-center'><Spinner /></div>
      ) : (
        <>
          <div className='hidden sm:block bg-white rounded-[32px] border border-green-50 shadow-sm overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full min-w-[650px] text-left'>
                <thead className='bg-[#F2F7F2]/60'>
                  <tr>
                    {['Product Flavour', 'Category', 'Price Matrix', 'Stock Availability', 'Actions'].map((h) => (
                      <th
                        key={h}
                        className='px-6 py-4 text-[10px] font-black text-emerald-900/50 uppercase tracking-widest'
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className='text-center py-20 text-slate-400 font-bold'>
                        No products found matching criteria
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      const isIcecreamProduct = p.category?.productType === 'icecream';
                      const allVariantsOff = isIcecreamProduct && !Object.values(p.variantAvailability || {}).some(Boolean);

                      return (
                        <tr
                          key={p._id}
                          className={`hover:bg-[#F2F7F2]/40 transition-colors ${allVariantsOff ? 'opacity-60' : ''}`}
                        >
                          <td className='px-6 py-4'>
                            <div className='flex items-center gap-3.5'>
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className='w-12 h-12 rounded-2xl object-cover border border-slate-100 shadow-sm'
                                />
                              ) : (
                                <div className='w-12 h-12 rounded-2xl bg-[#F2F7F2] border border-emerald-100 flex items-center justify-center font-black text-xs text-[#1B4332]'>
                                  A
                                </div>
                              )}
                              <div>
                                <p className='font-black text-slate-800 text-sm'>{p.name}</p>
                                <div className='flex items-center gap-1.5 mt-1 flex-wrap'>
                                  {p.isZeroSugar && (
                                    <span className='text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wider'>
                                      Zero Sugar
                                    </span>
                                  )}
                                  {allVariantsOff && (
                                    <span className='text-[9px] bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full font-black uppercase tracking-wider'>
                                      Out of Stock
                                    </span>
                                  )}
                                  {p.snoozedUntil && new Date(p.snoozedUntil) > new Date() && (
                                    <span className='text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-black uppercase tracking-wider'>
                                      Snoozed ({formatSnooze(p.snoozedUntil)})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </td>

                          <td className='px-6 py-4'>
                            <span className='text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-100'>
                              {p.category?.name || 'Standard'}
                            </span>
                          </td>

                          <td className='px-6 py-4'>
                            <span className='font-black text-slate-800 text-xs'>
                              {isIcecreamProduct
                                ? `₹${p.basePrices?.small || p.resolvedPrices?.small || 0} – ₹${p.basePrices?.shareIt || p.basePrices?.binge || p.resolvedPrices?.shareIt || p.resolvedPrices?.binge || 0}`
                                : currency(p.basePrices?.regular || p.resolvedPrices?.regular || 0)}
                            </span>
                          </td>

                          <td className='px-6 py-4'>
                            {isIcecreamProduct ? (
                              <div className='flex items-center gap-3'>
                                <button
                                  type='button'
                                  onClick={() => setVariantModalProduct(p)}
                                  className='flex items-center gap-1.5 bg-[#F2F7F2] hover:bg-emerald-100 text-[#1B4332] font-black text-xs px-3.5 py-2 rounded-xl transition border border-emerald-200/60'
                                >
                                  <div className='flex gap-1'>
                                    {['small', 'regular', 'large', 'binge', ...(p.category?.hasShareIt ? ['shareIt'] : [])].map((v) => (
                                      <div
                                        key={v}
                                        className={`w-2 h-2 rounded-full ${
                                          p.variantAvailability?.[v] !== false ? 'bg-[#1B4332]' : 'bg-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                  <span className='text-[10px] uppercase tracking-wider'>Sizes ▾</span>
                                </button>

                                <button
                                  type='button'
                                  onClick={() => handleToggleClick(p)}
                                  className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                                    p.isAvailable && !allVariantsOff ? 'bg-[#1B4332]' : 'bg-gray-200'
                                  }`}
                                >
                                  <span
                                    className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                                      p.isAvailable && !allVariantsOff ? 'left-6' : 'left-0.5'
                                    }`}
                                  />
                                </button>
                              </div>
                            ) : (
                              <button
                                type='button'
                                onClick={() => handleToggleClick(p)}
                                className={`relative w-12 h-6 rounded-full transition-colors duration-300 ${
                                  p.isAvailable ? 'bg-[#1B4332]' : 'bg-gray-200'
                                }`}
                              >
                                <span
                                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                                    p.isAvailable ? 'left-6' : 'left-0.5'
                                  }`}
                                />
                              </button>
                            )}
                          </td>

                          <td className='px-6 py-4'>
                            <div className='flex items-center gap-2'>
                              <button
                                type='button'
                                onClick={() => {
                                  setEditingId(p._id);
                                  setForm({ name: p.name, category: p.category?._id || '', isZeroSugar: p.isZeroSugar });
                                  setPreview(p.imageUrl || '');
                                  setShowModal(true);
                                }}
                                className='text-[11px] font-black uppercase tracking-wider text-[#1B4332] bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl transition'
                              >
                                Edit
                              </button>
                              <button
                                type='button'
                                onClick={() => handleDelete(p._id)}
                                className='text-[11px] font-black uppercase tracking-wider text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-xl transition'
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className='sm:hidden space-y-3'>
            {filteredProducts.length === 0 ? (
              <div className='text-center py-16 text-slate-400'>
                <p className='text-sm font-bold'>No products found</p>
              </div>
            ) : (
              filteredProducts.map((p) => {
                const isIcecreamProduct = p.category?.productType === 'icecream';
                const allVariantsOff = isIcecreamProduct && !Object.values(p.variantAvailability || {}).some(Boolean);

                return (
                  <div
                    key={p._id}
                    className={`bg-white rounded-2xl border border-gray-200 shadow-xs p-4 ${
                      allVariantsOff ? 'opacity-60' : ''
                    }`}
                  >
                    <div className='flex items-start gap-3 mb-3'>
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className='w-12 h-12 rounded-xl object-cover border border-slate-100 shrink-0'
                        />
                      ) : (
                        <div className='w-12 h-12 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center font-bold text-xs text-[#1B4332] shrink-0'>
                          A
                        </div>
                      )}
                      <div className='flex-1 min-w-0'>
                        <p className='font-bold text-slate-800 text-sm truncate'>{p.name}</p>
                        <div className='flex flex-wrap gap-1 mt-1'>
                          <span className='text-[9px] bg-emerald-50 text-emerald-800 font-bold uppercase px-2 py-0.5 rounded-lg border border-emerald-100'>
                            {p.category?.name}
                          </span>
                          {p.isZeroSugar && (
                            <span className='text-[9px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold uppercase'>
                              Zero Sugar
                            </span>
                          )}
                          {allVariantsOff && (
                            <span className='text-[9px] bg-rose-100 text-rose-600 px-2 py-0.5 rounded-full font-bold uppercase'>
                              Out of Stock
                            </span>
                          )}
                          {p.snoozedUntil && new Date(p.snoozedUntil) > new Date() && (
                            <span className='text-[9px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold uppercase'>
                              Snoozed ({formatSnooze(p.snoozedUntil)})
                            </span>
                          )}
                        </div>
                      </div>
                      <div className='text-right shrink-0'>
                        <p className='font-black text-slate-800 text-xs'>
                          {isIcecreamProduct
                            ? `₹${p.basePrices?.small || p.resolvedPrices?.small || 0}+`
                            : currency(p.basePrices?.regular || p.resolvedPrices?.regular || 0)}
                        </p>
                      </div>
                    </div>

                    <div className='flex items-center justify-between gap-2 pt-2 border-t border-slate-100'>
                      <div className='flex items-center gap-2'>
                        {isIcecreamProduct && (
                          <button
                            type='button'
                            onClick={() => setVariantModalProduct(p)}
                            className='flex items-center gap-1.5 bg-[#F2F7F2] text-[#1B4332] font-black text-xs px-3 py-1.5 rounded-xl border border-emerald-200'
                          >
                            <div className='flex gap-0.5'>
                              {['small', 'regular', 'large', 'binge', ...(p.category?.hasShareIt ? ['shareIt'] : [])].map((v) => (
                                <div
                                  key={v}
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    p.variantAvailability?.[v] !== false ? 'bg-[#1B4332]' : 'bg-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className='text-[10px] uppercase'>Sizes ▾</span>
                          </button>
                        )}

                        <button
                          type='button'
                          onClick={() => handleToggleClick(p)}
                          className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                            p.isAvailable && !allVariantsOff ? 'bg-[#1B4332]' : 'bg-gray-200'
                          }`}
                        >
                          <span
                            className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all duration-300 ${
                              p.isAvailable && !allVariantsOff ? 'left-5' : 'left-0.5'
                            }`}
                          />
                        </button>
                      </div>

                      <div className='flex gap-2 ml-auto'>
                        <button
                          type='button'
                          onClick={() => {
                            setEditingId(p._id);
                            setForm({ name: p.name, category: p.category?._id || '', isZeroSugar: p.isZeroSugar });
                            setPreview(p.imageUrl || '');
                            setShowModal(true);
                          }}
                          className='text-[10px] font-black uppercase text-[#1B4332] bg-emerald-50 px-3 py-1.5 rounded-xl'
                        >
                          Edit
                        </button>
                        <button
                          type='button'
                          onClick={() => handleDelete(p._id)}
                          className='text-[10px] font-black uppercase text-rose-600 bg-rose-50 px-3 py-1.5 rounded-xl'
                        >
                          Del
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </>
      )}

      {variantModalProduct && (
        <VariantAvailabilityModal
          product={variantModalProduct}
          onClose={() => setVariantModalProduct(null)}
          onSnooze={(p, variant) => {
            setVariantModalProduct(null);
            setSnoozeModalData({ product: p, variant: variant || null });
          }}
        />
      )}

      {snoozeModalData && (
        <SnoozeModal
          product={snoozeModalData.product}
          variant={snoozeModalData.variant}
          onClose={() => setSnoozeModalData(null)}
        />
      )}

      {showModal && (
        <div className='fixed inset-0 bg-[#1B4332]/30 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-0 sm:p-4'>
          <div className='bg-white rounded-t-[36px] sm:rounded-3xl shadow-2xl w-full sm:max-w-md overflow-hidden max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200'>
            <div className='bg-[#1B4332] px-6 py-5 flex items-center justify-between sticky top-0 z-10'>
              <div>
                <span className='text-[10px] font-black text-emerald-400 uppercase tracking-widest'>Flavour Setup</span>
                <h2 className='text-lg font-black text-white'>
                  {editingId ? 'Edit Product Flavour' : 'Create New Product'}
                </h2>
              </div>
              <button onClick={closeModal} className='text-white/60 hover:text-white font-bold text-lg'>✕</button>
            </div>
            <form onSubmit={handleSubmit} className='p-6 space-y-4'>
              <div>
                <label className='text-xs font-black text-slate-400 uppercase tracking-wide block mb-1.5'>
                  Product Name
                </label>
                <input
                  placeholder='e.g. Roasted Almond'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className='w-full border-none rounded-2xl px-4 py-3 bg-[#F2F7F2] text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500'
                  required
                />
              </div>

              <div>
                <label className='text-xs font-black text-slate-400 uppercase tracking-wide block mb-1.5'>
                  Category Collection
                </label>
                <select
                  value={form.category || selectedCat}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className='w-full border-none rounded-2xl px-4 py-3 bg-[#F2F7F2] text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500'
                  required
                >
                  <option value=''>Select category</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <label className='flex items-center gap-3 cursor-pointer select-none py-1'>
                <div className='relative'>
                  <input
                    type='checkbox'
                    className='sr-only'
                    checked={form.isZeroSugar}
                    onChange={(e) => setForm({ ...form, isZeroSugar: e.target.checked })}
                  />
                  <div
                    className={`w-11 h-6 rounded-full transition-colors ${
                      form.isZeroSugar ? 'bg-[#1B4332]' : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                        form.isZeroSugar ? 'left-5' : 'left-0.5'
                      }`}
                    />
                  </div>
                </div>
                <span className='text-xs font-black text-slate-700 uppercase tracking-wider'>Zero Added Sugar</span>
              </label>

              <div>
                <label className='text-xs font-black text-slate-400 uppercase tracking-wide block mb-1.5'>
                  Product Image
                </label>
                {preview && (
                  <img
                    src={preview}
                    alt='Preview'
                    className='w-full h-32 object-cover rounded-2xl mb-2 border border-slate-100 shadow-sm'
                  />
                )}
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const f = e.target.files[0];
                    if (f) {
                      setImageFile(f);
                      setPreview(URL.createObjectURL(f));
                    }
                  }}
                  className='w-full text-xs text-slate-500 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-black file:uppercase file:bg-emerald-50 file:text-emerald-800 hover:file:bg-emerald-100'
                />
              </div>

              <div className='flex gap-3 pt-3'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='flex-1 border border-slate-200 py-3 rounded-xl font-black uppercase text-xs tracking-wider text-slate-500 hover:bg-slate-50 transition'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='flex-1 bg-[#1B4332] hover:bg-[#163829] text-white font-black py-3 rounded-xl transition shadow-xl shadow-emerald-900/15 text-xs uppercase tracking-wider'
                >
                  Save Flavour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}