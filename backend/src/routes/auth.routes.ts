
import { Router } from "express";

import {
  login,
  getMe,
  logout,
  changePassword,
  createTeacherAccount,
  updateAdminProfile,
  getTeacherAccounts,
  updateTeacherAccountStatus,
} from "../controllers/auth.controller";

import {
  loginValidation,
  changePasswordValidation,
  createTeacherAccountValidation,
} from "../middleware/auth.validation";

import validateRequest from "../middleware/validateRequest";

import {
  protect,
  authorizeAdmin,
} from "../middleware/auth.middleware";

const router = Router();

// User Login
router.post(
  "/login",
  loginValidation,
  validateRequest,
  login
);

// Get Current Authenticated User
router.get(
  "/me",
  protect,
  getMe
);

// User Logout
// Public so an expired or invalid session can still clear its cookie.
router.post(
  "/logout",
  logout
);

// Change Password (Protected)
router.put(
  "/change-password",
  protect,
  changePasswordValidation,
  validateRequest,
  changePassword
);

// Update Admin Profile (Admin Only)
router.put(
  "/admin-profile",
  protect,
  authorizeAdmin,
  updateAdminProfile
);

// Create Teacher Account (Admin Only)
router.post(
  "/create-teacher-account",
  protect,
  authorizeAdmin,
  createTeacherAccountValidation,
  validateRequest,
  createTeacherAccount
);

// Get All Teacher Accounts (Admin Only)
router.get(
  "/teacher-accounts",
  protect,
  authorizeAdmin,
  getTeacherAccounts
);

// Activate / Deactivate Teacher Account (Admin Only)
router.patch(
  "/teacher-accounts/:id/status",
  protect,
  authorizeAdmin,
  updateTeacherAccountStatus
);

export default router;
