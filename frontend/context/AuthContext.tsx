
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import api from "../lib/api";

export type UserRole = "Admin" | "Teacher";

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  profilePhoto?: string;
}

interface LoginCredentials {
  email: string;
  password: string;
}

interface AdminProfileUpdate {
  name?: string;
  email?: string;
  profilePhoto?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  updateAdminProfile: (data: AdminProfileUpdate) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function isValidUser(data: unknown): data is AuthUser {
  if (!data || typeof data !== "object") {
    return false;
  }

  const user = data as Record<string, unknown>;

  return (
    typeof user._id === "string" &&
    typeof user.name === "string" &&
    typeof user.email === "string" &&
    (user.role === "Admin" || user.role === "Teacher") &&
    (user.profilePhoto === undefined ||
      user.profilePhoto === null ||
      typeof user.profilePhoto === "string")
  );
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Refresh current authenticated user
  const refreshUser = async (): Promise<void> => {
    const response = await api.get("/auth/me");
    const userData = response.data?.data;

    if (!isValidUser(userData)) {
      setUser(null);
      throw new Error("Invalid user data received from server");
    }

    setUser(userData);
  };

  // Verify the current session when the app loads
  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      try {
        const response = await api.get("/auth/me");
        const userData = response.data?.data;

        if (!cancelled) {
          setUser(isValidUser(userData) ? userData : null);
        }
      } catch {
        if (!cancelled) {
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void verifySession();

    return () => {
      cancelled = true;
    };
  }, []);

  // Login
  const login = async (credentials: LoginCredentials): Promise<void> => {
    const response = await api.post("/auth/login", credentials);

    if (!response.data?.success) {
      throw new Error(response.data?.message || "Login failed");
    }

    await refreshUser();
  };

  // Update Admin Profile
  const updateAdminProfile = async (
    data: AdminProfileUpdate
  ): Promise<void> => {
    if (user?.role !== "Admin") {
      throw new Error("Only Admin can update the Admin profile");
    }

    const response = await api.put("/auth/admin-profile", data);

    if (!response.data?.success) {
      throw new Error(
        response.data?.message || "Failed to update Admin profile"
      );
    }

    await refreshUser();
  };

  // Logout
  const logout = async (): Promise<void> => {
    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: Boolean(user),
    isLoading,
    login,
    logout,
    refreshUser,
    updateAdminProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
