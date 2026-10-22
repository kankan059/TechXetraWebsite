
"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Star from "@/components/ui/Star";

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
  const motionRootRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const formCardRef = useRef<HTMLDivElement>(null);

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

  useLayoutEffect(() => {
    if (loading || !motionRootRef.current) return;

    gsap.registerPlugin(ScrollTrigger);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const ctx = gsap.context(() => {
      if (introRef.current) {
        gsap.fromTo(
          introRef.current,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", clearProps: "transform" }
        );
        gsap.to(introRef.current, {
          y: -7,
          duration: 3.4,
          ease: "sine.inOut",
          repeat: -1,
          yoyo: true,
          delay: 0.8,
        });
      }

      if (formCardRef.current) {
        gsap.fromTo(
          formCardRef.current,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.85,
            delay: 0.12,
            ease: "power3.out",
            scrollTrigger: {
              trigger: formCardRef.current,
              start: "top 88%",
              once: true,
            },
          }
        );
      }

      gsap.fromTo(
        "[data-profile-field]",
        { opacity: 0, y: 12 },
        {
          opacity: 1,
          y: 0,
          duration: 0.45,
          stagger: 0.07,
          delay: 0.3,
          ease: "power2.out",
          scrollTrigger: {
            trigger: formCardRef.current,
            start: "top 86%",
            once: true,
          },
        }
      );
    }, motionRootRef);

    return () => ctx.revert();
  }, [loading]);

  function handlePointerMove(event: React.MouseEvent<HTMLDivElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = (event.clientX - bounds.left) / bounds.width - 0.5;
    const y = (event.clientY - bounds.top) / bounds.height - 0.5;

    if (formCardRef.current) {
      gsap.to(formCardRef.current, {
        x: x * -5,
        y: y * -4,
        duration: 0.75,
        ease: "power2.out",
        overwrite: "auto",
      });
    }
  }

  function handlePointerLeave() {
    if (formCardRef.current) {
      gsap.to(formCardRef.current, { x: 0, y: 0, duration: 0.8, ease: "power3.out", overwrite: "auto" });
    }
  }

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
      <main className="flex min-h-[100svh] items-center justify-center px-4 sm:px-5">
        <p className="text-sm text-white/60">Loading profile...</p>
      </main>
    );
  }

  return (
    <main className="min-h-[100svh] overflow-x-clip selection:bg-cyan-300/25">
      <div className="mx-auto flex min-h-[100svh] w-full max-w-6xl flex-col px-4 py-4 sm:px-8 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 border-b border-white/10 pb-4 sm:pb-5">
          <Link
            href="/"
            className="inline-flex min-h-10 items-center text-sm text-white/65 transition hover:text-white"
          >
            Back to home
          </Link>
          <span className="text-[10px] tracking-[0.12em] text-white/45 sm:text-xs">
            TECHXETRA 2026
          </span>
        </header>

        <section className="flex flex-1 items-start justify-center py-7 sm:items-center sm:py-12 lg:py-14">
          <div
            ref={motionRootRef}
            onMouseMove={handlePointerMove}
            onMouseLeave={handlePointerLeave}
            className="grid w-full max-w-5xl min-w-0 grid-cols-1 gap-7 sm:gap-9 lg:grid-cols-[0.8fr_1.2fr] lg:gap-14"
          >
            <div ref={introRef} className="min-w-0 self-center will-change-transform lg:pr-3">
              <p className="font-pixel mb-3 text-[10px] font-medium uppercase tracking-[0.24em] text-cyan-300 sm:mb-4 sm:text-sm sm:tracking-[0.28em]">
                Profile
              </p>
              <h1 className="font-autotech max-w-full break-words text-[clamp(2.7rem,13vw,3.5rem)] font-semibold uppercase leading-[0.92] tracking-[-0.055em] sm:max-w-xl sm:text-6xl xl:text-7xl">
                Complete
                <span className="mt-2 block text-white/45">your</span>
                <span className="mt-2 block text-cyan-300">profile.</span>
              </h1>
              <p className="font-heading mt-5 max-w-sm text-sm leading-6 text-white/50 sm:mt-7 sm:text-base sm:leading-7">
                Add your contact and institution details to continue to the TechXetra dashboard.
              </p>
              <div className="mt-6 flex items-center gap-3 sm:mt-10">
                <Star className="bg-cyan-300"/>
                <span className="font-cta text-xs uppercase tracking-[0.18em] text-white/40">
                  Participant profile · 2026
                </span>
              </div>
            </div>

            <div ref={formCardRef} className="w-full min-w-0 rounded-2xl border border-white/10 bg-[#0b1019] p-4 sm:p-6 md:p-8 will-change-transform">
              <div className="mb-6 border-b border-white/10 pb-4 sm:mb-7 sm:pb-5">
                <h2 className="font-pixel text-lg font-semibold sm:text-2xl">
                  Your details
                </h2>
                <p className="font-heading mt-2 text-xs leading-5 text-white/50 sm:text-sm">
                  Fields marked <span className="text-cyan-300">*</span> are required.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-5 rounded-lg border border-red-400/25 bg-red-400/[0.06] px-4 py-3 text-sm leading-5 text-red-200"
                >
                  {error}
                </div>
              )}

              {success && (
                <div
                  role="status"
                  className="mb-5 rounded-lg border border-emerald-400/25 bg-emerald-400/[0.06] px-4 py-3 text-sm leading-5 text-emerald-200"
                >
                  {success}
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                <div data-profile-field>
                  <label
                    htmlFor="name"
                    className="font-hero capitalize mb-2 block text-sm font-medium text-white/80"
                  >
                    Full name <span className="text-cyan-300">*</span>
                  </label>
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
                    className="w-full min-w-0 rounded-lg border border-white/15 bg-white/[0.03] px-3.5 py-3 text-base text-white outline-none transition placeholder:text-sm placeholder:text-white/30 hover:border-white/25 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10 sm:px-4 sm:text-sm"
                  />
                </div>

                <div data-profile-field>
                  <label
                    htmlFor="email"
                    className="font-hero capitalize mb-2 block text-sm font-medium text-white/80"
                  >
                    Email address
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    readOnly
                    aria-describedby="email-help"
                    className="w-full cursor-not-allowed rounded-lg border border-white/10 bg-white/[0.02] px-4 py-3 text-sm text-white/45 outline-none"
                  />
                  <p id="email-help" className="mt-2 text-xs text-white/40">
                    Your account email cannot be changed here.
                  </p>
                </div>

                <div data-profile-field>
                  <label
                    htmlFor="phone"
                    className="font-hero capitalize mb-2 block text-sm font-medium text-white/80"
                  >
                    Mobile number <span className="text-cyan-300">*</span>
                  </label>
                  <div className="flex min-w-0 overflow-hidden rounded-lg border border-white/15 bg-white/[0.03] transition focus-within:border-cyan-300/60 focus-within:ring-2 focus-within:ring-cyan-300/10">
                    <span className="flex shrink-0 items-center border-r border-white/10 px-3 text-sm text-white/45 sm:px-4">
                      +91
                    </span>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      value={phone}
                      onChange={(e) =>
                        setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                      }
                      pattern="[6-9][0-9]{9}"
                      minLength={10}
                      maxLength={10}
                      required
                      placeholder="10-digit mobile number"
                      className="min-w-0 flex-1 bg-transparent px-3 py-3 text-base text-white outline-none placeholder:text-xs placeholder:text-white/30 sm:px-4 sm:text-sm sm:placeholder:text-sm"
                    />
                  </div>
                </div>

                <div data-profile-field className="rounded-xl border border-white/10 p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium font-pixel text-white/90">
                        I&apos;m a student
                      </p>
                      <p className="mt-1 text-xs leading-5 text-white/45">
                        Add your institution details
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={isStudent}
                      aria-label="I am a student"
                      disabled={studentFieldsLocked}
                      onClick={() => setIsStudent((value) => !value)}
                      className={`relative h-6 w-11 shrink-0 rounded-full border transition ${isStudent
                          ? "border-cyan-300/50 bg-cyan-300/25"
                          : "border-white/20 bg-white/[0.06]"
                        } ${studentFieldsLocked
                          ? "cursor-not-allowed opacity-50"
                          : "cursor-pointer"
                        }`}
                    >
                      <span
                        className={`absolute top-0.5 h-4 w-4 rounded-full transition-all ${isStudent
                            ? "left-[1.35rem] bg-cyan-200"
                            : "left-0.5 bg-white/60"
                          }`}
                      />
                    </button>
                  </div>

                  {studentFieldsLocked && (
                    <p className="mt-4 font-pixel rounded-lg border border-white/10 bg-white/[0.03] p-3 text-xs leading-5 text-white/55">
                      Your student details are verified and locked. Contact festival administration if they need to be changed.
                    </p>
                  )}

                  {isStudent && (
                    <div className="mt-5 space-y-4 border-t border-white/10 pt-5">
                      <div>
                        <label
                          htmlFor="institutionName"
                          className="mb-2 block text-sm font-medium text-white/80"
                        >
                          Institution name <span className="text-cyan-300">*</span>
                        </label>
                        <input
                          id="institutionName"
                          name="institution_name"
                          value={institutionName}
                          onChange={(e) => setInstitutionName(e.target.value)}
                          minLength={2}
                          maxLength={100}
                          required={isStudent}
                          disabled={studentFieldsLocked}
                          placeholder="Your college or university"
                          className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/25 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="institutionId"
                          className="mb-2 block text-sm font-medium text-white/80"
                        >
                          Student / institution ID <span className="text-cyan-300">*</span>
                        </label>
                        <input
                          id="institutionId"
                          name="institution_id"
                          value={institutionId}
                          onChange={(e) => setInstitutionId(e.target.value)}
                          minLength={1}
                          maxLength={40}
                          required={isStudent}
                          disabled={studentFieldsLocked}
                          placeholder="Enter your student ID"
                          className="w-full rounded-lg border border-white/15 bg-white/[0.03] px-4 py-3 text-sm text-white outline-none transition placeholder:text-white/30 hover:border-white/25 focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-45"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <p data-profile-field className="text-xs leading-5 text-white/40">
                  Your details will be used for your TechXetra participant profile.
                </p>

                <button
                  data-profile-field
                  type="submit"
                  disabled={saving}
                  className="flex min-h-12 w-full items-center justify-center rounded-lg bg-cyan-300 px-4 py-3.5 text-sm font-semibold text-[#061019] transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 sm:px-5"
                >
                  {saving ? "Saving profile..." : "Save and continue"}
                </button>
              </form>

              <div className="mt-6 font-cta border-t border-white/10 pt-4 text-center text-xs text-white/35">
                TechXetra 2026
              </div>
            </div>
          </div>
        </section>

        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-4 text-[10px] text-white/35 sm:pt-5 sm:text-xs">
          <span className="font-cta">TECHXETRA 2026</span>
          <Link href="/" className="transition hover:text-cyan-200">
            Home
          </Link>
        </footer>
      </div>
    </main>
  );
}
