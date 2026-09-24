import { Router } from 'express';
import { getMonthlyReport } from '../controllers/orders.controller.js';
import { broadcastNotification } from '../controllers/notification.controller.js';
import { getStoreStatus, updateStoreStatus } from '../controllers/store.controller.js';
import authMiddleware  from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';

const router = Router();

router.get ('/reports/monthly', authMiddleware, adminMiddleware, getMonthlyReport);
router.post('/broadcast',       authMiddleware, adminMiddleware, broadcastNotification);
router.get ('/store-status',     getStoreStatus);
router.patch('/store-status',    authMiddleware, adminMiddleware, updateStoreStatus);

export default router;