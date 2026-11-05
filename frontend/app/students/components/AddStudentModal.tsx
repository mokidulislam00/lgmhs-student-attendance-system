
"use client";

import { useState, type FormEvent } from "react";
import { X, UserPlus, Loader2 } from "lucide-react";
import api from "../../../lib/api";

interface AddStudentModalProps {
  onClose: () => void;
  onSuccess: () => void;
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
}

const initialForm: StudentFormData = {
  studentId: "",
  name: "",
  roll: "",
  className: "",
  section: "",
  gender: "",
  guardianName: "",
  guardianPhone: "",
  address: "",
};

export default function AddStudentModal({
  onClose,
  onSuccess,
}: AddStudentModalProps) {
  const [form, setForm] = useState<StudentFormData>(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    try {
      setLoading(true);

      const payload = {
        ...form,
        studentId: form.studentId.trim(),
        name: form.name.trim(),
        roll: Number(form.roll),
        guardianName: form.guardianName.trim(),
        guardianPhone: form.guardianPhone.trim(),
        address: form.address.trim(),
      };

      await api.post("/students", payload);

      onSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Create student failed:", err);

      if (typeof err === "object" && err !== null && "response" in err) {
        const apiError = err as {
          response?: {
            data?: {
              message?: string;
              errors?: { msg?: string }[];
            };
          };
        };

        const validationMessage =
          apiError.response?.data?.errors
            ?.map((item) => item.msg)
            .filter(Boolean)
            .join(", ");

        setError(
          validationMessage ||
            apiError.response?.data?.message ||
            "Unable to create student. Please try again."
        );
      } else {
        setError(
          "Cannot connect to the backend server. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const inputClass =
    "w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-50";

  const labelClass =
    "mb-2 block text-sm font-medium text-slate-700";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <UserPlus size={22} />
            </div>

            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Add New Student
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Enter the student&apos;s information below.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <section>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-indigo-600">
              Student Information
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className={labelClass}>Student ID *</label>
                <input
                  name="studentId"
                  value={form.studentId}
                  onChange={handleChange}
                  placeholder="e.g. LGMHS-2026-004"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Full Name *</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Enter student's name"
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
                  value={form.roll}
                  onChange={handleChange}
                  placeholder="Enter roll"
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
                  value={form.className}
                  onChange={handleChange}
                  className={inputClass}
                  required
                >
                  <option value="">Select class</option>
                  {["6", "7", "8", "9", "10"].map((item) => (
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
                  value={form.section}
                  onChange={handleChange}
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
                  value={form.gender}
                  onChange={handleChange}
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
                  value={form.guardianName}
                  onChange={handleChange}
                  placeholder="Enter guardian's name"
                  className={inputClass}
                  required
                />
              </div>

              <div>
                <label className={labelClass}>Guardian Phone *</label>
                <input
                  type="tel"
                  name="guardianPhone"
                  value={form.guardianPhone}
                  onChange={handleChange}
                  placeholder="01XXXXXXXXX"
                  className={inputClass}
                  maxLength={11}
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className={labelClass}>Address *</label>
                <textarea
                  name="address"
                  value={form.address}
                  onChange={handleChange}
                  placeholder="Enter student's full address"
                  className={inputClass}
                  rows={3}
                  required
                />
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 size={17} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <UserPlus size={17} />
                  Create Student
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
