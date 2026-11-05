
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import ClassAssignment from "../models/ClassAssignment";
import Teacher from "../models/Teacher";

const allowedClasses = ["6", "7", "8", "9", "10"];

// Create Class Assignment
export const createClassAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { teacher, className, section } = req.body;

    if (
      typeof teacher !== "string" ||
      !mongoose.isValidObjectId(teacher)
    ) {
      res.status(400).json({
        success: false,
        message: "Valid teacher ID is required",
      });
      return;
    }

    if (
      typeof className !== "string" ||
      !allowedClasses.includes(className.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid class name",
      });
      return;
    }

    if (
      typeof section !== "string" ||
      !section.trim() ||
      section.trim().length > 20
    ) {
      res.status(400).json({
        success: false,
        message: "Valid section is required",
      });
      return;
    }

    const existingTeacher = await Teacher.findById(teacher);

    if (!existingTeacher || !existingTeacher.isActive) {
      res.status(404).json({
        success: false,
        message: "Active teacher not found",
      });
      return;
    }

    const normalizedClass = className.trim();
    const normalizedSection = section.trim().toUpperCase();

    const existingAssignment = await ClassAssignment.findOne({
      teacher,
      className: normalizedClass,
      section: normalizedSection,
    });

    if (existingAssignment) {
      res.status(409).json({
        success: false,
        message: "This teacher is already assigned to this class and section",
      });
      return;
    }

    const assignment = await ClassAssignment.create({
      teacher,
      className: normalizedClass,
      section: normalizedSection,
    });

    await assignment.populate("teacher", "teacherId name email");

    res.status(201).json({
      success: true,
      message: "Class assignment created successfully",
      data: assignment,
    });
  } catch (error) {
    if (
      error instanceof mongoose.Error &&
      error.name === "ValidationError"
    ) {
      res.status(400).json({
        success: false,
        message: error.message,
      });
      return;
    }

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "This class assignment already exists",
      });
      return;
    }

    next(error);
  }
};

// Get All Class Assignments
export const getAllClassAssignments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const assignments = await ClassAssignment.find()
      .populate("teacher", "teacherId name email designation")
      .sort({ className: 1, section: 1 });

    res.status(200).json({
      success: true,
      total: assignments.length,
      data: assignments,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Class Assignment
export const deleteClassAssignment = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({
        success: false,
        message: "Invalid assignment ID",
      });
      return;
    }

    const assignment = await ClassAssignment.findByIdAndDelete(id);

    if (!assignment) {
      res.status(404).json({
        success: false,
        message: "Class assignment not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Class assignment deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
