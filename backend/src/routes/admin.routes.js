import { Router } from 'express';
import { getMonthlyReport } from '../controllers/orders.controller.js';
import { broadcastNotification } from '../controllers/notification.controller.js';
import { getStoreStatus, updateStoreStatus } from '../controllers/store.controller.js';
import authMiddleware  from '../middleware/auth.middleware.js';
import adminMiddleware, { requireOwnerMiddleware } from '../middleware/admin.middleware.js';

import { upload } from '../middleware/multer.midleware.js';

const router = Router();

router.get ('/reports/monthly', authMiddleware, requireOwnerMiddleware, getMonthlyReport);
router.post('/broadcast',       authMiddleware, requireOwnerMiddleware, upload.single('image'), broadcastNotification);
router.get ('/store-status',     getStoreStatus);
router.patch('/store-status',    authMiddleware, adminMiddleware, updateStoreStatus);

export default router;