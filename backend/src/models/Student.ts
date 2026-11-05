import mongoose, { Document, Schema } from "mongoose";

export interface IStudent extends Document {
  studentId: string;
  name: string;
  roll: number;
  className: string;
  section: string;
  gender: "Male" | "Female" | "Other";
  guardianName: string;
  guardianPhone: string;
  address: string;
  isActive: boolean;
}

const studentSchema = new Schema<IStudent>(
  {
    studentId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    roll: {
      type: Number,
      required: true,
      min: 1,
    },
    className: {
      type: String,
      required: true,
      enum: ["6", "7", "8", "9", "10"],
    },
    section: {
      type: String,
      required: true,
      trim: true,
    },
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: true,
    },
    guardianName: {
      type: String,
      required: true,
      trim: true,
    },
    guardianPhone: {
      type: String,
      required: true,
      trim: true,
    },
    address: {
      type: String,
      required: true,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

const Student = mongoose.model<IStudent>("Student", studentSchema);

export default Student;