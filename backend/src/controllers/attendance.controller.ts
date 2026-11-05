
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";

import Attendance from "../models/Attendance";
import Student from "../models/Student";
import User from "../models/User";
import ClassAssignment from "../models/ClassAssignment";

type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

const parseAttendanceDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;

  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!dateMatch) return null;

  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[2]);
  const day = Number(dateMatch[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return date;
};

const getDateRange = (date: Date) => {
  const endOfDay = new Date(date);
  endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

  return {
    $gte: date,
    $lt: endOfDay,
  };
};

type TeacherAssignment = {
  className: string;
  section: string;
};

const normalizeClassName = (value: string): string => value.trim();

const normalizeSection = (value: string): string =>
  value.trim().toUpperCase();

const getTeacherAssignments = async (
  userId: string
): Promise<TeacherAssignment[]> => {
  const user = await User.findById(userId).select("teacher");

  if (!user?.teacher) return [];

  const assignments = await ClassAssignment.find({
    teacher: user.teacher,
  }).select("className section -_id");

  return assignments.map((assignment) => ({
    className: normalizeClassName(assignment.className),
    section: normalizeSection(assignment.section),
  }));
};

const hasTeacherClassAccess = async (
  userId: string,
  className: string,
  section: string
): Promise<boolean> => {
  const user = await User.findById(userId).select("teacher");

  if (!user?.teacher) return false;

  const assignment = await ClassAssignment.exists({
    teacher: user.teacher,
    className: normalizeClassName(className),
    section: normalizeSection(section),
  });

  return Boolean(assignment);
};

const isDuplicateKeyError = (error: unknown): boolean => {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: number }).code === 11000
  );
};

// Create Attendance
export const createAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { student, attendanceDate, status, remarks } = req.body;

    const normalizedDate = parseAttendanceDate(attendanceDate);

    if (!normalizedDate) {
      res.status(400).json({
        success: false,
        message: "Invalid attendance date. Use YYYY-MM-DD format.",
      });
      return;
    }

    if (!mongoose.isValidObjectId(student)) {
      res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
      return;
    }

    const existingStudent = await Student.findById(student);

    if (!existingStudent || !existingStudent.isActive) {
      res.status(404).json({
        success: false,
        message: "Active student not found",
      });
      return;
    }

    if (req.user?.role === "Teacher") {
      const hasAccess = await hasTeacherClassAccess(
        req.user.userId,
        existingStudent.className,
        existingStudent.section
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this class and section",
        });
        return;
      }
    }

    const existingAttendance = await Attendance.findOne({
      student,
      attendanceDate: normalizedDate,
    }).select("_id status");

    if (existingAttendance) {
      res.status(409).json({
        success: false,
        message:
          "Attendance has already been recorded for this student on this date.",
        data: {
          attendanceId: existingAttendance._id,
          status: existingAttendance.status,
        },
      });
      return;
    }

    const attendance = await Attendance.create({
      student,
      attendanceDate: normalizedDate,
      status,
      className: existingStudent.className,
      section: normalizeSection(existingStudent.section),
      remarks,
    });

    res.status(201).json({
      success: true,
      message: "Attendance created successfully",
      data: attendance,
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        success: false,
        message:
          "Attendance has already been recorded for this student on this date.",
      });
      return;
    }

    next(error);
  }
};

// Bulk Create / Update Attendance
export const bulkAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      date,
      attendanceDate: providedAttendanceDate,
      className,
      section,
      records,
      updateExisting = false,
    } = req.body;

    const attendanceDate = providedAttendanceDate ?? date;
    const normalizedDate = parseAttendanceDate(attendanceDate);

    if (!normalizedDate) {
      res.status(400).json({
        success: false,
        message: "Invalid attendance date. Use YYYY-MM-DD format.",
      });
      return;
    }

    if (
      typeof className !== "string" ||
      !className.trim() ||
      typeof section !== "string" ||
      !section.trim()
    ) {
      res.status(400).json({
        success: false,
        message: "Class name and section are required",
      });
      return;
    }

    const normalizedClassName = normalizeClassName(className);
    const normalizedSection = normalizeSection(section);

    if (typeof updateExisting !== "boolean") {
      res.status(400).json({
        success: false,
        message: "updateExisting must be a boolean",
      });
      return;
    }

    // Only Admin can correct existing attendance records.
    if (updateExisting && req.user?.role !== "Admin") {
      res.status(403).json({
        success: false,
        message: "Only Admin can update existing attendance records",
      });
      return;
    }

    if (
      !Array.isArray(records) ||
      records.length === 0 ||
      records.length > 500
    ) {
      res.status(400).json({
        success: false,
        message: "Records must contain between 1 and 500 students",
      });
      return;
    }

    const allowedStatuses: AttendanceStatus[] = [
      "Present",
      "Absent",
      "Late",
      "Excused",
    ];

    const studentIds: string[] = [];

    for (const record of records) {
      if (
        !record ||
        typeof record.student !== "string" ||
        !mongoose.isValidObjectId(record.student)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid student ID in attendance records",
        });
        return;
      }

      if (!allowedStatuses.includes(record.status)) {
        res.status(400).json({
          success: false,
          message: "Invalid attendance status in records",
        });
        return;
      }

      if (
        record.remarks !== undefined &&
        (typeof record.remarks !== "string" ||
          record.remarks.length > 500)
      ) {
        res.status(400).json({
          success: false,
          message: "Remarks must be a string with maximum 500 characters",
        });
        return;
      }

      studentIds.push(record.student);
    }

    if (new Set(studentIds).size !== studentIds.length) {
      res.status(400).json({
        success: false,
        message: "Duplicate student IDs found in request",
      });
      return;
    }

    const students = await Student.find({
      _id: { $in: studentIds },
      isActive: true,
    }).select("_id className section");

    if (students.length !== studentIds.length) {
      res.status(404).json({
        success: false,
        message: "One or more students were not found or are inactive",
      });
      return;
    }

    const studentMap = new Map(
      students.map((student) => [student._id.toString(), student])
    );

    for (const record of records) {
      const student = studentMap.get(record.student);

      if (
        !student ||
        normalizeClassName(student.className) !== normalizedClassName ||
        normalizeSection(student.section) !== normalizedSection
      ) {
        res.status(400).json({
          success: false,
          message:
            "All students must belong to the specified class and section",
        });
        return;
      }
    }

    if (req.user?.role === "Teacher") {
      const hasAccess = await hasTeacherClassAccess(
        req.user.userId,
        normalizedClassName,
        normalizedSection
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this class and section",
        });
        return;
      }
    }

    const objectStudentIds = studentIds.map(
      (id) => new mongoose.Types.ObjectId(id)
    );

    const baseFilter = {
      student: { $in: objectStudentIds },
      attendanceDate: normalizedDate,
    };

    // Normal submission: reject if any student is already marked.
    if (!updateExisting) {
      const existingRecords = await Attendance.find(baseFilter)
        .select("student status")
        .lean();

      if (existingRecords.length > 0) {
        const existingStudentIds = existingRecords.map((record) =>
          record.student.toString()
        );

        res.status(409).json({
          success: false,
          message:
            "Some students already have attendance recorded for this date. Duplicate attendance is not allowed.",
          data: {
            alreadyMarkedCount: existingRecords.length,
            alreadyMarkedStudentIds: existingStudentIds,
          },
        });
        return;
      }
    }

    const operations = records.map((record) => {
      const studentId = new mongoose.Types.ObjectId(record.student);

      const filter = {
        student: studentId,
        attendanceDate: normalizedDate,
        ...(updateExisting
          ? {
              className: normalizedClassName,
              section: normalizedSection,
            }
          : {}),
      };

      const attendanceData = {
        status: record.status,
        className: normalizedClassName,
        section: normalizedSection,
        ...(record.remarks !== undefined
          ? { remarks: record.remarks }
          : {}),
      };

      return {
        updateOne: {
          filter,
          update: updateExisting
            ? { $set: attendanceData }
            : {
                $setOnInsert: {
                  student: studentId,
                  attendanceDate: normalizedDate,
                  ...attendanceData,
                },
              },
          upsert: !updateExisting,
        },
      };
    });

    const result = await Attendance.bulkWrite(operations, {
      ordered: true,
    });

    const insertedCount = result.upsertedCount;
    const updatedCount = updateExisting ? result.matchedCount : 0;
    const skippedCount = updateExisting ? 0 : result.matchedCount;

    const notFoundCount = updateExisting
      ? records.length - result.matchedCount
      : 0;

    res.status(200).json({
      success: true,
      message: updateExisting
        ? "Attendance corrections processed successfully"
        : "Attendance submitted successfully",
      data: {
        attendanceDate,
        className: normalizedClassName,
        section: normalizedSection,
        totalRecords: records.length,
        insertedCount,
        updatedCount,
        skippedCount,
        notFoundCount,
      },
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      res.status(409).json({
        success: false,
        message:
          "Some students already have attendance recorded for this date. Duplicate attendance is not allowed.",
      });
      return;
    }

    next(error);
  }
};

// Get All Attendances with Filters
export const getAllAttendances = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date, className, section, status } = req.query;
    const filter: Record<string, unknown> = {};

    if (date !== undefined) {
      const selectedDate = parseAttendanceDate(date);

      if (!selectedDate) {
        res.status(400).json({
          success: false,
          message: "Invalid attendance date. Use YYYY-MM-DD format.",
        });
        return;
      }

      filter["attendanceDate"] = getDateRange(selectedDate);
    }

    if (className && typeof className === "string") {
      filter["className"] = normalizeClassName(className);
    }

    if (section && typeof section === "string") {
      filter["section"] = normalizeSection(section);
    }

    const allowedStatuses = ["Present", "Absent", "Late", "Excused"];

    if (status && typeof status === "string") {
      if (!allowedStatuses.includes(status)) {
        res.status(400).json({
          success: false,
          message: "Invalid attendance status",
        });
        return;
      }

      filter["status"] = status;
    }

    if (req.user?.role === "Teacher") {
      const assignments = await getTeacherAssignments(req.user.userId);

      if (assignments.length === 0) {
        res.status(200).json({
          success: true,
          total: 0,
          data: [],
        });
        return;
      }

      const requestedClass =
        typeof className === "string"
          ? normalizeClassName(className)
          : null;

      const requestedSection =
        typeof section === "string"
          ? normalizeSection(section)
          : null;

      const matchingAssignments = assignments.filter(
        (assignment) =>
          (!requestedClass || assignment.className === requestedClass) &&
          (!requestedSection || assignment.section === requestedSection)
      );

      if (
        (requestedClass || requestedSection) &&
        matchingAssignments.length === 0
      ) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this class and section",
        });
        return;
      }

      filter["$or"] = matchingAssignments.map((assignment) => ({
        className: assignment.className,
        section: assignment.section,
      }));
    }

    const attendances = await Attendance.find(filter)
      .populate("student", "studentId name roll")
      .sort({ attendanceDate: -1 });

    res.status(200).json({
      success: true,
      total: attendances.length,
      data: attendances,
    });
  } catch (error) {
    next(error);
  }
};

// Get Single Attendance
export const getAttendanceById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attendance = await Attendance.findById(req.params.id)
      .populate("student", "studentId name roll");

    if (!attendance) {
      res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
      return;
    }

    if (req.user?.role === "Teacher") {
      const hasAccess = await hasTeacherClassAccess(
        req.user.userId,
        attendance.className,
        attendance.section
      );

      if (!hasAccess) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this class and section",
        });
        return;
      }
    }

    res.status(200).json({
      success: true,
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// Update Attendance
export const updateAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { status, remarks } = req.body;

    const updateData: {
      status?: AttendanceStatus;
      remarks?: string;
    } = {};

    if (status !== undefined) updateData.status = status;
    if (remarks !== undefined) updateData.remarks = remarks;

    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      { $set: updateData },
      {
        new: true,
        runValidators: true,
      }
    ).populate("student", "studentId name roll");

    if (!attendance) {
      res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Attendance updated successfully",
      data: attendance,
    });
  } catch (error) {
    next(error);
  }
};

// Delete Attendance
export const deleteAttendance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const attendance = await Attendance.findByIdAndDelete(req.params.id);

    if (!attendance) {
      res.status(404).json({
        success: false,
        message: "Attendance not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Attendance deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get Attendance Summary
export const getAttendanceSummary = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date, className, section } = req.query;
    const matchFilter: Record<string, unknown> = {};

    if (date !== undefined) {
      const selectedDate = parseAttendanceDate(date);

      if (!selectedDate) {
        res.status(400).json({
          success: false,
          message: "Invalid attendance date. Use YYYY-MM-DD format.",
        });
        return;
      }

      matchFilter["attendanceDate"] = getDateRange(selectedDate);
    }

    if (className && typeof className === "string") {
      matchFilter["className"] = normalizeClassName(className);
    }

    if (section && typeof section === "string") {
      matchFilter["section"] = normalizeSection(section);
    }

    let teacherAssignments: TeacherAssignment[] | null = null;

    if (req.user?.role === "Teacher") {
      const assignments = await getTeacherAssignments(req.user.userId);

      if (assignments.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            date: date || null,
            className: className || "All",
            section: section || "All",
            totalStudents: 0,
            totalMarked: 0,
            present: 0,
            absent: 0,
            late: 0,
            excused: 0,
            attendancePercentage: 0,
          },
        });
        return;
      }

      const requestedClass =
        typeof className === "string"
          ? normalizeClassName(className)
          : null;

      const requestedSection =
        typeof section === "string"
          ? normalizeSection(section)
          : null;

      teacherAssignments = assignments.filter(
        (assignment) =>
          (!requestedClass || assignment.className === requestedClass) &&
          (!requestedSection || assignment.section === requestedSection)
      );

      if (
        (requestedClass || requestedSection) &&
        teacherAssignments.length === 0
      ) {
        res.status(403).json({
          success: false,
          message: "You are not assigned to this class and section",
        });
        return;
      }

      matchFilter["$or"] = teacherAssignments.map((assignment) => ({
        className: assignment.className,
        section: assignment.section,
      }));
    }

    const summary = await Attendance.aggregate([
      { $match: matchFilter },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    const studentFilter: Record<string, unknown> = {
      isActive: true,
      ...(className && typeof className === "string"
        ? { className: normalizeClassName(className) }
        : {}),
      ...(section && typeof section === "string"
        ? { section: normalizeSection(section) }
        : {}),
    };

    if (teacherAssignments) {
      studentFilter["$or"] = teacherAssignments.map((assignment) => ({
        className: assignment.className,
        section: assignment.section,
      }));
    }

    const totalStudents = await Student.countDocuments(studentFilter);

    const attendanceCounts = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Excused: 0,
    };

    summary.forEach((item) => {
      if (item._id in attendanceCounts) {
        attendanceCounts[
          item._id as keyof typeof attendanceCounts
        ] = item.count;
      }
    });

    const totalMarked =
      attendanceCounts.Present +
      attendanceCounts.Absent +
      attendanceCounts.Late +
      attendanceCounts.Excused;

    const attendancePercentage =
      totalMarked > 0
        ? Number(
            (
              ((attendanceCounts.Present + attendanceCounts.Late) /
                totalMarked) *
              100
            ).toFixed(2)
          )
        : 0;

    res.status(200).json({
      success: true,
      data: {
        date: date || null,
        className: className || "All",
        section: section || "All",
        totalStudents,
        totalMarked,
        present: attendanceCounts.Present,
        absent: attendanceCounts.Absent,
        late: attendanceCounts.Late,
        excused: attendanceCounts.Excused,
        attendancePercentage,
      },
    });
  } catch (error) {
    next(error);
  }
};
