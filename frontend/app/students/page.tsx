"use client";

import { useEffect, useState, type FormEvent } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Plus,
  Search,
  SlidersHorizontal,
  Users,
  Pencil,
  Trash2,
  X,
  Loader2,
  Save,
} from "lucide-react";
import api from "../../lib/api";
import AddStudentModal from "./components/AddStudentModal";
import ProtectedRoute from "../../components/ProtectedRoute";
import { useAuth } from "../../context/AuthContext";

interface Student {
  _id: string;
  studentId: string;
  name: string;
  roll: number;
  className: string;
  section: string;
  gender: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  isActive: boolean;
}

interface Pagination {
  currentPage: number;
  limit: number;
  totalStudents: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface StudentResponse {
  success: boolean;
  data: Student[];
  pagination: Pagination;
}

interface SingleStudentResponse {
  success: boolean;
  data: Student;
}

interface StudentFormData {
  studentId: string;
  name: string;
  roll: string;
  className: string;
  section: string;
  gender: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  isActive: boolean;
}

const initialEditForm: StudentFormData = {
  studentId: "",
  name: "",
  roll: "",
  className: "",
  section: "",
  gender: "",
  guardianName: "",
  guardianPhone: "",
  address: "",
  isActive: true,
};

const availableClasses = ["6", "7", "8", "9", "10"];

function StudentsContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [students, setStudents] = useState<Student[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [classFilter, setClassFilter] = useState("All Classes");
  const [sectionFilter, setSectionFilter] = useState("All Sections");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState("");
  const [editForm, setEditForm] =
    useState<StudentFormData>(initialEditForm);
  const [editLoading, setEditLoading] = useState(false);
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState("");

  const [deletingStudentId, setDeletingStudentId] = useState("");

  // Debounce search input to reduce unnecessary API requests.
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [search]);

  // Fetch students whenever filters, page, or refresh key changes.
  useEffect(() => {
    let isMounted = true;

    const fetchStudents = async () => {
      try {
        const params: Record<string, string | number> = {
          page,
          limit: 10,
        };

        if (debouncedSearch) {
          params.search = debouncedSearch;
        }

        if (classFilter !== "All Classes") {
          params.className = classFilter;
        }

        if (sectionFilter !== "All Sections") {
          params.section = sectionFilter;
        }

        const response = await api.get<StudentResponse>("/students", {
          params,
        });

        if (
          !response.data?.success ||
          !Array.isArray(response.data.data) ||
          !response.data.pagination
        ) {
          throw new Error("Invalid student response from server.");
        }

        if (isMounted) {
          setStudents(response.data.data);
          setPagination(response.data.pagination);
          setError("");
        }
      } catch (err: unknown) {
        console.error("Student API request failed:", err);

        if (isMounted) {
          setError(
            "Unable to load students. Please check the backend server and try again."
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchStudents();

    return () => {
      isMounted = false;
    };
  }, [page, debouncedSearch, classFilter, sectionFilter, refreshKey]);

  const activeStudents = students.filter(
    (student) => student.isActive
  ).length;

  const inactiveStudents = students.filter(
    (student) => !student.isActive
  ).length;

  const resetFilters = () => {
    setSearch("");
    setDebouncedSearch("");
    setClassFilter("All Classes");
    setSectionFilter("All Sections");
    setPage(1);
  };

  const retryFetch = () => {
    setError("");
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  const handleStudentCreated = () => {
    setPage(1);
    setSearch("");
    setDebouncedSearch("");
    setClassFilter("All Classes");
    setSectionFilter("All Sections");
    setLoading(true);
    setRefreshKey((current) => current + 1);
  };

  const handleEditStudent = async (studentId: string) => {
    if (!isAdmin) return;

    setEditingStudentId(studentId);
    setEditForm(initialEditForm);
    setEditError("");
    setEditLoading(true);
    setShowEditModal(true);

    try {
      const response = await api.get<SingleStudentResponse>(
        `/students/${studentId}`
      );

      if (!response.data?.success || !response.data.data) {
        throw new Error("Unable to load student details.");
      }

      const student = response.data.data;

      setEditForm({
        studentId: student.studentId ?? "",
        name: student.name ?? "",
        roll: String(student.roll ?? ""),
        className: student.className ?? "",
        section: student.section ?? "",
        gender: student.gender ?? "",
        guardianName: student.guardianName ?? "",
        guardianPhone: student.guardianPhone ?? "",
        address: student.address ?? "",
        isActive: student.isActive ?? true,
      });
    } catch (err: unknown) {
      console.error("Fetch student details failed:", err);

      setEditError(
        "Unable to load student details. Please close this window and try again."
      );
    } finally {
      setEditLoading(false);
    }
  };

  const handleEditChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    if (name === "isActive") {
      setEditForm((previous) => ({
        ...previous,
        isActive: value === "true",
      }));
      return;
    }

    setEditForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleUpdateStudent = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!isAdmin || !editingStudentId) return;

    setEditError("");

    const rollNumber = Number(editForm.roll);

    if (!Number.isInteger(rollNumber) || rollNumber < 1) {
      setEditError("Please enter a valid roll number.");
      return;
    }

    try {
      setEditSubmitting(true);

      const payload = {
        studentId: editForm.studentId.trim(),
        name: editForm.name.trim(),
        roll: rollNumber,
        className: editForm.className,
        section: editForm.section.trim().toUpperCase(),
        gender: editForm.gender,
        guardianName: editForm.guardianName.trim(),
        guardianPhone: editForm.guardianPhone.trim(),
        address: editForm.address.trim(),
        isActive: editForm.isActive,
      };

      const response = await api.put(
        `/students/${editingStudentId}`,
        payload
      );

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to update student."
        );
      }

      setShowEditModal(false);
      setEditingStudentId("");
      setEditForm(initialEditForm);
      setLoading(true);
      setRefreshKey((current) => current + 1);
    } catch (err: unknown) {
      console.error("Update student failed:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: {
            data?: {
              message?: string;
              errors?: { msg?: string }[];
            };
          };
        };

        const validationMessage = apiError.response?.data?.errors
          ?.map((item) => item.msg)
          .filter(Boolean)
          .join(", ");

        setEditError(
          validationMessage ||
            apiError.response?.data?.message ||
            "Unable to update student. Please try again."
        );
      } else {
        setEditError(
          "Unable to update student. Please check the information and try again."
        );
      }
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteStudent = async (student: Student) => {
    if (!isAdmin || deletingStudentId) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${student.name} (${student.studentId})?\n\nThis action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setDeletingStudentId(student._id);

      const response = await api.delete(`/students/${student._id}`);

      if (!response.data?.success) {
        throw new Error(
          response.data?.message || "Unable to delete student."
        );
      }

      if (students.length === 1 && page > 1) {
        setPage((currentPage) => currentPage - 1);
      } else {
        setLoading(true);
        setRefreshKey((current) => current + 1);
      }
    } catch (err: unknown) {
      console.error("Delete student failed:", err);

      let message = "Unable to delete student. Please try again.";

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: {
            data?: {
              message?: string;
            };
          };
        };

        message = apiError.response?.data?.message || message;
      }

      window.alert(message);
    } finally {
      setDeletingStudentId("");
    }
  };

  const closeEditModal = () => {
    if (editSubmitting) return;

    setShowEditModal(false);
    setEditingStudentId("");
    setEditForm(initialEditForm);
    setEditError("");
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-700";

  return (
    <main className="min-h-screen bg-[#f7f8fc] px-5 py-8 text-slate-900 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-[1500px]">
        <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
              Management / Students
            </p>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Students
            </h1>

            <p className="mt-2 text-sm text-slate-500">
              Manage student profiles, classes and enrollment records.
            </p>
          </div>

          {isAdmin && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700"
            >
              <Plus size={18} />
              Add Student
            </button>
          )}
        </div>

        <section className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-500">Total Students</p>
                <h2 className="mt-2 text-3xl font-bold">
                  {pagination?.totalStudents ?? 0}
                </h2>
              </div>

              <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                <Users size={23} />
              </div>
            </div>

            <p className="mt-3 text-xs text-slate-400">
              Total registered student records
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Active Students on This Page
            </p>
            <h2 className="mt-2 text-3xl font-bold text-emerald-600">
              {activeStudents}
            </h2>
            <p className="mt-3 text-xs text-slate-400">
              Active records in the current page
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Inactive Students on This Page
            </p>
            <h2 className="mt-2 text-3xl font-bold text-rose-500">
              {inactiveStudents}
            </h2>
            <p className="mt-3 text-xs text-slate-400">
              Inactive records in the current page
            </p>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <div className="flex flex-col gap-4 rounded-t-2xl border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="text-lg font-bold">All Students</h2>
              <p className="mt-1 text-sm text-slate-500">
                Search and manage student information.
              </p>
            </div>

            <button
              type="button"
              disabled
              title="Export feature is coming later"
              className="inline-flex cursor-not-allowed items-center gap-2 self-start rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-400"
            >
              <Download size={16} />
              Export
            </button>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-100 p-5 xl:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search
                size={18}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />

              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search by name or student ID..."
                className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50"
              />
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <div className="relative">
                <Filter
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <select
                  value={classFilter}
                  onChange={(event) => {
                    setClassFilter(event.target.value);
                    setPage(1);
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-3 pl-9 pr-9 text-sm outline-none focus:border-indigo-400 sm:w-40"
                >
                  <option value="All Classes">All Classes</option>
                  {availableClasses.map((className) => (
                    <option key={className} value={className}>
                      Class {className}
                    </option>
                  ))}
                </select>

                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                />
              </div>

              <select
                value={sectionFilter}
                onChange={(event) => {
                  setSectionFilter(event.target.value);
                  setPage(1);
                }}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-indigo-400 sm:w-40"
              >
                <option value="All Sections">All Sections</option>
                <option value="A">Section A</option>
                <option value="B">Section B</option>
                <option value="C">Section C</option>
              </select>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <SlidersHorizontal size={16} />
                Reset
              </button>
            </div>
          </div>

          {error && (
            <div className="m-5 rounded-xl border border-rose-200 bg-rose-50 p-4">
              <p className="text-sm font-medium text-rose-700">{error}</p>
              <button
                type="button"
                onClick={retryFetch}
                className="mt-2 text-sm font-semibold text-rose-700 underline"
              >
                Try Again
              </button>
            </div>
          )}

          <div className="w-full overflow-x-auto">
            <table className="w-full min-w-[1100px] table-auto border-collapse text-left">
              <thead className="bg-slate-50/80">
                <tr className="text-xs uppercase tracking-wider text-slate-500">
                  <th className="w-[190px] px-4 py-4 font-semibold">
                    Student
                  </th>
                  <th className="w-[115px] px-4 py-4 font-semibold">
                    Student ID
                  </th>
                  <th className="w-[115px] px-4 py-4 font-semibold">
                    Class / Section
                  </th>
                  <th className="w-[65px] px-4 py-4 font-semibold">
                    Roll
                  </th>
                  <th className="w-[175px] px-4 py-4 font-semibold">
                    Guardian
                  </th>
                  <th className="w-[220px] px-4 py-4 font-semibold">
                    Address
                  </th>
                  <th className="w-[110px] px-4 py-4 font-semibold">
                    Status
                  </th>

                  {isAdmin && (
                    <th className="w-[120px] px-4 py-4 text-right font-semibold">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="px-6 py-16 text-center"
                    >
                      <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
                      <p className="mt-3 text-sm text-slate-500">
                        Loading students...
                      </p>
                    </td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="px-6 py-16 text-center text-sm text-slate-500"
                    >
                      Student records could not be loaded.
                    </td>
                  </tr>
                ) : students.length > 0 ? (
                  students.map((student) => (
                    <tr
                      key={student._id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-5">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 font-bold text-indigo-600">
                            {student.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="break-words font-semibold text-slate-800">
                            {student.name}
                          </span>
                        </div>
                      </td>

                      <td className="break-words px-4 py-5 text-sm text-slate-600">
                        {student.studentId}
                      </td>

                      <td className="whitespace-nowrap px-4 py-5 text-sm text-slate-600">
                        {student.className} / {student.section}
                      </td>

                      <td className="px-4 py-5 text-sm text-slate-600">
                        {String(student.roll).padStart(2, "0")}
                      </td>

                      <td className="px-4 py-5">
                        <p className="break-words text-sm font-medium text-slate-700">
                          {student.guardianName}
                        </p>
                        <p className="mt-1 break-all text-xs text-slate-400">
                          {student.guardianPhone}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <p
                          className="whitespace-normal break-words text-sm leading-6 text-slate-600"
                          title={student.address || "Address not provided"}
                        >
                          {student.address || "Not provided"}
                        </p>
                      </td>

                      <td className="px-4 py-5">
                        <span
                          className={`inline-flex whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold ${
                            student.isActive
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          }`}
                        >
                          {student.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>

                      {isAdmin && (
                        <td className="px-4 py-5">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                void handleEditStudent(student._id)
                              }
                              disabled={Boolean(deletingStudentId)}
                              title={`Edit ${student.name}`}
                              aria-label={`Edit ${student.name}`}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700 transition duration-200 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-indigo-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Pencil size={16} />
                            </button>

                            <button
                              type="button"
                              onClick={() =>
                                void handleDeleteStudent(student)
                              }
                              disabled={Boolean(deletingStudentId)}
                              title={`Delete ${student.name}`}
                              aria-label={`Delete ${student.name}`}
                              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingStudentId === student._id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <Trash2 size={16} />
                              )}
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td
                      colSpan={isAdmin ? 8 : 7}
                      className="px-6 py-16 text-center"
                    >
                      <p className="font-semibold text-slate-700">
                        No students found
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Try changing your search or filters.
                      </p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
            <p className="text-sm text-slate-500">
              Showing{" "}
              {students.length > 0 ? (page - 1) * 10 + 1 : 0}
              {" - "}
              {(page - 1) * 10 + students.length} of{" "}
              {pagination?.totalStudents ?? 0} students
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={!pagination?.hasPreviousPage || loading}
                onClick={() => setPage((currentPage) => currentPage - 1)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label="Previous page"
              >
                <ChevronLeft size={17} />
              </button>

              <span className="rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white">
                {pagination?.currentPage ?? 1}
              </span>

              <span className="text-sm text-slate-400">
                / {pagination?.totalPages ?? 1}
              </span>

              <button
                type="button"
                disabled={!pagination?.hasNextPage || loading}
                onClick={() => setPage((currentPage) => currentPage + 1)}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:text-slate-300"
                aria-label="Next page"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </section>

        <p className="mt-6 text-center text-xs text-slate-400">
          LGMHS Student Management System
        </p>
      </div>

      {isAdmin && showAddModal && (
        <AddStudentModal
          onClose={() => setShowAddModal(false)}
          onSuccess={handleStudentCreated}
        />
      )}

      {isAdmin && showEditModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget &&
              !editLoading &&
              !editSubmitting
            ) {
              closeEditModal();
            }
          }}
        >
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
                  <Pencil size={22} />
                </div>

                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Edit Student
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Update the student&apos;s information below.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditModal}
                disabled={editLoading || editSubmitting}
                className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                aria-label="Close edit modal"
              >
                <X size={20} />
              </button>
            </div>

            {editLoading ? (
              <div className="flex flex-col items-center justify-center px-6 py-16">
                <Loader2
                  size={32}
                  className="animate-spin text-indigo-600"
                />
                <p className="mt-3 text-sm text-slate-500">
                  Loading student details...
                </p>
              </div>
            ) : (
              <form
                onSubmit={handleUpdateStudent}
                className="space-y-6 p-6"
              >
                <section>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-indigo-600">
                    Student Information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Student ID *</label>
                      <input
                        name="studentId"
                        value={editForm.studentId}
                        onChange={handleEditChange}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Full Name *</label>
                      <input
                        name="name"
                        value={editForm.name}
                        onChange={handleEditChange}
                        className={inputClass}
                        minLength={2}
                        maxLength={100}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Roll Number *</label>
                      <input
                        type="number"
                        name="roll"
                        value={editForm.roll}
                        onChange={handleEditChange}
                        className={inputClass}
                        min={1}
                        step={1}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Class *</label>
                      <select
                        name="className"
                        value={editForm.className}
                        onChange={handleEditChange}
                        className={inputClass}
                        required
                      >
                        <option value="">Select class</option>
                        {availableClasses.map((item) => (
                          <option key={item} value={item}>
                            Class {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Section *</label>
                      <select
                        name="section"
                        value={editForm.section}
                        onChange={handleEditChange}
                        className={inputClass}
                        required
                      >
                        <option value="">Select section</option>
                        {["A", "B", "C"].map((item) => (
                          <option key={item} value={item}>
                            Section {item}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className={labelClass}>Gender *</label>
                      <select
                        name="gender"
                        value={editForm.gender}
                        onChange={handleEditChange}
                        className={inputClass}
                        required
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                </section>

                <div className="border-t border-slate-100" />

                <section>
                  <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-indigo-600">
                    Guardian Information
                  </h3>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className={labelClass}>Guardian Name *</label>
                      <input
                        name="guardianName"
                        value={editForm.guardianName}
                        onChange={handleEditChange}
                        className={inputClass}
                        required
                      />
                    </div>

                    <div>
                      <label className={labelClass}>Guardian Phone *</label>
                      <input
                        type="tel"
                        name="guardianPhone"
                        value={editForm.guardianPhone}
                        onChange={handleEditChange}
                        className={inputClass}
                        maxLength={11}
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Address *</label>
                      <textarea
                        name="address"
                        value={editForm.address}
                        onChange={handleEditChange}
                        className={inputClass}
                        rows={3}
                        required
                      />
                    </div>

                    <div className="sm:col-span-2">
                      <label className={labelClass}>Student Status</label>
                      <select
                        name="isActive"
                        value={String(editForm.isActive)}
                        onChange={handleEditChange}
                        className={inputClass}
                      >
                        <option value="true">Active</option>
                        <option value="false">Inactive</option>
                      </select>
                    </div>
                  </div>
                </section>

                {editError && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
                    {editError}
                  </div>
                )}

                <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={closeEditModal}
                    disabled={editSubmitting}
                    className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={editSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {editSubmitting ? (
                      <>
                        <Loader2
                          size={17}
                          className="animate-spin"
                        />
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={17} />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

export default function StudentsPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin", "Teacher"]}>
      <StudentsContent />
    </ProtectedRoute>
  );
}