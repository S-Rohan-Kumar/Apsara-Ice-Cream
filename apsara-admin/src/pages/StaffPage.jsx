import { useState } from 'react';
import {
  useGetStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeleteStaffMutation,
} from '../slices/staffApiSlice';

export default function StaffPage() {
  const { data: staffList = [], isLoading, isError, refetch } = useGetStaffQuery();
  const [createStaff, { isLoading: isCreating }] = useCreateStaffMutation();
  const [updateStaff, { isLoading: isUpdating }] = useUpdateStaffMutation();
  const [deleteStaff, { isLoading: isDeleting }] = useDeleteStaffMutation();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    role: 'rider',
    isActive: true,
  });
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const openCreateModal = () => {
    setEditingStaff(null);
    setFormData({ name: '', phone: '', role: 'rider', isActive: true });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const openEditModal = (staff) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name || '',
      phone: staff.phone || '',
      role: staff.role || 'rider',
      isActive: staff.isActive ?? true,
    });
    setErrorMessage('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStaff(null);
    setErrorMessage('');
  };

  const handleToggleActive = async (staff) => {
    try {
      await updateStaff({
        id: staff._id,
        isActive: !staff.isActive,
      }).unwrap();
      setSuccessMessage(`Updated status for ${staff.name}`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err?.data?.message || 'Failed to update staff status');
    }
  };

  const handleDelete = async (staff) => {
    if (!window.confirm(`Are you sure you want to remove employee "${staff.name}"?`)) {
      return;
    }
    try {
      await deleteStaff(staff._id).unwrap();
      setSuccessMessage(`Employee ${staff.name} removed successfully.`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      alert(err?.data?.message || 'Failed to delete staff member');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');

    if (!formData.name.trim()) {
      setErrorMessage('Employee name is required');
      return;
    }
    const cleanPhone = formData.phone.trim().replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number');
      return;
    }

    try {
      if (editingStaff) {
        await updateStaff({
          id: editingStaff._id,
          name: formData.name.trim(),
          phone: cleanPhone,
          role: formData.role,
          isActive: formData.isActive,
        }).unwrap();
        setSuccessMessage(`Employee ${formData.name} updated successfully!`);
      } else {
        await createStaff({
          name: formData.name.trim(),
          phone: cleanPhone,
          role: formData.role,
          isActive: formData.isActive,
        }).unwrap();
        setSuccessMessage(`Employee ${formData.name} added successfully!`);
      }
      setTimeout(() => setSuccessMessage(''), 3000);
      closeModal();
    } catch (err) {
      setErrorMessage(err?.data?.message || 'Operation failed. Please try again.');
    }
  };

  return (
    <div className='p-6 max-w-6xl mx-auto'>
      {/* Header */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6'>
        <div>
          <h1 className='text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2'>
            <span>Staff & Delivery Team</span>
            <span className='text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800'>
              {staffList.length} Staff
            </span>
          </h1>
          <p className='text-sm text-gray-500 mt-1'>
            Manage store workers, billing staff, and delivery riders for WhatsApp link assignment & live order tracking.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className='inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1B4332] hover:bg-[#143427] text-white text-sm font-bold rounded-xl shadow-xs transition-all active:scale-95'
        >
          <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
            <line x1='12' y1='5' x2='12' y2='19'></line>
            <line x1='5' y1='12' x2='19' y2='12'></line>
          </svg>
          Add New Staff
        </button>
      </div>

      {/* Info Notice */}
      <div className='bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start gap-3 text-emerald-900'>
        <div className='w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0 text-emerald-700 font-bold'>
          💡
        </div>
        <div className='text-xs leading-relaxed'>
          <p className='font-bold text-sm text-emerald-950 mb-0.5'>Dual-Worker Shift Flow</p>
          Store employees alternate between billing in store and bike deliveries. When an order is packed, the biller sends the order link to the rider on WhatsApp. The rider selects their profile, taps <b>Order Picked</b> to launch Google Maps bike navigation, and marks delivery using the customer's 4-digit OTP.
        </div>
      </div>

      {/* Notification Toast */}
      {successMessage && (
        <div className='mb-6 p-4 rounded-xl bg-emerald-600 text-white text-sm font-bold flex items-center justify-between shadow-md transition-all'>
          <span>✅ {successMessage}</span>
          <button onClick={() => setSuccessMessage('')} className='text-white/80 hover:text-white'>✕</button>
        </div>
      )}

      {/* Staff List Grid */}
      {isLoading ? (
        <div className='py-20 text-center text-gray-400 font-medium'>Loading staff profiles...</div>
      ) : isError ? (
        <div className='py-20 text-center text-red-500 font-medium'>
          Failed to load staff list.{' '}
          <button onClick={refetch} className='underline text-emerald-700 ml-2'>Retry</button>
        </div>
      ) : staffList.length === 0 ? (
        <div className='bg-white rounded-2xl border border-dashed border-gray-300 p-12 text-center'>
          <div className='text-4xl mb-3'>👥</div>
          <h3 className='text-base font-bold text-gray-800'>No Staff Members Found</h3>
          <p className='text-xs text-gray-500 mt-1 max-w-sm mx-auto'>
            Add your store workers so they can be selected during delivery dispatches.
          </p>
          <button
            onClick={openCreateModal}
            className='mt-4 px-4 py-2 bg-[#1B4332] text-white text-xs font-bold rounded-xl'
          >
            Add First Staff Member
          </button>
        </div>
      ) : (
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
          {staffList.map((staff) => (
            <div
              key={staff._id}
              className={`bg-white rounded-2xl border transition-all p-5 shadow-xs flex flex-col justify-between ${
                staff.isActive ? 'border-gray-200 hover:border-emerald-300' : 'border-gray-200 bg-gray-50/70 opacity-75'
              }`}
            >
              <div>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex items-center gap-3'>
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg font-black shrink-0 ${
                      staff.isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {staff.name ? staff.name.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <div>
                      <h3 className='font-black text-gray-900 text-base leading-snug'>{staff.name}</h3>
                      <p className='text-xs text-gray-500 font-medium flex items-center gap-1 mt-0.5'>
                        <svg className='w-3 h-3 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                          <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z' />
                        </svg>
                        +91 {staff.phone}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                    staff.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {staff.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className='mt-4 pt-3 border-t border-gray-100 flex items-center justify-between text-xs'>
                  <span className='text-gray-400 font-medium'>Store Role:</span>
                  <span className='font-bold uppercase text-[11px] px-2 py-0.5 rounded bg-gray-100 text-gray-700'>
                    {staff.role === 'rider' ? '🛵 Delivery Rider' : staff.role === 'biller' ? '🧾 In-Store Biller' : '🔄 All-Rounder'}
                  </span>
                </div>
              </div>

              <div className='mt-5 pt-3 border-t border-gray-100 flex items-center justify-between gap-2'>
                <button
                  onClick={() => handleToggleActive(staff)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-lg border transition-all ${
                    staff.isActive
                      ? 'border-gray-200 text-gray-600 hover:bg-gray-100'
                      : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                  }`}
                >
                  {staff.isActive ? 'Mark Inactive' : 'Mark Active'}
                </button>

                <div className='flex items-center gap-1'>
                  <button
                    onClick={() => openEditModal(staff)}
                    className='p-1.5 text-gray-400 hover:text-gray-800 rounded-lg hover:bg-gray-100 transition-colors'
                    title='Edit Staff'
                  >
                    <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                      <path d='M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7'></path>
                      <path d='M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z'></path>
                    </svg>
                  </button>

                  <button
                    onClick={() => handleDelete(staff)}
                    disabled={isDeleting}
                    className='p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors'
                    title='Delete Staff'
                  >
                    <svg className='w-4 h-4' viewBox='0 0 24 24' fill='none' stroke='currentColor' strokeWidth='2'>
                      <polyline points='3 6 5 6 21 6'></polyline>
                      <path d='M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs'>
          <div className='bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl relative animate-in fade-in zoom-in duration-200'>
            <div className='flex items-center justify-between pb-3 border-b border-gray-100 mb-4'>
              <h2 className='text-lg font-black text-gray-900'>
                {editingStaff ? 'Edit Staff Profile' : 'Add New Staff Member'}
              </h2>
              <button
                onClick={closeModal}
                className='text-gray-400 hover:text-gray-600 p-1 rounded-lg'
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className='mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold'>
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className='space-y-4'>
              <div>
                <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1'>
                  Staff Full Name
                </label>
                <input
                  type='text'
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder='e.g. Ramesh Kumar'
                  className='w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium'
                  required
                />
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1'>
                  Phone Number (WhatsApp)
                </label>
                <div className='relative'>
                  <span className='absolute left-3.5 top-2.5 text-xs font-bold text-gray-400'>+91</span>
                  <input
                    type='tel'
                    maxLength='10'
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    placeholder='9876543210'
                    className='w-full pl-12 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium'
                    required
                  />
                </div>
                <p className='text-[10px] text-gray-400 mt-1'>
                  Used by biller to send delivery order links via WhatsApp.
                </p>
              </div>

              <div>
                <label className='block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1'>
                  Primary Role
                </label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                  className='w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium bg-white'
                >
                  <option value='rider'>Delivery Rider (Bike delivery)</option>
                  <option value='biller'>In-Store Biller (Packing & Counter)</option>
                  <option value='all-rounder'>All-Rounder (Biller + Delivery)</option>
                </select>
              </div>

              <div className='flex items-center gap-2 pt-2'>
                <input
                  type='checkbox'
                  id='isActiveStaff'
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className='w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500'
                />
                <label htmlFor='isActiveStaff' className='text-xs font-bold text-gray-700 cursor-pointer'>
                  Active Staff Member (Can be assigned deliveries)
                </label>
              </div>

              <div className='pt-4 border-t border-gray-100 flex items-center justify-end gap-2'>
                <button
                  type='button'
                  onClick={closeModal}
                  className='px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-800 rounded-xl hover:bg-gray-100'
                >
                  Cancel
                </button>
                <button
                  type='submit'
                  disabled={isCreating || isUpdating}
                  className='px-5 py-2.5 bg-[#1B4332] hover:bg-[#143427] text-white text-xs font-bold rounded-xl shadow-xs transition-all disabled:opacity-50'
                >
                  {isCreating || isUpdating ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
