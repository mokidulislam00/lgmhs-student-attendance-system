
"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  Search,
  Users,
  UserCheck,
  UserX,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Phone,
  Mail,
  Plus,
  X,
  Trash2,
  BookOpen,
  ClipboardList,
  Pencil,
  Power,
  ShieldAlert,
} from "lucide-react";
import api from "@/lib/api";
import ProtectedRoute from "@/components/ProtectedRoute";
import { useAuth } from "@/context/AuthContext";

interface Teacher {
  _id: string;
  teacherId: string;
  name: string;
  phone: string;
  email?: string;
  gender: "Male" | "Female" | "Other";
  designation: string;
  subject: string[];
  qualification: string;
  address?: string;
  joiningDate: string;
  isActive: boolean;
}

interface Pagination {
  currentPage: number;
  limit: number;
  totalTeachers: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface TeacherResponse {
  success: boolean;
  data: Teacher[];
  pagination: Pagination;
}

interface TeacherForm {
  teacherId: string;
  name: string;
  phone: string;
  email: string;
  gender: "Male" | "Female" | "Other";
  designation: string;
  subject: string[];
  qualification: string;
  address: string;
  joiningDate: string;
  isActive: boolean;
}

interface ClassAssignment {
  _id: string;
  teacher: {
    _id: string;
    teacherId: string;
    name: string;
    email?: string;
    designation?: string;
  };
  className: string;
  section: string;
}

interface AssignmentResponse {
  success: boolean;
  data: ClassAssignment[];
}

const initialForm: TeacherForm = {
  teacherId: "",
  name: "",
  phone: "",
  email: "",
  gender: "Male",
  designation: "",
  subject: [],
  qualification: "",
  address: "",
  joiningDate: "",
  isActive: true,
};

const inputClass =
  "w-full min-h-11 rounded-xl border border-slate-200 bg-slate-50/70 px-3.5 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100";

const availableClasses = ["6", "7", "8", "9", "10"];

function TeachersContent() {
  const { user } = useAuth();
  const isAdmin = user?.role === "Admin";

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    currentPage: 1,
    limit: 10,
    totalTeachers: 0,
    totalPages: 0,
    hasNextPage: false,
    hasPreviousPage: false,
  });

  const [search, setSearch] = useState("");
  const [designation, setDesignation] = useState("");
  const [subject, setSubject] = useState("");
  const [status, setStatus] = useState("true");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTeacher, setDeletingTeacher] = useState<Teacher | null>(null);
  const [deleteConfirmed, setDeleteConfirmed] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [form, setForm] = useState<TeacherForm>(initialForm);
  const [subjectInput, setSubjectInput] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Class Assignment states
  const [assignments, setAssignments] = useState<ClassAssignment[]>([]);
  const [assignmentsLoading, setAssignmentsLoading] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [assignmentSuccess, setAssignmentSuccess] = useState("");

  const [showAssignmentModal, setShowAssignmentModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [assignmentClass, setAssignmentClass] = useState("6");
  const [assignmentSection, setAssignmentSection] = useState("");
  const [assignmentSubmitting, setAssignmentSubmitting] = useState(false);

  const fetchTeachers = useCallback(async () => {
    try {
      const params: Record<string, string | number> = {
        page: pagination.currentPage,
        limit: pagination.limit,
      };

      if (search.trim()) params.search = search.trim();
      if (designation) params.designation = designation;
      if (subject) params.subject = subject;
      if (status) params.isActive = status;

      const response = await api.get<TeacherResponse>("/teachers", {
        params,
      });

      if (!response.data?.success || !Array.isArray(response.data.data)) {
        throw new Error("Invalid teacher response from server.");
      }

      setTeachers(response.data.data);
      setPagination((previous) => ({
        ...previous,
        ...response.data.pagination,
      }));
      setError("");
    } catch (err: unknown) {
      console.error("Failed to fetch teachers:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: { data?: { message?: string } };
        };

        setError(
          apiError.response?.data?.message ||
            "Unable to load teachers. Please try again."
        );
      } else {
        setError(
          "Cannot connect to the backend server. Please check whether it is running."
        );
      }
    } finally {
      setLoading(false);
    }
  }, [
    pagination.currentPage,
    pagination.limit,
    search,
    designation,
    subject,
    status,
  ]);

  const fetchAssignments = useCallback(async () => {
    if (!isAdmin) return;

    try {
      setAssignmentsLoading(true);
      setAssignmentError("");

      const response = await api.get<AssignmentResponse>(
        "/class-assignments"
      );

      if (!response.data?.success || !Array.isArray(response.data.data)) {
        throw new Error("Invalid class assignment response.");
      }

      setAssignments(response.data.data);
    } catch (err: unknown) {
      console.error("Failed to fetch class assignments:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: { data?: { message?: string } };
        };

        setAssignmentError(
          apiError.response?.data?.message ||
            "Unable to load class assignments."
        );
      } else {
        setAssignmentError("Unable to connect to the backend server.");
      }
    } finally {
      setAssignmentsLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchTeachers();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [fetchTeachers]);

useEffect(() => {
  if (!isAdmin) return;

  const timeoutId = window.setTimeout(() => {
    void fetchAssignments();
  }, 0);

  return () => window.clearTimeout(timeoutId);
}, [fetchAssignments, isAdmin]);

  const changePage = (page: number) => {
    setPagination((previous) => ({
      ...previous,
      currentPage: page,
    }));
    setLoading(true);
  };

  const resetFilters = () => {
    setSearch("");
    setDesignation("");
    setSubject("");
    setStatus("true");
    setPagination((previous) => ({
      ...previous,
      currentPage: 1,
    }));
    setLoading(true);
  };

  const updateForm = <K extends keyof TeacherForm>(
    field: K,
    value: TeacherForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const addSubject = () => {
    const newSubject = subjectInput.trim();

    if (!newSubject) return;

    const alreadyExists = form.subject.some(
      (item) => item.toLowerCase() === newSubject.toLowerCase()
    );

    if (alreadyExists) {
      setFormError("This subject has already been added.");
      return;
    }

    setForm((previous) => ({
      ...previous,
      subject: [...previous.subject, newSubject],
    }));

    setSubjectInput("");
    setFormError("");
  };

  const removeSubject = (subjectToRemove: string) => {
    setForm((previous) => ({
      ...previous,
      subject: previous.subject.filter(
        (item) => item !== subjectToRemove
      ),
    }));
  };

  const closeModal = () => {
    if (submitting) return;

    setShowAddModal(false);
    setShowEditModal(false);
    setEditingTeacher(null);
    setForm(initialForm);
    setSubjectInput("");
    setFormError("");
  };

  const openEditModal = (teacher: Teacher) => {
    setEditingTeacher(teacher);
    setForm({
      teacherId: teacher.teacherId,
      name: teacher.name,
      phone: teacher.phone,
      email: teacher.email || "",
      gender: teacher.gender,
      designation: teacher.designation,
      subject: [...teacher.subject],
      qualification: teacher.qualification,
      address: teacher.address || "",
      joiningDate: teacher.joiningDate
        ? new Date(teacher.joiningDate).toISOString().slice(0, 10)
        : "",
      isActive: teacher.isActive,
    });
    setSubjectInput("");
    setFormError("");
    setShowEditModal(true);
  };

  const handleUpdateTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!editingTeacher) return;

    setFormError("");
    if (form.subject.length === 0) {
      setFormError("Please add at least one subject.");
      return;
    }
    if (!form.joiningDate) {
      setFormError("Please select the joining date.");
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        teacherId: form.teacherId.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        // Teacher profile email is intentionally separate from login email.
        email: form.email.trim() || undefined,
        gender: form.gender,
        designation: form.designation.trim(),
        subject: form.subject,
        qualification: form.qualification.trim(),
        address: form.address.trim() || undefined,
        joiningDate: form.joiningDate,
      };

      const response = await api.put(`/teachers/${editingTeacher._id}`, payload);
      if (!response.data?.success) {
        throw new Error("Teacher could not be updated.");
      }

      setSuccessMessage("Teacher information updated successfully.");
      setShowEditModal(false);
      setEditingTeacher(null);
      setForm(initialForm);
      setSubjectInput("");
      setLoading(true);
      await fetchTeachers();
    } catch (err: unknown) {
      console.error("Failed to update teacher:", err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: { data?: { message?: string; errors?: { message?: string }[] } };
        };
        setFormError(
          apiError.response?.data?.errors?.[0]?.message ||
          apiError.response?.data?.message ||
          "Unable to update teacher. Please try again."
        );
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openDeleteModal = (teacher: Teacher) => {
    setDeletingTeacher(teacher);
    setDeleteConfirmed(false);
    setDeleteError("");
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    if (deleteSubmitting) return;
    setShowDeleteModal(false);
    setDeletingTeacher(null);
    setDeleteConfirmed(false);
    setDeleteError("");
  };

  const handleDeleteTeacher = async () => {
    if (!deletingTeacher || !deleteConfirmed) return;

    try {
      setDeleteSubmitting(true);
      setDeleteError("");
      await api.delete(`/teachers/${deletingTeacher._id}`);
      setSuccessMessage(`${deletingTeacher.name} was deleted successfully.`);
      setShowDeleteModal(false);
      setDeletingTeacher(null);
      setDeleteConfirmed(false);
      setLoading(true);
      await fetchTeachers();
      await fetchAssignments();
    } catch (err: unknown) {
      console.error("Failed to delete teacher:", err);
      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as { response?: { data?: { message?: string } } };
        setDeleteError(
          apiError.response?.data?.message ||
          "Unable to delete this teacher. Check linked accounts and class assignments."
        );
      } else {
        setDeleteError("Something went wrong. Please try again.");
      }
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const handleTeacherStatus = async (teacher: Teacher) => {
    const nextIsActive = !teacher.isActive;
    const action = nextIsActive ? "reactivate" : "deactivate";

    if (
      !window.confirm(
        `Are you sure you want to ${action} ${teacher.name}?`
      )
    ) {
      return;
    }

    try {
      setStatusUpdatingId(teacher._id);
      setError("");
      setSuccessMessage("");

      const response = await api.patch(
        `/teachers/${teacher._id}/status`,
        { isActive: nextIsActive }
      );

      if (!response.data?.success) {
        throw new Error(`Unable to ${action} teacher.`);
      }

      setSuccessMessage(
        `${teacher.name} was ${action}d successfully.`
      );
      setLoading(true);
      await fetchTeachers();
    } catch (err: unknown) {
      console.error(`Failed to ${action} teacher:`, err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: { data?: { message?: string } };
        };

        setError(
          apiError.response?.data?.message ||
            `Unable to ${action} teacher. Please try again.`
        );
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(`Unable to ${action} teacher. Please try again.`);
      }
    } finally {
      setStatusUpdatingId(null);
    }
  };

  const handleAddTeacher = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setFormError("");
    setSuccessMessage("");

    if (form.subject.length === 0) {
      setFormError("Please add at least one subject.");
      return;
    }

    if (!form.joiningDate) {
      setFormError("Please select the joining date.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        ...form,
        teacherId: form.teacherId.trim(),
        name: form.name.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        designation: form.designation.trim(),
        qualification: form.qualification.trim(),
        address: form.address.trim() || undefined,
      };

      const response = await api.post("/teachers", payload);

      if (!response.data?.success) {
        throw new Error("Teacher could not be created.");
      }

      setSuccessMessage("Teacher added successfully!");
      setShowAddModal(false);
      setShowEditModal(false);
      setForm(initialForm);
      setSubjectInput("");
      setPagination((previous) => ({
        ...previous,
        currentPage: 1,
      }));

      setSearch("");
      setDesignation("");
      setSubject("");
      setStatus("true");
      setLoading(true);
    } catch (err: unknown) {
      console.error("Failed to add teacher:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: {
            data?: {
              message?: string;
              errors?: { message?: string }[];
            };
          };
        };

        setFormError(
          apiError.response?.data?.errors?.[0]?.message ||
            apiError.response?.data?.message ||
            "Unable to add teacher. Please check the information."
        );
      } else {
        setFormError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open Class Assignment Modal
  const openAssignmentModal = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setAssignmentClass("6");
    setAssignmentSection("");
    setAssignmentError("");
    setAssignmentSuccess("");
    setShowAssignmentModal(true);
  };

  const closeAssignmentModal = () => {
    if (assignmentSubmitting) return;

    setShowAssignmentModal(false);
    setSelectedTeacher(null);
    setAssignmentClass("6");
    setAssignmentSection("");
    setAssignmentError("");
  };

  // Create Class Assignment
  const handleCreateAssignment = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!selectedTeacher) return;

    const normalizedSection = assignmentSection.trim().toUpperCase();

    if (!normalizedSection) {
      setAssignmentError("Please enter a section.");
      return;
    }

    const duplicate = assignments.some(
      (assignment) =>
        assignment.teacher?._id === selectedTeacher._id &&
        assignment.className === assignmentClass &&
        assignment.section.toUpperCase() === normalizedSection
    );

    if (duplicate) {
      setAssignmentError(
        "This teacher is already assigned to this class and section."
      );
      return;
    }

    try {
      setAssignmentSubmitting(true);
      setAssignmentError("");

      const response = await api.post("/class-assignments", {
        teacher: selectedTeacher._id,
        className: assignmentClass,
        section: normalizedSection,
      });

      if (!response.data?.success) {
        throw new Error("Class assignment could not be created.");
      }

      setAssignmentSuccess("Class assigned successfully!");
      await fetchAssignments();

      setAssignmentSection("");
    } catch (err: unknown) {
      console.error("Failed to create class assignment:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: { data?: { message?: string } };
        };

        setAssignmentError(
          apiError.response?.data?.message ||
            "Unable to assign this class. Please try again."
        );
      } else {
        setAssignmentError("Something went wrong. Please try again.");
      }
    } finally {
      setAssignmentSubmitting(false);
    }
  };

  // Delete Class Assignment
  const handleDeleteAssignment = async (assignmentId: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to remove this class assignment?"
    );

    if (!confirmed) return;

    try {
      setAssignmentError("");
      setAssignmentSuccess("");

      await api.delete(`/class-assignments/${assignmentId}`);

      setAssignments((previous) =>
        previous.filter((item) => item._id !== assignmentId)
      );

      setAssignmentSuccess("Class assignment removed successfully.");
    } catch (err: unknown) {
      console.error("Failed to delete class assignment:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: { data?: { message?: string } };
        };

        setAssignmentError(
          apiError.response?.data?.message ||
            "Unable to remove class assignment."
        );
      } else {
        setAssignmentError("Something went wrong. Please try again.");
      }
    }
  };

  const getTeacherAssignments = (teacherId: string) =>
    assignments.filter(
      (assignment) => assignment.teacher?._id === teacherId
    );

  const activeCount = teachers.filter((teacher) => teacher.isActive).length;
  const inactiveCount = teachers.filter(
    (teacher) => !teacher.isActive
  ).length;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-sm font-medium text-blue-600">
              Lalmohan Govt Model High School
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Teachers Management
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              View and manage school teacher information.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setLoading(true);
                void fetchTeachers();
                void fetchAssignments();
              }}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100 disabled:opacity-60"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
              />
              Refresh
            </button>

            {isAdmin && (
              <button
                onClick={() => {
                  setForm(initialForm);
                  setEditingTeacher(null);
                  setShowEditModal(false);
                  setFormError("");
                  setShowAddModal(true);
                }}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
              >
                <Plus size={18} />
                Add Teacher
              </button>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        )}

        {assignmentSuccess && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {assignmentSuccess}
          </div>
        )}

        {assignmentError && !showAssignmentModal && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {assignmentError}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <SummaryCard
            title="Total Teachers"
            value={pagination.totalTeachers}
            icon={<Users size={21} />}
            color="blue"
          />
          <SummaryCard
            title="Active on This Page"
            value={activeCount}
            icon={<UserCheck size={21} />}
            color="emerald"
          />
          <SummaryCard
            title="Inactive on This Page"
            value={inactiveCount}
            icon={<UserX size={21} />}
            color="rose"
          />
        </div>

        {/* Filters */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="font-semibold text-slate-900">
                Search & Filters
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Find teachers using their details.
              </p>
            </div>

            <button
              onClick={resetFilters}
              className="text-sm font-semibold text-blue-600 hover:text-blue-700"
            >
              Reset
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="relative">
              <Search
                size={17}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPagination((previous) => ({
                    ...previous,
                    currentPage: 1,
                  }));
                }}
                placeholder="Search name, ID or phone..."
                className="w-full rounded-xl border border-slate-200 bg-white py-3 pl-10 pr-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <input
              value={designation}
              onChange={(event) => {
                setDesignation(event.target.value);
                setPagination((previous) => ({
                  ...previous,
                  currentPage: 1,
                }));
              }}
              placeholder="Filter by designation..."
              className={inputClass}
            />

            <input
              value={subject}
              onChange={(event) => {
                setSubject(event.target.value);
                setPagination((previous) => ({
                  ...previous,
                  currentPage: 1,
                }));
              }}
              placeholder="Filter by subject..."
              className={inputClass}
            />

            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPagination((previous) => ({
                  ...previous,
                  currentPage: 1,
                }));
              }}
              className={inputClass}
            >
              <option value="true">Active Teachers</option>
              <option value="false">Inactive Teachers</option>
              <option value="">All Teachers</option>
            </select>
          </div>
        </div>

        {/* Teacher Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col justify-between gap-2 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
            <div>
              <h2 className="font-semibold text-slate-900">
                Teacher Directory
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {pagination.totalTeachers} teacher(s) found
              </p>
            </div>
          </div>

          {loading ? (
            <div className="flex min-h-64 items-center justify-center">
              <RefreshCw className="animate-spin text-blue-600" size={28} />
            </div>
          ) : error ? (
            <div className="p-10 text-center">
              <p className="font-medium text-rose-600">{error}</p>
              <button
                onClick={() => {
                  setLoading(true);
                  void fetchTeachers();
                }}
                className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Try Again
              </button>
            </div>
          ) : teachers.length === 0 ? (
            <div className="flex min-h-64 flex-col items-center justify-center px-5 text-center">
              <GraduationCap size={40} className="text-slate-300" />
              <h3 className="mt-3 font-semibold text-slate-700">
                No teachers found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Try changing your search or filters.
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1160px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-4 font-semibold">Teacher</th>
                      <th className="px-5 py-4 font-semibold">Teacher ID</th>
                      <th className="px-5 py-4 font-semibold">Designation</th>
                      <th className="px-5 py-4 font-semibold">Subjects</th>
                      <th className="px-5 py-4 font-semibold">Contact</th>
                      <th className="px-5 py-4 font-semibold">Status</th>
                      {isAdmin && (
                        <>
                          <th className="px-5 py-4 font-semibold">Class Assignment</th>
                          <th className="px-5 py-4 font-semibold">Actions</th>
                        </>
                      )}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {teachers.map((teacher) => {
                      const teacherAssignments = getTeacherAssignments(
                        teacher._id
                      );

                      return (
                        <tr
                          key={teacher._id}
                          className="transition hover:bg-slate-50/70"
                        >
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">
                                {teacher.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {teacher.name}
                                </p>
                                <p className="mt-1 text-xs text-slate-500">
                                  {teacher.gender}
                                </p>
                              </div>
                            </div>
                          </td>

                          <td className="px-5 py-4 font-medium text-slate-600">
                            {teacher.teacherId}
                          </td>

                          <td className="px-5 py-4 text-slate-600">
                            {teacher.designation}
                          </td>

                          <td className="px-5 py-4">
                            <div className="flex max-w-56 flex-wrap gap-1.5">
                              {teacher.subject.map((item) => (
                                <span
                                  key={item}
                                  className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <div className="space-y-1.5 text-xs text-slate-600">
                              <p className="flex items-center gap-2">
                                <Phone size={13} />
                                {teacher.phone}
                              </p>
                              {teacher.email && (
                                <p className="flex items-center gap-2">
                                  <Mail size={13} />
                                  {teacher.email}
                                </p>
                              )}
                            </div>
                          </td>

                          <td className="px-5 py-4">
                            <span
                              className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
                                teacher.isActive
                                  ? "bg-emerald-50 text-emerald-700"
                                  : "bg-rose-50 text-rose-700"
                              }`}
                            >
                              {teacher.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>

                          {isAdmin && (
                            <td className="px-5 py-4">
                              <div className="mb-2 flex max-w-64 flex-wrap gap-1.5">
                                {teacherAssignments.length > 0 ? (
                                  teacherAssignments.map((assignment) => (
                                    <span
                                      key={assignment._id}
                                      className="rounded-md bg-indigo-50 px-2 py-1 text-xs font-medium text-indigo-700"
                                    >
                                      Class {assignment.className} -{" "}
                                      {assignment.section}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-xs text-slate-400">
                                    Not assigned
                                  </span>
                                )}
                              </div>

                              <button
                                onClick={() => openAssignmentModal(teacher)}
                                disabled={!teacher.isActive}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                              >
                                <BookOpen size={14} />
                                Manage Classes
                              </button>
                            </td>
                          )}

                          {isAdmin && (
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openEditModal(teacher)}
                                  title={`Edit ${teacher.name}`}
                                  aria-label={`Edit ${teacher.name}`}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-700 transition duration-200 hover:-translate-y-0.5 hover:border-blue-200 hover:bg-blue-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                                >
                                  <Pencil size={16} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleTeacherStatus(teacher)}
                                  disabled={statusUpdatingId === teacher._id}
                                  title={teacher.isActive ? `Deactivate ${teacher.name}` : `Reactivate ${teacher.name}`}
                                  aria-label={teacher.isActive ? `Deactivate ${teacher.name}` : `Reactivate ${teacher.name}`}
                                  className={`inline-flex h-10 w-10 items-center justify-center rounded-xl border transition duration-200 hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
                                    teacher.isActive
                                      ? "border-amber-100 bg-amber-50 text-amber-700 hover:border-amber-200 hover:bg-amber-100 focus-visible:ring-amber-500"
                                      : "border-emerald-100 bg-emerald-50 text-emerald-700 hover:border-emerald-200 hover:bg-emerald-100 focus-visible:ring-emerald-500"
                                  }`}
                                >
                                  {statusUpdatingId === teacher._id ? (
                                    <RefreshCw size={16} className="animate-spin" />
                                  ) : (
                                    <Power size={16} />
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeleteModal(teacher)}
                                  title={`Delete ${teacher.name}`}
                                  aria-label={`Delete ${teacher.name}`}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-rose-100 bg-rose-50 text-rose-700 transition duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-100 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 focus-visible:ring-offset-2"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex flex-col justify-between gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
                <p className="text-xs text-slate-500">
                  Page {pagination.currentPage} of{" "}
                  {Math.max(1, pagination.totalPages)}
                  {" · "}
                  {pagination.totalTeachers} total teachers
                </p>

                <div className="flex items-center gap-2">
                  <button
                    disabled={!pagination.hasPreviousPage}
                    onClick={() => changePage(pagination.currentPage - 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft size={16} />
                    Previous
                  </button>

                  <button
                    disabled={!pagination.hasNextPage}
                    onClick={() => changePage(pagination.currentPage + 1)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* All Class Assignments */}
        {isAdmin && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="flex items-center gap-2 font-semibold text-slate-900">
                  <ClipboardList size={18} className="text-blue-600" />
                  Class Assignment Directory
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  All teacher class and section assignments.
                </p>
              </div>

              <button
                onClick={() => void fetchAssignments()}
                disabled={assignmentsLoading}
                className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                aria-label="Refresh assignments"
              >
                <RefreshCw
                  size={16}
                  className={assignmentsLoading ? "animate-spin" : ""}
                />
              </button>
            </div>

            {assignmentsLoading ? (
              <div className="flex min-h-32 items-center justify-center">
                <RefreshCw className="animate-spin text-blue-600" />
              </div>
            ) : assignments.length === 0 ? (
              <div className="p-8 text-center">
                <BookOpen
                  size={32}
                  className="mx-auto text-slate-300"
                />
                <p className="mt-3 text-sm font-medium text-slate-600">
                  No class assignments yet.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[600px] text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                    <tr>
                      <th className="px-5 py-3 font-semibold">Teacher</th>
                      <th className="px-5 py-3 font-semibold">Teacher ID</th>
                      <th className="px-5 py-3 font-semibold">Class</th>
                      <th className="px-5 py-3 font-semibold">Section</th>
                      <th className="px-5 py-3 text-right font-semibold">
                        Action
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {assignments.map((assignment) => (
                      <tr key={assignment._id}>
                        <td className="px-5 py-3 font-medium text-slate-800">
                          {assignment.teacher?.name || "Unknown Teacher"}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {assignment.teacher?.teacherId || "—"}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          Class {assignment.className}
                        </td>
                        <td className="px-5 py-3 text-slate-600">
                          {assignment.section}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={() =>
                              void handleDeleteAssignment(assignment._id)
                            }
                            className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 size={14} />
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Edit Teacher Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[94vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-white/60 bg-white shadow-2xl shadow-slate-950/20">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-white px-5 py-5 sm:px-7">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                  {showEditModal ? <Pencil size={19} /> : <GraduationCap size={21} />}
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-bold tracking-tight text-slate-900 sm:text-xl">
                      {showEditModal ? "Edit Teacher Profile" : "Add New Teacher"}
                    </h2>
                    <span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-blue-700">
                      {showEditModal ? "Update profile" : "New profile"}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 sm:text-sm">
                    {showEditModal
                      ? "Keep the teacher information accurate and up to date. Login account email remains separate."
                      : "Add the teacher's personal, contact and professional information."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                title="Close"
                aria-label="Close teacher form"
                className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
              >
                <X size={19} />
              </button>
            </div>

            <form
              onSubmit={showEditModal ? handleUpdateTeacher : handleAddTeacher}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-4 overflow-y-auto bg-slate-50/70 px-5 py-5 sm:px-7 sm:py-6">
                {/* Personal information */}
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                      <UserCheck size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Personal Information</h3>
                      <p className="mt-0.5 text-xs text-slate-400">Basic identity details of the teacher</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <FormField label="Teacher ID" required>
                      <input
                        required
                        value={form.teacherId}
                        onChange={(event) => updateForm("teacherId", event.target.value)}
                        placeholder="e.g. TCH-2026-002"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Full Name" required>
                      <input
                        required
                        value={form.name}
                        onChange={(event) => updateForm("name", event.target.value)}
                        placeholder="Enter full name"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Gender" required>
                      <select
                        value={form.gender}
                        onChange={(event) =>
                          updateForm("gender", event.target.value as TeacherForm["gender"])
                        }
                        className={inputClass}
                      >
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </FormField>
                  </div>
                </section>

                {/* Contact information */}
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Phone size={17} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Contact Information</h3>
                      <p className="mt-0.5 text-xs text-slate-400">Phone, email and residential address</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Phone Number" required>
                      <input
                        required
                        value={form.phone}
                        onChange={(event) => updateForm("phone", event.target.value)}
                        placeholder="01XXXXXXXXX"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Email Address">
                      <input
                        type="email"
                        value={form.email}
                        onChange={(event) => updateForm("email", event.target.value)}
                        placeholder="teacher@example.com"
                        className={inputClass}
                      />
                    </FormField>

                    <div className="sm:col-span-2">
                      <FormField label="Address">
                        <textarea
                          rows={2}
                          value={form.address}
                          onChange={(event) => updateForm("address", event.target.value)}
                          placeholder="Enter the teacher's address"
                          className={`${inputClass} min-h-24 resize-y`}
                        />
                      </FormField>
                    </div>
                  </div>
                </section>

                {/* Professional information */}
                <section className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm sm:p-5">
                  <div className="mb-5 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <GraduationCap size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">Professional Information</h3>
                      <p className="mt-0.5 text-xs text-slate-400">Designation, qualification, subjects and joining date</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField label="Designation" required>
                      <input
                        required
                        value={form.designation}
                        onChange={(event) => updateForm("designation", event.target.value)}
                        placeholder="e.g. Assistant Teacher"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Qualification" required>
                      <input
                        required
                        value={form.qualification}
                        onChange={(event) => updateForm("qualification", event.target.value)}
                        placeholder="e.g. M.Sc. in Mathematics"
                        className={inputClass}
                      />
                    </FormField>

                    <FormField label="Joining Date" required>
                      <input
                        required
                        type="date"
                        value={form.joiningDate}
                        onChange={(event) => updateForm("joiningDate", event.target.value)}
                        className={inputClass}
                      />
                    </FormField>

                    <div className="sm:col-span-2">
                      <FormField label="Subjects" required>
                        <div className="flex flex-col gap-2 sm:flex-row">
                          <input
                            value={subjectInput}
                            onChange={(event) => setSubjectInput(event.target.value)}
                            onKeyDown={(event) => {
                              if (event.key === "Enter") {
                                event.preventDefault();
                                addSubject();
                              }
                            }}
                            placeholder="Type a subject name"
                            className={inputClass}
                          />
                          <button
                            type="button"
                            onClick={addSubject}
                            className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
                          >
                            <Plus size={16} />
                            Add subject
                          </button>
                        </div>

                        {form.subject.length > 0 ? (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {form.subject.map((item) => (
                              <span
                                key={item}
                                className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-blue-50 py-1.5 pl-3 pr-1.5 text-xs font-semibold text-blue-700"
                              >
                                {item}
                                <button
                                  type="button"
                                  onClick={() => removeSubject(item)}
                                  title={`Remove ${item}`}
                                  aria-label={`Remove ${item}`}
                                  className="inline-flex h-6 w-6 items-center justify-center rounded-full text-blue-500 transition hover:bg-rose-100 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-500"
                                >
                                  <X size={13} />
                                </button>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <p className="mt-2 text-xs text-slate-400">Add at least one subject to continue.</p>
                        )}
                      </FormField>
                    </div>
                  </div>
                </section>

                {formError && (
                  <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                    {formError}
                  </div>
                )}
              </div>

              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-white px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      {showEditModal ? <Pencil size={16} /> : <Plus size={17} />}
                      {showEditModal ? "Update Teacher" : "Save Teacher"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Teacher Confirmation Modal */}
      {showDeleteModal && deletingTeacher && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <ShieldAlert size={24} />
            </div>
            <h2 className="mt-4 text-lg font-bold text-slate-900">Delete Teacher?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Are you sure you want to permanently delete <strong>{deletingTeacher.name}</strong> ({deletingTeacher.teacherId})? This action cannot be undone.
            </p>

            {deleteError && (
              <p className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-3 text-sm text-rose-700">
                {deleteError}
              </p>
            )}

            <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3">
              <input
                type="checkbox"
                checked={deleteConfirmed}
                onChange={(event) => setDeleteConfirmed(event.target.checked)}
                disabled={deleteSubmitting}
                className="mt-0.5 h-4 w-4 accent-rose-600"
              />
              <span className="text-sm text-slate-700">
                I understand that this action is permanent and cannot be undone.
              </span>
            </label>

            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deleteSubmitting}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void handleDeleteTeacher()}
                disabled={!deleteConfirmed || deleteSubmitting}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {deleteSubmitting ? (
                  <><RefreshCw size={15} className="animate-spin" /> Deleting...</>
                ) : (
                  <><Trash2 size={15} /> Confirm Delete</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Class Assignment Modal */}
      {showAssignmentModal && selectedTeacher && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
          <div className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Manage Class Assignment
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedTeacher.name} · {selectedTeacher.teacherId}
                </p>
              </div>

              <button
                onClick={closeAssignmentModal}
                disabled={assignmentSubmitting}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close assignment modal"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-5 overflow-y-auto p-5">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Current Assignments
                </h3>

                <div className="space-y-2">
                  {getTeacherAssignments(selectedTeacher._id).length > 0 ? (
                    getTeacherAssignments(selectedTeacher._id).map(
                      (assignment) => (
                        <div
                          key={assignment._id}
                          className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 p-3"
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-800">
                              Class {assignment.className}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              Section {assignment.section}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              void handleDeleteAssignment(assignment._id)
                            }
                            className="rounded-lg p-2 text-rose-600 transition hover:bg-rose-50"
                            aria-label="Remove assignment"
                          >
                            <Trash2 size={17} />
                          </button>
                        </div>
                      )
                    )
                  ) : (
                    <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">
                      No classes assigned to this teacher yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-800">
                  Assign a New Class
                </h3>

                <form
                  onSubmit={handleCreateAssignment}
                  className="space-y-4"
                >
                  <FormField label="Class" required>
                    <select
                      required
                      value={assignmentClass}
                      onChange={(event) =>
                        setAssignmentClass(event.target.value)
                      }
                      className={inputClass}
                    >
                      {availableClasses.map((className) => (
                        <option key={className} value={className}>
                          Class {className}
                        </option>
                      ))}
                    </select>
                  </FormField>

                  <FormField label="Section" required>
                    <input
                      required
                      value={assignmentSection}
                      onChange={(event) =>
                        setAssignmentSection(event.target.value.toUpperCase())
                      }
                      placeholder="e.g. A, B, C"
                      maxLength={20}
                      className={inputClass}
                    />
                  </FormField>

                  {assignmentError && (
                    <p className="rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
                      {assignmentError}
                    </p>
                  )}

                  {assignmentSuccess && (
                    <p className="rounded-lg bg-emerald-50 px-3 py-2.5 text-sm text-emerald-700">
                      {assignmentSuccess}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={assignmentSubmitting}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {assignmentSubmitting ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Assigning...
                      </>
                    ) : (
                      <>
                        <Plus size={17} />
                        Assign Class
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-2 block text-xs font-semibold tracking-wide text-slate-600">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: "blue" | "emerald" | "rose";
}) {
  const styles = {
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    rose: "bg-rose-50 text-rose-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <div className={`rounded-xl p-2.5 ${styles[color]}`}>{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
    </div>
  );
}

export default function TeachersPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <TeachersContent />
    </ProtectedRoute>
  );
}
