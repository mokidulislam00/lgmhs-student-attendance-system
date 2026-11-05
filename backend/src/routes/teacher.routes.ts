import { Router } from "express";

import {
  createTeacher,
  getAllTeachers,
  getTeacherById,
  updateTeacher,
  updateTeacherStatus,
  deleteTeacher,
} from "../controllers/teacher.controller";

import {
  teacherValidation,
  updateTeacherValidation,
} from "../middleware/teacher.validation";

import validateRequest from "../middleware/validateRequest";

import {
  protect,
  authorizeAdmin,
} from "../middleware/auth.middleware";

const router = Router();

// Create Teacher (Admin Only)
router.post(
  "/",
  protect,
  authorizeAdmin,
  teacherValidation,
  validateRequest,
  createTeacher
);

// Get All Teachers (Admin and Teacher)
router.get("/", protect, getAllTeachers);

// Update Teacher Status (Admin Only)
router.patch(
  "/:id/status",
  protect,
  authorizeAdmin,
  updateTeacherStatus
);

// Get Single Teacher (Admin and Teacher)
router.get("/:id", protect, getTeacherById);

// Update Teacher Profile (Admin Only)
router.put(
  "/:id",
  protect,
  authorizeAdmin,
  updateTeacherValidation,
  validateRequest,
  updateTeacher
);

// Delete Teacher (Admin Only)
router.delete(
  "/:id",
  protect,
  authorizeAdmin,
  deleteTeacher
);

export default router;