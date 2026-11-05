
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CalendarDays,
  CheckCircle2,
  XCircle,
  Clock3,
  ClipboardCheck,
  RefreshCw,
  Search,
  Users,
  AlertCircle,
  LockKeyhole,
  PartyPopper,
} from "lucide-react";

import api from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import ProtectedRoute from "../../components/ProtectedRoute";

type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

interface Student {
  _id: string;
  studentId: string;
  name: string;
  roll: number;
  className: string;
  section: string;
  isActive: boolean;
}

interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  remarks: string;
  isSaved: boolean;
}

interface SavedAttendance {
  _id: string;
  student: {
    _id: string;
    studentId: string;
    name: string;
    roll: number;
  } | string;
  attendanceDate: string;
  status: AttendanceStatus;
  remarks?: string;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

const statuses: {
  value: AttendanceStatus;
  label: string;
  activeClass: string;
}[] = [
  {
    value: "Present",
    label: "Present",
    activeClass: "bg-emerald-500 text-white border-emerald-500",
  },
  {
    value: "Absent",
    label: "Absent",
    activeClass: "bg-rose-500 text-white border-rose-500",
  },
  {
    value: "Late",
    label: "Late",
    activeClass: "bg-amber-500 text-white border-amber-500",
  },
  {
    value: "Excused",
    label: "Excused",
    activeClass: "bg-blue-500 text-white border-blue-500",
  },
];

function getTodayDate(): string {
  const now = new Date();

  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function isValidDateFormat(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function AttendanceContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<
    Record<string, AttendanceEntry>
  >({});

  const [date, setDate] = useState(getTodayDate());
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManageAttendance =
    user?.role === "Admin" || user?.role === "Teacher";

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (!isValidDateFormat(date)) {
        throw new Error("Please enter a valid date in YYYY-MM-DD format.");
      }

      const studentResponse = await api.get<ApiResponse<Student[]>>(
        "/students",
        {
          params: {
            page: 1,
            limit: 100,
            isActive: true,
            ...(className ? { className } : {}),
            ...(section ? { section } : {}),
          },
        }
      );

      if (!studentResponse.data?.success) {
        throw new Error(
          studentResponse.data?.message || "Unable to load students."
        );
      }

      const studentList = studentResponse.data.data;

      if (!Array.isArray(studentList)) {
        throw new Error("Unexpected student API response.");
      }

      const attendanceResponse = await api.get<
        ApiResponse<SavedAttendance[]>
      >("/attendances", {
        params: {
          date: date.trim(),
          ...(className ? { className } : {}),
          ...(section ? { section } : {}),
        },
      });

      if (!attendanceResponse.data?.success) {
        throw new Error(
          attendanceResponse.data?.message ||
            "Unable to load saved attendance."
        );
      }

      const savedRecords = attendanceResponse.data.data;

      if (!Array.isArray(savedRecords)) {
        throw new Error("Unexpected attendance API response.");
      }

      const savedAttendanceMap: Record<string, AttendanceEntry> = {};

      savedRecords.forEach((record) => {
        const studentMongoId =
          typeof record.student === "string"
            ? record.student
            : record.student?._id;

        if (studentMongoId) {
          savedAttendanceMap[studentMongoId] = {
            studentId: studentMongoId,
            status: record.status,
            remarks: record.remarks ?? "",
            isSaved: true,
          };
        }
      });

      const nextAttendance: Record<string, AttendanceEntry> = {};

      studentList.forEach((student) => {
        nextAttendance[student._id] =
          savedAttendanceMap[student._id] ?? {
            studentId: student._id,
            status: "Present",
            remarks: "",
            isSaved: false,
          };
      });

      setStudents(studentList);
      setAttendance(nextAttendance);
    } catch (err: unknown) {
      console.error("Attendance loading error:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: {
            status?: number;
            data?: { message?: string };
          };
        };

        if (apiError.response?.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        setError(
          apiError.response?.data?.message ||
            "Failed to load attendance data."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Cannot connect to the backend."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [date, className, section, logout, router]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchStudents();
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [fetchStudents]);

  const updateStatus = (
    studentId: string,
    status: AttendanceStatus
  ) => {
    if (attendance[studentId]?.isSaved) return;

    setAttendance((previous) => ({
      ...previous,
      [studentId]: {
        ...previous[studentId],
        status,
      },
    }));
  };

  const updateRemarks = (studentId: string, remarks: string) => {
    if (attendance[studentId]?.isSaved) return;

    setAttendance((previous) => ({
      ...previous,
      [studentId]: {
        ...previous[studentId],
        remarks,
      },
    }));
  };

  const filteredStudents = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return students;

    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.studentId.toLowerCase().includes(query) ||
        String(student.roll).includes(query)
    );
  }, [students, search]);

  const summary = useMemo(() => {
    const values = students
      .map((student) => attendance[student._id])
      .filter(Boolean);

    return {
      total: students.length,
      present: values.filter((item) => item.status === "Present").length,
      absent: values.filter((item) => item.status === "Absent").length,
      late: values.filter((item) => item.status === "Late").length,
      excused: values.filter((item) => item.status === "Excused").length,
    };
  }, [students, attendance]);

  const markedCount = useMemo(
    () => students.filter((student) => attendance[student._id]?.isSaved).length,
    [students, attendance]
  );

  const pendingCount = students.length - markedCount;

  const handleSubmit = async () => {
    if (!canManageAttendance) {
      setError("You are not allowed to manage attendance.");
      return;
    }

    if (!isValidDateFormat(date)) {
      setError("Invalid date. Please use YYYY-MM-DD format.");
      return;
    }

    if (!students.length) {
      setError("No students available for attendance.");
      return;
    }

    const unmarkedStudents = students.filter(
      (student) => !attendance[student._id]?.isSaved
    );

    if (!unmarkedStudents.length) {
      setError("Attendance has already been completed for all students.");
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    try {
      const records = unmarkedStudents.map((student) => ({
        student: student._id,
        status: attendance[student._id]?.status ?? "Present",
        remarks: attendance[student._id]?.remarks ?? "",
      }));

      const payload = {
        date: date.trim(),
        className: className || undefined,
        section: section || undefined,
        records,
      };

      const response = await api.post(
        "/attendances/bulk",
        payload
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to submit attendance."
        );
      }

      await fetchStudents();

      setSuccess(
        `${records.length} student attendance record(s) submitted successfully!`
      );
    } catch (err: unknown) {
      console.error("Attendance submission error:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: {
            status?: number;
            data?: { message?: string };
          };
        };

        if (apiError.response?.status === 401) {
          logout();
          router.replace("/login");
          return;
        }

        setError(
          apiError.response?.data?.message ||
            "Failed to submit attendance."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Cannot connect to the backend."
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f8fc] p-4 text-slate-800 sm:p-7 lg:p-9">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-medium text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Attendance Management
            </div>

            <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
              Daily Attendance
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage student attendance for your school.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void fetchStudents()}
            disabled={loading || submitting}
            className="flex items-center justify-center gap-2 rounded-xl bg-[#14213d] px-4 py-3 text-xs font-semibold text-white transition hover:bg-[#20375f] disabled:opacity-60"
          >
            <RefreshCw
              size={15}
              className={loading ? "animate-spin" : ""}
            />
            Refresh Attendance
          </button>
        </div>

        <section className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {[
            {
              label: "Total Students",
              value: summary.total,
              icon: Users,
              color: "bg-blue-50 text-blue-600",
            },
            {
              label: "Present",
              value: summary.present,
              icon: CheckCircle2,
              color: "bg-emerald-50 text-emerald-600",
            },
            {
              label: "Absent",
              value: summary.absent,
              icon: XCircle,
              color: "bg-rose-50 text-rose-600",
            },
            {
              label: "Late",
              value: summary.late,
              icon: Clock3,
              color: "bg-amber-50 text-amber-600",
            },
            {
              label: "Excused",
              value: summary.excused,
              icon: ClipboardCheck,
              color: "bg-blue-50 text-blue-600",
            },
          ].map((item) => {
            const Icon = item.icon;

            return (
              <article
                key={item.label}
                className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500">
                    {item.label}
                  </span>

                  <div className={`rounded-lg p-2 ${item.color}`}>
                    <Icon size={17} />
                  </div>
                </div>

                <p className="mt-3 text-2xl font-bold text-slate-900">
                  {item.value}
                </p>
              </article>
            );
          })}
        </section>

        <section className="mb-6 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
          <div className="mb-5 flex items-center gap-2">
            <CalendarDays size={19} className="text-emerald-600" />
            <h2 className="text-sm font-bold text-slate-800">
              Attendance Filters
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Attendance Date (YYYY-MM-DD)
              </label>

              <input
                type="text"
                inputMode="numeric"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                placeholder="YYYY-MM-DD"
                maxLength={10}
                autoComplete="off"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100"
              />

              <p className="mt-2 text-[11px] text-slate-400">
                Example: 2026-11-01
              </p>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Class
              </label>

              <select
                value={className}
                onChange={(event) => setClassName(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">All Classes</option>
                {Array.from({ length: 10 }, (_, index) => index + 1).map(
                  (item) => (
                    <option key={item} value={String(item)}>
                      Class {item}
                    </option>
                  )
                )}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Section
              </label>

              <select
                value={section}
                onChange={(event) => setSection(event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500"
              >
                <option value="">All Sections</option>
                {["A", "B", "C", "D"].map((item) => (
                  <option key={item} value={item}>
                    Section {item}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-2 block text-xs font-semibold text-slate-600">
                Search Student
              </label>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3">
                <Search size={16} className="text-slate-400" />

                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Name, ID or roll..."
                  className="w-full bg-transparent py-3 text-sm outline-none"
                />
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 animate-[fadeIn_.3s_ease-out]">
            <AlertCircle size={19} className="mt-0.5 shrink-0" />
            {error}
          </div>
        )}

        {success && (
          <div
            role="status"
            aria-live="polite"
            className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-sm animate-[fadeIn_.35s_ease-out]"
          >
            <div className="flex h-9 w-9 shrink-0 animate-[successPop_.45s_ease-out] items-center justify-center rounded-full bg-emerald-500 text-white">
              <CheckCircle2 size={21} />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-bold">Attendance submitted successfully!</p>
              <p className="mt-1 text-xs text-emerald-700">{success}</p>
              <p className="mt-1 text-xs text-emerald-700">
                Marked students are now locked for this date.
              </p>
            </div>

            <PartyPopper size={20} className="shrink-0 text-emerald-600" />
          </div>
        )}

        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <h2 className="text-sm font-bold text-slate-800">
                Student Attendance List
              </h2>

              <p className="mt-1 text-xs text-slate-400">
                {filteredStudents.length} students found
              </p>

              <div className="mt-2 flex flex-wrap items-center gap-3 text-[11px]">
                <span className="font-semibold text-emerald-700">
                  {markedCount} Already Marked
                </span>
                <span className="font-semibold text-amber-700">
                  {pendingCount} Pending
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
              {date}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 5 }).map((_, index) => (
                <div
                  key={index}
                  className="h-16 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="p-12 text-center">
              <Users
                size={35}
                className="mx-auto mb-3 text-slate-300"
              />

              <h3 className="text-sm font-bold text-slate-700">
                No students found
              </h3>

              <p className="mt-1 text-xs text-slate-400">
                Try changing the class, section or search filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left">
                <thead className="bg-slate-50 text-[11px] uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Student</th>
                    <th className="px-5 py-4">Class / Section</th>
                    <th className="px-5 py-4">Roll</th>
                    <th className="px-5 py-4">Attendance Status</th>
                    <th className="px-5 py-4">Remarks</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {filteredStudents.map((student) => {
                    const entry = attendance[student._id];
                    const isSaved = entry?.isSaved ?? false;

                    return (
                      <tr
                        key={student._id}
                        className={`transition ${
                          isSaved
                            ? "bg-slate-50/70"
                            : "hover:bg-slate-50/70"
                        }`}
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-semibold text-slate-800">
                              {student.name}
                            </p>

                            {isSaved && (
                              <LockKeyhole
                                size={13}
                                className="text-emerald-600"
                                aria-label="Attendance locked"
                              />
                            )}
                          </div>

                          <p className="mt-1 text-[11px] text-slate-400">
                            {student.studentId}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-xs text-slate-600">
                          Class {student.className} / {student.section}
                        </td>

                        <td className="px-5 py-4 text-xs font-semibold text-slate-700">
                          {student.roll}
                        </td>

                        <td className="px-5 py-4">
                          <div className="flex flex-wrap gap-1.5">
                            {statuses.map((status) => {
                              const active =
                                entry?.status === status.value;

                              return (
                                <button
                                  key={status.value}
                                  type="button"
                                  disabled={
                                    !canManageAttendance ||
                                    isSaved ||
                                    submitting
                                  }
                                  onClick={() =>
                                    updateStatus(student._id, status.value)
                                  }
                                  title={
                                    isSaved
                                      ? "Attendance already submitted for this date"
                                      : status.label
                                  }
                                  className={`rounded-lg border px-2.5 py-2 text-[10px] font-semibold transition ${
                                    active
                                      ? status.activeClass
                                      : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                  } disabled:cursor-not-allowed disabled:opacity-70`}
                                >
                                  {status.label}
                                </button>
                              );
                            })}
                          </div>

                          {isSaved && (
                            <p className="mt-2 flex items-center gap-1 text-[10px] font-medium text-emerald-700">
                              <LockKeyhole size={11} />
                              Already submitted
                            </p>
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <input
                            value={entry?.remarks ?? ""}
                            onChange={(event) =>
                              updateRemarks(student._id, event.target.value)
                            }
                            disabled={
                              !canManageAttendance ||
                              isSaved ||
                              submitting
                            }
                            maxLength={500}
                            placeholder="Optional remarks"
                            className="w-40 rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-emerald-500 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 p-5 sm:flex-row sm:items-center sm:px-6">
            <div>
              <p className="text-xs text-slate-500">
                {markedCount > 0
                  ? `${markedCount} student(s) already marked. ${pendingCount} remaining.`
                  : "Attendance is submitted for the selected class and section."}
              </p>

              {pendingCount === 0 && students.length > 0 && !loading && (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  All students have completed attendance for this date.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={
                submitting ||
                loading ||
                pendingCount === 0 ||
                !canManageAttendance
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-xs font-bold text-white shadow-lg shadow-emerald-600/15 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <RefreshCw size={16} className="animate-spin" />
              ) : pendingCount === 0 && students.length > 0 ? (
                <CheckCircle2 size={16} />
              ) : (
                <ClipboardCheck size={16} />
              )}

              {submitting
                ? "Submitting..."
                : pendingCount === 0 && students.length > 0
                  ? "Attendance Completed"
                  : "Submit Attendance"}
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default function AttendancePage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Teacher"]}>
      <AttendanceContent />
    </ProtectedRoute>
  );
}
