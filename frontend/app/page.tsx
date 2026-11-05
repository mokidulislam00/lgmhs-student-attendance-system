"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";

import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import ProtectedRoute from "../components/ProtectedRoute";
import DashboardStudentModal from "../components/DashboardStudentModal";

import {
  Users,
  CalendarDays,
  Clock3,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Activity,
  BookOpen,
  AlertCircle,
  RefreshCw,
  ArrowRight,
  Database,
  GraduationCap,
  Layers3,
  FileBarChart,
  ClipboardCheck,
} from "lucide-react";

type DashboardModalType =
  | "students"
  | "Present"
  | "Absent"
  | "Late"
  | "Excused";

interface DashboardData {
  students: {
    total: number;
    active: number;
    inactive: number;
    classWise: { _id: string; total: number }[];
    sectionWise: { _id: string; total: number }[];
  };
  todayAttendance: {
    date: string;
    totalMarked: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    attendancePercentage: number;
  };
}

interface RecentAttendance {
  _id: string;
  student?: {
    _id?: string;
    studentId?: string;
    name?: string;
    roll?: number | string;
  } | null;
  attendanceDate: string;
  status: "Present" | "Absent" | "Late" | "Excused";
  className: string;
  section: string;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US").format(
    Number.isFinite(value) ? value : 0
  );
}

function formatDate(date: string) {
  if (!date) return "Date unavailable";

  const parsedDate = new Date(`${date.slice(0, 10)}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return "Date unavailable";
  }

  return parsedDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getStatusStyle(status: RecentAttendance["status"]) {
  switch (status) {
    case "Present":
      return "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200";
    case "Absent":
      return "bg-rose-100 text-rose-700 ring-1 ring-rose-200";
    case "Late":
      return "bg-amber-100 text-amber-700 ring-1 ring-amber-200";
    case "Excused":
      return "bg-blue-100 text-blue-700 ring-1 ring-blue-200";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function AttendanceRing({
  present,
  absent,
  late,
  excused,
  total,
}: {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
}) {
  const radius = 78;
  const circumference = 2 * Math.PI * radius;

  const segments = [
    { value: present, color: "#10b981" },
    { value: late, color: "#f59e0b" },
    { value: absent, color: "#f43f5e" },
    { value: excused, color: "#3b82f6" },
  ];

  let offset = 0;

  return (
    <div className="relative mx-auto flex h-40 w-40 shrink-0 items-center justify-center sm:h-44 sm:w-44">
      <svg
        viewBox="0 0 200 200"
        className="h-full w-full -rotate-90"
        role="img"
        aria-label="Today's attendance distribution"
      >
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="none"
          stroke="#f1f5f9"
          strokeWidth="18"
        />

        {total > 0 &&
          segments.map((segment, index) => {
            const length =
              (Math.max(segment.value, 0) / total) * circumference;

            const currentOffset = offset;
            offset += length;

            if (segment.value <= 0) return null;

            return (
              <circle
                key={index}
                cx="100"
                cy="100"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="18"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="butt"
              />
            );
          })}
      </svg>

      <div className="absolute text-center">
        <p className="text-3xl font-bold tracking-tight text-slate-900">
          {total > 0
            ? `${Math.round((present / total) * 100)}%`
            : "—"}
        </p>
        <p className="mt-1 text-[11px] font-medium text-slate-400">
          Present Today
        </p>
      </div>
    </div>
  );
}

function DashboardContent() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const container = useRef<HTMLDivElement>(null);
  const requestId = useRef(0);

  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [recentAttendance, setRecentAttendance] = useState<
    RecentAttendance[]
  >([]);
  const [recentLoading, setRecentLoading] = useState(true);
  const [recentError, setRecentError] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [modalType, setModalType] = useState<DashboardModalType | null>(
    null
  );

  const fetchDashboard = useCallback(async () => {
    const currentRequest = ++requestId.current;

    try {
      const response = await api.get("/dashboard");

      if (!response.data?.success || !response.data?.data) {
        throw new Error("Invalid dashboard response from server.");
      }

      if (currentRequest !== requestId.current) return;

      setDashboard(response.data.data as DashboardData);
      setError("");
    } catch (err: unknown) {
      if (currentRequest !== requestId.current) return;

      console.error("Dashboard request failed:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: {
            status?: number;
            data?: { message?: string };
          };
        };

        if (apiError.response?.status === 401) {
          await logout();
          router.replace("/login");
          return;
        }

        setError(
          apiError.response?.data?.message ||
            "Unable to load dashboard data. Please try again."
        );
      } else {
        setError(
          "Cannot connect to the backend server. Please check whether it is running."
        );
      }
    } finally {
      if (currentRequest === requestId.current) {
        setLoading(false);
      }
    }
  }, [logout, router]);

  const fetchRecentAttendance = useCallback(async () => {
    setRecentLoading(true);
    setRecentError("");

    try {
      const response = await api.get("/attendances");

      if (!response.data?.success || !Array.isArray(response.data?.data)) {
        throw new Error("Invalid attendance response from server.");
      }

      const records = response.data.data as RecentAttendance[];

      const sortedRecords = [...records].sort((a, b) => {
        const dateDifference =
          new Date(b.attendanceDate).getTime() -
          new Date(a.attendanceDate).getTime();

        if (dateDifference !== 0) return dateDifference;

        return b._id.localeCompare(a._id);
      });

      setRecentAttendance(sortedRecords.slice(0, 5));
    } catch (err: unknown) {
      console.error("Recent attendance request failed:", err);
      setRecentError("Unable to load recent attendance records.");
      setRecentAttendance([]);
    } finally {
      setRecentLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void fetchDashboard();
      void fetchRecentAttendance();
    }, 0);

    return () => {
      window.clearTimeout(timeoutId);
      requestId.current += 1;
    };
  }, [fetchDashboard, fetchRecentAttendance]);

  const handleRefresh = () => {
    setLoading(true);
    setError("");
    void fetchDashboard();
    void fetchRecentAttendance();
  };

  useEffect(() => {
    if (loading || !dashboard || !container.current) return;

    const context = gsap.context(() => {
      const elements = gsap.utils.toArray<HTMLElement>(
        ".dashboard-reveal"
      );

      if (!elements.length) return;

      gsap.fromTo(
        elements,
        { y: 12 },
        {
          y: 0,
          duration: 0.35,
          stagger: 0.035,
          ease: "power2.out",
          clearProps: "transform",
          overwrite: "auto",
        }
      );
    }, container);

    return () => context.revert();
  }, [loading, dashboard]);

  const students = dashboard?.students;
  const today = dashboard?.todayAttendance;

  const stats: {
    title: string;
    value: number;
    description: string;
    icon: typeof Users;
    iconClass: string;
    cardClass: string;
    accent: string;
    modalType: DashboardModalType;
  }[] = [
    {
      title: "Total Students",
      value: students?.total ?? 0,
      description: "All registered students",
      icon: Users,
      iconClass: "bg-blue-100 text-blue-600",
      cardClass: "border-blue-100 bg-gradient-to-br from-white to-blue-50",
      accent: "bg-blue-500",
      modalType: "students",
    },
    {
      title: "Present Today",
      value: today?.present ?? 0,
      description: "Students marked present",
      icon: CheckCircle2,
      iconClass: "bg-emerald-100 text-emerald-600",
      cardClass:
        "border-emerald-100 bg-gradient-to-br from-white to-emerald-50",
      accent: "bg-emerald-500",
      modalType: "Present",
    },
    {
      title: "Absent Today",
      value: today?.absent ?? 0,
      description: "Students marked absent",
      icon: XCircle,
      iconClass: "bg-rose-100 text-rose-600",
      cardClass: "border-rose-100 bg-gradient-to-br from-white to-rose-50",
      accent: "bg-rose-500",
      modalType: "Absent",
    },
    {
      title: "Late Arrivals",
      value: today?.late ?? 0,
      description: "Students marked late",
      icon: Clock3,
      iconClass: "bg-amber-100 text-amber-600",
      cardClass:
        "border-amber-100 bg-gradient-to-br from-white to-amber-50",
      accent: "bg-amber-500",
      modalType: "Late",
    },
    {
      title: "Excused Today",
      value: today?.excused ?? 0,
      description: "Students with excused attendance",
      icon: ClipboardCheck,
      iconClass: "bg-violet-100 text-violet-600",
      cardClass:
        "border-violet-100 bg-gradient-to-br from-white to-violet-50",
      accent: "bg-violet-500",
      modalType: "Excused",
    },
  ];

  const attendanceSummary = [
    {
      label: "Present",
      value: today?.present ?? 0,
      color: "bg-emerald-500",
    },
    {
      label: "Late",
      value: today?.late ?? 0,
      color: "bg-amber-400",
    },
    {
      label: "Absent",
      value: today?.absent ?? 0,
      color: "bg-rose-500",
    },
    {
      label: "Excused",
      value: today?.excused ?? 0,
      color: "bg-blue-500",
    },
  ];

  const activeRatio =
    students && students.total > 0
      ? Math.min((students.active / students.total) * 100, 100)
      : 0;

  return (
    <div
      ref={container}
      className="min-h-screen bg-[#f3f6fc] text-slate-800"
    >
      <div className="mx-auto w-full max-w-[1600px] p-4 sm:p-5 lg:p-6 xl:p-7">
        {/* Welcome banner */}
        <section className="dashboard-reveal relative mb-5 min-h-[145px] overflow-hidden rounded-2xl border border-emerald-100 bg-gradient-to-r from-emerald-50 via-cyan-50 to-blue-50 p-5 shadow-sm sm:p-6">
          <div className="pointer-events-none absolute -right-10 -top-24 h-64 w-64 rounded-full bg-emerald-200/30 blur-3xl" />
          <div className="pointer-events-none absolute right-32 top-10 h-40 w-40 rounded-full bg-blue-200/30 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col justify-between gap-5 lg:flex-row lg:items-center">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                School overview
              </div>

              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Welcome, {user?.name ?? "User"} 👋
              </h1>

              <p className="mt-1.5 text-sm text-slate-600">
                Here&apos;s what&apos;s happening at your school today.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-h-[42px] items-center gap-2 rounded-full border border-white/80 bg-white/90 px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm">
                <CalendarDays size={15} className="text-blue-600" />
                {today ? formatDate(today.date) : "Loading date..."}
              </div>

              <button
                type="button"
                onClick={handleRefresh}
                disabled={loading}
                className="flex min-h-[42px] items-center gap-2 rounded-full bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <RefreshCw
                  size={14}
                  className={loading ? "animate-spin" : ""}
                />
                Refresh
              </button>
            </div>
          </div>

          <div className="pointer-events-none absolute bottom-0 right-0 hidden h-24 w-2/5 opacity-20 lg:block">
            <div className="absolute bottom-0 right-8 h-16 w-52 rounded-t-xl border-x-4 border-t-4 border-emerald-700" />
            <div className="absolute bottom-0 right-20 h-20 w-28 rounded-t-xl border-x-4 border-t-4 border-emerald-700" />
            <div className="absolute bottom-0 right-32 h-12 w-5 border-x-2 border-t-2 border-emerald-700" />
            <div className="absolute bottom-0 right-52 h-14 w-5 border-x-2 border-t-2 border-emerald-700" />
          </div>
        </section>

        {/* Loading state */}
        {loading && (
          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                className="min-h-[145px] animate-pulse rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="h-11 w-11 rounded-xl bg-slate-100" />
                <div className="mt-4 h-3 w-28 rounded bg-slate-100" />
                <div className="mt-2 h-7 w-16 rounded bg-slate-100" />
                <div className="mt-2 h-3 w-36 rounded bg-slate-100" />
              </div>
            ))}
          </div>
        )}

        {/* Error state */}
        {!loading && error && (
          <div className="mb-5 rounded-2xl border border-rose-200 bg-white p-5 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="shrink-0 rounded-xl bg-rose-50 p-3 text-rose-600">
                <AlertCircle size={21} />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-bold text-slate-800">
                  Unable to load dashboard
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {error}
                </p>

                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-3 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
                >
                  <RefreshCw size={13} />
                  Try again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Dashboard data */}
        {!loading && !error && dashboard && students && today && (
          <>
            {/* Statistics cards */}
            <section className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
              {stats.map((stat) => {
                const Icon = stat.icon;

                return (
                  <button
                    key={stat.title}
                    type="button"
                    onClick={() => setModalType(stat.modalType)}
                    aria-label={`View ${stat.title} students`}
                    className={`dashboard-reveal group relative min-w-0 overflow-hidden rounded-2xl border p-5 text-left shadow-sm transition duration-200 hover:-translate-y-1 hover:shadow-lg focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 ${stat.cardClass}`}
                  >
                    <div
                      className={`absolute bottom-0 left-0 top-0 w-1 ${stat.accent}`}
                    />

                    <div className="flex items-center justify-between gap-3">
                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl ${stat.iconClass}`}
                      >
                        <Icon size={23} strokeWidth={2.2} />
                      </div>

                      <MoreHorizontal
                        size={19}
                        className="text-slate-300 transition group-hover:text-slate-500"
                      />
                    </div>

                    <div className="mt-4">
                      <p className="text-xs font-semibold text-slate-500">
                        {stat.title}
                      </p>

                      <h3 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                        {formatNumber(stat.value)}
                      </h3>

                      <p className="mt-1.5 text-[11px] text-slate-500">
                        {stat.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </section>

            {/* Attendance overview and summary */}
            <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-5">
              <article className="dashboard-reveal min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Activity
                      size={23}
                      className="mt-0.5 shrink-0 text-emerald-500"
                    />

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Today&apos;s Attendance Overview
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Attendance statistics from your school database
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/reports")}
                    className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3.5 py-2 text-[11px] font-semibold text-emerald-700 transition hover:bg-emerald-100"
                  >
                    <FileBarChart size={14} />
                    Daily report
                  </button>
                </div>

                <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-slate-500">
                      Attendance Percentage
                    </p>

                    <p className="mt-1 text-4xl font-bold tracking-tight text-slate-900">
                      {Number(today.attendancePercentage || 0).toFixed(2)}%
                    </p>

                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                        style={{
                          width: `${Math.min(
                            Math.max(today.attendancePercentage || 0, 0),
                            100
                          )}%`,
                        }}
                      />
                    </div>

                    <p className="mt-2 text-[11px] text-slate-500">
                      Present + Late divided by total marked
                    </p>
                  </div>

                  <div className="flex flex-col justify-center rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
                    <p className="text-xs font-medium text-slate-500">
                      Total Marked Attendance
                    </p>

                    <p className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
                      {formatNumber(today.totalMarked)}
                    </p>

                    <p className="mt-1 text-[11px] text-slate-500">
                      All attendance statuses combined
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex items-center gap-2">
                    <Database size={17} className="text-emerald-600" />

                    <p className="text-xs font-bold text-slate-800">
                      Live database statistics
                    </p>
                  </div>

                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    This section displays the current day&apos;s attendance
                    percentage directly from the backend. Historical
                    attendance trends will be added when a date-wise
                    statistics endpoint is connected.
                  </p>
                </div>
              </article>

              <article className="dashboard-reveal min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                <div className="mb-4 flex items-center gap-3">
                  <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600">
                    <Activity size={21} />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Attendance Summary
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Today&apos;s student distribution
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 items-center gap-3 sm:grid-cols-[1fr_1fr] xl:grid-cols-1 2xl:grid-cols-[1fr_1fr]">
                  <AttendanceRing
                    present={today.present}
                    absent={today.absent}
                    late={today.late}
                    excused={today.excused}
                    total={today.totalMarked}
                  />

                  <div className="space-y-4">
                    {attendanceSummary.map((item) => (
                      <div
                        key={item.label}
                        className="flex items-center justify-between gap-3 text-sm"
                      >
                        <span className="flex items-center gap-2.5 text-slate-600">
                          <span
                            className={`h-3 w-3 shrink-0 rounded-full ${item.color}`}
                          />
                          {item.label}
                        </span>

                        <span className="font-bold tabular-nums text-slate-900">
                          {formatNumber(item.value)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            </section>

            {/* Student and class information */}
            <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-5">
              <article className="dashboard-reveal min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-3">
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <Users
                      size={23}
                      className="mt-0.5 shrink-0 text-blue-600"
                    />

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Student Overview
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Registered student account statistics
                      </p>
                    </div>
                  </div>

                  <div className="rounded-full bg-blue-50 p-2.5 text-blue-600">
                    <GraduationCap size={20} />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-blue-100 bg-blue-50/80 p-4">
                    <p className="text-xs font-semibold text-blue-700">
                      Total Students
                    </p>

                    <p className="mt-1.5 text-2xl font-bold text-blue-900">
                      {formatNumber(students.total)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-emerald-100 bg-emerald-50/80 p-4">
                    <p className="text-xs font-semibold text-emerald-700">
                      Active Students
                    </p>

                    <p className="mt-1.5 text-2xl font-bold text-emerald-900">
                      {formatNumber(students.active)}
                    </p>
                  </div>

                  <div className="rounded-xl border border-rose-100 bg-rose-50/80 p-4">
                    <p className="text-xs font-semibold text-rose-700">
                      Inactive Students
                    </p>

                    <p className="mt-1.5 text-2xl font-bold text-rose-900">
                      {formatNumber(students.inactive)}
                    </p>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-2 flex justify-between gap-3 text-xs">
                    <span className="font-semibold text-slate-600">
                      Active student ratio
                    </span>

                    <span className="font-bold tabular-nums text-slate-900">
                      {activeRatio.toFixed(1)}%
                    </span>
                  </div>

                  <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                      style={{ width: `${activeRatio}%` }}
                    />
                  </div>
                </div>
              </article>

              <article className="dashboard-reveal min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6 xl:col-span-2">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-blue-50 p-2.5 text-blue-600">
                    <BookOpen size={21} />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Students by Class
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Active student distribution
                    </p>
                  </div>
                </div>

                {students.classWise.length > 0 ? (
                  <div className="space-y-3.5">
                    {students.classWise.map((item) => {
                      const percentage =
                        students.active > 0
                          ? (item.total / students.active) * 100
                          : 0;

                      return (
                        <div key={item._id}>
                          <div className="mb-1.5 flex justify-between gap-3 text-xs">
                            <span className="font-medium text-slate-700">
                              Class {item._id}
                            </span>

                            <span className="font-bold tabular-nums text-slate-900">
                              {formatNumber(item.total)}
                            </span>
                          </div>

                          <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
                              style={{
                                width: `${Math.min(percentage, 100)}%`,
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                    No class information available.
                  </p>
                )}
              </article>
            </section>

            {/* Section distribution and Recent Attendance */}
            <section className="mb-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <article className="dashboard-reveal min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-5 flex items-center gap-3">
                  <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600">
                    <Layers3 size={21} />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-slate-900">
                      Students by Section
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Active student distribution across sections
                    </p>
                  </div>
                </div>

                {students.sectionWise.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-3 2xl:grid-cols-5">
                    {students.sectionWise.map((item) => (
                      <div
                        key={item._id}
                        className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-blue-50/60 p-3.5 transition hover:-translate-y-0.5 hover:shadow-sm"
                      >
                        <p className="text-xs font-semibold text-indigo-700">
                          Section {item._id}
                        </p>

                        <p className="mt-2 text-2xl font-bold text-slate-900">
                          {formatNumber(item.total)}
                        </p>

                        <p className="mt-1 text-[10px] text-slate-500">
                          Active students
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-xl bg-slate-50 p-4 text-xs text-slate-500">
                    No section information available.
                  </p>
                )}
              </article>

              {/* Recent Attendance */}
              <article className="dashboard-reveal min-w-0 overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm sm:p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600">
                      <Clock3 size={21} />
                    </div>

                    <div>
                      <h3 className="text-base font-bold text-slate-900">
                        Recent Attendance
                      </h3>

                      <p className="mt-1 text-xs text-slate-500">
                        Latest attendance records
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => router.push("/attendance")}
                    className="inline-flex items-center gap-1.5 rounded-full border border-blue-100 bg-blue-50 px-3.5 py-2 text-[11px] font-semibold text-blue-700 transition hover:bg-blue-100"
                  >
                    View All
                    <ArrowRight size={13} />
                  </button>
                </div>

                {recentLoading ? (
                  <div className="space-y-3 py-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div
                        key={index}
                        className="h-9 animate-pulse rounded-lg bg-slate-100"
                      />
                    ))}
                  </div>
                ) : recentError ? (
                  <div className="rounded-xl border border-rose-100 bg-rose-50 p-4">
                    <p className="text-xs text-rose-700">{recentError}</p>

                    <button
                      type="button"
                      onClick={() => void fetchRecentAttendance()}
                      className="mt-2 inline-flex items-center gap-1.5 text-xs font-semibold text-rose-700 hover:text-rose-900"
                    >
                      <RefreshCw size={12} />
                      Try again
                    </button>
                  </div>
                ) : recentAttendance.length > 0 ? (
                  <div className="-mx-2 overflow-x-auto px-2">
                    <table className="w-full min-w-[570px] text-left text-xs">
                      <thead>
                        <tr className="border-y border-slate-100 bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                          <th className="px-3 py-3">Student Name</th>
                          <th className="px-3 py-3">Roll</th>
                          <th className="px-3 py-3">Class</th>
                          <th className="px-3 py-3">Section</th>
                          <th className="px-3 py-3">Date</th>
                          <th className="px-3 py-3 text-right">Status</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentAttendance.map((record) => (
                          <tr
                            key={record._id}
                            className="border-b border-slate-100 transition hover:bg-slate-50/80"
                          >
                            <td className="max-w-[150px] px-3 py-3">
                              <span className="block truncate font-semibold text-slate-800">
                                {record.student?.name || "Unknown Student"}
                              </span>
                            </td>

                            <td className="px-3 py-3 font-medium text-slate-600">
                              {record.student?.roll ?? "—"}
                            </td>

                            <td className="px-3 py-3 font-medium text-slate-600">
                              {record.className}
                            </td>

                            <td className="px-3 py-3 font-medium text-slate-600">
                              {record.section}
                            </td>

                            <td className="whitespace-nowrap px-3 py-3 text-slate-500">
                              {formatDate(record.attendanceDate)}
                            </td>

                            <td className="px-3 py-3 text-right">
                              <span
                                className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${getStatusStyle(
                                  record.status
                                )}`}
                              >
                                {record.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/70 px-4 py-8 text-center">
                    <CalendarDays
                      size={25}
                      className="mx-auto text-slate-300"
                    />

                    <p className="mt-2 text-xs font-semibold text-slate-600">
                      No attendance records found
                    </p>

                    <p className="mt-1 text-[11px] text-slate-400">
                      Attendance records will appear here after marking.
                    </p>
                  </div>
                )}
              </article>
            </section>

            {/* Additional information */}
            <section className="dashboard-reveal mb-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => router.push("/reports")}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:border-blue-200 hover:shadow-md"
              >
                <div className="shrink-0 rounded-xl bg-blue-50 p-3 text-blue-600">
                  <CalendarDays size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">
                    Attendance Reports
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    Daily, monthly and date-range reports.
                  </p>
                </div>

                <ArrowRight size={16} className="shrink-0 text-slate-400" />
              </button>

              <button
                type="button"
                onClick={() => router.push("/students")}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left shadow-sm transition hover:border-emerald-200 hover:shadow-md"
              >
                <div className="shrink-0 rounded-xl bg-emerald-50 p-3 text-emerald-600">
                  <GraduationCap size={20} />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-800">
                    Student Management
                  </p>

                  <p className="mt-1 text-[11px] leading-5 text-slate-500">
                    View and manage registered students.
                  </p>
                </div>

                <ArrowRight size={16} className="shrink-0 text-slate-400" />
              </button>
            </section>
          </>
        )}

        {/* Footer */}
        <footer className="flex flex-col justify-between gap-2 border-t border-slate-200/80 py-4 text-[10px] text-slate-500 sm:flex-row">
          <p>
            © 2026 Lalmohan Govt Model High School. All rights reserved.
          </p>

          <p>Student Attendance Management System</p>
        </footer>
      </div>

      {/* Interactive Student Modal */}
      <DashboardStudentModal
        key={modalType ?? "closed"}
        open={modalType !== null}
        type={modalType}
        date={today?.date ?? ""}
        onClose={() => setModalType(null)}
      />
    </div>
  );
}

export default function Home() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  );
}