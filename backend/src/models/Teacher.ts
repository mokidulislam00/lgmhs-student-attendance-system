
import mongoose, { Document, Schema } from "mongoose";

export interface ITeacher extends Document {
  teacherId: string;
  name: string;
  phone: string;
  email?: string;
  gender: "Male" | "Female" | "Other";
  designation: string;
  subject: string[];
  qualification: string;
  address?: string;
  joiningDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const teacherSchema = new Schema<ITeacher>(
  {
    teacherId: {
      type: String,
      required: [true, "Teacher ID is required"],
      unique: true,
      trim: true,
      uppercase: true,
    },

    name: {
      type: String,
      required: [true, "Teacher name is required"],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: undefined,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
      required: [true, "Gender is required"],
    },

    designation: {
      type: String,
      required: [true, "Designation is required"],
      trim: true,
    },

    subject: {
      type: [String],
      required: [true, "At least one subject is required"],
      validate: {
        validator: (subjects: string[]) =>
          subjects.length > 0 &&
          subjects.every((subject) => subject.trim().length > 0),
        message: "At least one valid subject is required",
      },
    },

    qualification: {
      type: String,
      required: [true, "Qualification is required"],
      trim: true,
    },

    address: {
      type: String,
      trim: true,
    },

    joiningDate: {
      type: Date,
      required: [true, "Joining date is required"],
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Teacher = mongoose.model<ITeacher>("Teacher", teacherSchema);

export default Teacher;
