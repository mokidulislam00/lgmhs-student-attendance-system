
import { Router } from "express";

import {
  createAttendance,
  bulkAttendance,
  getAllAttendances,
  getAttendanceById,
  updateAttendance,
  deleteAttendance,
  getAttendanceSummary,
} from "../controllers/attendance.controller";

import {
  attendanceValidation,
  updateAttendanceValidation,
} from "../middleware/attendance.validation";

import validateRequest from "../middleware/validateRequest";

import {
  protect,
  authorizeAdmin,
} from "../middleware/auth.middleware";

const router = Router();

// Create Single Attendance (Admin and Teacher)
router.post(
  "/",
  protect,
  attendanceValidation,
  validateRequest,
  createAttendance
);

// Bulk Create / Update Attendance (Admin and Teacher)
router.post("/bulk", protect, bulkAttendance);
router.put("/bulk", protect, bulkAttendance);

// Get All Attendance (Admin and Teacher)
router.get("/", protect, getAllAttendances);

// Get Attendance Summary (Admin and Teacher)
router.get("/summary", protect, getAttendanceSummary);

// Get Single Attendance (Admin and Teacher)
router.get("/:id", protect, getAttendanceById);

// Update Single Attendance (Admin Only)
router.put(
  "/:id",
  protect,
  authorizeAdmin,
  updateAttendanceValidation,
  validateRequest,
  updateAttendance
);

// Delete Attendance (Admin Only)
router.delete("/:id", protect, authorizeAdmin, deleteAttendance);

export default router;
