
import { Router } from "express";

import {
  protect,
  authorizeAdmin,
} from "../middleware/auth.middleware";

import {
  createStudent,
  getAllStudents,
  getStudentById,
  updateStudent,
  deleteStudent,
} from "../controllers/student.controller";

import {
  studentValidation,
  updateStudentValidation,
} from "../middleware/student.validation";

import validateRequest from "../middleware/validateRequest";

const router = Router();

// Create Student (Admin Only)
router.post(
  "/",
  protect,
  authorizeAdmin,
  studentValidation,
  validateRequest,
  createStudent
);

// Get All Students (Admin and Teacher)
router.get("/", protect, getAllStudents);

// Get Student by ID (Admin and Teacher)
router.get("/:id", protect, getStudentById);

// Update Student (Admin Only)
router.put(
  "/:id",
  protect,
  authorizeAdmin,
  updateStudentValidation,
  validateRequest,
  updateStudent
);

// Delete Student (Admin Only)
router.delete("/:id", protect, authorizeAdmin, deleteStudent);

export default router;
