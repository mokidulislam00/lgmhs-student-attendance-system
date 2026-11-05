
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";

import authRoutes from "./routes/auth.routes";
import studentRoutes from "./routes/student.routes";
import attendanceRoutes from "./routes/attendance.routes";
import dashboardRoutes from "./routes/dashboard.routes";
import teacherRoutes from "./routes/teacher.routes";
import reportsRoutes from "./routes/reports.routes";
import classAssignmentRoutes from "./routes/classAssignment.routes";

import errorMiddleware from "./middleware/error.middleware";

dotenv.config();

const app = express();

const CLIENT_URL = process.env.CLIENT_URL || "http://localhost:3000";

// CORS Configuration
app.use(
  cors({
    origin: CLIENT_URL,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Middleware
app.use(express.json());

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/students", studentRoutes);
app.use("/api/attendances", attendanceRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/teachers", teacherRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/class-assignments", classAssignmentRoutes);

// Health Check
app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Student Attendance API is running!",
    timestamp: new Date().toISOString(),
  });
});

// Global Error Handler
app.use(errorMiddleware);

const PORT = Number(process.env.PORT) || 5000;

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
