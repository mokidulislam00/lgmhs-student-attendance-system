
import { Router } from "express";

import {
  getDailyReport,
  getDateRangeReport,
  getMonthlyReport,
  getStudentReport,
  exportReportsCsv,
  exportReportsExcel,
  exportReportsPdf,
} from "../controllers/reports.controller";

import { protect } from "../middleware/auth.middleware";

const router = Router();

// Protect all report routes (Admin and Teacher)
router.use(protect);

// GET /api/reports/daily
router.get("/daily", getDailyReport);

// GET /api/reports/date-range
router.get("/date-range", getDateRangeReport);

// GET /api/reports/monthly
router.get("/monthly", getMonthlyReport);

// GET /api/reports/student/:studentId
router.get("/student/:studentId", getStudentReport);

// GET /api/reports/export
router.get("/export", exportReportsCsv);

// GET /api/reports/export/excel
router.get("/export/excel", exportReportsExcel);

// GET /api/reports/export/pdf
router.get("/export/pdf", exportReportsPdf);

export default router;
