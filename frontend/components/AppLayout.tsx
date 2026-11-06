
"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "../context/AuthContext";

import {
  LayoutDashboard,
  Users,
  GraduationCap,
  ClipboardCheck,
  FileBarChart,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  LogOut,
} from "lucide-react";

import type { LucideIcon } from "lucide-react";

interface NavigationItem {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: ("Admin" | "Teacher")[];
}

const navigation: NavigationItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    roles: ["Admin", "Teacher"],
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    roles: ["Admin"],
  },
  {
    label: "Teachers",
    href: "/teachers",
    icon: GraduationCap,
    roles: ["Admin"],
  },
  {
    label: "Attendance",
    href: "/attendance",
    icon: ClipboardCheck,
    roles: ["Admin", "Teacher"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileBarChart,
    roles: ["Admin", "Teacher"],
  },
];

const SCHOOL_LOGO = "/images/school-logo.png";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  if (pathname === "/login") {
    return <>{children}</>;
  }

  const roleNavigation = navigation.filter((item) =>
    item.roles.includes(user?.role as "Admin" | "Teacher")
  );

  const isDashboard = pathname === "/";
  const isAdminPage = pathname === "/admin";

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "U";

  const handleLogout = async () => {
    if (loggingOut) return;

    setLoggingOut(true);

    try {
      await logout();
    } finally {
      router.replace("/login");
    }
  };

  const handleAdminProfileClick = () => {
    if (user?.role === "Admin") {
      router.push("/admin");
    }
  };

  if (isDashboard) {
    return (
      <div className="min-h-screen min-w-0 bg-[#f6f8fc] text-slate-800">
        {/* Hide Sidebar Scrollbar Without Disabling Scrolling */}
        <style jsx global>{`
          .sidebar-scrollbar-hidden {
            scrollbar-width: none !important;
            -ms-overflow-style: none !important;
          }

          .sidebar-scrollbar-hidden::-webkit-scrollbar {
            display: none !important;
            width: 0 !important;
            height: 0 !important;
            background: transparent !important;
          }

          .sidebar-scrollbar-hidden::-webkit-scrollbar-track {
            display: none !important;
          }

          .sidebar-scrollbar-hidden::-webkit-scrollbar-thumb {
            display: none !important;
          }
        `}</style>

        {/* Mobile sidebar overlay */}
        {sidebarOpen && (
          <button
            type="button"
            aria-label="Close sidebar overlay"
            onClick={() => setSidebarOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/40 lg:hidden"
          />
        )}

        {/* Sidebar */}
        <aside
          className={`sidebar-scrollbar-hidden fixed inset-y-0 left-0 z-50 flex w-[245px] flex-col overflow-x-hidden overflow-y-auto overscroll-contain bg-[#14213d] text-white transition-transform duration-300 ${
            sidebarOpen ? "translate-x-0" : "-translate-x-full"
          } lg:translate-x-0`}
        >
          {/* School Logo and Branding */}
          <div className="relative flex min-h-[190px] shrink-0 flex-col items-center justify-center px-3 pb-4 pt-5">
            {/* Mobile close button */}
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
              className="absolute right-3 top-3 rounded-lg p-2 text-slate-300 transition hover:bg-white/10 hover:text-white lg:hidden"
            >
              <X size={19} />
            </button>

            {/* School Logo */}
            <div className="relative flex h-[105px] w-[105px] shrink-0 items-center justify-center">
              <Image
                src={SCHOOL_LOGO}
                alt="Lalmohan Govt Model High School Logo"
                width={512}
                height={512}
                priority
                className="h-[105px] w-[105px] object-contain drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]"
              />
            </div>

            {/* School Branding */}
            <div className="mt-2 flex w-full flex-col items-center text-center">
              <h1 className="whitespace-nowrap text-[12px] font-bold leading-5 tracking-[0.3px] text-white">
                LGMHS Attendance System
              </h1>

              <p className="mt-0.5 whitespace-nowrap text-[9px] leading-4 tracking-wide text-slate-400">
                Lalmohan Govt. Model High School
              </p>
            </div>
          </div>

          {/* Navigation */}
          <div className="shrink-0 px-3.5 pt-6">
            <p className="mb-4 px-3 text-[10px] font-bold uppercase tracking-[2px] text-slate-500">
              Main Menu
            </p>

            <nav className="space-y-1.5">
              {roleNavigation.map((item) => {
                const Icon = item.icon;

                const active =
                  pathname === item.href ||
                  (item.href !== "/" &&
                    pathname.startsWith(item.href + "/"));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-[46px] w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-[13px] font-medium transition-all duration-200 ${
                      active
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-900/30"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <Icon size={19} className="shrink-0" />
                    <span>{item.label}</span>

                    {active && (
                      <ChevronRight
                        size={16}
                        className="ml-auto shrink-0"
                      />
                    )}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* Sidebar bottom */}
          <div className="mt-auto shrink-0 p-3.5 pt-7">
            <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-3.5">
              <div className="mb-2.5 flex items-center gap-2">
                <Image
                  src={SCHOOL_LOGO}
                  alt="LGMHS"
                  width={32}
                  height={32}
                  className="h-8 w-8 shrink-0 object-contain"
                />
                <span className="text-xs font-semibold">
                  LGMHS System
                </span>
              </div>

              <p className="text-[11px] leading-5 text-slate-400">
                Student Attendance Management System
              </p>
            </div>

            <button
              type="button"
              onClick={handleLogout}
              disabled={loggingOut}
              className="mt-3 flex min-h-[42px] w-full items-center gap-3 rounded-lg px-3 text-xs text-slate-400 transition hover:bg-white/5 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              <LogOut size={16} />
              {loggingOut ? "Signing out..." : "Sign out"}
            </button>
          </div>
        </aside>

        {/* Dashboard main content */}
        <main className="min-h-screen min-w-0 lg:ml-[245px]">
          {/* Dashboard header */}
          <header className="sticky top-0 z-30 flex h-[76px] min-h-[76px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white px-4 sm:px-6 lg:px-8">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="shrink-0 rounded-lg p-2 transition hover:bg-slate-100 lg:hidden"
                aria-label="Open navigation menu"
              >
                <Menu size={21} />
              </button>

              <div className="min-w-0">
                <p className="hidden truncate text-[11px] text-slate-400 sm:block">
                  Lalmohan Govt Model High School
                </p>

                <h2 className="truncate text-base font-bold text-slate-800 sm:text-lg">
                  Dashboard
                </h2>
              </div>
            </div>

            {/* Dashboard Admin profile */}
            {user?.role === "Admin" ? (
              <button
                type="button"
                onClick={handleAdminProfileClick}
                aria-label="Open System Admin profile and settings"
                className="group flex shrink-0 items-center gap-2.5 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:gap-3"
              >
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt="Admin profile"
                    className="h-10 w-10 shrink-0 rounded-full border border-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eefb] text-xs font-bold text-[#243b69]">
                    {initials}
                  </div>
                )}

                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-[150px] truncate text-xs font-bold text-slate-700 transition group-hover:text-emerald-700">
                    {user?.name ?? "System Admin"}
                  </p>
                  <p className="text-[10px] text-slate-400">Admin</p>
                </div>

                <ChevronDown
                  size={15}
                  className="hidden text-slate-400 transition group-hover:text-emerald-600 sm:block"
                />
              </button>
            ) : (
              <div className="flex shrink-0 items-center gap-2 sm:gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#e8eefb] text-xs font-bold text-[#243b69]">
                  {initials}
                </div>

                <div className="hidden min-w-0 sm:block">
                  <p className="max-w-[150px] truncate text-xs font-bold text-slate-700">
                    {user?.name ?? "User"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {user?.role ?? "User"}
                  </p>
                </div>
              </div>
            )}
          </header>

          <div className="min-h-[calc(100vh-76px)] min-w-0">
            {children}
          </div>
        </main>
      </div>
    );
  }

  // Other pages use a responsive top navigation bar.
  return (
    <div className="min-h-screen min-w-0 overflow-x-clip bg-[#f6f8fc] text-slate-800">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white shadow-sm">
        <div className="mx-auto flex min-h-[76px] w-full min-w-0 max-w-[1600px] items-center justify-between gap-2 px-3 sm:gap-4 sm:px-6 lg:px-8">
          {/* School Logo and Branding */}
          <Link
            href="/"
            className="flex min-w-0 flex-1 items-center gap-2 rounded-xl transition hover:opacity-90 sm:gap-3"
          >
            <div className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center sm:h-[50px] sm:w-[50px] lg:h-[60px] lg:w-[60px]">
              <Image
                src={SCHOOL_LOGO}
                alt="Lalmohan Govt Model High School Logo"
                width={512}
                height={512}
                priority
                className="h-full w-full object-contain drop-shadow-sm"
              />
            </div>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-sm font-bold tracking-wide text-slate-800 sm:text-base">
                <span className="sm:hidden">LGMHS</span>
                <span className="hidden sm:inline">
                  Lalmohan Govt. Model High School
                </span>
              </h1>

              <p className="truncate text-[9px] text-slate-400 sm:text-[10px]">
                Student Attendance System
              </p>
            </div>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden shrink-0 items-center gap-1 lg:flex">
            {roleNavigation.map((item) => {
              const Icon = item.icon;

              const active =
                pathname === item.href ||
                (item.href !== "/" &&
                  pathname.startsWith(item.href + "/"));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                    active
                      ? "bg-emerald-50 text-emerald-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-emerald-700"
                  }`}
                >
                  <Icon size={17} />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* User information and mobile menu */}
          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            {/* Desktop Admin profile */}
            {user?.role === "Admin" ? (
              <button
                type="button"
                onClick={handleAdminProfileClick}
                aria-label="Open System Admin profile and settings"
                className="group hidden items-center gap-2 rounded-xl px-2 py-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 sm:flex"
              >
                {user.profilePhoto ? (
                  <img
                    src={user.profilePhoto}
                    alt="Admin profile"
                    className="h-9 w-9 shrink-0 rounded-full border border-slate-100 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8eefb] text-xs font-bold text-[#243b69]">
                    {initials}
                  </div>
                )}

                <div className="hidden min-w-0 xl:block">
                  <p className="max-w-[130px] truncate text-xs font-bold text-slate-700 transition group-hover:text-emerald-700">
                    {user.name ?? "System Admin"}
                  </p>
                  <p className="text-[10px] text-slate-400">Admin</p>
                </div>

                <ChevronDown
                  size={14}
                  className="text-slate-400 transition group-hover:text-emerald-600"
                />
              </button>
            ) : (
              <div className="hidden items-center gap-2 sm:flex">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8eefb] text-xs font-bold text-[#243b69]">
                  {initials}
                </div>

                <div className="hidden min-w-0 xl:block">
                  <p className="max-w-[130px] truncate text-xs font-bold text-slate-700">
                    {user?.name ?? "User"}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    {user?.role ?? "User"}
                  </p>
                </div>
              </div>
            )}

            {/* Logout is visible only on Admin page */}
            {isAdminPage && (
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                className="hidden items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 transition hover:bg-red-50 hover:text-red-600 disabled:opacity-50 sm:flex"
              >
                <LogOut size={16} />
                <span className="hidden xl:inline">
                  {loggingOut ? "Signing out..." : "Logout"}
                </span>
              </button>
            )}

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              aria-label="Toggle navigation menu"
              aria-expanded={mobileMenuOpen}
              className="shrink-0 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
            >
              {mobileMenuOpen ? <X size={21} /> : <Menu size={21} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="border-t border-slate-100 bg-white px-4 py-3 shadow-lg lg:hidden">
            <nav className="space-y-1">
              {roleNavigation.map((item) => {
                const Icon = item.icon;

                const active =
                  pathname === item.href ||
                  (item.href !== "/" &&
                    pathname.startsWith(item.href + "/"));

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    aria-current={active ? "page" : undefined}
                    className={`flex items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition ${
                      active
                        ? "bg-emerald-50 text-emerald-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                );
              })}

              <div className="border-t border-slate-100 pt-2 sm:hidden">
                {/* Mobile Admin profile */}
                {user?.role === "Admin" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      handleAdminProfileClick();
                    }}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                  >
                    {user.profilePhoto ? (
                      <img
                        src={user.profilePhoto}
                        alt="Admin profile"
                        className="h-9 w-9 shrink-0 rounded-full border border-slate-100 object-cover"
                      />
                    ) : (
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#e8eefb] text-xs font-bold text-[#243b69]">
                        {initials}
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 transition group-hover:text-emerald-700">
                        {user.name ?? "System Admin"}
                      </p>
                      <p className="text-[10px] text-slate-400">Admin</p>
                    </div>

                    <ChevronDown
                      size={15}
                      className="ml-auto text-slate-400"
                    />
                  </button>
                ) : (
                  <div className="flex items-center gap-3 px-3 py-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#e8eefb] text-xs font-bold text-[#243b69]">
                      {initials}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700">
                        {user?.name ?? "User"}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {user?.role ?? "User"}
                      </p>
                    </div>
                  </div>
                )}

                {/* Mobile Logout only on Admin page */}
                {isAdminPage && (
                  <button
                    type="button"
                    onClick={handleLogout}
                    disabled={loggingOut}
                    className="mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                  >
                    <LogOut size={18} />
                    {loggingOut ? "Signing out..." : "Logout"}
                  </button>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      <main className="min-h-[calc(100vh-76px)] min-w-0 w-full overflow-x-clip">
        {children}
      </main>
    </div>
  );
}
