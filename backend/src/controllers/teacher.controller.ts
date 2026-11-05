import { Request, Response, NextFunction } from "express";

import Teacher from "../models/Teacher";
import User from "../models/User";
import ClassAssignment from "../models/ClassAssignment";

// Create Teacher
export const createTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      teacherId,
      name,
      phone,
      email,
      gender,
      designation,
      subject,
      qualification,
      address,
      joiningDate,
    } = req.body;

    const teacher = await Teacher.create({
      teacherId,
      name,
      phone,
      email,
      gender,
      designation,
      subject,
      qualification,
      address,
      joiningDate,
    });

    res.status(201).json({
      success: true,
      message: "Teacher created successfully",
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Teachers
export const getAllTeachers = async (
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

    const { search, designation, subject, isActive } = req.query;

    const filter: Record<string, unknown> = {};

    if (typeof isActive === "string") {
      if (isActive === "true") {
        filter.isActive = true;
      } else if (isActive === "false") {
        filter.isActive = false;
      }
    } else {
      filter.isActive = true;
    }

    if (typeof search === "string" && search.trim()) {
      const escapedSearch = search
        .trim()
        .replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

      const searchRegex = new RegExp(escapedSearch, "i");

      filter.$or = [
        { name: searchRegex },
        { teacherId: searchRegex },
        { phone: searchRegex },
      ];
    }

    if (typeof designation === "string" && designation.trim()) {
      filter.designation = designation.trim();
    }

    if (typeof subject === "string" && subject.trim()) {
      filter.subject = subject.trim();
    }

    const [teachers, totalTeachers] = await Promise.all([
      Teacher.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Teacher.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      pagination: {
        currentPage: page,
        limit,
        totalTeachers,
        totalPages: Math.ceil(totalTeachers / limit),
        hasNextPage: page < Math.ceil(totalTeachers / limit),
        hasPreviousPage: page > 1,
      },
      data: teachers,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Teacher
export const getTeacherById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: teacher,
    });
  } catch (error) {
    next(error);
  }
};

// Update Teacher Profile
export const updateTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;

    const {
      teacherId,
      name,
      phone,
      email,
      gender,
      designation,
      subject,
      qualification,
      address,
      joiningDate,
      isActive,
    } = req.body;

    if (isActive !== undefined) {
      res.status(400).json({
        success: false,
        message:
          "Teacher status must be updated through the status management API",
      });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (teacherId !== undefined) updateData.teacherId = teacherId;
    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;
    if (gender !== undefined) updateData.gender = gender;
    if (designation !== undefined) updateData.designation = designation;
    if (subject !== undefined) updateData.subject = subject;
    if (qualification !== undefined) {
      updateData.qualification = qualification;
    }
    if (address !== undefined) updateData.address = address;
    if (joiningDate !== undefined) {
      updateData.joiningDate = joiningDate;
    }

    if (Object.keys(updateData).length === 0) {
      res.status(400).json({
        success: false,
        message: "At least one valid teacher field is required",
      });
      return;
    }

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
      return;
    }

    Object.assign(teacher, updateData);

    await teacher.save();

    // Keep the linked login account name synchronized.
    if (name !== undefined) {
      await User.updateOne(
        {
          teacher: teacher._id,
          role: "Teacher",
        },
        {
          $set: {
            name: teacher.name,
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: "Teacher updated successfully",
      data: teacher,
    });
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      res.status(409).json({
        success: false,
        message: "Teacher ID or another unique field already exists",
      });
      return;
    }

    next(error);
  }
};

// Update Teacher Active Status
export const updateTeacherStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be a boolean value",
      });
      return;
    }

    const teacher = await Teacher.findById(id);

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
      return;
    }

    // Update Teacher profile status.
    teacher.isActive = isActive;
    await teacher.save();

    // Update linked login account when one exists.
    const linkedAccount = await User.findOne({
      teacher: teacher._id,
      role: "Teacher",
    });

    if (linkedAccount) {
      await User.updateOne(
        { _id: linkedAccount._id },
        {
          $set: {
            isActive,
          },
          $inc: {
            tokenVersion: 1,
          },
        }
      );
    }

    res.status(200).json({
      success: true,
      message: isActive
        ? "Teacher activated successfully"
        : "Teacher deactivated successfully",
      data: {
        teacher,
        hasLinkedLoginAccount: Boolean(linkedAccount),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Delete Teacher
export const deleteTeacher = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const teacher = await Teacher.findById(req.params.id);

    if (!teacher) {
      res.status(404).json({
        success: false,
        message: "Teacher not found",
      });
      return;
    }

    // Check linked login account.
    const linkedAccount = await User.exists({
      teacher: teacher._id,
      role: "Teacher",
    });

    if (linkedAccount) {
      res.status(409).json({
        success: false,
        message:
          "This teacher has a linked login account. Deactivate the teacher instead of deleting the profile.",
      });
      return;
    }

    // Check existing class assignments.
    const existingAssignment = await ClassAssignment.exists({
      teacher: teacher._id,
    });

    if (existingAssignment) {
      res.status(409).json({
        success: false,
        message:
          "This teacher has class assignments. Remove the assignments before deleting the teacher.",
      });
      return;
    }

    await Teacher.findByIdAndDelete(teacher._id);

    res.status(200).json({
      success: true,
      message: "Teacher deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};