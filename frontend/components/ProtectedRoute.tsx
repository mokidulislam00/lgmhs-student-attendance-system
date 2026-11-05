"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";

import { useAuth } from "../context/AuthContext";

type UserRole = "Admin" | "Teacher";

export default function ProtectedRoute({
  children,
  allowedRoles,
}: {
  children: ReactNode;
  allowedRoles?: UserRole[];
}) {
  const router = useRouter();
  const pathname = usePathname();

  const { user, isAuthenticated, isLoading } = useAuth();

  const hasRequiredRole =
    !allowedRoles || (user?.role && allowedRoles.includes(user.role as UserRole));

  useEffect(() => {
    if (isLoading) return;

    if (!isAuthenticated) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!hasRequiredRole) {
      router.replace("/");
    }
  }, [hasRequiredRole, isAuthenticated, isLoading, pathname, router]);

  if (isLoading || !isAuthenticated || !hasRequiredRole) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <p className="text-sm text-slate-500">
          {!isAuthenticated ? "Checking authentication..." : "Checking access..."}
        </p>
      </div>
    );
  }

  return <>{children}</>;
}