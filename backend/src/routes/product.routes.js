import { Router } from 'express';
import {
  getProducts,
  getAllProducts,
  getProductDetails,
  createProduct,
  updateProduct,
  updateVariantAvailability,
  toggleStock,
  deleteProduct,
} from '../controllers/product.controller.js';
import authMiddleware  from '../middleware/auth.middleware.js';
import adminMiddleware from '../middleware/admin.middleware.js';
import { upload }      from '../middleware/multer.midleware.js';

const router = Router();

// ── Public / Customer routes ──────────────────────────────────────────────────
router.get('/',    getProducts);        // filters isAvailable:true

router.get('/all', authMiddleware, adminMiddleware, getAllProducts);
router.get('/:id', getProductDetails);

// ── Admin routes ──────────────────────────────────────────────────────────────
// IMPORTANT: /all must come before /:id so Express doesn't treat 'all' as an ID

router.post('/',
  authMiddleware, adminMiddleware,
  upload.single('image'),
  createProduct
);

router.patch('/:id',
  authMiddleware, adminMiddleware,
  upload.single('image'),
  updateProduct
);

// Variant availability — for icecream products (per-size toggle)
router.patch('/:id/variant-availability',
  authMiddleware, adminMiddleware,
  updateVariantAvailability
);

// Stock toggle — for single-type products only
router.patch('/:id/toggle-stock',
  authMiddleware, adminMiddleware,
  toggleStock
);

router.delete('/:id',
  authMiddleware, adminMiddleware,
  deleteProduct
);

export default router;