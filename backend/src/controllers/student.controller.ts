import { Request, Response, NextFunction } from "express";
import Student from "../models/Student";
import User from "../models/User";
import ClassAssignment from "../models/ClassAssignment";

interface TeacherAssignment {
  className: string;
  section: string;
}

/**
 * Get a teacher's assigned classes and sections.
 * Returns an empty array if the teacher has no profile or assignments.
 */
const getTeacherAssignments = async (
  userId: string
): Promise<TeacherAssignment[]> => {
  const user = await User.findById(userId).select("teacher").lean();

  if (!user?.teacher) {
    return [];
  }

  const assignments = await ClassAssignment.find({
    teacher: user.teacher,
  })
    .select("className section")
    .lean();

  return assignments.map((assignment) => ({
    className: assignment.className,
    section: assignment.section,
  }));
};

/**
 * Create Student
 */
export const createStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const student = await Student.create(req.body);

    res.status(201).json({
      success: true,
      message: "Student created successfully",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get All Students
 *
 * Admin: Can view all active students.
 * Teacher: Can view active students only from assigned classes/sections.
 */
export const getAllStudents = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const skip = (page - 1) * limit;

    const { search, className, section } = req.query;

    const filter: Record<string, unknown> = {
      isActive: true,
    };

    const conditions: Record<string, unknown>[] = [];

    // Search by student name or student ID
    if (typeof search === "string" && search.trim()) {
      const searchRegex = new RegExp(
        search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
        "i"
      );

      conditions.push({
        $or: [
          { name: searchRegex },
          { studentId: searchRegex },
        ],
      });
    }

    // Filter by class
    if (typeof className === "string" && className.trim()) {
      filter.className = className.trim();
    }

    // Filter by section
    if (typeof section === "string" && section.trim()) {
      filter.section = section.trim().toUpperCase();
    }

    // Restrict Teacher to assigned classes and sections
    if (req.user?.role === "Teacher") {
      const assignments = await getTeacherAssignments(
        req.user.userId
      );

      if (assignments.length === 0) {
        res.status(200).json({
          success: true,
          pagination: {
            currentPage: page,
            limit,
            totalStudents: 0,
            totalPages: 0,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          data: [],
        });
        return;
      }

      conditions.push({
        $or: assignments.map((assignment) => ({
          className: assignment.className,
          section: assignment.section,
        })),
      });
    }

    if (conditions.length > 0) {
      filter.$and = conditions;
    }

    const [students, totalStudents] = await Promise.all([
      Student.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Student.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        limit,
        totalStudents,
        totalPages: Math.ceil(totalStudents / limit),
        hasNextPage: page < Math.ceil(totalStudents / limit),
        hasPreviousPage: page > 1,
      },
      data: students,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Single Student
 *
 * Teacher can only access a student from an assigned class/section.
 */
export const getStudentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let student;

    if (req.user?.role === "Teacher") {
      const assignments = await getTeacherAssignments(
        req.user.userId
      );

      if (assignments.length === 0) {
        res.status(404).json({
          success: false,
          message: "Student not found",
        });
        return;
      }

      student = await Student.findOne({
        _id: req.params.id,
        $or: assignments.map((assignment) => ({
          className: assignment.className,
          section: assignment.section,
        })),
      });
    } else {
      student = await Student.findById(req.params.id);
    }

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Student
 * Route should remain Admin-only.
 */
export const updateStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const student = await Student.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Student updated successfully",
      data: student,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Student
 * Route should remain Admin-only.
 */
export const deleteStudent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Student deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};