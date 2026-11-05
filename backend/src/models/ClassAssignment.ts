
import mongoose, { Document, Schema, Types } from "mongoose";

export interface IClassAssignment extends Document {
  teacher: Types.ObjectId;
  className: string;
  section: string;
  createdAt: Date;
  updatedAt: Date;
}

const classAssignmentSchema = new Schema<IClassAssignment>(
  {
    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      required: [true, "Teacher is required"],
    },

    className: {
      type: String,
      required: [true, "Class name is required"],
      enum: ["6", "7", "8", "9", "10"],
      trim: true,
    },

    section: {
      type: String,
      required: [true, "Section is required"],
      trim: true,
      uppercase: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent assigning the same teacher to the same class and section twice.
classAssignmentSchema.index(
  { teacher: 1, className: 1, section: 1 },
  { unique: true }
);

// Efficiently find all teachers assigned to a class and section.
classAssignmentSchema.index({ className: 1, section: 1 });

const ClassAssignment =
  mongoose.models.ClassAssignment ||
  mongoose.model<IClassAssignment>(
    "ClassAssignment",
    classAssignmentSchema
  );

export default ClassAssignment;
