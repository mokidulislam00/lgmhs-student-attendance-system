
import mongoose, { Document, Schema } from "mongoose";

export interface IAttendance extends Document {
  student: mongoose.Types.ObjectId;
  attendanceDate: Date;
  status: "Present" | "Absent" | "Late" | "Excused";
  className: string;
  section: string;
  remarks?: string;
}

const attendanceSchema = new Schema<IAttendance>(
  {
    student: {
      type: Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    attendanceDate: {
      type: Date,
      required: true,
    },

    status: {
      type: String,
      enum: ["Present", "Absent", "Late", "Excused"],
      required: true,
    },

    className: {
      type: String,
      required: true,
      trim: true,
    },

    section: {
      type: String,
      required: true,
      trim: true,
    },

    remarks: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate attendance for the same student on the same date
attendanceSchema.index(
  { student: 1, attendanceDate: 1 },
  { unique: true }
);

const Attendance = mongoose.model<IAttendance>(
  "Attendance",
  attendanceSchema
);

export default Attendance;
