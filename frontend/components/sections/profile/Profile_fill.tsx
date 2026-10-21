
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  GraduationCap,
  LockKeyhole,
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  UserRound,
  Phone,
  Building2,
  Hash,
  AlertCircle,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8787";

type UserProfile = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  is_student: boolean;
  institution_name: string | null;
  institution_id: string | null;
  student_fields_locked: boolean;
  profile_complete: boolean;
};

export default function Profile_fill() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isStudent, setIsStudent] = useState(true);
  const [institutionName, setInstitutionName] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [studentFieldsLocked, setStudentFieldsLocked] = useState(false);

  const loadProfile = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE}/api/me`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
        cache: "no-store",
      });

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error?.message || "Unable to load your profile."
        );
      }

      const profile: UserProfile = result.data;

      setName(profile.name || "");
      setEmail(profile.email || "");
      setPhone(profile.phone || "");
      setIsStudent(Boolean(profile.is_student));
      setInstitutionName(profile.institution_name || "");
      setInstitutionId(profile.institution_id || "");
      setStudentFieldsLocked(Boolean(profile.student_fields_locked));
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your profile."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    void Promise.resolve().then(loadProfile);
  }, [loadProfile]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedInstitutionName = institutionName.trim();
    const trimmedInstitutionId = institutionId.trim();

    if (trimmedName.length < 2 || trimmedName.length > 100) {
      setError("Name must be between 2 and 100 characters.");
      return;
    }

    if (!/^[6-9]\d{9}$/.test(trimmedPhone)) {
      setError("Enter a valid 10-digit Indian mobile number.");
      return;
    }

    if (isStudent && !studentFieldsLocked) {
      if (
        trimmedInstitutionName.length < 2 ||
        trimmedInstitutionName.length > 100
      ) {
        setError("Enter a valid institution name.");
        return;
      }

      if (
        trimmedInstitutionId.length < 1 ||
        trimmedInstitutionId.length > 40
      ) {
        setError("Enter your institution ID.");
        return;
      }
    }

    const payload = {
      name: trimmedName,
      phone: trimmedPhone,
      is_student: studentFieldsLocked ? isStudent : isStudent,
      institution_name: isStudent
        ? trimmedInstitutionName
        : null,
      institution_id: isStudent
        ? trimmedInstitutionId
        : null,
    };

    try {
      setSaving(true);

      const response = await fetch(`${API_BASE}/api/me/profile`, {
        method: "PATCH",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => null);

      if (response.status === 401) {
        router.replace("/login");
        return;
      }

      if (!response.ok || !result?.success) {
        throw new Error(
          result?.error?.message || "Could not save your profile."
        );
      }

      setSuccess("Profile saved successfully.");

      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#05070c] text-white">
        <div className="absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.07]">
            <LoaderCircle className="h-7 w-7 animate-spin text-cyan-300" />
          </div>
          <p className="text-sm tracking-wide text-white/50">
            Loading your profile...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05070c] text-white selection:bg-cyan-300/30 selection:text-white">
      {/* Background atmosphere */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 top-10 h-96 w-96 rounded-full bg-cyan-500/[0.09] blur-[120px]" />
        <div className="absolute -right-40 top-1/3 h-96 w-96 rounded-full bg-blue-600/[0.10] blur-[130px]" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-cyan-400/[0.05] blur-[110px]" />

        <div
          className="absolute inset-0 opacity-[0.12]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(148,163,184,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.12) 1px, transparent 1px)",
            backgroundSize: "3rem 3rem",
            maskImage:
              "linear-gradient(to bottom, black, transparent 85%)",
          }}
        />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-6 sm:px-8 sm:py-8 lg:px-12">
        {/* Top navigation */}
        <header className="flex items-center justify-between">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 text-sm text-white/60 transition hover:text-white"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] transition group-hover:border-cyan-300/30 group-hover:bg-cyan-300/[0.06]">
              <ArrowLeft className="h-4 w-4" />
            </span>
            Back to home
          </Link>

          <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-2">
            <ShieldCheck className="h-4 w-4 text-cyan-300" />
            <span className="text-xs text-white/60">
              Secure profile setup
            </span>
          </div>
        </header>

        {/* Main content */}
        <section className="flex flex-1 items-center justify-center py-12 sm:py-16">
          <div className="grid w-full max-w-5xl items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
            {/* Left introduction */}
            <div className="hidden lg:block">
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-300/[0.06] px-3.5 py-2">
                <Sparkles className="h-4 w-4 text-cyan-300" />
                <span className="text-xs font-medium tracking-wide text-cyan-100">
                  YOUR TECHXETRA JOURNEY
                </span>
              </div>

              <h1 className="max-w-lg text-5xl font-semibold leading-[1.12] tracking-tight xl:text-6xl">
                Make it
                <br />
                <span className="bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 bg-clip-text text-transparent">
                  official.
                </span>
              </h1>

              <p className="mt-6 max-w-md text-base leading-7 text-white/50">
                One last step before you jump into TechXetra. Complete
                your profile so we can personalize your experience and
                get you ready for the festival.
              </p>

              <div className="mt-10 space-y-5">
                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06]">
                    <UserRound className="h-5 w-5 text-cyan-300" />
                  </div>
                  <div>
                    <p className="font-medium text-white/90">
                      Your identity
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/45">
                      Keep your contact details up to date.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-blue-300/15 bg-blue-300/[0.06]">
                    <GraduationCap className="h-5 w-5 text-blue-300" />
                  </div>
                  <div>
                    <p className="font-medium text-white/90">
                      Your institution
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/45">
                      Add your academic details if you are a student.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.03]">
                    <CheckCircle2 className="h-5 w-5 text-emerald-300" />
                  </div>
                  <div>
                    <p className="font-medium text-white/90">
                      Ready to explore
                    </p>
                    <p className="mt-1 text-sm leading-6 text-white/45">
                      Finish setup and continue to your dashboard.
                    </p>
                  </div>
                </div>
              </div>

              <div className="mt-12 flex items-center gap-3 border-t border-white/[0.08] pt-6">
                <div className="flex -space-x-2">
                  <span className="h-7 w-7 rounded-full border-2 border-[#05070c] bg-gradient-to-br from-cyan-300 to-blue-600" />
                  <span className="h-7 w-7 rounded-full border-2 border-[#05070c] bg-gradient-to-br from-blue-400 to-indigo-600" />
                  <span className="h-7 w-7 rounded-full border-2 border-[#05070c] bg-gradient-to-br from-sky-200 to-cyan-600" />
                </div>
                <p className="text-xs text-white/40">
                  Built for the next generation of innovators.
                </p>
              </div>
            </div>

            {/* Profile form card */}
            <div className="mx-auto w-full max-w-xl">
              <div className="mb-6 lg:hidden">
                <p className="mb-3 text-xs font-semibold tracking-[0.22em] text-cyan-300">
                  TECHXETRA / PROFILE
                </p>
                <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
                  Let&apos;s get you
                  <span className="block bg-gradient-to-r from-cyan-300 to-blue-500 bg-clip-text text-transparent">
                    set up.
                  </span>
                </h1>
                <p className="mt-3 max-w-md text-sm leading-6 text-white/50">
                  Complete your details to continue your TechXetra
                  journey.
                </p>
              </div>

              <div className="relative overflow-hidden rounded-3xl border border-white/[0.11] bg-[#0b1019]/90 p-5 shadow-2xl shadow-black/30 backdrop-blur-2xl sm:p-8">
                <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />

                <div className="mb-7 flex items-start justify-between gap-4">
                  <div>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/15 to-blue-500/10">
                      <UserRound className="h-6 w-6 text-cyan-200" />
                    </div>
                    <h2 className="text-2xl font-semibold tracking-tight">
                      Complete your profile
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-white/45">
                      Tell us a little about yourself.
                    </p>
                  </div>

                  <div className="hidden rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-right sm:block">
                    <p className="text-[0.65rem] uppercase tracking-wider text-white/35">
                      Step
                    </p>
                    <p className="mt-0.5 text-sm font-medium text-cyan-200">
                      01 / 01
                    </p>
                  </div>
                </div>

                {error && (
                  <div
                    role="alert"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-red-400/20 bg-red-400/[0.07] p-3.5 text-sm text-red-200"
                  >
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                {success && (
                  <div
                    role="status"
                    className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3.5 text-sm text-emerald-200"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{success}</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Full name */}
                  <div>
                    <label
                      htmlFor="name"
                      className="mb-2 block text-sm font-medium text-white/75"
                    >
                      Full name <span className="text-cyan-300">*</span>
                    </label>
                    <div className="group relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition group-focus-within:text-cyan-300" />
                      <input
                        id="name"
                        name="name"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        minLength={2}
                        maxLength={100}
                        required
                        placeholder="Enter your full name"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035] focus:ring-4 focus:ring-cyan-300/[0.07]"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      htmlFor="email"
                      className="mb-2 block text-sm font-medium text-white/75"
                    >
                      Email address
                    </label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30">
                        <ShieldCheck className="h-4 w-4" />
                      </div>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        readOnly
                        className="w-full cursor-not-allowed rounded-xl border border-white/[0.07] bg-white/[0.02] py-3.5 pl-11 pr-12 text-sm text-white/45 outline-none"
                      />
                      <LockKeyhole className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/25" />
                    </div>
                    <p className="mt-2 text-xs text-white/30">
                      Your account email cannot be changed here.
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      htmlFor="phone"
                      className="mb-2 block text-sm font-medium text-white/75"
                    >
                      Mobile number{" "}
                      <span className="text-cyan-300">*</span>
                    </label>
                    <div className="group relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition group-focus-within:text-cyan-300" />
                      <div className="pointer-events-none absolute left-11 top-1/2 -translate-y-1/2 text-sm text-white/35">
                        +91
                      </div>
                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={phone}
                        onChange={(e) =>
                          setPhone(
                            e.target.value.replace(/\D/g, "").slice(0, 10)
                          )
                        }
                        pattern="[6-9][0-9]{9}"
                        minLength={10}
                        maxLength={10}
                        required
                        placeholder="10-digit mobile number"
                        className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-3.5 pl-[4.5rem] pr-4 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-cyan-300/60 focus:bg-cyan-300/[0.035] focus:ring-4 focus:ring-cyan-300/[0.07]"
                      />
                    </div>
                  </div>

                  {/* Student toggle */}
                  <div className="rounded-2xl border border-white/[0.09] bg-white/[0.02] p-4 sm:p-5">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-300/15 bg-cyan-300/[0.06]">
                          <GraduationCap className="h-5 w-5 text-cyan-200" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white/90">
                            I&apos;m a student
                          </p>
                          <p className="mt-1 text-xs leading-5 text-white/40">
                            Add your institution details
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        role="switch"
                        aria-checked={isStudent}
                        aria-label="I am a student"
                        disabled={studentFieldsLocked}
                        onClick={() => setIsStudent((value) => !value)}
                        className={`relative h-7 w-12 shrink-0 rounded-full border transition ${
                          isStudent
                            ? "border-cyan-300/50 bg-cyan-400/25"
                            : "border-white/15 bg-white/[0.06]"
                        } ${
                          studentFieldsLocked
                            ? "cursor-not-allowed opacity-50"
                            : "cursor-pointer"
                        }`}
                      >
                        <span
                          className={`absolute top-1 h-5 w-5 rounded-full transition-all ${
                            isStudent
                              ? "left-[1.35rem] bg-cyan-200 shadow-lg shadow-cyan-300/30"
                              : "left-1 bg-white/50"
                          }`}
                        />
                      </button>
                    </div>

                    {studentFieldsLocked && (
                      <div className="mt-4 flex items-start gap-2 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] p-3">
                        <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300" />
                        <p className="text-xs leading-5 text-emerald-100/70">
                          Your student details are verified and locked.
                          Contact festival administration if they need
                          to be changed.
                        </p>
                      </div>
                    )}

                    {isStudent && (
                      <div className="mt-5 space-y-4 border-t border-white/[0.07] pt-5">
                        <div>
                          <label
                            htmlFor="institutionName"
                            className="mb-2 block text-sm font-medium text-white/75"
                          >
                            Institution name{" "}
                            <span className="text-cyan-300">*</span>
                          </label>
                          <div className="group relative">
                            <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition group-focus-within:text-cyan-300" />
                            <input
                              id="institutionName"
                              name="institution_name"
                              value={institutionName}
                              onChange={(e) =>
                                setInstitutionName(e.target.value)
                              }
                              minLength={2}
                              maxLength={100}
                              required={isStudent}
                              disabled={studentFieldsLocked}
                              placeholder="Your college or university"
                              className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </div>
                        </div>

                        <div>
                          <label
                            htmlFor="institutionId"
                            className="mb-2 block text-sm font-medium text-white/75"
                          >
                            Student / institution ID{" "}
                            <span className="text-cyan-300">*</span>
                          </label>
                          <div className="group relative">
                            <Hash className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30 transition group-focus-within:text-cyan-300" />
                            <input
                              id="institutionId"
                              name="institution_id"
                              value={institutionId}
                              onChange={(e) =>
                                setInstitutionId(e.target.value)
                              }
                              minLength={1}
                              maxLength={40}
                              required={isStudent}
                              disabled={studentFieldsLocked}
                              placeholder="Enter your student ID"
                              className="w-full rounded-xl border border-white/10 bg-white/[0.035] py-3.5 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-white/25 hover:border-white/20 focus:border-cyan-300/60 focus:ring-4 focus:ring-cyan-300/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <p className="flex items-start gap-2 text-xs leading-5 text-white/35">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300/60" />
                    Your information is submitted securely and used for
                    your TechXetra participant profile.
                  </p>

                  <button
                    type="submit"
                    disabled={saving}
                    className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-xl bg-gradient-to-r from-cyan-300 via-sky-400 to-blue-500 px-5 py-4 text-sm font-semibold text-[#061019] shadow-lg shadow-cyan-500/10 transition hover:shadow-xl hover:shadow-cyan-400/20 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="absolute inset-0 translate-y-full bg-white/20 transition-transform duration-300 group-hover:translate-y-0" />
                    <span className="relative flex items-center gap-2">
                      {saving ? (
                        <>
                          <LoaderCircle className="h-4 w-4 animate-spin" />
                          Saving your profile...
                        </>
                      ) : (
                        <>
                          <Check className="h-4 w-4" />
                          Save & continue
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </span>
                  </button>
                </form>

                <div className="mt-6 flex items-center justify-center gap-2 border-t border-white/[0.07] pt-5 text-xs text-white/30">
                  <LockKeyhole className="h-3.5 w-3.5" />
                  Secure session · TechXetra 2026
                </div>
              </div>

              <p className="mt-5 text-center text-xs text-white/30">
                Need help? Contact the TechXetra team.
              </p>
            </div>
          </div>
        </section>

        <footer className="flex items-center justify-between border-t border-white/[0.07] pt-5 text-xs text-white/30">
          <span>TECHXETRA 2026</span>
          <span className="hidden sm:block">
            Explore. Build. Innovate.
          </span>
          <Link
            href="/"
            className="transition hover:text-cyan-200"
          >
            Home
          </Link>
        </footer>
      </div>
    </main>
  );
}
