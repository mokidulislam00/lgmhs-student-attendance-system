
import { body } from "express-validator";

export const studentValidation = [
  body("studentId")
    .trim()
    .notEmpty()
    .withMessage("Student ID is required"),

  body("name")
    .trim()
    .notEmpty()
    .withMessage("Student name is required")
    .isLength({ min: 2, max: 100 })
    .withMessage("Student name must be between 2 and 100 characters"),

  body("roll")
    .isInt({ min: 1 })
    .withMessage("Roll must be a positive number"),

  body("className")
    .isIn(["6", "7", "8", "9", "10"])
    .withMessage("Class must be 6, 7, 8, 9 or 10"),

  body("section")
    .trim()
    .notEmpty()
    .withMessage("Section is required"),

  body("gender")
    .isIn(["Male", "Female", "Other"])
    .withMessage("Invalid gender"),

  body("guardianName")
    .trim()
    .notEmpty()
    .withMessage("Guardian name is required"),

  body("guardianPhone")
    .trim()
    .matches(/^(?:\+8801|8801|01)[3-9]\d{8}$/)
    .withMessage("Please provide a valid Bangladesh phone number"),

  body("address")
    .trim()
    .notEmpty()
    .withMessage("Address is required"),
];

export const updateStudentValidation = [
  body("studentId")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Student ID cannot be empty"),

  body("name")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Student name cannot be empty")
    .isLength({ min: 2, max: 100 })
    .withMessage("Student name must be between 2 and 100 characters"),

  body("roll")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Roll must be a positive number"),

  body("className")
    .optional()
    .isIn(["6", "7", "8", "9", "10"])
    .withMessage("Invalid class"),

  body("section")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Section cannot be empty"),

  body("gender")
    .optional()
    .isIn(["Male", "Female", "Other"])
    .withMessage("Invalid gender"),

  body("guardianName")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Guardian name cannot be empty"),

  body("guardianPhone")
    .optional()
    .trim()
    .matches(/^(?:\+8801|8801|01)[3-9]\d{8}$/)
    .withMessage("Please provide a valid Bangladesh phone number"),

  body("address")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("Address cannot be empty"),

  body("isActive")
    .optional()
    .isBoolean()
    .withMessage("isActive must be true or false"),
];
