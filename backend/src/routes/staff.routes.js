import { Router } from 'express';
import {
  getAllStaff,
  getActiveStaff,
  createStaff,
  updateStaff,
  deleteStaff,
} from '../controllers/staff.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import { requireOwnerMiddleware } from '../middleware/admin.middleware.js';

const router = Router();

// Public / rider viewable list of active employees
router.get('/active', getActiveStaff);

// Owner-only employee management routes
router.get('/', authMiddleware, requireOwnerMiddleware, getAllStaff);
router.post('/', authMiddleware, requireOwnerMiddleware, createStaff);
router.patch('/:id', authMiddleware, requireOwnerMiddleware, updateStaff);
router.delete('/:id', authMiddleware, requireOwnerMiddleware, deleteStaff);

export default router;
