
import mongoose, { Document, Schema } from "mongoose";

export type UserRole = "Admin" | "Teacher";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  profilePhoto?: string;
  teacher?: mongoose.Types.ObjectId;
  isActive: boolean;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },

    role: {
      type: String,
      enum: ["Admin", "Teacher"],
      required: true,
      default: "Teacher",
    },

    profilePhoto: {
      type: String,
      trim: true,
      default: undefined,
    },

    teacher: {
      type: Schema.Types.ObjectId,
      ref: "Teacher",
      default: undefined,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
      validate: {
        validator: Number.isInteger,
        message: "Token version must be an integer",
      },
    },
  },
  {
    timestamps: true,
  }
);

const User =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
