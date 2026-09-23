import { Router } from 'express';
import { broadcastNotification, getRecentBroadcasts } from '../controllers/notification.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';

const router = Router();

router.get('/broadcasts', getRecentBroadcasts);
router.post('/broadcast', authMiddleware, adminMiddleware, broadcastNotification);

export default router;
