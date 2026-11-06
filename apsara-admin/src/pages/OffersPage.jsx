import { useState, useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectUserInfo } from '../slices/authSlice';
import { useGetCategoriesQuery } from '../slices/categoryApiSlice';
import {
  useGetAllOffersQuery,
  useCreateOfferMutation,
  useUpdateOfferMutation,
  useDeleteOfferMutation,
} from '../slices/offerApiSlice';
import { useToast } from '../hooks/useToast';
import { showConfirm } from '../slices/uiSlice';
import { registerConfirmHandler } from '../components/common/ConfirmDialog';
import Spinner from '../components/common/Spinner';

const BANNER_TEMPLATES = [
  {
    id: 'tpl_big_bang',
    bannerType: 'offer',
    title: '💥 Big Bang Offer • Flat 25% OFF',
    searchKeyword: 'Big Bang',
    description: 'Festive blowout savings on all artisan scoops and rich sundaes!',
    discountPercent: 25,
    minOrderAmount: 299,
    minQuantity: 1,
    tag: 'FESTIVE SALE',
    badgeCls: 'bg-amber-100 text-amber-900 border-amber-300',
    headerBg: 'from-amber-600 to-orange-700',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790957003/apsara_menu/sundaes/Death_By_Chocolate_Sundae_vatb3k.jpg',
  },
  {
    id: 'tpl_new_arrival',
    bannerType: 'arrival',
    title: '🥭 New Arrival: Asli Alphonso & Roasted Almond',
    searchKeyword: 'Alphonso',
    description: 'Freshly hand-churned Ratnagiri Alphonso pulp with almond crunch.',
    discountPercent: 0,
    minOrderAmount: 0,
    minQuantity: 1,
    tag: 'NEW FLAVOURS',
    badgeCls: 'bg-yellow-100 text-yellow-900 border-yellow-300',
    headerBg: 'from-yellow-600 to-amber-700',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790956965/apsara_menu/ice_creams/Asli_Alphonso_Mango_Ice_Cream_m5uczq.jpg',
  },
  {
    id: 'tpl_seasonal_harvest',
    bannerType: 'offer',
    title: '🍓 Seasonal Harvest: Fresh Strawberry & Mulberry',
    searchKeyword: 'Strawberry',
    description: 'Made from fresh farm berries. 100% natural, no synthetic colors!',
    discountPercent: 20,
    minOrderAmount: 249,
    minQuantity: 1,
    tag: 'SEASONAL HARVEST',
    badgeCls: 'bg-rose-100 text-rose-900 border-rose-300',
    headerBg: 'from-rose-600 to-pink-700',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790956968/apsara_menu/ice_creams/Brownie_Blast_Chocolate_Ice_Cream_w6lgyi.jpg',
  },
  {
    id: 'tpl_heritage_artisan',
    bannerType: 'arrival',
    title: '🍨 Royal Heritage: Handcrafted Naturals',
    searchKeyword: 'Heritage',
    description: 'Since 1971 slow-churned heritage recipe crafted with 100% pure cow milk.',
    discountPercent: 0,
    minOrderAmount: 0,
    minQuantity: 1,
    tag: 'HERITAGE RECIPE',
    badgeCls: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    headerBg: 'from-emerald-700 to-teal-800',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790956966/apsara_menu/ice_creams/Belgian_Bite_Chocolate_Ice_Cream_wnxqju.jpg',
  },
  {
    id: 'tpl_zero_sugar',
    bannerType: 'offer',
    title: '🌱 Guilt-Free Delights: 0% Added Sugar Series',
    searchKeyword: 'Sugar',
    description: 'Naturally sweetened with sun-dried Afghan figs and berries. Indulge without guilt!',
    discountPercent: 15,
    minOrderAmount: 199,
    minQuantity: 1,
    tag: '0% ADDED SUGAR',
    badgeCls: 'bg-teal-100 text-teal-900 border-teal-300',
    headerBg: 'from-teal-700 to-cyan-800',
    imageUrl: 'https://res.cloudinary.com/dolzqp0pj/image/upload/v1790957007/apsara_menu/zero_added_sugar/Anjeer_Andaaz_Ice_Cream_itmx93.jpg',
  },
];

const getStatus = (o) => {
  const now = new Date();
  if (!o.isActive) {
    return { label: 'Deactivated', cls: 'bg-slate-100 text-slate-500 border-slate-200', dot: 'bg-slate-400' };
  }
  if (now < new Date(o.startsAt)) {
    return { label: 'Upcoming', cls: 'bg-blue-50 text-blue-600 border-blue-200', dot: 'bg-blue-500' };
  }
  if (now > new Date(o.expiresAt)) {
    return { label: 'Expired', cls: 'bg-rose-50 text-rose-500 border-rose-200', dot: 'bg-rose-400' };
  }
  return { label: 'Active', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
};

const fmtDate = (iso) => {
  if (!iso) return 'N/A';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const EMPTY_OFFER = {
  title: '',
  description: '',
  discountPercent: 0,
  category: '',
  startsAt: '',
  expiresAt: '',
  minOrderAmount: 0,
  minQuantity: 1,
  bannerType: 'offer',
};

export default function OffersPage() {
  const userInfo = useSelector(selectUserInfo);
  const role = userInfo?.user?.role || userInfo?.role || 'owner';
  const isBiller = role === 'biller';

  // Strict Owner-Only protection
  if (isBiller) {
    return <Navigate to='/orders' replace />;
  }

  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_OFFER);
  const [imageFile, setImageFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [sendPush, setSendPush] = useState(true);
  const [activeTab, setActiveTab] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [togglingTplId, setTogglingTplId] = useState(null);

  const { showSuccess, showError } = useToast();
  const dispatch = useDispatch();

  const { data: offers = [], isLoading, refetch } = useGetAllOffersQuery();
  const { data: categories = [] } = useGetCategoriesQuery();
  const [createOffer] = useCreateOfferMutation();
  const [updateOffer] = useUpdateOfferMutation();
  const [deleteOffer] = useDeleteOfferMutation();

  const findMatchingOffer = (tpl) => {
    // 1. By exact templateId
    const byId = offers.find((o) => o.templateId === tpl.id);
    if (byId) return byId;

    // 2. By title keyword (case-insensitive)
    const byTitle = offers.find((o) => {
      const oTitle = (o.title || '').toLowerCase();
      return (
        oTitle === tpl.title.toLowerCase() ||
        (tpl.searchKeyword && oTitle.includes(tpl.searchKeyword.toLowerCase()))
      );
    });
    return byTitle || null;
  };

  const isTemplateLiveInApp = (tpl) => {
    const match = findMatchingOffer(tpl);
    if (!match || !match.isActive) return false;
    const now = new Date();
    return new Date(match.startsAt) <= now && new Date(match.expiresAt) > now;
  };

  const openCreateModal = () => {
    setEditing(null);
    setForm(EMPTY_OFFER);
    setImageFile(null);
    setPreview('');
    setSendPush(true);
    setShowModal(true);
  };

  const openEditModal = (o) => {
    setEditing(o);
    setForm({
      title: o.title,
      description: o.description || '',
      discountPercent: o.discountPercent ?? 0,
      category: o.category?._id || '',
      startsAt: o.startsAt?.slice(0, 16) || '',
      expiresAt: o.expiresAt?.slice(0, 16) || '',
      minOrderAmount: o.minOrderAmount || 0,
      minQuantity: o.minQuantity || 1,
      bannerType: o.bannerType || (o.discountPercent > 0 ? 'offer' : 'arrival'),
    });
    setPreview(o.imageUrl || '');
    setImageFile(null);
    setShowModal(true);
  };

  const openCustomizeTemplate = (tpl) => {
    const existing = findMatchingOffer(tpl);
    if (existing) {
      openEditModal(existing);
      return;
    }

    const now = new Date();
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    setEditing(null);
    setForm({
      title: tpl.title,
      description: tpl.description,
      discountPercent: tpl.discountPercent || 0,
      category: '',
      startsAt: now.toISOString().slice(0, 16),
      expiresAt: nextMonth.toISOString().slice(0, 16),
      minOrderAmount: tpl.minOrderAmount || 0,
      minQuantity: tpl.minQuantity || 1,
      bannerType: tpl.bannerType,
      templateId: tpl.id,
    });
    setPreview(tpl.imageUrl);
    setImageFile(null);
    setSendPush(false);
    setShowModal(true);
  };

  const handleToggleTemplate = async (tpl) => {
    try {
      setTogglingTplId(tpl.id);
      const existing = findMatchingOffer(tpl);

      if (existing) {
        const isLive = existing.isActive && new Date(existing.expiresAt) > new Date();
        if (isLive) {
          // Turn OFF
          await updateOffer({ id: existing._id, isActive: false }).unwrap();
          showSuccess(`Turned OFF "${tpl.title}" from mobile app`);
        } else {
          // Turn ON (renew dates for 30 days)
          const now = new Date();
          const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
          await updateOffer({
            id: existing._id,
            isActive: true,
            templateId: tpl.id,
            bannerType: tpl.bannerType,
            startsAt: now.toISOString(),
            expiresAt: nextMonth.toISOString(),
          }).unwrap();
          showSuccess(`⚡ "${tpl.title}" is now LIVE in customer app!`);
        }
      } else {
        // Create new active offer from template
        const now = new Date();
        const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        const fd = new FormData();
        fd.append('title', tpl.title);
        fd.append('description', tpl.description);
        fd.append('discountPercent', String(tpl.discountPercent || 0));
        fd.append('minOrderAmount', String(tpl.minOrderAmount || 0));
        fd.append('minQuantity', String(tpl.minQuantity || 1));
        fd.append('startsAt', now.toISOString());
        fd.append('expiresAt', nextMonth.toISOString());
        fd.append('imageUrl', tpl.imageUrl);
        fd.append('templateId', tpl.id);
        fd.append('bannerType', tpl.bannerType);
        fd.append('isActive', 'true');
        fd.append('sendPush', 'false');

        await createOffer(fd).unwrap();
        showSuccess(`⚡ Banner template "${tpl.title}" activated live in app!`);
      }
      refetch();
    } catch (err) {
      showError(err?.data?.message || 'Failed to toggle banner template');
    } finally {
      setTogglingTplId(null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description.trim());
      fd.append('discountPercent', String(Number(form.discountPercent) || 0));
      if (form.category) fd.append('category', form.category);
      fd.append('minOrderAmount', String(Number(form.minOrderAmount) || 0));
      fd.append('minQuantity', String(Number(form.minQuantity) || 1));
      fd.append('startsAt', form.startsAt);
      fd.append('expiresAt', form.expiresAt);
      if (form.bannerType) fd.append('bannerType', form.bannerType);
      if (form.templateId) fd.append('templateId', form.templateId);

      if (imageFile) {
        fd.append('image', imageFile);
      } else if (preview && !imageFile) {
        fd.append('imageUrl', preview);
      }
      if (!editing) {
        fd.append('sendPush', String(sendPush));
      }

      if (editing) {
        await updateOffer({ id: editing._id, formData: fd }).unwrap();
        showSuccess('Offer updated successfully');
      } else {
        await createOffer(fd).unwrap();
        showSuccess(sendPush ? 'Offer published & Push Notification dispatched!' : 'Offer published successfully');
      }
      setShowModal(false);
      refetch();
    } catch (e) {
      showError(e?.data?.message || 'Failed to save offer');
    }
  };

  const handleDelete = (id) => {
    const key = `del_offer_${id}`;
    registerConfirmHandler(key, async () => {
      try {
        await deleteOffer(id).unwrap();
        showSuccess('Offer removed');
        refetch();
      } catch {
        showError('Delete failed');
      }
    });
    dispatch(showConfirm({ message: 'Are you sure you want to permanently delete this offer?', confirmKey: key }));
  };

  const filteredOffers = useMemo(() => {
    return offers.filter((o) => {
      const status = getStatus(o).label;
      if (activeTab === 'ACTIVE' && status !== 'Active') return false;
      if (activeTab === 'UPCOMING' && status !== 'Upcoming') return false;
      if (activeTab === 'EXPIRED' && status !== 'Expired' && status !== 'Deactivated') return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = (o.title || '').toLowerCase().includes(q);
        const matchesCat = (o.category?.name || '').toLowerCase().includes(q);
        if (!matchesTitle && !matchesCat) return false;
      }
      return true;
    });
  }, [offers, activeTab, searchQuery]);

  const activeCount = offers.filter((o) => getStatus(o).label === 'Active').length;
  const upcomingCount = offers.filter((o) => getStatus(o).label === 'Upcoming').length;

  return (
    <div className='max-w-7xl mx-auto pb-24 space-y-8'>
      {/* Page Header */}
      <div className='flex flex-col md:flex-row md:items-end justify-between gap-4'>
        <div>
          <div className='flex items-center gap-2 mb-2'>
            <span className='px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800'>
              Store Owner Only
            </span>
            <span className='text-xs font-semibold text-gray-500'>
              {activeCount} Active Live in App • {upcomingCount} Scheduled
            </span>
          </div>
          <h1 className='text-2xl sm:text-3xl font-black text-[#1B4332] tracking-tight'>
            Banners & Offers Control
          </h1>
          <p className='text-xs font-bold text-gray-400 uppercase tracking-widest mt-1'>
            Toggle Ready-Made App Banners or Create Custom Promo Codes
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className='bg-[#1B4332] hover:bg-[#163829] active:scale-95 text-white font-bold px-5 py-2.5 rounded-xl shadow-xs transition text-xs uppercase tracking-wider flex items-center gap-2'
        >
          <span>＋</span>
          <span>Create Custom Promo</span>
        </button>
      </div>

      {/* SECTION 1: Ready-Made App Banner Templates (Owner-Only) */}
      <div className='bg-gradient-to-br from-emerald-900 to-[#0F291E] rounded-3xl p-6 sm:p-8 text-white shadow-lg space-y-6'>
        <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-emerald-800/80'>
          <div>
            <div className='flex items-center gap-2'>
              <span className='text-xl'>⚡</span>
              <h2 className='text-lg font-black tracking-tight text-white'>
                Ready-Made App Banner Templates
              </h2>
              <span className='px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30'>
                1-Click Toggle
              </span>
            </div>
            <p className='text-xs text-emerald-200/80 mt-1 font-medium'>
              Turn curated discounts or new arrival showcase banners ON or OFF in the mobile app with a single click.
            </p>
          </div>
          <span className='text-[11px] font-bold text-emerald-300/70'>
            Changes update instantly on customer phones via live sockets
          </span>
        </div>

        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {BANNER_TEMPLATES.map((tpl) => {
            const isLive = isTemplateLiveInApp(tpl);
            const isToggling = togglingTplId === tpl.id;
            const hasDiscount = tpl.discountPercent > 0;

            return (
              <div
                key={tpl.id}
                className='bg-white/10 backdrop-blur-md rounded-2xl border border-white/15 overflow-hidden flex flex-col justify-between hover:border-white/30 transition-all shadow-sm'
              >
                <div>
                  {/* Thumbnail Banner Preview */}
                  <div className='relative h-32 w-full overflow-hidden bg-black/40'>
                    <img
                      src={tpl.imageUrl}
                      alt={tpl.title}
                      className='w-full h-full object-cover transition-transform duration-500 hover:scale-105'
                    />
                    <div className='absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent' />

                    <span className='absolute top-3 left-3 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-white/90 text-slate-900 shadow-xs'>
                      {tpl.tag}
                    </span>

                    <div className='absolute top-3 right-3'>
                      {isLive ? (
                        <span className='px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-emerald-400 text-emerald-950 flex items-center gap-1 shadow-sm'>
                          <span className='w-1.5 h-1.5 rounded-full bg-emerald-950 animate-pulse'></span>
                          <span>LIVE IN APP</span>
                        </span>
                      ) : (
                        <span className='px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-black/50 text-white/70 border border-white/20'>
                          OFFLINE
                        </span>
                      )}
                    </div>

                    <div className='absolute bottom-2.5 left-3 right-3 flex items-end justify-between'>
                      {hasDiscount ? (
                        <>
                          <span className='text-lg font-black text-amber-300 drop-shadow'>
                            {tpl.discountPercent}% OFF
                          </span>
                          <span className='text-[10px] font-bold text-white/90 drop-shadow bg-black/40 px-2 py-0.5 rounded'>
                            Min ₹{tpl.minOrderAmount}
                          </span>
                        </>
                      ) : (
                        <>
                          <span className='text-xs font-black text-emerald-300 drop-shadow px-2 py-0.5 rounded bg-black/50 uppercase tracking-wider'>
                            ✨ New Arrival
                          </span>
                          <span className='text-[10px] font-bold text-white/90 drop-shadow bg-black/40 px-2 py-0.5 rounded'>
                            No Min Order
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Body Info */}
                  <div className='p-4 space-y-1.5'>
                    <h3 className='font-black text-xs text-white leading-snug line-clamp-2'>
                      {tpl.title}
                    </h3>
                    <p className='text-[11px] text-emerald-100/70 leading-relaxed line-clamp-2'>
                      {tpl.description}
                    </p>
                  </div>
                </div>

                {/* Actions: 1-Click Toggle + Customise */}
                <div className='p-4 pt-0 flex items-center gap-2'>
                  <button
                    onClick={() => handleToggleTemplate(tpl)}
                    disabled={isToggling}
                    className={`flex-1 py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm active:scale-95 disabled:opacity-50 ${
                      isLive
                        ? 'bg-rose-600 hover:bg-rose-700 text-white'
                        : 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950 font-black'
                    }`}
                  >
                    {isToggling ? (
                      <span className='animate-pulse'>Updating...</span>
                    ) : isLive ? (
                      <>
                        <span>⚪</span>
                        <span>Turn OFF in App</span>
                      </>
                    ) : (
                      <>
                        <span>⚡</span>
                        <span>Turn ON in App</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => openCustomizeTemplate(tpl)}
                    title='Edit banner content'
                    className='py-2 px-3 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition'
                  >
                    <span>✏️</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Custom Promo Codes & All Offers Table */}
      <div className='space-y-4'>
        <div className='flex items-center justify-between'>
          <h2 className='text-sm font-black uppercase tracking-wider text-slate-800'>
            All Store Promotions ({offers.length})
          </h2>
        </div>

        <div className='bg-white rounded-2xl border border-gray-200 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4'>
          <div className='flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar'>
            {[
              { id: 'ALL', label: 'All Offers', count: offers.length },
              { id: 'ACTIVE', label: 'Live Now', count: activeCount },
              { id: 'UPCOMING', label: 'Upcoming', count: upcomingCount },
              { id: 'EXPIRED', label: 'Past & Off', count: offers.length - activeCount - upcomingCount }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-[#1B4332] text-white shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:text-slate-900'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className='w-full sm:w-72'>
            <input
              type='text'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder='Search by title or category...'
              className='w-full bg-gray-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold text-slate-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
            />
          </div>
        </div>

        {isLoading ? (
          <div className='py-24 text-center'>
            <Spinner />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className='bg-white rounded-2xl border border-gray-200 p-16 text-center shadow-xs'>
            <p className='text-sm font-bold text-gray-500'>No campaigns found matching filter.</p>
          </div>
        ) : (
          <div className='bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden'>
            <div className='overflow-x-auto'>
              <table className='w-full text-left border-collapse'>
                <thead>
                  <tr className='border-b border-gray-100 bg-gray-50/70 text-[10px] font-black uppercase tracking-wider text-gray-400'>
                    <th className='py-3.5 px-4'>Campaign</th>
                    <th className='py-3.5 px-4'>Discount / Type</th>
                    <th className='py-3.5 px-4'>Status</th>
                    <th className='py-3.5 px-4'>Validity</th>
                    <th className='py-3.5 px-4'>Min Order</th>
                    <th className='py-3.5 px-4 text-right'>Actions</th>
                  </tr>
                </thead>
                <tbody className='divide-y divide-gray-100 text-xs font-medium'>
                  {filteredOffers.map((o) => {
                    const st = getStatus(o);
                    return (
                      <tr key={o._id} className='hover:bg-gray-50/50 transition'>
                        <td className='py-3.5 px-4'>
                          <div className='flex items-center gap-3'>
                            {o.imageUrl ? (
                              <img src={o.imageUrl} alt='' className='w-10 h-10 rounded-lg object-cover border border-gray-200 shrink-0' />
                            ) : (
                              <div className='w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-800 font-bold shrink-0'>
                                %
                              </div>
                            )}
                            <div className='min-w-0'>
                              <p className='font-bold text-slate-900 truncate'>{o.title}</p>
                              <p className='text-[10px] text-gray-400 truncate'>
                                {o.description || (o.category?.name ? `Category: ${o.category.name}` : 'Storewide')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className='py-3.5 px-4'>
                          {o.discountPercent > 0 ? (
                            <span className='font-black text-[#1B4332] text-sm font-mono'>
                              {o.discountPercent}% OFF
                            </span>
                          ) : (
                            <span className='font-black text-emerald-700 text-xs uppercase px-2 py-0.5 rounded bg-emerald-50 border border-emerald-200'>
                              New Arrival
                            </span>
                          )}
                        </td>
                        <td className='py-3.5 px-4'>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`}></span>
                            <span>{st.label}</span>
                          </span>
                        </td>
                        <td className='py-3.5 px-4 text-[11px] text-gray-500 font-mono'>
                          {fmtDate(o.startsAt)} - {fmtDate(o.expiresAt)}
                        </td>
                        <td className='py-3.5 px-4 font-mono font-bold text-slate-700'>
                          {o.minOrderAmount > 0 ? `₹${o.minOrderAmount}` : 'None'}
                        </td>
                        <td className='py-3.5 px-4 text-right'>
                          <div className='flex items-center justify-end gap-1'>
                            <button
                              onClick={() => openEditModal(o)}
                              className='p-1.5 rounded-lg hover:bg-gray-100 text-gray-600 transition'
                              title='Edit offer'
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => handleDelete(o._id)}
                              className='p-1.5 rounded-lg hover:bg-red-50 text-red-500 transition'
                              title='Delete offer'
                            >
                              🗑️
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
        )}
      </div>

      {/* Modal for Creating / Editing Offer */}
      {showModal && (
        <div className='fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs'>
          <div className='bg-white rounded-3xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 sm:p-8 space-y-6 shadow-2xl no-scrollbar'>
            <div className='flex items-center justify-between pb-3 border-b border-gray-100'>
              <div>
                <h3 className='text-lg font-black text-slate-900'>
                  {editing ? 'Edit Banner / Offer' : 'Create Banner / Offer'}
                </h3>
                <p className='text-xs text-gray-400 font-medium'>
                  Configure appearance and requirements for the mobile app
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className='text-gray-400 hover:text-gray-600 p-1 rounded-lg'
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5'>
                  Campaign Title *
                </label>
                <input
                  type='text'
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder='e.g., 💥 Big Bang Offer • Flat 25% OFF'
                  className='w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                />
              </div>

              <div>
                <label className='block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5'>
                  Tagline / Description
                </label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder='Brief catchphrase shown in the mobile banner carousel'
                  className='w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                />
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5'>
                    Discount % {form.bannerType === 'arrival' ? '(0 for New Arrivals)' : ''}
                  </label>
                  <input
                    type='number'
                    min='0'
                    max='100'
                    value={form.discountPercent}
                    onChange={(e) => setForm({ ...form, discountPercent: e.target.value })}
                    placeholder='0 for showcase, > 0 for promo'
                    className='w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5'>
                    Min Order Amount (₹)
                  </label>
                  <input
                    type='number'
                    min='0'
                    value={form.minOrderAmount}
                    onChange={(e) => setForm({ ...form, minOrderAmount: e.target.value })}
                    placeholder='0 for no minimum'
                    className='w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                  />
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5'>
                    Starts At *
                  </label>
                  <input
                    type='datetime-local'
                    required
                    value={form.startsAt}
                    onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
                    className='w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                  />
                </div>

                <div>
                  <label className='block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5'>
                    Expires At *
                  </label>
                  <input
                    type='datetime-local'
                    required
                    value={form.expiresAt}
                    onChange={(e) => setForm({ ...form, expiresAt: e.target.value })}
                    className='w-full border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1B4332]/20 focus:border-[#1B4332]'
                  />
                </div>
              </div>

              <div>
                <label className='block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5'>
                  App Banner Image
                </label>
                {preview && (
                  <div className='mb-3 relative h-32 rounded-xl overflow-hidden border border-gray-200 bg-gray-50'>
                    <img src={preview} alt='' className='w-full h-full object-cover' />
                    <button
                      type='button'
                      onClick={() => {
                        setPreview('');
                        setImageFile(null);
                      }}
                      className='absolute top-2 right-2 p-1 rounded-full bg-black/60 text-white text-xs'
                    >
                      ✕
                    </button>
                  </div>
                )}
                <input
                  type='file'
                  accept='image/*'
                  onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      setImageFile(file);
                      setPreview(URL.createObjectURL(file));
                    }
                  }}
                  className='w-full text-xs text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-gray-100 file:text-slate-700 hover:file:bg-gray-200 cursor-pointer'
                />
              </div>

              {!editing && (
                <div className='flex items-center gap-2 pt-2'>
                  <input
                    type='checkbox'
                    id='sendPush'
                    checked={sendPush}
                    onChange={(e) => setSendPush(e.target.checked)}
                    className='w-4 h-4 text-[#1B4332] rounded focus:ring-[#1B4332]'
                  />
                  <label htmlFor='sendPush' className='text-xs font-bold text-slate-700 cursor-pointer'>
                    Dispatch Rich Push Notification with banner to customers now
                  </label>
                </div>
              )}

              <div className='flex items-center justify-end gap-3 pt-4 border-t border-gray-100'>
                <button
                  type='button'
                  onClick={() => setShowModal(false)}
                  className='px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-50'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  className='px-6 py-2.5 rounded-xl bg-[#1B4332] hover:bg-[#163829] text-white text-xs font-bold uppercase tracking-wider shadow-sm transition'
                >
                  {editing ? 'Update Campaign' : 'Publish to App'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
