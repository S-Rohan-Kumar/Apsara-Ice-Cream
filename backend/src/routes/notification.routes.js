import { Router } from 'express';
import { broadcastNotification, getRecentBroadcasts } from '../controllers/notification.controller.js';
import authMiddleware from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';
import { upload } from '../middleware/multer.midleware.js';

const router = Router();

router.get('/broadcasts', getRecentBroadcasts);
router.post('/broadcast', authMiddleware, adminMiddleware, upload.single('image'), broadcastNotification);

export default router;
