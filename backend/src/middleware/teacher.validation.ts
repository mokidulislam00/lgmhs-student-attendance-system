
import { body } from "express-validator";

export const teacherValidation = [
  body("teacherId")
    .trim()
    .notEmpty()
    .withMessage("Teacher ID is required"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Teacher name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Teacher name must be between 2 and 100 characters"),

  body("phone")
    .trim()
    .notEmpty()
    .withMessage("Phone number is required")
    .matches(/^(?:\+8801|8801|01)[3-9]\d{8}$/)
    .withMessage("Please provide a valid Bangladesh phone number"),

  body("email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("gender")
    .isIn(["Male", "Female", "Other"])
    .withMessage("Invalid gender"),

  body("designation")
    .trim()
    .notEmpty()
    .withMessage("Designation is required"),

  body("subject")
    .isArray({ min: 1 })
    .withMessage("At least one subject is required"),

  body("subject.*")
    .trim()
    .notEmpty()
    .withMessage("Subject cannot be empty"),

  body("qualification")
    .trim()
    .notEmpty()
    .withMessage("Qualification is required"),

  body("address")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address cannot be empty"),

  body("joiningDate")
    .notEmpty()
    .withMessage("Joining date is required")
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Please provide a valid joining date (YYYY-MM-DD)"),
];

export const updateTeacherValidation = [
  body("teacherId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Teacher ID cannot be empty"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Teacher name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Teacher name must be between 2 and 100 characters"),

  body("phone")
    .optional()
    .trim()
    .matches(/^(?:\+8801|8801|01)[3-9]\d{8}$/)
    .withMessage("Please provide a valid Bangladesh phone number"),

  body("email")
    .optional({ checkFalsy: true })
    .trim()
    .isEmail()
    .withMessage("Please provide a valid email address"),

  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Invalid gender"),

  body("designation")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Designation cannot be empty"),

  body("subject")
    .optional()
    .isArray({ min: 1 })
    .withMessage("At least one subject is required"),

  body("subject.*")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Subject cannot be empty"),

  body("qualification")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Qualification cannot be empty"),

  body("address")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address cannot be empty"),

  body("joiningDate")
    .optional()
    .isISO8601({ strict: true, strictSeparator: true })
    .withMessage("Please provide a valid joining date (YYYY-MM-DD)"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];
