"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  RefreshCw,
  Search,
  Users,
} from "lucide-react";

import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";

type ReportType = "daily" | "date-range" | "monthly" | "student";
type ExportType = "csv" | "excel" | "pdf";

type Student = {
  _id: string;
  studentId: string;
  name: string;
  roll: number | string;
  className: string;
  section: string;
};

type StudentInfo = {
  id: string;
  studentId: string;
  name: string;
  roll: number | string;
  className: string;
  section: string;
};

type Summary = {
  totalStudents?: number;
  totalMarked?: number;
  totalRecords?: number;
  totalDays?: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  notMarked: number;
  attendancePercentage: number;
};

type DailyRecord = {
  student: StudentInfo;
  status: string;
  remarks?: string | null;
};

type PeriodRecord = {
  student: StudentInfo;
  summary: Summary;
  attendanceRecords: {
    date: string;
    status: string;
    remarks?: string | null;
  }[];
};

type ReportResponse = {
  success: boolean;
  data: {
    summary: Summary;
    pagination: {
      totalRecords: number;
      totalPages: number;
      currentPage: number;
      limit: number;
    };
    records?: DailyRecord[] | PeriodRecord[];
    attendanceRecords?: {
      date: string;
      status: string;
      remarks?: string | null;
    }[];
    student?: StudentInfo & { gender?: string };
    date?: string;
    startDate?: string;
    endDate?: string;
    year?: number;
    month?: number;
    totalDays?: number;
    dateRange?: {
      startDate: string;
      endDate: string;
    };
  };
};

const today = () => {
  const date = new Date();
  const localDate = new Date(
    date.getTime() - date.getTimezoneOffset() * 60000
  );
  return localDate.toISOString().slice(0, 10);
};

const currentMonth = () => {
  const date = new Date();
  return {
    year: String(date.getFullYear()),
    month: String(date.getMonth() + 1),
  };
};

const classes = ["6", "7", "8", "9", "10"];

const sections = ["A", "B", "C", "D"];

const reportOptions: {
  value: ReportType;
  label: string;
  description: string;
}[] = [
  {
    value: "daily",
    label: "Daily Report",
    description: "Attendance for a selected date",
  },
  {
    value: "date-range",
    label: "Date Range Report",
    description: "Attendance between two dates",
  },
  {
    value: "monthly",
    label: "Monthly Report",
    description: "Attendance for a selected month",
  },
  {
    value: "student",
    label: "Student Report",
    description: "Individual student's attendance history",
  },
];

const emptySummary: Summary = {
  totalStudents: 0,
  totalMarked: 0,
  present: 0,
  absent: 0,
  late: 0,
  excused: 0,
  notMarked: 0,
  attendancePercentage: 0,
};

function getErrorMessage(error: unknown): string {
  const axiosError = error as {
    response?: { data?: { message?: string } };
    message?: string;
  };

  return (
    axiosError.response?.data?.message ||
    axiosError.message ||
    "Something went wrong. Please try again."
  );
}

function getStatusStyle(status: string) {
  switch (status) {
    case "Present":
      return "bg-green-50 text-green-700";
    case "Absent":
      return "bg-red-50 text-red-700";
    case "Late":
      return "bg-amber-50 text-amber-700";
    case "Excused":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function ReportsContent() {
  const monthDefaults = useMemo(() => currentMonth(), []);

  const [reportType, setReportType] = useState<ReportType>("daily");
  const [date, setDate] = useState(today());
  const [startDate, setStartDate] = useState(today());
  const [endDate, setEndDate] = useState(today());
  const [year, setYear] = useState(monthDefaults.year);
  const [month, setMonth] = useState(monthDefaults.month);

  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [selectedStudent, setSelectedStudent] = useState("");

  const [students, setStudents] = useState<Student[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);

  const [report, setReport] = useState<ReportResponse["data"] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [exporting, setExporting] = useState<ExportType | null>(null);
  const [page, setPage] = useState(1);

  const limit = 20;

  const fetchStudents = useCallback(async () => {
    setStudentsLoading(true);

    try {
      const response = await api.get("/students", {
        params: {
          page: 1,
          limit: 100,
        },
      });

      const payload = response.data?.data;
      const list = Array.isArray(payload)
        ? payload
        : Array.isArray(payload?.students)
          ? payload.students
          : Array.isArray(response.data?.students)
            ? response.data.students
            : [];

      setStudents(list);
    } catch (err) {
      console.error("Failed to load students:", err);
      setError(getErrorMessage(err));
    } finally {
      setStudentsLoading(false);
    }
  }, []);

  const buildParams = useCallback(
    (currentPage: number) => {
      const params: Record<string, string | number> = {
        page: currentPage,
        limit,
      };

      if (className) params.className = className;
      if (section) params.section = section;

      if (reportType === "daily") {
        params.date = date;
      } else if (reportType === "date-range") {
        params.startDate = startDate;
        params.endDate = endDate;
      } else if (reportType === "monthly") {
        params.year = year;
        params.month = month;
      }

      return params;
    },
    [
      className,
      section,
      reportType,
      date,
      startDate,
      endDate,
      year,
      month,
    ]
  );

  const fetchReport = useCallback(
    async (currentPage = 1) => {
      if (reportType === "student") {
        setError("Student-wise report is not available in this view yet.");
        return;
      }

      if (reportType === "date-range" && startDate > endDate) {
        setError("Start date cannot be greater than end date.");
        return;
      }

      if (reportType === "daily" && !date) {
        setError("Please select a date.");
        return;
      }

      if (reportType === "date-range" && (!startDate || !endDate)) {
        setError("Please select both start and end dates.");
        return;
      }

      if (
        reportType === "monthly" &&
        (!year || !month || Number(month) < 1 || Number(month) > 12)
      ) {
        setError("Please select a valid year and month.");
        return;
      }

      setLoading(true);
      setError("");
      setReport(null);

      try {
        const endpoint =
          reportType === "daily"
            ? "/reports/daily"
            : reportType === "date-range"
              ? "/reports/date-range"
              : "/reports/monthly";

        const response = await api.get<ReportResponse>(endpoint, {
          params: buildParams(currentPage),
        });

        if (!response.data?.success || !response.data?.data) {
          throw new Error("Invalid report response from server.");
        }

        setReport(response.data.data);
        setPage(currentPage);
      } catch (err) {
        setError(getErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [
      reportType,
      date,
      startDate,
      endDate,
      year,
      month,
      buildParams,
    ]
  );

  const handleGenerate = () => {
    setPage(1);
    void fetchReport(1);
  };

  const handleReset = () => {
    setReport(null);
    setError("");
    setPage(1);
    setClassName("");
    setSection("");
    setDate(today());
    setStartDate(today());
    setEndDate(today());

    const current = currentMonth();
    setYear(current.year);
    setMonth(current.month);
    setSelectedStudent("");
  };

  const handleExport = async (type: ExportType) => {
    if (reportType === "student") {
      setError("Student-wise export is not available in this view yet.");
      return;
    }

    if (!report) {
      setError("Generate a report before downloading it.");
      return;
    }

    setExporting(type);
    setError("");

    try {
      const params = buildParams(1);
      delete params.page;
      delete params.limit;

      params.reportType = reportType;

      const endpoint =
        type === "csv"
          ? "/reports/export"
          : type === "excel"
            ? "/reports/export/excel"
            : "/reports/export/pdf";

      const response = await api.get(endpoint, {
        params,
        responseType: "blob",
      });

      const mimeTypes: Record<ExportType, string> = {
        csv: "text/csv;charset=utf-8",
        excel:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        pdf: "application/pdf",
      };

      const extensions: Record<ExportType, string> = {
        csv: "csv",
        excel: "xlsx",
        pdf: "pdf",
      };

      const blob = new Blob([response.data], {
        type: mimeTypes[type],
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `attendance-${reportType}-${today()}.${extensions[type]}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const summary = report?.summary ?? emptySummary;

  const records = (report?.records ?? []) as (
    | DailyRecord
    | PeriodRecord
  )[];

  const pagination = report?.pagination;

  const isDaily = reportType === "daily";

  const isPeriodReport =
    reportType === "date-range" || reportType === "monthly";

  const selectedStudentInfo = students.find(
    (student) => student._id === selectedStudent
  );

  const handleStudentReport = async (currentPage = 1) => {
    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (!startDate || !endDate || startDate > endDate) {
      setError("Please select a valid date range.");
      return;
    }

    setLoading(true);
    setError("");
    setReport(null);

    try {
      const response = await api.get<ReportResponse>(
        `/reports/student/${selectedStudent}`,
        {
          params: {
            startDate,
            endDate,
            page: currentPage,
            limit,
          },
        }
      );

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Invalid report response from server.");
      }

      setReport(response.data.data);
      setPage(currentPage);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleStudentExport = async (type: ExportType) => {
    if (!selectedStudent) {
      setError("Please select a student.");
      return;
    }

    if (!report) {
      setError("Generate a student report first.");
      return;
    }

    setExporting(type);
    setError("");

    try {
      const endpoint =
        type === "csv"
          ? "/reports/export"
          : type === "excel"
            ? "/reports/export/excel"
            : "/reports/export/pdf";

      const response = await api.get(endpoint, {
        params: {
          reportType: "student",
          studentId: selectedStudent,
          startDate,
          endDate,
        },
        responseType: "blob",
      });

      const extensions: Record<ExportType, string> = {
        csv: "csv",
        excel: "xlsx",
        pdf: "pdf",
      };

      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `attendance-student-${today()}.${extensions[type]}`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setExporting(null);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (nextPage < 1 || nextPage > (pagination?.totalPages ?? 1)) {
      return;
    }

    if (reportType === "student") {
      void handleStudentReport(nextPage);
      return;
    }

    void fetchReport(nextPage);
  };

  const formatMonth = (value: string) => {
    return new Date(Number(year), Number(value) - 1).toLocaleString(
      "en-US",
      { month: "long" }
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-2">
              <BarChart3 className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">
                Attendance Reports
              </h1>
            </div>
            <p className="mt-1 text-sm text-slate-500">
              Generate, review and download student attendance reports.
            </p>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-100"
          >
            <RefreshCw className="h-4 w-4" />
            Reset Filters
          </button>
        </div>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            <h2 className="font-semibold text-slate-900">
              Report Configuration
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {reportOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setReportType(option.value);
                  setReport(null);
                  setError("");
                  setPage(1);

                  if (option.value === "student") {
                    void fetchStudents();
                  }
                }}
                className={`rounded-lg border p-4 text-left transition ${
                  reportType === option.value
                    ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500"
                    : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                }`}
              >
                <p className="font-semibold text-slate-900">
                  {option.label}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {option.description}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 border-t border-slate-100 pt-5 sm:grid-cols-2 lg:grid-cols-4">
            {reportType === "daily" && (
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Attendance Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            )}

            {(reportType === "date-range" ||
              reportType === "student") && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={startDate}
                    onChange={(event) => setStartDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={endDate}
                    min={startDate}
                    onChange={(event) => setEndDate(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
              </>
            )}

            {reportType === "monthly" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Year
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="9999"
                    value={year}
                    onChange={(event) => setYear(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Month
                  </label>
                  <select
                    value={month}
                    onChange={(event) => setMonth(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    {Array.from({ length: 12 }, (_, index) => {
                      const value = String(index + 1);
                      return (
                        <option key={value} value={value}>
                          {new Date(2000, index).toLocaleString("en-US", {
                            month: "long",
                          })}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </>
            )}

            {reportType === "student" && (
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Select Student
                </label>
                <select
                  value={selectedStudent}
                  onChange={(event) =>
                    setSelectedStudent(event.target.value)
                  }
                  disabled={studentsLoading}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
                >
                  <option value="">
                    {studentsLoading
                      ? "Loading students..."
                      : "Choose a student"}
                  </option>
                  {students.map((student) => (
                    <option key={student._id} value={student._id}>
                      {student.name} — {student.studentId} (Class{" "}
                      {student.className}, Roll {student.roll})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {reportType !== "student" && (
              <>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Class
                  </label>
                  <select
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">All Classes</option>
                    {classes.map((item) => (
                      <option key={item} value={item}>
                        Class {item}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">
                    Section
                  </label>
                  <select
                    value={section}
                    onChange={(event) => setSection(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="">All Sections</option>
                    {sections.map((item) => (
                      <option key={item} value={item}>
                        Section {item}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={
                reportType === "student"
                  ? () => void handleStudentReport(1)
                  : handleGenerate
              }
              disabled={loading || studentsLoading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <BarChart3 className="h-4 w-4" />
              )}
              Generate Report
            </button>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex min-h-48 items-center justify-center rounded-xl border border-slate-200 bg-white">
            <div className="text-center">
              <Loader2 className="mx-auto h-8 w-8 animate-spin text-blue-600" />
              <p className="mt-3 text-sm text-slate-500">
                Generating attendance report...
              </p>
            </div>
          </div>
        )}

        {report && !loading && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                {
                  label: "Total Students",
                  value: summary.totalStudents ?? 0,
                  icon: Users,
                  color: "text-blue-600",
                  bg: "bg-blue-50",
                },
                {
                  label: "Present",
                  value: summary.present,
                  icon: Users,
                  color: "text-green-600",
                  bg: "bg-green-50",
                },
                {
                  label: "Absent",
                  value: summary.absent,
                  icon: Users,
                  color: "text-red-600",
                  bg: "bg-red-50",
                },
                {
                  label: "Attendance Rate",
                  value: `${summary.attendancePercentage ?? 0}%`,
                  icon: BarChart3,
                  color: "text-purple-600",
                  bg: "bg-purple-50",
                },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-slate-500">
                        {card.label}
                      </p>
                      <div className={`rounded-lg p-2 ${card.bg}`}>
                        <Icon className={`h-5 w-5 ${card.color}`} />
                      </div>
                    </div>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {card.value}
                    </p>
                  </div>
                );
              })}
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Report Summary
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {reportType === "daily"
                      ? `Date: ${report.date}`
                      : reportType === "monthly"
                        ? `${formatMonth(String(report.month))} ${report.year}`
                        : reportType === "student"
                          ? `${report.student?.name ?? selectedStudentInfo?.name ?? "Student"} · ${report.dateRange?.startDate ?? startDate} to ${report.dateRange?.endDate ?? endDate}`
                          : `${report.startDate} to ${report.endDate}`}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      ["csv", "CSV", FileText],
                      ["excel", "Excel", FileSpreadsheet],
                      ["pdf", "PDF", FileText],
                    ] as const
                  ).map(([type, label, Icon]) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() =>
                        reportType === "student"
                          ? handleStudentExport(type)
                          : handleExport(type)
                      }
                      disabled={exporting !== null}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                      {exporting === type ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                      {label}
                      <Download className="h-3.5 w-3.5" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {[
                  ["Late", summary.late],
                  ["Excused", summary.excused],
                  ["Not Marked", summary.notMarked],
                  ["Total Marked", summary.totalMarked ?? 0],
                  ["Attendance Rate", `${summary.attendancePercentage ?? 0}%`],
                  ["Total Days", summary.totalDays ?? report.totalDays ?? "—"],
                ].map(([label, value]) => (
                  <div
                    key={String(label)}
                    className="rounded-lg bg-slate-50 p-3"
                  >
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="mt-1 text-lg font-semibold text-slate-900">
                      {value}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col justify-between gap-2 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
                <div>
                  <h2 className="font-semibold text-slate-900">
                    Student Attendance Details
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {pagination?.totalRecords ?? 0} records found
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <CalendarDays className="h-4 w-4" />
                  Page {pagination?.currentPage ?? 1} of{" "}
                  {pagination?.totalPages ?? 1}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[850px] border-collapse text-left">
                  <thead className="bg-slate-50">
                    <tr className="text-xs uppercase tracking-wide text-slate-500">
                      <th className="px-5 py-3 font-semibold">Student</th>
                      <th className="px-5 py-3 font-semibold">Student ID</th>
                      <th className="px-5 py-3 font-semibold">Class</th>
                      <th className="px-5 py-3 font-semibold">Roll</th>
                      <th className="px-5 py-3 font-semibold">Status</th>
                      <th className="px-5 py-3 font-semibold">Remarks</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {records.length === 0 &&
                      (!report.attendanceRecords ||
                        report.attendanceRecords.length === 0) && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center text-sm text-slate-500"
                          >
                            No attendance records found.
                          </td>
                        </tr>
                      )}

                    {isDaily &&
                      (records as DailyRecord[]).map((record) => (
                        <tr
                          key={record.student.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-3 text-sm font-medium text-slate-900">
                            {record.student.name}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.student.studentId}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.student.className} -{" "}
                            {record.student.section}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.student.roll}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">
                            {record.remarks || "—"}
                          </td>
                        </tr>
                      ))}

                    {isPeriodReport &&
                      (records as PeriodRecord[]).map((record) => (
                        <tr
                          key={record.student.id}
                          className="hover:bg-slate-50"
                        >
                          <td className="px-5 py-3 text-sm font-medium text-slate-900">
                            {record.student.name}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.student.studentId}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.student.className} -{" "}
                            {record.student.section}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.student.roll}
                          </td>
                          <td className="px-5 py-3">
                            <span className="text-xs font-medium text-slate-700">
                              P: {record.summary.present} · A:{" "}
                              {record.summary.absent} · L:{" "}
                              {record.summary.late} · E:{" "}
                              {record.summary.excused}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.summary.attendancePercentage}%
                          </td>
                        </tr>
                      ))}

                    {reportType === "student" &&
                      report.attendanceRecords?.map((record, index) => (
                        <tr key={`${record.date}-${index}`}>
                          <td className="px-5 py-3 text-sm text-slate-900">
                            {report.student?.name ??
                              selectedStudentInfo?.name}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {report.student?.studentId ??
                              selectedStudentInfo?.studentId}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {report.student?.className ??
                              selectedStudentInfo?.className}
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-600">
                            {record.date}
                          </td>
                          <td className="px-5 py-3">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusStyle(record.status)}`}
                            >
                              {record.status}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-sm text-slate-500">
                            {record.remarks || "—"}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col justify-between gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-sm text-slate-500">
                  Showing page {pagination?.currentPage ?? 1} of{" "}
                  {pagination?.totalPages ?? 1}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page <= 1 || loading}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </button>

                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    disabled={
                      page >= (pagination?.totalPages ?? 1) || loading
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </section>
          </>
        )}

        {!report && !loading && !error && (
          <div className="rounded-xl border border-dashed border-slate-300 bg-white px-5 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <BarChart3 className="h-7 w-7 text-blue-600" />
            </div>
            <h3 className="mt-4 font-semibold text-slate-900">
              No Report Generated
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Choose a report type, configure the filters and generate your
              report.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ReportsPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Teacher"]}>
      <ReportsContent />
    </ProtectedRoute>
  );
}