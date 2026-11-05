
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Search,
  Users,
  RefreshCw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
} from "lucide-react";

import api from "../lib/api";

type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";
type ModalType = "students" | AttendanceStatus;

interface Student {
  _id: string;
  studentId?: string;
  name: string;
  roll?: number | string;
  className: string;
  section: string;
}

interface AttendanceRecord {
  _id: string;
  student?: Student | null;
  attendanceDate: string;
  status: AttendanceStatus;
  className: string;
  section: string;
  remarks?: string;
}

interface Props {
  open: boolean;
  type: ModalType | null;
  date: string;
  onClose: () => void;
}

interface StudentRow {
  id: string;
  studentId: string;
  name: string;
  roll: number | string;
  className: string;
  section: string;
  status: AttendanceStatus | null;
  remarks: string;
}

const PAGE_SIZE = 10;

const statusStyles: Record<AttendanceStatus, string> = {
  Present: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  Absent: "bg-rose-50 text-rose-700 ring-rose-200",
  Late: "bg-amber-50 text-amber-700 ring-amber-200",
  Excused: "bg-blue-50 text-blue-700 ring-blue-200",
};

export default function DashboardStudentModal(props: Props) {
  const { open, type, date, onClose } = props;

  if (!open || !type) return null;

  return (
    <DashboardStudentModalContent
      key={`${type}-${date}`}
      type={type}
      date={date}
      onClose={onClose}
    />
  );
}

function DashboardStudentModalContent({
  type,
  date,
  onClose,
}: {
  type: ModalType;
  date: string;
  onClose: () => void;
}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceRecords, setAttendanceRecords] = useState<
    AttendanceRecord[]
  >([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("All");
  const [sectionFilter, setSectionFilter] = useState("All");
  const [page, setPage] = useState(1);

  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch student or attendance data.
  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");

      try {
        let response;

        if (type === "students") {
          response = await api.get("/students", {
            params: {
              page: 1,
              limit: 100,
            },
          });
        } else {
          response = await api.get("/attendances", {
            params: {
              date,
              status: type,
            },
          });
        }

        if (
          !response.data?.success ||
          !Array.isArray(response.data?.data)
        ) {
          throw new Error("Invalid server response.");
        }

        if (cancelled) return;

        if (type === "students") {
          setStudents(response.data.data as Student[]);
          setAttendanceRecords([]);
        } else {
          setAttendanceRecords(
            response.data.data as AttendanceRecord[]
          );
          setStudents([]);
        }
      } catch (err: unknown) {
        if (cancelled) return;

        console.error("Dashboard student list request failed:", err);

        const apiError = err as {
          response?: {
            data?: {
              message?: string;
            };
          };
          message?: string;
        };

        setError(
          apiError.response?.data?.message ||
            apiError.message ||
            "Unable to load student information. Please try again."
        );

        setStudents([]);
        setAttendanceRecords([]);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [type, date, refreshKey]);

  // Close modal using Escape key.
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [onClose]);

  // Prepare table rows.
  const rows = useMemo<StudentRow[]>(() => {
    if (type === "students") {
      return students.map((student) => ({
        id: student._id,
        studentId: student.studentId || "—",
        name: student.name || "Unknown Student",
        roll: student.roll ?? "—",
        className: student.className || "—",
        section: student.section || "—",
        status: null,
        remarks: "",
      }));
    }

    return attendanceRecords
      .filter((record) => record.student)
      .map((record) => ({
        id: record.student!._id,
        studentId: record.student!.studentId || "—",
        name: record.student!.name || "Unknown Student",
        roll: record.student!.roll ?? "—",
        className:
          record.className || record.student!.className || "—",
        section:
          record.section || record.student!.section || "—",
        status: record.status,
        remarks: record.remarks?.trim() || "",
      }));
  }, [type, students, attendanceRecords]);

  // Available classes.
  const classes = useMemo(
    () =>
      [...new Set(rows.map((row) => row.className))].sort(),
    [rows]
  );

  // Available sections.
  const sections = useMemo(
    () =>
      [...new Set(rows.map((row) => row.section))].sort(),
    [rows]
  );

  // Search and filter students.
  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((row) => {
      const matchesSearch =
        !query ||
        row.name.toLowerCase().includes(query) ||
        row.studentId.toLowerCase().includes(query) ||
        String(row.roll).toLowerCase().includes(query) ||
        row.remarks.toLowerCase().includes(query);

      const matchesClass =
        classFilter === "All" ||
        row.className === classFilter;

      const matchesSection =
        sectionFilter === "All" ||
        row.section === sectionFilter;

      return (
        matchesSearch &&
        matchesClass &&
        matchesSection
      );
    });
  }, [rows, search, classFilter, sectionFilter]);

  // Pagination.
  const totalPages = Math.max(
    1,
    Math.ceil(filteredRows.length / PAGE_SIZE)
  );

  const currentPage = Math.min(page, totalPages);

  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  const title =
    type === "students"
      ? "All Students"
      : `${type} Students`;

  const description =
    type === "students"
      ? "Registered students available to your account"
      : `Students marked ${type.toLowerCase()} on ${date}`;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-5"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-student-modal-title"
        className="flex max-h-[92vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 via-white to-emerald-50 px-5 py-5 sm:px-7">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white text-blue-600 shadow-sm ring-1 ring-slate-100">
              <GraduationCap size={24} />
            </div>

            <div className="min-w-0">
              <h2
                id="dashboard-student-modal-title"
                className="text-lg font-bold text-slate-900 sm:text-xl"
              >
                {title}
              </h2>

              <p className="mt-1 text-xs text-slate-500">
                {description}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close student list"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-white hover:text-slate-900 hover:shadow-sm"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-7">
          {/* Search and filters */}
          <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                type="search"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search name, ID, roll or remark..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              />
            </div>

            <select
              value={classFilter}
              onChange={(event) => {
                setClassFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              aria-label="Filter by class"
            >
              <option value="All">All Classes</option>

              {classes.map((className) => (
                <option key={className} value={className}>
                  Class {className}
                </option>
              ))}
            </select>

            <select
              value={sectionFilter}
              onChange={(event) => {
                setSectionFilter(event.target.value);
                setPage(1);
              }}
              className="h-11 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm text-slate-700 outline-none transition focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
              aria-label="Filter by section"
            >
              <option value="All">All Sections</option>

              {sections.map((section) => (
                <option key={section} value={section}>
                  Section {section}
                </option>
              ))}
            </select>
          </div>

          {/* Result count and refresh */}
          {!loading && !error && (
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-medium text-slate-500">
                Showing{" "}
                <span className="font-bold text-slate-800">
                  {filteredRows.length === 0
                    ? 0
                    : (currentPage - 1) * PAGE_SIZE + 1}
                  –
                  {Math.min(
                    currentPage * PAGE_SIZE,
                    filteredRows.length
                  )}
                </span>{" "}
                of{" "}
                <span className="font-bold text-slate-800">
                  {filteredRows.length}
                </span>{" "}
                students
              </p>

              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-blue-600 transition hover:bg-blue-50"
                title="Refresh current list"
              >
                <RefreshCw size={13} />
                Refresh
              </button>
            </div>
          )}

          {/* Loading */}
          {loading ? (
            <div className="space-y-3 py-4">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-12 animate-pulse rounded-xl bg-slate-100"
                />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-5 py-10 text-center">
              <AlertCircle
                size={30}
                className="mx-auto text-rose-500"
              />

              <p className="mt-3 text-sm font-bold text-slate-800">
                Unable to load students
              </p>

              <p className="mx-auto mt-1 max-w-md text-xs leading-5 text-slate-600">
                {error}
              </p>

              <button
                type="button"
                onClick={() => setRefreshKey((value) => value + 1)}
                className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-blue-600 shadow-sm ring-1 ring-slate-200 hover:bg-blue-50"
              >
                <RefreshCw size={14} />
                Try Again
              </button>
            </div>
          ) : filteredRows.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-5 py-14 text-center">
              <Users
                size={32}
                className="mx-auto text-slate-300"
              />

              <p className="mt-3 text-sm font-bold text-slate-700">
                No students found
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <th className="px-4 py-3.5">
                      Student
                    </th>

                    <th className="px-4 py-3.5">
                      Student ID
                    </th>

                    <th className="px-4 py-3.5">
                      Roll
                    </th>

                    <th className="px-4 py-3.5">
                      Class
                    </th>

                    <th className="px-4 py-3.5">
                      Section
                    </th>

                    {type !== "students" && (
                      <th className="px-4 py-3.5 text-right">
                        Status
                      </th>
                    )}

                    {type === "Excused" && (
                      <th className="px-4 py-3.5">
                        Remarks
                      </th>
                    )}
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {paginatedRows.map((student) => (
                    <tr
                      key={student.id}
                      className="transition hover:bg-slate-50/80"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xs font-bold text-blue-700">
                            {student.name.charAt(0).toUpperCase()}
                          </div>

                          <span className="font-semibold text-slate-800">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                        {student.studentId}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                        {student.roll}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                        {student.className}
                      </td>

                      <td className="px-4 py-3.5 text-xs font-medium text-slate-600">
                        {student.section}
                      </td>

                      {student.status && (
                        <td className="px-4 py-3.5 text-right">
                          <span
                            className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ${statusStyles[student.status]}`}
                          >
                            {student.status}
                          </span>
                        </td>
                      )}

                      {type === "Excused" && (
                        <td className="max-w-[260px] px-4 py-3.5">
                          {student.remarks ? (
                            <span
                              className="inline-block max-w-full whitespace-normal break-words rounded-lg bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700"
                              title={student.remarks}
                            >
                              {student.remarks}
                            </span>
                          ) : (
                            <span className="text-xs italic text-slate-400">
                              No remarks
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer pagination */}
        {!loading && !error && filteredRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/70 px-5 py-4 sm:px-7">
            <p className="text-xs text-slate-500">
              Page{" "}
              <span className="font-bold text-slate-800">
                {currentPage}
              </span>{" "}
              of{" "}
              <span className="font-bold text-slate-800">
                {totalPages}
              </span>
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() =>
                  setPage((value) => Math.max(1, value - 1))
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} />
                Previous
              </button>

              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() =>
                  setPage((value) =>
                    Math.min(totalPages, value + 1)
                  )
                }
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Next
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
