
import { Router } from "express";

import {
  createClassAssignment,
  getAllClassAssignments,
  deleteClassAssignment,
} from "../controllers/classAssignment.controller";

import {
  protect,
  authorizeAdmin,
} from "../middleware/auth.middleware";

const router = Router();

// All class assignment routes require Admin authentication.
router.use(protect, authorizeAdmin);

// Create a class assignment
router.post("/", createClassAssignment);

// Get all class assignments
router.get("/", getAllClassAssignments);

// Delete a class assignment
router.delete("/:id", deleteClassAssignment);

export default router;
