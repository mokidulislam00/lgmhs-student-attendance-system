
import { Router } from "express";

import { getDashboardStats } from "../controllers/dashboard.controller";
import { protect } from "../middleware/auth.middleware";

const router = Router();

// Get Dashboard Statistics (Admin & Teacher only)
router.get("/", protect, getDashboardStats);

export default router;
