
import { Request, Response, NextFunction } from "express";
import { validationResult } from "express-validator";

const validateRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    res.status(400).json({
      success: false,
      message: "Validation failed",
      errors: errors.array().map((error) => ({
        field: "path" in error ? error.path : "unknown",
        message: error.msg,
      })),
    });
    return;
  }

  next();
};

export default validateRequest;
