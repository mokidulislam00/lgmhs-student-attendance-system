
import { Response, NextFunction } from "express";

import Student from "../models/Student";
import Attendance from "../models/Attendance";
import User from "../models/User";
import ClassAssignment from "../models/ClassAssignment";
import { AuthRequest } from "../middleware/auth.middleware";

// Get Dashboard Statistics
export const getDashboardStats = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    let studentFilter: Record<string, unknown> = {};
    let attendanceStudentIds: unknown[] | null = null;

    // Restrict Teacher dashboard to assigned classes and sections.
    if (req.user?.role === "Teacher") {
      const user = await User.findById(req.user.userId).select("teacher");

      if (!user?.teacher) {
        res.status(403).json({
          success: false,
          message: "Teacher profile not found.",
        });
        return;
      }

      const assignments = await ClassAssignment.find({
        teacher: user.teacher,
      }).select("className section -_id");

      if (assignments.length === 0) {
        res.status(200).json({
          success: true,
          data: {
            students: {
              total: 0,
              active: 0,
              inactive: 0,
              classWise: [],
              sectionWise: [],
            },
            todayAttendance: {
              date: "",
              totalMarked: 0,
              present: 0,
              absent: 0,
              late: 0,
              excused: 0,
              attendancePercentage: 0,
            },
          },
        });
        return;
      }

      const assignedClasses = assignments.map((assignment) => ({
        className: assignment.className,
        section: assignment.section,
      }));

      studentFilter = {
        $or: assignedClasses,
      };
    }

    // Get Student Statistics
    const [
      totalStudents,
      activeStudents,
      inactiveStudents,
      classWiseStudents,
      sectionWiseStudents,
      studentsForAttendance,
    ] = await Promise.all([
      Student.countDocuments(studentFilter),

      Student.countDocuments({
        ...studentFilter,
        isActive: true,
      }),

      Student.countDocuments({
        ...studentFilter,
        isActive: false,
      }),

      Student.aggregate([
        {
          $match: {
            ...studentFilter,
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$className",
            total: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),

      Student.aggregate([
        {
          $match: {
            ...studentFilter,
            isActive: true,
          },
        },
        {
          $group: {
            _id: "$section",
            total: { $sum: 1 },
          },
        },
        {
          $sort: { _id: 1 },
        },
      ]),

      Student.find(studentFilter).select("_id"),
    ]);

    attendanceStudentIds = studentsForAttendance.map(
      (student) => student._id
    );

    // Get Today's Date (Bangladesh Time)
    const now = new Date();

    const bdDateParts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Dhaka",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(now);

    const year = bdDateParts.find(
      (part) => part.type === "year"
    )?.value;

    const month = bdDateParts.find(
      (part) => part.type === "month"
    )?.value;

    const day = bdDateParts.find(
      (part) => part.type === "day"
    )?.value;

    if (!year || !month || !day) {
      throw new Error("Unable to determine Bangladesh date");
    }

    const todayDate = `${year}-${month}-${day}`;

    // Attendance dates are stored at UTC midnight.
    const startOfDay = new Date(`${todayDate}T00:00:00.000Z`);

    const endOfDay = new Date(startOfDay);
    endOfDay.setUTCDate(endOfDay.getUTCDate() + 1);

    // Get Today's Attendance Summary
    const attendanceSummary = await Attendance.aggregate([
      {
        $match: {
          attendanceDate: {
            $gte: startOfDay,
            $lt: endOfDay,
          },
          ...(req.user?.role === "Teacher"
            ? {
                student: {
                  $in: attendanceStudentIds,
                },
              }
            : {}),
        },
      },
      {
        $group: {
          _id: "$status",
          total: { $sum: 1 },
        },
      },
    ]);

    const attendanceCounts = {
      Present: 0,
      Absent: 0,
      Late: 0,
      Excused: 0,
    };

    attendanceSummary.forEach((item) => {
      if (item._id in attendanceCounts) {
        attendanceCounts[
          item._id as keyof typeof attendanceCounts
        ] = item.total;
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

    // Send Response
    res.status(200).json({
      success: true,
      data: {
        students: {
          total: totalStudents,
          active: activeStudents,
          inactive: inactiveStudents,
          classWise: classWiseStudents,
          sectionWise: sectionWiseStudents,
        },

        todayAttendance: {
          date: todayDate,
          totalMarked,
          present: attendanceCounts.Present,
          absent: attendanceCounts.Absent,
          late: attendanceCounts.Late,
          excused: attendanceCounts.Excused,
          attendancePercentage,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};
