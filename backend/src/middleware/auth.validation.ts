
import { body } from "express-validator";

// First Admin Registration Validation
export const registerAdminValidation = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("Name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Name must be between 2 and 100 characters"),

  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be between 8 and 72 characters"),

  body("setupKey")
    .trim()
    .notEmpty()
    .withMessage("Admin setup key is required"),
];

// Login Validation
export const loginValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// Change Password Validation
export const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),

  body("newPassword")
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage("New password must be between 8 and 72 characters")
    .custom((value, { req }) => {
      if (value === req.body.currentPassword) {
        throw new Error(
          "New password must be different from current password"
        );
      }

      return true;
    }),
];
// Create Teacher Account Validation (Admin Only)
export const createTeacherAccountValidation = [
  body("email")
    .trim()
    .notEmpty()
    .withMessage("Email is required")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),

  body("password")
    .isString()
    .isLength({ min: 8, max: 72 })
    .withMessage("Password must be between 8 and 72 characters"),

  body("teacher")
    .notEmpty()
    .withMessage("Teacher ID is required")
    .isMongoId()
    .withMessage("Invalid Teacher ID"),
];