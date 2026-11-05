
import { body } from "express-validator";

const attendanceStatuses = [
  "Present",
  "Absent",
  "Late",
  "Excused",
];

export const attendanceValidation = [
  body("student")
    .trim()
    .notEmpty()
    .withMessage("Student ID is required")
    .isMongoId()
    .withMessage("Invalid Student ID"),

  body("attendanceDate")
    .notEmpty()
    .withMessage("Attendance date is required")
    .isISO8601()
    .withMessage("Please provide a valid attendance date"),

  body("status")
    .notEmpty()
    .withMessage("Attendance status is required")
    .isIn(attendanceStatuses)
    .withMessage("Invalid attendance status"),



  body("remarks")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Remarks cannot exceed 500 characters"),
];

export const updateAttendanceValidation = [
  body("status")
    .optional()
    .isIn(attendanceStatuses)
    .withMessage("Invalid attendance status"),

  body("remarks")
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage("Remarks cannot exceed 500 characters"),
];
