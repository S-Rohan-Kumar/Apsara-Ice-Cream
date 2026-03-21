import { getCategories, createCategory, updateCategory } from "../controllers/category.controller.js";
import { Router } from 'express';
import authMiddleware from "../middleware/auth.middleware.js";
import adminMiddleware from "../middleware/admin.middleware.js";




const router = Router();

router.route("/").get(getCategories).post(authMiddleware,adminMiddleware , createCategory);
router.route("/:id").patch(authMiddleware,adminMiddleware , updateCategory);

export default router;