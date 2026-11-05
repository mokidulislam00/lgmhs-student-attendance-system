
import { Request, Response, NextFunction, ErrorRequestHandler } from "express";
import mongoose from "mongoose";

const errorMiddleware: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let statusCode = 500;
  let message = "Internal server error";

  // Invalid MongoDB ID
  if (err instanceof mongoose.Error.CastError) {
    statusCode = 400;
    message = "Invalid resource ID";
  }

  // Duplicate field error
  else if (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    err.code === 11000
  ) {
    statusCode = 409;
    message = "A record with this value already exists";
  }

  // MongoDB validation error
  else if (err instanceof mongoose.Error.ValidationError) {
    statusCode = 400;
    message = "Database validation failed";
  }

  // Other application errors
  else if (err instanceof Error) {
    message = err.message;
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && err instanceof Error
      ? { stack: err.stack }
      : {}),
  });
};

export default errorMiddleware;
