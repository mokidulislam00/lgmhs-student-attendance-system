
"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  UserRound,
  Users,
  LockKeyhole,
  Save,
  RefreshCw,
  Plus,
  Eye,
  EyeOff,
  Camera,
  CheckCircle2,
  AlertCircle,
  UserCheck,
  UserX,
} from "lucide-react";

import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

interface Teacher {
  _id: string;
  teacherId: string;
  name: string;
  designation?: string;
  subject?: string[];
  isActive: boolean;
}

interface TeacherAccount {
  _id: string;
  name: string;
  email: string;
  role: "Teacher";
  teacher?: Teacher | string | null;
  isActive: boolean;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
}

function AdminPageContent() {
  const router = useRouter();
  const { user, updateAdminProfile, logout } = useAuth();

  const [activeSection, setActiveSection] = useState<
    "profile" | "security" | "teachers"
  >("profile");

  const [profileName, setProfileName] = useState(user?.name || "");
  const [profileEmail, setProfileEmail] = useState(user?.email || "");
  const [profilePhoto, setProfilePhoto] = useState(
    user?.profilePhoto || ""
  );
  const [photoError, setPhotoError] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [accounts, setAccounts] = useState<TeacherAccount[]>([]);

  const [selectedTeacher, setSelectedTeacher] = useState("");
  const [teacherEmail, setTeacherEmail] = useState("");
  const [teacherPassword, setTeacherPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showTeacherPassword, setShowTeacherPassword] = useState(false);

  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [updatingAccount, setUpdatingAccount] = useState<string | null>(
    null
  );

  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setErrorMessage("");
  };

  const showError = (message: string) => {
    setErrorMessage(message);
    setSuccessMessage("");
  };

  const clearMessages = () => {
    setSuccessMessage("");
    setErrorMessage("");
  };

  const getErrorMessage = (error: unknown, fallback: string) => {
    const apiError = error as {
      response?: {
        data?: {
          message?: string;
        };
      };
    };

    return apiError.response?.data?.message || fallback;
  };

  // Load Teacher Profiles and Login Accounts
  const fetchTeacherData = async () => {
    setLoadingTeachers(true);

    try {
      const [teacherResponse, accountResponse] = await Promise.all([
        api.get("/teachers", {
          params: {
            page: 1,
            limit: 100,
          },
        }),
        api.get<ApiResponse<TeacherAccount[]>>(
          "/auth/teacher-accounts"
        ),
      ]);

      const teacherData = teacherResponse.data?.data;
      const accountData = accountResponse.data?.data;

      setTeachers(
        Array.isArray(teacherData) ? teacherData : []
      );

      setAccounts(
        Array.isArray(accountData) ? accountData : []
      );
    } catch (error) {
      showError(
        getErrorMessage(
          error,
          "Teacher account information load করা যায়নি।"
        )
      );
    } finally {
      setLoadingTeachers(false);
    }
  };

  // Initial Teacher Data Loading
  useEffect(() => {
    if (user?.role !== "Admin") return;

    let cancelled = false;

    Promise.resolve().then(() => {
      if (!cancelled) {
        void fetchTeacherData();
      }
    });

    return () => {
      cancelled = true;
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role]);

  // Update Admin Profile
  const handleProfileSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    const trimmedName = profileName.trim();
    const trimmedEmail = profileEmail.trim();
    const trimmedPhoto = profilePhoto.trim();

    if (!trimmedName || !trimmedEmail) {
      showError("Admin name এবং email পূরণ করো।");
      return;
    }

    setSavingProfile(true);
    clearMessages();

    try {
      await updateAdminProfile({
        name: trimmedName,
        email: trimmedEmail,
        profilePhoto: trimmedPhoto || null,
      });

      setProfileName(trimmedName);
      setProfileEmail(trimmedEmail);
      setPhotoError(false);

      showSuccess("Admin profile সফলভাবে update হয়েছে।");
    } catch (error) {
      showError(
        getErrorMessage(
          error,
          "Admin profile update করা যায়নি।"
        )
      );
    } finally {
      setSavingProfile(false);
    }
  };

  // Change Admin Password
  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!currentPassword || !newPassword) {
      showError("সব password field পূরণ করো।");
      return;
    }

    if (newPassword.length < 6) {
      showError(
        "নতুন password কমপক্ষে ৬ অক্ষরের হতে হবে।"
      );
      return;
    }

    if (currentPassword === newPassword) {
      showError(
        "নতুন password আগের password থেকে আলাদা হতে হবে।"
      );
      return;
    }

    setChangingPassword(true);
    clearMessages();

    try {
      const response = await api.put("/auth/change-password", {
        currentPassword,
        newPassword,
      });

      if (!response.data?.success) {
        showError(
          response.data?.message ||
            "Password পরিবর্তন করা যায়নি।"
        );
        return;
      }

      setCurrentPassword("");
      setNewPassword("");

      showSuccess(
        "Password পরিবর্তন হয়েছে। আবার Login করতে হবে।"
      );

      await logout();
      router.replace("/login");
    } catch (error) {
      showError(
        getErrorMessage(
          error,
          "Password পরিবর্তন করা যায়নি।"
        )
      );
    } finally {
      setChangingPassword(false);
    }
  };

  // Create Teacher Login Account
  const handleCreateTeacherAccount = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (
      !selectedTeacher ||
      !teacherEmail.trim() ||
      !teacherPassword
    ) {
      showError(
        "Teacher, email এবং password পূরণ করো।"
      );
      return;
    }

    if (teacherPassword.length < 6) {
      showError(
        "Teacher password কমপক্ষে ৬ অক্ষরের হতে হবে।"
      );
      return;
    }

    setCreatingAccount(true);
    clearMessages();

    try {
      const response = await api.post(
        "/auth/create-teacher-account",
        {
          teacher: selectedTeacher,
          email: teacherEmail.trim(),
          password: teacherPassword,
        }
      );

      if (!response.data?.success) {
        showError(
          response.data?.message ||
            "Teacher account তৈরি করা যায়নি।"
        );
        return;
      }

      setTeacherEmail("");
      setTeacherPassword("");
      setSelectedTeacher("");
      setShowTeacherPassword(false);

      showSuccess(
        "Teacher login account সফলভাবে তৈরি হয়েছে।"
      );

      await fetchTeacherData();
    } catch (error) {
      showError(
        getErrorMessage(
          error,
          "Teacher account তৈরি করা যায়নি।"
        )
      );
    } finally {
      setCreatingAccount(false);
    }
  };

  // Activate / Deactivate Teacher Account
  const handleAccountStatus = async (
    account: TeacherAccount
  ) => {
    const nextStatus = !account.isActive;

    const confirmed = window.confirm(
      `তুমি কি ${account.name}-এর account ${
        nextStatus ? "Activate" : "Deactivate"
      } করতে চাও?`
    );

    if (!confirmed) return;

    setUpdatingAccount(account._id);
    clearMessages();

    try {
      const response = await api.patch(
        `/auth/teacher-accounts/${account._id}/status`,
        {
          isActive: nextStatus,
        }
      );

      if (!response.data?.success) {
        showError(
          response.data?.message ||
            "Account status update করা যায়নি।"
        );
        return;
      }

      setAccounts((previous) =>
        previous.map((item) =>
          item._id === account._id
            ? {
                ...item,
                isActive: nextStatus,
              }
            : item
        )
      );

      showSuccess(
        `${account.name}-এর account ${
          nextStatus ? "Activate" : "Deactivate"
        } হয়েছে।`
      );
    } catch (error) {
      showError(
        getErrorMessage(
          error,
          "Account status update করা যায়নি।"
        )
      );
    } finally {
      setUpdatingAccount(null);
    }
  };

  const getTeacherName = (account: TeacherAccount) => {
    if (
      account.teacher &&
      typeof account.teacher === "object"
    ) {
      return account.teacher.name || account.name;
    }

    return account.name || "Unknown Teacher";
  };

  const getTeacherId = (account: TeacherAccount) => {
    if (
      account.teacher &&
      typeof account.teacher === "object"
    ) {
      return account.teacher.teacherId || "—";
    }

    return "—";
  };

  // Teachers without an existing login account
  const availableTeachers = teachers.filter(
    (teacher) =>
      !accounts.some(
        (account) =>
          account.teacher &&
          typeof account.teacher === "object" &&
          account.teacher._id === teacher._id
      )
  );

  const menuItems = [
    {
      id: "profile" as const,
      label: "Profile Settings",
      description: "Admin information",
      icon: UserRound,
    },
    {
      id: "security" as const,
      label: "Security Settings",
      description: "Change password",
      icon: LockKeyhole,
    },
    {
      id: "teachers" as const,
      label: "Teacher Accounts",
      description: "Manage login accounts",
      icon: Users,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <ShieldCheck size={25} />
            </div>

            <div>
              <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                System Administration
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Manage your admin profile, security and teacher accounts.
              </p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {(successMessage || errorMessage) && (
          <div
            role="alert"
            className={`mb-6 flex items-start gap-3 rounded-xl border p-4 ${
              successMessage
                ? "border-green-200 bg-green-50 text-green-800"
                : "border-red-200 bg-red-50 text-red-800"
            }`}
          >
            {successMessage ? (
              <CheckCircle2
                className="mt-0.5 shrink-0"
                size={19}
              />
            ) : (
              <AlertCircle
                className="mt-0.5 shrink-0"
                size={19}
              />
            )}

            <p className="text-sm font-medium">
              {successMessage || errorMessage}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[260px_1fr]">
          {/* Sidebar */}
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Administration
              </p>
              <p className="mt-1 font-semibold text-slate-800">
                Admin Control Panel
              </p>
            </div>

            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;

                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveSection(item.id);
                      clearMessages();
                    }}
                    className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
                      isActive
                        ? "bg-indigo-50 text-indigo-700"
                        : "text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Icon size={20} />

                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold">
                        {item.label}
                      </span>

                      <span
                        className={`mt-0.5 block text-xs ${
                          isActive
                            ? "text-indigo-500"
                            : "text-slate-400"
                        }`}
                      >
                        {item.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 rounded-xl bg-slate-50 p-3">
              <div className="flex items-center gap-2">
                <ShieldCheck
                  size={17}
                  className="text-indigo-600"
                />
                <span className="text-xs font-semibold text-slate-700">
                  Administrator
                </span>
              </div>

              <p className="mt-2 break-all text-sm font-medium text-slate-800">
                {user?.name || "Admin"}
              </p>

              <p className="mt-1 break-all text-xs text-slate-500">
                {user?.email}
              </p>
            </div>
          </aside>

          {/* Main Content */}
          <main className="min-w-0 space-y-6">
            {/* Profile Settings */}
            {activeSection === "profile" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    Profile Settings
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your administrator profile information.
                  </p>
                </div>

                <form
                  onSubmit={handleProfileSubmit}
                  className="space-y-6"
                >
                  {/* Profile Photo */}
                  <div className="flex flex-col gap-4 border-b border-slate-100 pb-6 sm:flex-row sm:items-center">
                    <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-4 border-indigo-50 bg-indigo-100">
                      {profilePhoto.trim() && !photoError ? (
                        <img
                          src={profilePhoto.trim()}
                          alt="Admin profile"
                          className="h-full w-full object-cover"
                          onError={() => setPhotoError(true)}
                        />
                      ) : (
                        <UserRound
                          size={38}
                          className="text-indigo-500"
                        />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <Camera
                          size={17}
                          className="text-indigo-600"
                        />
                        <p className="font-semibold text-slate-800">
                          Admin Profile Photo
                        </p>
                      </div>

                      <p className="mt-1 text-xs text-slate-500">
                        একটি publicly accessible image URL ব্যবহার করো।
                        সরাসরি photo upload এখনো চালু হয়নি।
                      </p>

                      <div className="mt-3">
                        <input
                          type="url"
                          value={profilePhoto}
                          onChange={(event) => {
                            setProfilePhoto(event.target.value);
                            setPhotoError(false);
                          }}
                          placeholder="https://example.com/profile.jpg"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Admin Name
                      </label>

                      <input
                        type="text"
                        required
                        maxLength={100}
                        value={profileName}
                        onChange={(event) =>
                          setProfileName(event.target.value)
                        }
                        placeholder="Enter admin name"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Email Address
                      </label>

                      <input
                        type="email"
                        required
                        value={profileEmail}
                        onChange={(event) =>
                          setProfileEmail(event.target.value)
                        }
                        placeholder="admin@example.com"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end border-t border-slate-100 pt-5">
                    <button
                      type="submit"
                      disabled={savingProfile}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {savingProfile ? (
                        <RefreshCw
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <Save size={17} />
                      )}

                      {savingProfile
                        ? "Saving..."
                        : "Save Profile"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Security Settings */}
            {activeSection === "security" && (
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="mb-6">
                  <h2 className="text-xl font-bold text-slate-900">
                    Security Settings
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Change your administrator account password.
                  </p>
                </div>

                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <LockKeyhole
                    size={20}
                    className="mt-0.5 shrink-0 text-amber-600"
                  />

                  <p className="text-sm leading-6 text-amber-800">
                    Password পরিবর্তন করার পর তোমাকে নিরাপত্তার জন্য
                    Login page-এ পাঠানো হবে। নতুন password দিয়ে আবার
                    Login করতে হবে।
                  </p>
                </div>

                <form
                  onSubmit={handlePasswordSubmit}
                  className="max-w-xl space-y-5"
                >
                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      Current Password
                    </label>

                    <div className="relative">
                      <input
                        type={
                          showCurrentPassword ? "text" : "password"
                        }
                        required
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        placeholder="Enter current password"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(
                            !showCurrentPassword
                          )
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        aria-label="Toggle current password visibility"
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-700">
                      New Password
                    </label>

                    <div className="relative">
                      <input
                        type={
                          showNewPassword ? "text" : "password"
                        }
                        required
                        minLength={6}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        placeholder="Enter new password"
                        className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />

                      <button
                        type="button"
                        onClick={() =>
                          setShowNewPassword(!showNewPassword)
                        }
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        aria-label="Toggle new password visibility"
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>

                    <p className="mt-1.5 text-xs text-slate-400">
                      কমপক্ষে ৬ অক্ষরের password ব্যবহার করো।
                    </p>
                  </div>

                  <div className="border-t border-slate-100 pt-5">
                    <button
                      type="submit"
                      disabled={changingPassword}
                      className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {changingPassword ? (
                        <RefreshCw
                          size={17}
                          className="animate-spin"
                        />
                      ) : (
                        <LockKeyhole size={17} />
                      )}

                      {changingPassword
                        ? "Updating..."
                        : "Change Password"}
                    </button>
                  </div>
                </form>
              </section>
            )}

            {/* Teacher Accounts */}
            {activeSection === "teachers" && (
              <>
                {/* Create Teacher Account */}
                <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-slate-900">
                      Create Teacher Login Account
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      Select an existing teacher profile and create login
                      credentials.
                    </p>
                  </div>

                  <form
                    onSubmit={handleCreateTeacherAccount}
                    className="space-y-5"
                  >
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Select Teacher
                      </label>

                      <select
                        required
                        value={selectedTeacher}
                        onChange={(event) =>
                          setSelectedTeacher(event.target.value)
                        }
                        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      >
                        <option value="">
                          Choose a teacher
                        </option>

                        {availableTeachers.map((teacher) => (
                          <option
                            key={teacher._id}
                            value={teacher._id}
                          >
                            {teacher.name} ({teacher.teacherId})
                            {teacher.designation
                              ? ` - ${teacher.designation}`
                              : ""}
                          </option>
                        ))}
                      </select>

                      {availableTeachers.length === 0 &&
                        !loadingTeachers && (
                          <p className="mt-2 text-xs text-amber-600">
                            কোনো available teacher profile পাওয়া যায়নি।
                            প্রথমে Teachers page থেকে Teacher profile তৈরি
                            করো।
                          </p>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Login Email
                        </label>

                        <input
                          type="email"
                          required
                          value={teacherEmail}
                          onChange={(event) =>
                            setTeacherEmail(event.target.value)
                          }
                          placeholder="teacher@example.com"
                          className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-semibold text-slate-700">
                          Login Password
                        </label>

                        <div className="relative">
                          <input
                            type={
                              showTeacherPassword ? "text" : "password"
                            }
                            required
                            minLength={6}
                            autoComplete="new-password"
                            value={teacherPassword}
                            onChange={(event) =>
                              setTeacherPassword(event.target.value)
                            }
                            placeholder="Create password"
                            className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-11 text-sm outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              setShowTeacherPassword(
                                !showTeacherPassword
                              )
                            }
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                            aria-label="Toggle teacher password visibility"
                          >
                            {showTeacherPassword ? (
                              <EyeOff size={18} />
                            ) : (
                              <Eye size={18} />
                            )}
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-end border-t border-slate-100 pt-5">
                      <button
                        type="submit"
                        disabled={
                          creatingAccount ||
                          loadingTeachers ||
                          !selectedTeacher ||
                          availableTeachers.length === 0
                        }
                        className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {creatingAccount ? (
                          <RefreshCw
                            size={17}
                            className="animate-spin"
                          />
                        ) : (
                          <Plus size={18} />
                        )}

                        {creatingAccount
                          ? "Creating Account..."
                          : "Create Teacher Account"}
                      </button>
                    </div>
                  </form>
                </section>

                {/* Teacher Account List */}
                <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Teacher Login Accounts
                      </h2>

                      <p className="mt-1 text-sm text-slate-500">
                        View and manage teacher account access.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => void fetchTeacherData()}
                      disabled={loadingTeachers}
                      className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
                    >
                      <RefreshCw
                        size={16}
                        className={
                          loadingTeachers ? "animate-spin" : ""
                        }
                      />
                      Refresh
                    </button>
                  </div>

                  {/* Account Statistics */}
                  <div className="grid grid-cols-2 gap-3 p-5 sm:grid-cols-3">
                    <div className="rounded-xl bg-slate-50 p-4">
                      <p className="text-xs font-medium text-slate-500">
                        Total Accounts
                      </p>

                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {accounts.length}
                      </p>
                    </div>

                    <div className="rounded-xl bg-green-50 p-4">
                      <p className="text-xs font-medium text-green-700">
                        Active
                      </p>

                      <p className="mt-1 text-2xl font-bold text-green-700">
                        {
                          accounts.filter(
                            (account) => account.isActive
                          ).length
                        }
                      </p>
                    </div>

                    <div className="col-span-2 rounded-xl bg-red-50 p-4 sm:col-span-1">
                      <p className="text-xs font-medium text-red-700">
                        Inactive
                      </p>

                      <p className="mt-1 text-2xl font-bold text-red-700">
                        {
                          accounts.filter(
                            (account) => !account.isActive
                          ).length
                        }
                      </p>
                    </div>
                  </div>

                  {loadingTeachers ? (
                    <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500">
                      <RefreshCw
                        size={18}
                        className="animate-spin"
                      />
                      Loading teacher accounts...
                    </div>
                  ) : accounts.length === 0 ? (
                    <div className="px-5 py-12 text-center">
                      <Users
                        size={35}
                        className="mx-auto text-slate-300"
                      />

                      <p className="mt-3 font-semibold text-slate-700">
                        No Teacher Accounts Found
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Create a login account for an existing teacher.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[650px] text-left">
                        <thead className="bg-slate-50">
                          <tr className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            <th className="px-5 py-4">Teacher</th>
                            <th className="px-5 py-4">Email</th>
                            <th className="px-5 py-4">Status</th>
                            <th className="px-5 py-4">Created</th>
                            <th className="px-5 py-4 text-right">
                              Action
                            </th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-100">
                          {accounts.map((account) => (
                            <tr
                              key={account._id}
                              className="transition hover:bg-slate-50"
                            >
                              <td className="px-5 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                                    {getTeacherName(account)
                                      .charAt(0)
                                      .toUpperCase()}
                                  </div>

                                  <div>
                                    <p className="text-sm font-semibold text-slate-800">
                                      {getTeacherName(account)}
                                    </p>

                                    <p className="mt-0.5 text-xs text-slate-400">
                                      ID: {getTeacherId(account)}
                                    </p>
                                  </div>
                                </div>
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-600">
                                {account.email}
                              </td>

                              <td className="px-5 py-4">
                                <span
                                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    account.isActive
                                      ? "bg-green-50 text-green-700"
                                      : "bg-red-50 text-red-700"
                                  }`}
                                >
                                  <span
                                    className={`h-1.5 w-1.5 rounded-full ${
                                      account.isActive
                                        ? "bg-green-500"
                                        : "bg-red-500"
                                    }`}
                                  />

                                  {account.isActive
                                    ? "Active"
                                    : "Inactive"}
                                </span>
                              </td>

                              <td className="px-5 py-4 text-sm text-slate-500">
                                {account.createdAt
                                  ? new Date(
                                      account.createdAt
                                    ).toLocaleDateString()
                                  : "—"}
                              </td>

                              <td className="px-5 py-4 text-right">
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleAccountStatus(account)
                                  }
                                  disabled={
                                    updatingAccount === account._id
                                  }
                                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
                                    account.isActive
                                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                                      : "bg-green-50 text-green-700 hover:bg-green-100"
                                  }`}
                                >
                                  {updatingAccount === account._id ? (
                                    <RefreshCw
                                      size={14}
                                      className="animate-spin"
                                    />
                                  ) : account.isActive ? (
                                    <UserX size={14} />
                                  ) : (
                                    <UserCheck size={14} />
                                  )}

                                  {account.isActive
                                    ? "Deactivate"
                                    : "Activate"}
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  <div className="border-t border-slate-100 px-5 py-3">
                    <p className="text-xs leading-5 text-slate-400">
                      Deactivating an account prevents that teacher from
                      accessing the system. This changes the login account
                      status, not the Teacher profile status.
                    </p>
                  </div>
                </section>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <ProtectedRoute allowedRoles={["Admin"]}>
      <AdminPageContent />
    </ProtectedRoute>
  );
}
