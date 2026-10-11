import Staff from '../models/staff.model.js';
import { asyncHandler } from '../utils/async-handler.js';
import { APIResponse } from '../utils/api-response.js';
import { APIError } from '../utils/api-error.js';

// Default staff seeding if none exist
const DEFAULT_STAFF = [
  { name: 'Ramesh', phone: '9876543210', role: 'rider', isActive: true },
  { name: 'Suresh', phone: '9123456789', role: 'rider', isActive: true },
];

export const getAllStaff = asyncHandler(async (req, res) => {
  let staffList = await Staff.find({}).sort({ createdAt: -1 });

  // Auto-seed default staff if collection is completely empty
  if (staffList.length === 0) {
    try {
      await Staff.insertMany(DEFAULT_STAFF);
      staffList = await Staff.find({}).sort({ createdAt: -1 });
    } catch {
      // Continue if insert fails
    }
  }

  return res.status(200).json(
    new APIResponse(200, staffList, 'Staff members fetched successfully')
  );
});

export const getActiveStaff = asyncHandler(async (req, res) => {
  let activeList = await Staff.find({ isActive: true }).select('name phone role isActive').sort({ name: 1 });

  if (activeList.length === 0) {
    try {
      await Staff.insertMany(DEFAULT_STAFF);
      activeList = await Staff.find({ isActive: true }).select('name phone role isActive').sort({ name: 1 });
    } catch {}
  }

  return res.status(200).json(
    new APIResponse(200, activeList, 'Active staff fetched')
  );
});

export const createStaff = asyncHandler(async (req, res) => {
  const { name, phone, role } = req.body;
  if (!name || !name.trim()) {
    throw new APIError(400, 'Employee name is required');
  }
  if (!phone || !phone.trim()) {
    throw new APIError(400, 'Phone number is required');
  }

  const staff = await Staff.create({
    name: name.trim(),
    phone: phone.trim(),
    role: role || 'staff',
    isActive: true,
    createdBy: req.user?._id,
  });

  return res.status(201).json(
    new APIResponse(201, staff, 'Employee added successfully')
  );
});

export const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const staff = await Staff.findById(id);
  if (!staff) {
    throw new APIError(404, 'Employee not found');
  }

  const allowedFields = ['name', 'phone', 'role', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      staff[field] = req.body[field];
    }
  });

  await staff.save();

  return res.status(200).json(
    new APIResponse(200, staff, 'Employee details updated')
  );
});

export const deleteStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const staff = await Staff.findByIdAndDelete(id);
  if (!staff) {
    throw new APIError(404, 'Employee not found');
  }

  return res.status(200).json(
    new APIResponse(200, null, 'Employee removed successfully')
  );
});
