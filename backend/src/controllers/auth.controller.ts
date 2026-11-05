
import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import Teacher from "../models/Teacher";
import User, { UserRole } from "../models/User";

// Authentication constants
const AUTH_COOKIE_NAME = "lgmhs_access_token";
const TOKEN_EXPIRES_IN = "1d";
const COOKIE_MAX_AGE = 24 * 60 * 60 * 1000;

// Cookie configuration
const getAuthCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: COOKIE_MAX_AGE,
});

// Cookie clearing configuration
const getAuthCookieClearOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
});

// Authenticated Request Type
interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

// Register First Admin
export const registerAdmin = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { name, email, password, setupKey } = req.body;

    const adminSetupKey = process.env.ADMIN_SETUP_KEY;

    if (!adminSetupKey) {
      res.status(500).json({
        success: false,
        message: "Admin registration is not configured",
      });
      return;
    }

    if (setupKey !== adminSetupKey) {
      res.status(403).json({
        success: false,
        message: "Invalid admin setup key",
      });
      return;
    }

    const existingAdmin = await User.findOne({ role: "Admin" });

    if (existingAdmin) {
      res.status(403).json({
        success: false,
        message: "Admin account has already been registered",
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "Admin",
    });

    const { password: _password, ...safeUser } = user.toObject();

    res.status(201).json({
      success: true,
      message: "Admin registered successfully",
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

// Login
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password } = req.body;

    const normalizedEmail = String(email).trim().toLowerCase();

    const user = await User.findOne({
      email: normalizedEmail,
    }).select("+password");

    if (!user) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      password,
      user.password
    );

    if (!isPasswordValid) {
      res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      res.status(500).json({
        success: false,
        message: "JWT secret is not configured",
      });
      return;
    }

    const token = jwt.sign(
      {
        userId: user._id.toString(),
        role: user.role,
        tokenVersion: user.tokenVersion ?? 0,
      },
      jwtSecret,
      {
        expiresIn: TOKEN_EXPIRES_IN,
      }
    );

    res.cookie(
      AUTH_COOKIE_NAME,
      token,
      getAuthCookieOptions()
    );

    const { password: _password, ...safeUser } = user.toObject();

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

// Get Current Authenticated User
export const getMe = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const user = await User.findById(userId).select(
      "name email role teacher profilePhoto isActive createdAt"
    );

    if (!user || !user.isActive) {
      res.status(401).json({
        success: false,
        message: "User account not found or inactive",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Authenticated user retrieved successfully",
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// Update Admin Profile (Admin Only)
export const updateAdminProfile = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    if (req.user?.role !== "Admin") {
      res.status(403).json({
        success: false,
        message: "Only Admin can update the admin profile",
      });
      return;
    }

    const { name, email, profilePhoto } = req.body;

    if (
      name === undefined &&
      email === undefined &&
      profilePhoto === undefined
    ) {
      res.status(400).json({
        success: false,
        message: "At least one profile field is required",
      });
      return;
    }

    const updateData: {
      name?: string;
      email?: string;
      profilePhoto?: string;
    } = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({
          success: false,
          message: "A valid name is required",
        });
        return;
      }

      updateData.name = name.trim();
    }

    if (email !== undefined) {
      if (typeof email !== "string" || !email.trim()) {
        res.status(400).json({
          success: false,
          message: "A valid email is required",
        });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(normalizedEmail)) {
        res.status(400).json({
          success: false,
          message: "Please provide a valid email address",
        });
        return;
      }

      const existingUser = await User.findOne({
        email: normalizedEmail,
        _id: { $ne: userId },
      });

      if (existingUser) {
        res.status(409).json({
          success: false,
          message: "Email is already registered",
        });
        return;
      }

      updateData.email = normalizedEmail;
    }

    if (profilePhoto !== undefined) {
      if (
        profilePhoto !== null &&
        typeof profilePhoto !== "string"
      ) {
        res.status(400).json({
          success: false,
          message: "Invalid profile photo value",
        });
        return;
      }

      updateData.profilePhoto =
        typeof profilePhoto === "string"
          ? profilePhoto.trim()
          : "";
    }

    const admin = await User.findOneAndUpdate(
      {
        _id: userId,
        role: "Admin",
      },
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
      }
    ).select(
      "name email role profilePhoto isActive createdAt updatedAt"
    );

    if (!admin) {
      res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Admin profile updated successfully",
      data: admin,
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
        message: "Email is already registered",
      });
      return;
    }

    next(error);
  }
};

// Logout and Invalidate Current JWT
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const cookieHeader = req.headers.cookie;

    const authCookie = cookieHeader
      ?.split(";")
      .map((cookie) => cookie.trim())
      .find((cookie) =>
        cookie.startsWith(`${AUTH_COOKIE_NAME}=`)
      );

    const token = authCookie
      ? decodeURIComponent(
          authCookie.substring(AUTH_COOKIE_NAME.length + 1)
        )
      : null;

    const jwtSecret = process.env.JWT_SECRET;

    if (token && jwtSecret) {
      let decoded: string | jwt.JwtPayload | null = null;

      try {
        decoded = jwt.verify(token, jwtSecret);
      } catch {
        // Invalid or expired token: continue clearing the cookie.
      }

      if (
        decoded &&
        typeof decoded !== "string" &&
        typeof decoded.userId === "string"
      ) {
        await User.findByIdAndUpdate(
          decoded.userId,
          { $inc: { tokenVersion: 1 } }
        );
      }
    }

    res.clearCookie(
      AUTH_COOKIE_NAME,
      getAuthCookieClearOptions()
    );

    res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    next(error);
  }
};

// Change Password
export const changePassword = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    const user = await User.findById(userId).select("+password");

    if (!user) {
      res.status(404).json({
        success: false,
        message: "User not found",
      });
      return;
    }

    const isPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
      return;
    }

    user.password = await bcrypt.hash(newPassword, 12);
    user.tokenVersion = (user.tokenVersion ?? 0) + 1;

    await user.save();

    res.clearCookie(
      AUTH_COOKIE_NAME,
      getAuthCookieClearOptions()
    );

    res.status(200).json({
      success: true,
      message: "Password changed successfully. Please login again.",
    });
  } catch (error) {
    next(error);
  }
};

// Create Teacher Account (Admin Only)
export const createTeacherAccount = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password, teacher } = req.body;

    const teacherProfile = await Teacher.findById(teacher);

    if (!teacherProfile) {
      res.status(404).json({
        success: false,
        message: "Teacher profile not found",
      });
      return;
    }

    if (!teacherProfile.isActive) {
      res.status(400).json({
        success: false,
        message: "Cannot create an account for an inactive teacher",
      });
      return;
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      res.status(409).json({
        success: false,
        message: "Email is already registered",
      });
      return;
    }

    const existingTeacherAccount = await User.findOne({
      teacher,
    });

    if (existingTeacherAccount) {
      res.status(409).json({
        success: false,
        message: "This teacher already has an account",
      });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: teacherProfile.name,
      email: normalizedEmail,
      password: hashedPassword,
      role: "Teacher",
      teacher: teacherProfile._id,
    });

    const { password: _password, ...safeUser } = user.toObject();

    res.status(201).json({
      success: true,
      message: "Teacher account created successfully",
      data: safeUser,
    });
  } catch (error) {
    next(error);
  }
};

// Get All Teacher Login Accounts (Admin Only)
export const getTeacherAccounts = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.role !== "Admin") {
      res.status(403).json({
        success: false,
        message: "Only Admin can view teacher accounts",
      });
      return;
    }

    const accounts = await User.find({
      role: "Teacher",
    })
      .select("name email role teacher isActive createdAt updatedAt")
      .populate(
        "teacher",
        "teacherId name designation subject isActive"
      )
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      message: "Teacher accounts retrieved successfully",
      data: accounts,
    });
  } catch (error) {
    next(error);
  }
};

// Update Teacher Login Account Status (Admin Only)
export const updateTeacherAccountStatus = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (req.user?.role !== "Admin") {
      res.status(403).json({
        success: false,
        message: "Only Admin can update teacher account status",
      });
      return;
    }

    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== "boolean") {
      res.status(400).json({
        success: false,
        message: "isActive must be a boolean value",
      });
      return;
    }

    // Find the Teacher login account.
    const account = await User.findOne({
      _id: id,
      role: "Teacher",
    });

    if (!account) {
      res.status(404).json({
        success: false,
        message: "Teacher account not found",
      });
      return;
    }

    // Verify the linked Teacher profile.
    if (!account.teacher) {
      res.status(409).json({
        success: false,
        message: "No teacher profile is linked to this account",
      });
      return;
    }

    const teacherProfile = await Teacher.findById(account.teacher);

    if (!teacherProfile) {
      res.status(404).json({
        success: false,
        message: "Linked teacher profile not found",
      });
      return;
    }

    // Synchronize Teacher Profile status.
    teacherProfile.isActive = isActive;
    await teacherProfile.save();

    // Synchronize Login Account status.
    account.isActive = isActive;

    // Invalidate existing sessions when deactivating.
    if (!isActive) {
      account.tokenVersion = (account.tokenVersion ?? 0) + 1;
    }

    await account.save();

    const updatedAccount = await User.findById(account._id)
      .select("name email role teacher isActive createdAt updatedAt")
      .populate(
        "teacher",
        "teacherId name designation subject isActive"
      );

    res.status(200).json({
      success: true,
      message: `Teacher account ${
        isActive ? "activated" : "deactivated"
      } successfully`,
      data: updatedAccount,
    });
  } catch (error) {
    next(error);
  }
};
