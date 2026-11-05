
import { Request, Response, NextFunction } from "express";
import mongoose from "mongoose";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

import Student from "../models/Student";
import Attendance from "../models/Attendance";

// Parse strict YYYY-MM-DD date
const parseReportDate = (value: unknown): Date | null => {
  if (typeof value !== "string") {
    return null;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

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

// Get Daily Attendance Report
export const getDailyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { date, className, section, page = "1", limit = "20" } =
      req.query;

    // Validate date
    const selectedDate = parseReportDate(date);

    if (!selectedDate) {
      res.status(400).json({
        success: false,
        message: "A valid date is required. Use YYYY-MM-DD format.",
      });
      return;
    }

    // Validate pagination
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 100",
      });
      return;
    }

    // Validate optional filters
    if (
      className !== undefined &&
      (typeof className !== "string" || !className.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid class name",
      });
      return;
    }

    if (
      section !== undefined &&
      (typeof section !== "string" || !section.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid section",
      });
      return;
    }

    // Attendance dates are stored at UTC midnight
    const startOfDay = selectedDate;

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // Student filter
    const studentFilter: Record<string, unknown> = {
      isActive: true,
    };

    if (typeof className === "string") {
      studentFilter.className = className.trim();
    }

    if (typeof section === "string") {
      studentFilter.section = section.trim();
    }

    // Get all active students matching filters
    const students = await Student.find(studentFilter)
      .select("studentId name roll className section")
      .sort({ className: 1, section: 1, roll: 1 })
      .lean();

    // Get attendance records for selected date
    const attendanceFilter: Record<string, unknown> = {
      attendanceDate: {
        $gte: startOfDay,
        $lt: endOfDay,
      },
    };

    if (typeof className === "string") {
      attendanceFilter.className = className.trim();
    }

    if (typeof section === "string") {
      attendanceFilter.section = section.trim();
    }

    const attendances = await Attendance.find(attendanceFilter)
      .select("student status remarks")
      .lean();

    // Map attendance by student ID
    const attendanceMap = new Map(
      attendances.map((attendance) => [
        attendance.student.toString(),
        attendance,
      ])
    );

    // Build report records
    const reportRecords = students.map((student) => {
      const attendance = attendanceMap.get(student._id.toString());

      return {
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          roll: student.roll,
          className: student.className,
          section: student.section,
        },
        status: attendance?.status ?? "Not Marked",
        remarks: attendance?.remarks ?? null,
      };
    });

    // Calculate summary before pagination
    const summary = {
      totalStudents: students.length,
      totalMarked: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      notMarked: 0,
    };

    reportRecords.forEach((record) => {
      switch (record.status) {
        case "Present":
          summary.present++;
          break;
        case "Absent":
          summary.absent++;
          break;
        case "Late":
          summary.late++;
          break;
        case "Excused":
          summary.excused++;
          break;
        default:
          summary.notMarked++;
      }
    });

    summary.totalMarked =
      summary.present +
      summary.absent +
      summary.late +
      summary.excused;

    const attendancePercentage =
      summary.totalMarked > 0
        ? Number(
            (
              ((summary.present + summary.late) /
                summary.totalMarked) *
              100
            ).toFixed(2)
          )
        : 0;

    // Pagination
    const totalRecords = reportRecords.length;
    const totalPages = Math.ceil(totalRecords / limitNumber);
    const skip = (pageNumber - 1) * limitNumber;

    const paginatedRecords = reportRecords.slice(
      skip,
      skip + limitNumber
    );

    res.status(200).json({
      success: true,
      data: {
        date,
        filters: {
          className: className || "All",
          section: section || "All",
        },
        summary: {
          ...summary,
          attendancePercentage,
        },
        pagination: {
          totalRecords,
          totalPages,
          currentPage: pageNumber,
          limit: limitNumber,
        },
        records: paginatedRecords,
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Date Range Attendance Report
export const getDateRangeReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      startDate,
      endDate,
      className,
      section,
      page = "1",
      limit = "20",
    } = req.query;

    // Validate date range
    const start = parseReportDate(startDate);
    const end = parseReportDate(endDate);

    if (!start || !end) {
      res.status(400).json({
        success: false,
        message:
          "Valid startDate and endDate are required. Use YYYY-MM-DD format.",
      });
      return;
    }

    if (start > end) {
      res.status(400).json({
        success: false,
        message: "startDate cannot be greater than endDate",
      });
      return;
    }

    // Validate pagination
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      res.status(400).json({
        success: false,
        message: "Page must be positive and limit must be between 1 and 100",
      });
      return;
    }

    // Validate optional filters
    if (
      className !== undefined &&
      (typeof className !== "string" || !className.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid class name",
      });
      return;
    }

    if (
      section !== undefined &&
      (typeof section !== "string" || !section.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid section",
      });
      return;
    }

    // Exclusive end date
    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    // Get active students
    const studentFilter: Record<string, unknown> = {
      isActive: true,
    };

    if (typeof className === "string") {
      studentFilter.className = className.trim();
    }

    if (typeof section === "string") {
      studentFilter.section = section.trim();
    }

    const students = await Student.find(studentFilter)
      .select("studentId name roll className section")
      .sort({ className: 1, section: 1, roll: 1 })
      .lean();

    // Get attendance records within date range
    const attendanceFilter: Record<string, unknown> = {
      attendanceDate: {
        $gte: start,
        $lt: endExclusive,
      },
    };

    if (typeof className === "string") {
      attendanceFilter.className = className.trim();
    }

    if (typeof section === "string") {
      attendanceFilter.section = section.trim();
    }

    const attendances = await Attendance.find(attendanceFilter)
      .select("student attendanceDate status remarks")
      .sort({ attendanceDate: 1 })
      .lean();

    // Group attendance by student
    const attendanceMap = new Map<string, typeof attendances>();

    attendances.forEach((attendance) => {
      const studentId = attendance.student.toString();

      const existing = attendanceMap.get(studentId) ?? [];
      existing.push(attendance);

      attendanceMap.set(studentId, existing);
    });

    // Build student-wise report
    const reportRecords = students.map((student) => {
      const studentAttendances =
        attendanceMap.get(student._id.toString()) ?? [];

      const summary = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        notMarked: 0,
        totalMarked: studentAttendances.length,
      };

      studentAttendances.forEach((attendance) => {
        switch (attendance.status) {
          case "Present":
            summary.present++;
            break;
          case "Absent":
            summary.absent++;
            break;
          case "Late":
            summary.late++;
            break;
          case "Excused":
            summary.excused++;
            break;
        }
      });

      // Calendar-day based count; school holidays are not excluded yet
      const totalDays =
        Math.floor(
          (endExclusive.getTime() - start.getTime()) /
            (1000 * 60 * 60 * 24)
        );

      summary.notMarked = Math.max(
        0,
        totalDays - summary.totalMarked
      );

      const attendancePercentage =
        summary.totalMarked > 0
          ? Number(
              (
                ((summary.present + summary.late) /
                  summary.totalMarked) *
                100
              ).toFixed(2)
            )
          : 0;

      return {
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          roll: student.roll,
          className: student.className,
          section: student.section,
        },
        summary: {
          ...summary,
          attendancePercentage,
        },
        attendanceRecords: studentAttendances.map((attendance) => ({
          date: attendance.attendanceDate.toISOString().slice(0, 10),
          status: attendance.status,
          remarks: attendance.remarks ?? null,
        })),
      };
    });

    // Overall summary
    const overall = {
      totalStudents: students.length,
      totalMarked: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      notMarked: 0,
    };

    reportRecords.forEach((record) => {
      overall.present += record.summary.present;
      overall.absent += record.summary.absent;
      overall.late += record.summary.late;
      overall.excused += record.summary.excused;
      overall.notMarked += record.summary.notMarked;
      overall.totalMarked += record.summary.totalMarked;
    });

    const attendancePercentage =
      overall.totalMarked > 0
        ? Number(
            (
              ((overall.present + overall.late) /
                overall.totalMarked) *
              100
            ).toFixed(2)
          )
        : 0;

    // Pagination
    const totalRecords = reportRecords.length;
    const totalPages = Math.ceil(totalRecords / limitNumber);
    const skip = (pageNumber - 1) * limitNumber;

    res.status(200).json({
      success: true,
      data: {
        startDate,
        endDate,
        filters: {
          className: className || "All",
          section: section || "All",
        },
        summary: {
          ...overall,
          attendancePercentage,
        },
        pagination: {
          totalRecords,
          totalPages,
          currentPage: pageNumber,
          limit: limitNumber,
        },
        records: reportRecords.slice(skip, skip + limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};

// Get Monthly Attendance Report
export const getMonthlyReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      year,
      month,
      className,
      section,
      page = "1",
      limit = "20",
    } = req.query;

    // Validate year and month
    const yearNumber = Number(year);
    const monthNumber = Number(month);

    if (
      typeof year !== "string" ||
      !/^\d{4}$/.test(year) ||
      !Number.isInteger(yearNumber) ||
      yearNumber < 1 ||
      yearNumber > 9999 ||
      typeof month !== "string" ||
      !/^\d{1,2}$/.test(month) ||
      !Number.isInteger(monthNumber) ||
      monthNumber < 1 ||
      monthNumber > 12
    ) {
      res.status(400).json({
        success: false,
        message: "Valid year and month are required.",
      });
      return;
    }

    // Validate pagination
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      res.status(400).json({
        success: false,
        message:
          "Page must be positive and limit must be between 1 and 100",
      });
      return;
    }

    // Validate optional filters
    if (
      className !== undefined &&
      (typeof className !== "string" || !className.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid class name",
      });
      return;
    }

    if (
      section !== undefined &&
      (typeof section !== "string" || !section.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid section",
      });
      return;
    }

    // Month range: UTC midnight to next month's UTC midnight
    const startOfMonth = new Date(
      Date.UTC(yearNumber, monthNumber - 1, 1)
    );

    const startOfNextMonth = new Date(
      Date.UTC(yearNumber, monthNumber, 1)
    );

    const totalDays = Math.floor(
      (startOfNextMonth.getTime() - startOfMonth.getTime()) /
        (1000 * 60 * 60 * 24)
    );

    // Active student filter
    const studentFilter: Record<string, unknown> = {
      isActive: true,
    };

    if (typeof className === "string") {
      studentFilter.className = className.trim();
    }

    if (typeof section === "string") {
      studentFilter.section = section.trim();
    }

    // Get active students
    const students = await Student.find(studentFilter)
      .select("studentId name roll className section")
      .sort({ className: 1, section: 1, roll: 1 })
      .lean();

    // Attendance filter
    const attendanceFilter: Record<string, unknown> = {
      attendanceDate: {
        $gte: startOfMonth,
        $lt: startOfNextMonth,
      },
    };

    if (typeof className === "string") {
      attendanceFilter.className = className.trim();
    }

    if (typeof section === "string") {
      attendanceFilter.section = section.trim();
    }

    // Get monthly attendance records
    const attendances = await Attendance.find(attendanceFilter)
      .select("student attendanceDate status remarks")
      .sort({ attendanceDate: 1 })
      .lean();

    // Group attendance by student
    const attendanceMap = new Map<string, typeof attendances>();

    attendances.forEach((attendance) => {
      const studentId = attendance.student.toString();

      const existing = attendanceMap.get(studentId) ?? [];
      existing.push(attendance);

      attendanceMap.set(studentId, existing);
    });

    // Build student-wise monthly report
    const reportRecords = students.map((student) => {
      const studentAttendances =
        attendanceMap.get(student._id.toString()) ?? [];

      const summary = {
        present: 0,
        absent: 0,
        late: 0,
        excused: 0,
        notMarked: 0,
        totalMarked: studentAttendances.length,
      };

      studentAttendances.forEach((attendance) => {
        switch (attendance.status) {
          case "Present":
            summary.present++;
            break;

          case "Absent":
            summary.absent++;
            break;

          case "Late":
            summary.late++;
            break;

          case "Excused":
            summary.excused++;
            break;
        }
      });

      // Calendar-day based count.
      // Weekends and school holidays are not excluded.
      summary.notMarked = Math.max(
        0,
        totalDays - summary.totalMarked
      );

      const attendancePercentage =
        summary.totalMarked > 0
          ? Number(
              (
                ((summary.present + summary.late) /
                  summary.totalMarked) *
                100
              ).toFixed(2)
            )
          : 0;

      return {
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          roll: student.roll,
          className: student.className,
          section: student.section,
        },
        summary: {
          ...summary,
          attendancePercentage,
        },
        attendanceRecords: studentAttendances.map((attendance) => ({
          date: attendance.attendanceDate.toISOString().slice(0, 10),
          status: attendance.status,
          remarks: attendance.remarks ?? null,
        })),
      };
    });

    // Calculate overall monthly summary
    const overall = {
      totalStudents: students.length,
      totalMarked: 0,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      notMarked: 0,
    };

    reportRecords.forEach((record) => {
      overall.present += record.summary.present;
      overall.absent += record.summary.absent;
      overall.late += record.summary.late;
      overall.excused += record.summary.excused;
      overall.notMarked += record.summary.notMarked;
      overall.totalMarked += record.summary.totalMarked;
    });

    const attendancePercentage =
      overall.totalMarked > 0
        ? Number(
            (
              ((overall.present + overall.late) /
                overall.totalMarked) *
              100
            ).toFixed(2)
          )
        : 0;

    // Pagination
    const totalRecords = reportRecords.length;
    const totalPages = Math.ceil(totalRecords / limitNumber);
    const skip = (pageNumber - 1) * limitNumber;

    res.status(200).json({
      success: true,
      data: {
        year: yearNumber,
        month: monthNumber,
        totalDays,
        filters: {
          className: className || "All",
          section: section || "All",
        },
        summary: {
          ...overall,
          attendancePercentage,
        },
        pagination: {
          totalRecords,
          totalPages,
          currentPage: pageNumber,
          limit: limitNumber,
        },
        records: reportRecords.slice(skip, skip + limitNumber),
      },
    });
  } catch (error) {
    next(error);
  }
};
// Get Student-wise Attendance Report
export const getStudentReport = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const studentId = req.params.studentId;

    const {
      startDate,
      endDate,
      page = "1",
      limit = "20",
    } = req.query;

    // Validate MongoDB Student ID
    if (
      typeof studentId !== "string" ||
      !mongoose.Types.ObjectId.isValid(studentId)
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid student ID",
      });
      return;
    }

    // Validate date range
    const start = parseReportDate(startDate);
    const end = parseReportDate(endDate);

    if (!start || !end) {
      res.status(400).json({
        success: false,
        message:
          "Valid startDate and endDate are required. Use YYYY-MM-DD format.",
      });
      return;
    }

    if (start > end) {
      res.status(400).json({
        success: false,
        message: "startDate cannot be greater than endDate",
      });
      return;
    }

    // Validate pagination
    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(pageNumber) ||
      pageNumber < 1 ||
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      res.status(400).json({
        success: false,
        message:
          "Page must be positive and limit must be between 1 and 100",
      });
      return;
    }

    // Find active student
    const student = await Student.findOne({
      _id: studentId,
      isActive: true,
    })
      .select("studentId name roll className section gender")
      .lean();

    if (!student) {
      res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
      return;
    }

    // Exclusive end date
    const endExclusive = new Date(end);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);

    // Get student's attendance within date range
    const attendances = await Attendance.find({
      student: student._id,
      attendanceDate: {
        $gte: start,
        $lt: endExclusive,
      },
    })
      .select("attendanceDate status remarks")
      .sort({ attendanceDate: 1 })
      .lean();

    // Calculate summary
    const summary = {
      totalDays: Math.floor(
        (endExclusive.getTime() - start.getTime()) /
          (1000 * 60 * 60 * 24)
      ),
      totalMarked: attendances.length,
      present: 0,
      absent: 0,
      late: 0,
      excused: 0,
      notMarked: 0,
    };

    attendances.forEach((attendance) => {
      switch (attendance.status) {
        case "Present":
          summary.present++;
          break;

        case "Absent":
          summary.absent++;
          break;

        case "Late":
          summary.late++;
          break;

        case "Excused":
          summary.excused++;
          break;
      }
    });

    // Calendar-day based count.
    // Weekends and school holidays are not excluded.
    summary.notMarked = Math.max(
      0,
      summary.totalDays - summary.totalMarked
    );

    const attendancePercentage =
      summary.totalMarked > 0
        ? Number(
            (
              ((summary.present + summary.late) /
                summary.totalMarked) *
              100
            ).toFixed(2)
          )
        : 0;

    // Pagination
    const totalRecords = attendances.length;
    const totalPages = Math.ceil(totalRecords / limitNumber);
    const skip = (pageNumber - 1) * limitNumber;

    const paginatedAttendances = attendances
      .slice(skip, skip + limitNumber)
      .map((attendance) => ({
        date: attendance.attendanceDate.toISOString().slice(0, 10),
        status: attendance.status,
        remarks: attendance.remarks ?? null,
      }));

    res.status(200).json({
      success: true,
      data: {
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          roll: student.roll,
          className: student.className,
          section: student.section,
          gender: student.gender,
        },
        dateRange: {
          startDate,
          endDate,
        },
        summary: {
          ...summary,
          attendancePercentage,
        },
        pagination: {
          totalRecords,
          totalPages,
          currentPage: pageNumber,
          limit: limitNumber,
        },
        attendanceRecords: paginatedAttendances,
      },
    });
  } catch (error) {
    next(error);
  }
};


// Export Attendance Reports as CSV
export const exportReportsCsv = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      reportType,
      date,
      startDate,
      endDate,
      year,
      month,
      studentId,
      className,
      section,
    } = req.query;

    const allowedReportTypes = ["daily", "date-range", "monthly", "student"];

    if (
      typeof reportType !== "string" ||
      !allowedReportTypes.includes(reportType)
    ) {
      res.status(400).json({
        success: false,
        message:
          "A valid reportType is required: daily, date-range, monthly, or student",
      });
      return;
    }

    // Validate optional class and section filters.
    if (
      className !== undefined &&
      (typeof className !== "string" || !className.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid class name",
      });
      return;
    }

    if (
      section !== undefined &&
      (typeof section !== "string" || !section.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid section",
      });
      return;
    }

    let rangeStart: Date;
    let rangeEndExclusive: Date;

    if (reportType === "daily") {
      const selectedDate = parseReportDate(date);

      if (!selectedDate) {
        res.status(400).json({
          success: false,
          message: "A valid date is required. Use YYYY-MM-DD format.",
        });
        return;
      }

      rangeStart = selectedDate;
      rangeEndExclusive = new Date(selectedDate);
      rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);
    } else if (reportType === "date-range" || reportType === "student") {
      const start = parseReportDate(startDate);
      const end = parseReportDate(endDate);

      if (!start || !end) {
        res.status(400).json({
          success: false,
          message:
            "Valid startDate and endDate are required. Use YYYY-MM-DD format.",
        });
        return;
      }

      if (start > end) {
        res.status(400).json({
          success: false,
          message: "startDate cannot be greater than endDate",
        });
        return;
      }

      rangeStart = start;
      rangeEndExclusive = new Date(end);
      rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);
    } else {
      const yearNumber = Number(year);
      const monthNumber = Number(month);

      if (
        typeof year !== "string" ||
        !/^\d{4}$/.test(year) ||
        !Number.isInteger(yearNumber) ||
        yearNumber < 1 ||
        yearNumber > 9999 ||
        typeof month !== "string" ||
        !/^\d{1,2}$/.test(month) ||
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        res.status(400).json({
          success: false,
          message: "Valid year and month are required.",
        });
        return;
      }

      rangeStart = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
      rangeEndExclusive = new Date(Date.UTC(yearNumber, monthNumber, 1));
    }

    // Student-wise export requires a valid active student ID.
    if (reportType === "student") {
      if (
        typeof studentId !== "string" ||
        !mongoose.Types.ObjectId.isValid(studentId)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
        return;
      }
    }

    const studentFilter: Record<string, unknown> = { isActive: true };

    if (className !== undefined) {
      studentFilter.className = className;
    }

    if (section !== undefined) {
      studentFilter.section = section;
    }

    if (reportType === "student") {
      studentFilter._id = studentId;
    }

    const students = await Student.find(studentFilter)
      .select("_id studentId name roll className section gender")
      .sort({ className: 1, section: 1, roll: 1 })
      .lean();

    if (reportType === "student" && students.length === 0) {
      res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
      return;
    }

    const studentIds = students.map((student) => student._id);

    const attendances = await Attendance.find({
      student: { $in: studentIds },
      attendanceDate: {
        $gte: rangeStart,
        $lt: rangeEndExclusive,
      },
    })
      .select("student attendanceDate status remarks")
      .sort({ attendanceDate: 1 })
      .lean();

    const studentMap = new Map(
      students.map((student) => [String(student._id), student])
    );

    const csvEscape = (value: unknown): string => {
      const text = value === null || value === undefined ? "" : String(value);
      return `"${text.replace(/"/g, '""')}"`;
    };

    const headers = [
      "Date",
      "Student ID",
      "Student Name",
      "Roll",
      "Class",
      "Section",
      "Gender",
      "Status",
      "Remarks",
    ];

    const rows: string[][] = [];

    if (reportType === "daily") {
      const attendanceMap = new Map(
        attendances.map((attendance) => [
          String(attendance.student),
          attendance,
        ])
      );

      for (const student of students) {
        const attendance = attendanceMap.get(String(student._id));

        rows.push([
          rangeStart.toISOString().slice(0, 10),
          student.studentId,
          student.name,
          student.roll,
          student.className,
          student.section,
          student.gender,
          attendance?.status ?? "Not Marked",
          attendance?.remarks ?? "",
        ].map(csvEscape));
      }
    } else {
      for (const attendance of attendances) {
        const student = studentMap.get(String(attendance.student));

        if (!student) {
          continue;
        }

        rows.push([
          attendance.attendanceDate.toISOString().slice(0, 10),
          student.studentId,
          student.name,
          student.roll,
          student.className,
          student.section,
          student.gender,
          attendance.status,
          attendance.remarks ?? "",
        ].map(csvEscape));
      }
    }

    const csvContent = [
      headers.map(csvEscape).join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\r\n");

    const fileDate = new Date().toISOString().slice(0, 10);
    const filename = `attendance-${reportType}-${fileDate}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    // UTF-8 BOM helps Microsoft Excel display text correctly.
    res.status(200).send(`\uFEFF${csvContent}`);
  } catch (error) {
    next(error);
  }
};


// Export Attendance Reports as Excel
export const exportReportsExcel = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      reportType,
      date,
      startDate,
      endDate,
      year,
      month,
      studentId,
      className,
      section,
    } = req.query;

    const allowedReportTypes = ["daily", "date-range", "monthly", "student"];

    if (
      typeof reportType !== "string" ||
      !allowedReportTypes.includes(reportType)
    ) {
      res.status(400).json({
        success: false,
        message:
          "A valid reportType is required: daily, date-range, monthly, or student",
      });
      return;
    }

    // Validate optional class and section filters.
    if (
      className !== undefined &&
      (typeof className !== "string" || !className.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid class name",
      });
      return;
    }

    if (
      section !== undefined &&
      (typeof section !== "string" || !section.trim())
    ) {
      res.status(400).json({
        success: false,
        message: "Invalid section",
      });
      return;
    }

    let rangeStart: Date;
    let rangeEndExclusive: Date;

    if (reportType === "daily") {
      const selectedDate = parseReportDate(date);

      if (!selectedDate) {
        res.status(400).json({
          success: false,
          message: "A valid date is required. Use YYYY-MM-DD format.",
        });
        return;
      }

      rangeStart = selectedDate;
      rangeEndExclusive = new Date(selectedDate);
      rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);
    } else if (reportType === "date-range" || reportType === "student") {
      const start = parseReportDate(startDate);
      const end = parseReportDate(endDate);

      if (!start || !end) {
        res.status(400).json({
          success: false,
          message:
            "Valid startDate and endDate are required. Use YYYY-MM-DD format.",
        });
        return;
      }

      if (start > end) {
        res.status(400).json({
          success: false,
          message: "startDate cannot be greater than endDate",
        });
        return;
      }

      rangeStart = start;
      rangeEndExclusive = new Date(end);
      rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);
    } else {
      const yearNumber = Number(year);
      const monthNumber = Number(month);

      if (
        typeof year !== "string" ||
        !/^\d{4}$/.test(year) ||
        !Number.isInteger(yearNumber) ||
        yearNumber < 1 ||
        yearNumber > 9999 ||
        typeof month !== "string" ||
        !/^\d{1,2}$/.test(month) ||
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        res.status(400).json({
          success: false,
          message: "Valid year and month are required.",
        });
        return;
      }

      rangeStart = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
      rangeEndExclusive = new Date(Date.UTC(yearNumber, monthNumber, 1));
    }

    // Student-wise export requires a valid active student ID.
    if (reportType === "student") {
      if (
        typeof studentId !== "string" ||
        !mongoose.Types.ObjectId.isValid(studentId)
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid student ID",
        });
        return;
      }
    }

    const studentFilter: Record<string, unknown> = { isActive: true };

    if (className !== undefined) {
      studentFilter.className = className;
    }

    if (section !== undefined) {
      studentFilter.section = section;
    }

    if (reportType === "student") {
      studentFilter._id = studentId;
    }

    const students = await Student.find(studentFilter)
      .select("_id studentId name roll className section gender")
      .sort({ className: 1, section: 1, roll: 1 })
      .lean();

    if (reportType === "student" && students.length === 0) {
      res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
      return;
    }

    const studentIds = students.map((student) => student._id);

    const attendances = await Attendance.find({
      student: { $in: studentIds },
      attendanceDate: {
        $gte: rangeStart,
        $lt: rangeEndExclusive,
      },
    })
      .select("student attendanceDate status remarks")
      .sort({ attendanceDate: 1 })
      .lean();

    const studentMap = new Map(
      students.map((student) => [String(student._id), student])
    );

    const headers = [
      "Date",
      "Student ID",
      "Student Name",
      "Roll",
      "Class",
      "Section",
      "Gender",
      "Status",
      "Remarks",
    ];

    const rows: unknown[][] = [];

    if (reportType === "daily") {
      const attendanceMap = new Map(
        attendances.map((attendance) => [
          String(attendance.student),
          attendance,
        ])
      );

      for (const student of students) {
        const attendance = attendanceMap.get(String(student._id));

        rows.push([
          rangeStart.toISOString().slice(0, 10),
          student.studentId,
          student.name,
          student.roll,
          student.className,
          student.section,
          student.gender,
          attendance?.status ?? "Not Marked",
          attendance?.remarks ?? "",
        ]);
      }
    } else {
      for (const attendance of attendances) {
        const student = studentMap.get(String(attendance.student));

        if (!student) {
          continue;
        }

        rows.push([
          attendance.attendanceDate.toISOString().slice(0, 10),
          student.studentId,
          student.name,
          student.roll,
          student.className,
          student.section,
          student.gender,
          attendance.status,
          attendance.remarks ?? "",
        ]);
      }
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Student Attendance System";
    workbook.subject = "Attendance Report";
    workbook.title = `Attendance ${reportType} Report`;
    workbook.created = new Date();

    const worksheet = workbook.addWorksheet("Attendance Report", {
      views: [{ state: "frozen", ySplit: 1 }],
    });

    worksheet.columns = [
      { header: headers[0], key: "date", width: 15 },
      { header: headers[1], key: "studentId", width: 20 },
      { header: headers[2], key: "studentName", width: 28 },
      { header: headers[3], key: "roll", width: 10 },
      { header: headers[4], key: "className", width: 12 },
      { header: headers[5], key: "section", width: 12 },
      { header: headers[6], key: "gender", width: 12 },
      { header: headers[7], key: "status", width: 16 },
      { header: headers[8], key: "remarks", width: 35 },
    ];

    // Format the header row for readability in Excel.
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF1D4ED8" },
    };
    headerRow.alignment = { vertical: "middle", horizontal: "center" };
    headerRow.height = 24;

    for (const row of rows) {
      worksheet.addRow(row);
    }

    // Keep long remarks readable and make the table easy to filter.
    worksheet.getColumn(9).alignment = {
      vertical: "top",
      wrapText: true,
    };
    worksheet.autoFilter = {
      from: "A1",
      to: "I1",
    };

    const fileDate = new Date().toISOString().slice(0, 10);
    const filename = `attendance-${reportType}-${fileDate}.xlsx`;
    const fileBuffer = await workbook.xlsx.writeBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${filename}"`
    );
    res.status(200).send(Buffer.from(fileBuffer));
  } catch (error) {
    next(error);
  }
};


// Export Attendance Reports as PDF
export const exportReportsPdf = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const {
      reportType,
      date,
      startDate,
      endDate,
      year,
      month,
      studentId,
      className,
      section,
    } = req.query;

    const allowedReportTypes = ["daily", "date-range", "monthly", "student"];

    if (
      typeof reportType !== "string" ||
      !allowedReportTypes.includes(reportType)
    ) {
      res.status(400).json({
        success: false,
        message:
          "A valid reportType is required: daily, date-range, monthly, or student",
      });
      return;
    }

    if (
      className !== undefined &&
      (typeof className !== "string" || !className.trim())
    ) {
      res.status(400).json({ success: false, message: "Invalid class name" });
      return;
    }

    if (
      section !== undefined &&
      (typeof section !== "string" || !section.trim())
    ) {
      res.status(400).json({ success: false, message: "Invalid section" });
      return;
    }

    let rangeStart: Date;
    let rangeEndExclusive: Date;
    let reportPeriod = "";

    if (reportType === "daily") {
      const selectedDate = parseReportDate(date);
      if (!selectedDate) {
        res.status(400).json({
          success: false,
          message: "A valid date is required. Use YYYY-MM-DD format.",
        });
        return;
      }
      rangeStart = selectedDate;
      rangeEndExclusive = new Date(selectedDate);
      rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);
      reportPeriod = `Date: ${String(date)}`;
    } else if (reportType === "date-range" || reportType === "student") {
      const start = parseReportDate(startDate);
      const end = parseReportDate(endDate);
      if (!start || !end) {
        res.status(400).json({
          success: false,
          message:
            "Valid startDate and endDate are required. Use YYYY-MM-DD format.",
        });
        return;
      }
      if (start > end) {
        res.status(400).json({
          success: false,
          message: "startDate cannot be greater than endDate",
        });
        return;
      }
      rangeStart = start;
      rangeEndExclusive = new Date(end);
      rangeEndExclusive.setUTCDate(rangeEndExclusive.getUTCDate() + 1);
      reportPeriod = `Date Range: ${String(startDate)} to ${String(endDate)}`;
    } else {
      const yearNumber = Number(year);
      const monthNumber = Number(month);
      if (
        typeof year !== "string" ||
        !/^\d{4}$/.test(year) ||
        !Number.isInteger(yearNumber) ||
        yearNumber < 1 ||
        yearNumber > 9999 ||
        typeof month !== "string" ||
        !/^\d{1,2}$/.test(month) ||
        !Number.isInteger(monthNumber) ||
        monthNumber < 1 ||
        monthNumber > 12
      ) {
        res.status(400).json({
          success: false,
          message: "Valid year and month are required.",
        });
        return;
      }
      rangeStart = new Date(Date.UTC(yearNumber, monthNumber - 1, 1));
      rangeEndExclusive = new Date(Date.UTC(yearNumber, monthNumber, 1));
      reportPeriod = `Month: ${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
    }

    if (reportType === "student" && (
      typeof studentId !== "string" ||
      !mongoose.Types.ObjectId.isValid(studentId)
    )) {
      res.status(400).json({ success: false, message: "Invalid student ID" });
      return;
    }

    const studentFilter: Record<string, unknown> = { isActive: true };
    if (typeof className === "string") studentFilter.className = className.trim();
    if (typeof section === "string") studentFilter.section = section.trim();
    if (reportType === "student") studentFilter._id = studentId;

    const students = await Student.find(studentFilter)
      .select("_id studentId name roll className section gender")
      .sort({ className: 1, section: 1, roll: 1 })
      .lean();

    if (reportType === "student" && students.length === 0) {
      res.status(404).json({
        success: false,
        message: "Student not found or inactive",
      });
      return;
    }

    const studentIds = students.map((student) => student._id);
    const attendances = await Attendance.find({
      student: { $in: studentIds },
      attendanceDate: { $gte: rangeStart, $lt: rangeEndExclusive },
    })
      .select("student attendanceDate status remarks")
      .sort({ attendanceDate: 1 })
      .lean();

    const studentMap = new Map(
      students.map((student) => [String(student._id), student])
    );

    type PdfRow = {
      date: string;
      studentId: string;
      name: string;
      roll: string;
      className: string;
      section: string;
      gender: string;
      status: string;
      remarks: string;
    };

    const rows: PdfRow[] = [];
    if (reportType === "daily") {
      const attendanceMap = new Map(
        attendances.map((attendance) => [String(attendance.student), attendance])
      );
      for (const student of students) {
        const attendance = attendanceMap.get(String(student._id));
        rows.push({
          date: rangeStart.toISOString().slice(0, 10),
          studentId: student.studentId,
          name: student.name,
          roll: String(student.roll),
          className: student.className,
          section: student.section,
          gender: student.gender,
          status: attendance?.status ?? "Not Marked",
          remarks: attendance?.remarks ?? "",
        });
      }
    } else {
      for (const attendance of attendances) {
        const student = studentMap.get(String(attendance.student));
        if (!student) continue;
        rows.push({
          date: attendance.attendanceDate.toISOString().slice(0, 10),
          studentId: student.studentId,
          name: student.name,
          roll: String(student.roll),
          className: student.className,
          section: student.section,
          gender: student.gender,
          status: attendance.status,
          remarks: attendance.remarks ?? "",
        });
      }
    }

    const summary = {
      totalStudents: students.length,
      totalRecords: rows.length,
      present: rows.filter((row) => row.status === "Present").length,
      absent: rows.filter((row) => row.status === "Absent").length,
      late: rows.filter((row) => row.status === "Late").length,
      excused: rows.filter((row) => row.status === "Excused").length,
      notMarked: rows.filter((row) => row.status === "Not Marked").length,
    };
    const attendancePercentage =
      summary.present + summary.absent + summary.late + summary.excused > 0
        ? Number(
            (((summary.present + summary.late) /
              (summary.present + summary.absent + summary.late + summary.excused)) * 100).toFixed(2)
          )
        : 0;

    const filename = `attendance-${reportType}-${new Date().toISOString().slice(0, 10)}.pdf`;
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margins: { top: 35, bottom: 35, left: 30, right: 30 },
      autoFirstPage: true,
      bufferPages: true,
    });
    doc.on("error", next);
    doc.pipe(res);

    const pageWidth = doc.page.width;
    const left = doc.page.margins.left;
    const tableWidth = pageWidth - left - doc.page.margins.right;
    const columns = [
      { title: "Date", key: "date" as const, width: 58 },
      { title: "Student ID", key: "studentId" as const, width: 82 },
      { title: "Student Name", key: "name" as const, width: 112 },
      { title: "Roll", key: "roll" as const, width: 34 },
      { title: "Class", key: "className" as const, width: 42 },
      { title: "Section", key: "section" as const, width: 44 },
      { title: "Gender", key: "gender" as const, width: 48 },
      { title: "Status", key: "status" as const, width: 66 },
      { title: "Remarks", key: "remarks" as const, width: tableWidth - 486 },
    ];

    const drawPageHeading = () => {
      doc.font("Helvetica-Bold").fontSize(17).fillColor("#172554")
        .text("Lalmohan Govt Model High School", { align: "center" });
      doc.moveDown(0.25);
      doc.font("Helvetica-Bold").fontSize(13).fillColor("#1D4ED8")
        .text(`${reportType.replace("-", " ").toUpperCase()} ATTENDANCE REPORT`, { align: "center" });
      doc.moveDown(0.25);
      doc.font("Helvetica").fontSize(9).fillColor("#333333")
        .text(reportPeriod, { align: "center" });
      doc.text(`Class: ${typeof className === "string" ? className : "All"}    Section: ${typeof section === "string" ? section : "All"}`, { align: "center" });
      doc.moveDown(0.7);
    };

    const drawTableHeader = () => {
      const y = doc.y;
      let x = left;
      doc.font("Helvetica-Bold").fontSize(8).fillColor("#FFFFFF");
      for (const column of columns) {
        doc.rect(x, y, column.width, 22).fillAndStroke("#1D4ED8", "#FFFFFF");
        doc.fillColor("#FFFFFF").text(column.title, x + 3, y + 7, {
          width: column.width - 6,
          height: 10,
          lineBreak: false,
          ellipsis: true,
        });
        x += column.width;
      }
      doc.y = y + 22;
    };

    drawPageHeading();
    doc.font("Helvetica-Bold").fontSize(9).fillColor("#111827")
      .text(`Students: ${summary.totalStudents}    Records: ${summary.totalRecords}    Present: ${summary.present}    Absent: ${summary.absent}    Late: ${summary.late}    Excused: ${summary.excused}    Not Marked: ${summary.notMarked}    Attendance: ${attendancePercentage}%`);
    doc.moveDown(0.8);
    drawTableHeader();

    for (const [index, row] of rows.entries()) {
      const cellValues = columns.map((column) => String(row[column.key] ?? ""));
      const rowHeight = 26;
      if (doc.y + rowHeight > doc.page.height - doc.page.margins.bottom) {
        doc.addPage();
        drawPageHeading();
        drawTableHeader();
      }
      const y = doc.y;
      let x = left;
      for (let i = 0; i < columns.length; i++) {
        const column = columns[i];
        doc.rect(x, y, column.width, rowHeight)
          .fillAndStroke(index % 2 === 0 ? "#F8FAFC" : "#FFFFFF", "#CBD5E1");
        doc.font("Helvetica").fontSize(7).fillColor("#111827")
          .text(cellValues[i], x + 3, y + 8, {
            width: column.width - 6,
            height: 10,
            lineBreak: false,
            ellipsis: true,
          });
        x += column.width;
      }
      doc.y = y + rowHeight;
    }

    if (rows.length === 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#64748B")
        .text("No attendance records found for the selected filters.", { align: "center" });
    }

    const pages = doc.bufferedPageRange();
    for (let i = 0; i < pages.count; i++) {
      doc.switchToPage(i);
      doc.font("Helvetica").fontSize(8).fillColor("#64748B")
        .text(`Generated: ${new Date().toISOString().slice(0, 10)}    Page ${i + 1} of ${pages.count}`,
          left, doc.page.height - 24, { width: tableWidth, align: "right" });
    }

    doc.end();
  } catch (error) {
    next(error);
  }
};
