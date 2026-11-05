
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import User, { UserRole } from "../models/User";

const AUTH_COOKIE_NAME = "lgmhs_access_token";

export interface AuthRequest extends Request {
  user?: {
    userId: string;
    role: UserRole;
  };
}

interface JwtPayload {
  userId: string;
  role: UserRole;
  tokenVersion: number;
}

// Read JWT from HttpOnly cookie
const getTokenFromCookie = (req: Request): string | null => {
  const cookieHeader = req.headers.cookie;

  if (!cookieHeader) {
    return null;
  }

  const cookies = cookieHeader.split(";");

  for (const cookie of cookies) {
    const separatorIndex = cookie.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const name = cookie.slice(0, separatorIndex).trim();
    const value = cookie.slice(separatorIndex + 1).trim();

    if (name === AUTH_COOKIE_NAME && value) {
      return decodeURIComponent(value);
    }
  }

  return null;
};

// Verify JWT and check current user status
export const protect = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Read token only from the HttpOnly cookie
    const token = getTokenFromCookie(req);

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Authentication required. Please login.",
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

    // Verify JWT
   const decoded = jwt.verify(token, jwtSecret, {
  algorithms: ["HS256"],
}) as JwtPayload;
    if (
      !decoded.userId ||
      !["Admin", "Teacher"].includes(decoded.role) ||
      !mongoose.isValidObjectId(decoded.userId) ||
      !Number.isInteger(decoded.tokenVersion) ||
      decoded.tokenVersion < 0
    ) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
      return;
    }

    // Find current user in database
    const user = await User.findById(decoded.userId).select(
      "role isActive tokenVersion"
    );

    if (!user) {
      res.status(401).json({
        success: false,
        message: "User account not found. Please login again.",
      });
      return;
    }

    // Check account status
    if (!user.isActive) {
      res.status(403).json({
        success: false,
        message: "Your account is inactive. Access denied.",
      });
      return;
    }

    // Check current role
    if (user.role !== decoded.role) {
      res.status(401).json({
        success: false,
        message: "User permissions have changed. Please login again.",
      });
      return;
    }

    // Check token version
    const currentTokenVersion = user.tokenVersion ?? 0;

    if (decoded.tokenVersion !== currentTokenVersion) {
      res.status(401).json({
        success: false,
        message: "Session expired. Please login again.",
      });
      return;
    }

    // Attach authenticated user
    req.user = {
      userId: user._id.toString(),
      role: user.role,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        success: false,
        message: "Token has expired. Please login again.",
      });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError || error instanceof URIError) {
      res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
      return;
    }

    next(error);
  }
};

// Admin only authorization
export const authorizeAdmin = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): void => {
  if (req.user?.role !== "Admin") {
    res.status(403).json({
      success: false,
      message: "Access denied. Admin permission required.",
    });
    return;
  }

  next();
};

// Role-based authorization
export const authorizeRoles = (...allowedRoles: UserRole[]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Access denied. You do not have permission.",
      });
      return;
    }

    next();
  };
};
