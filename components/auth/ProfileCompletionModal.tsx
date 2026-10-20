"use client"

import { useEffect, useId } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { ApiError, apiRequest } from "@/lib/api-client"
import { useAuth } from "@/lib/auth-context"
import type { UserProfile } from "@/types/api"
import { motion, AnimatePresence } from "framer-motion"

// --------------------------------------------------------------------------
// Schema
// --------------------------------------------------------------------------

const schema = z
  .object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters"),
    phone: z
      .string()
      .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
    is_student: z.boolean(),
    institution_name: z.string().optional(),
    institution_id: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.is_student) {
      if (!data.institution_name || data.institution_name.length < 2) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["institution_name"],
          message: "Institution name must be at least 2 characters",
        })
      }
      if (data.institution_name && data.institution_name.length > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["institution_name"],
          message: "Institution name must be less than 100 characters",
        })
      }
      if (!data.institution_id || data.institution_id.length < 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["institution_id"],
          message: "Student ID is required",
        })
      }
      if (data.institution_id && data.institution_id.length > 40) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["institution_id"],
          message: "Student ID must be less than 40 characters",
        })
      }
    }
  })

type FormValues = z.infer<typeof schema>

// --------------------------------------------------------------------------
// Component
// --------------------------------------------------------------------------

interface ProfileCompletionModalProps {
  isOpen: boolean
  onClose?: () => void
}

export function ProfileCompletionModal({
  isOpen,
  onClose,
}: ProfileCompletionModalProps) {
  const { user, refreshUser } = useAuth()
  const nameId = useId()
  const phoneId = useId()
  const studentId = useId()
  const institutionNameId = useId()
  const institutionIdFieldId = useId()

  const isLocked = user?.student_fields_locked ?? false

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: user?.name ?? "",
      phone: user?.phone ?? "",
      is_student: user?.is_student ?? false,
      institution_name: user?.institution_name ?? "",
      institution_id: user?.institution_id ?? "",
    },
  })

  // Re-populate defaults whenever user changes
  useEffect(() => {
    if (user) {
      reset({
        name: user.name ?? "",
        phone: user.phone ?? "",
        is_student: user.is_student ?? false,
        institution_name: user.institution_name ?? "",
        institution_id: user.institution_id ?? "",
      })
    }
  }, [user, reset])

  const isStudent = watch("is_student")

  const onSubmit = async (values: FormValues) => {
    try {
      await apiRequest<UserProfile>("/api/me/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: values.name,
          phone: values.phone,
          is_student: values.is_student,
          ...(values.is_student && {
            institution_name: values.institution_name,
            institution_id: values.institution_id,
          }),
        }),
      })
      await refreshUser()
      onClose?.()
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === "STUDENT_FIELDS_LOCKED") {
          setError("root", {
            message:
              "Student details are verified and locked. Contact support for changes.",
          })
        } else {
          setError("root", { message: err.message })
        }
      }
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="profile-modal-title"
        >
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 32, scale: 0.96 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className="relative z-10 w-full max-w-md rounded-2xl border border-white/10 bg-[#0f0f0f] p-6 shadow-2xl sm:p-8"
          >
            <h2
              id="profile-modal-title"
              className="mb-1 font-[var(--font-gotham-bold)] text-xl text-white"
            >
              Complete your profile
            </h2>
            <p className="mb-6 text-sm text-white/50">
              Required before you can register for events.
            </p>

            {/* Lock notice */}
            {isLocked && (
              <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 text-sm text-amber-300">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  aria-hidden="true"
                >
                  <path
                    d="M12 9v4M12 17h.01M10.3 4.6 3 18a2 2 0 0 0 1.7 3h14.6a2 2 0 0 0 1.7-3L13.7 4.6a2 2 0 0 0-3.4 0Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <span>
                  Student status verified &amp; locked. To update, contact
                  festival administration.
                </span>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              {/* Name */}
              <div className="mb-4">
                <label
                  htmlFor={nameId}
                  className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/60"
                >
                  Full Name
                </label>
                <input
                  id={nameId}
                  type="text"
                  autoComplete="name"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  placeholder="Your full name"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {errors.name.message}
                  </p>
                )}
              </div>

              {/* Phone */}
              <div className="mb-4">
                <label
                  htmlFor={phoneId}
                  className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/60"
                >
                  Mobile Number
                </label>
                <input
                  id={phoneId}
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  maxLength={10}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20"
                  placeholder="10-digit Indian mobile"
                  {...register("phone")}
                />
                {errors.phone && (
                  <p className="mt-1.5 text-xs text-red-400">
                    {errors.phone.message}
                  </p>
                )}
              </div>

              {/* Is Student toggle */}
              <div className="mb-4 flex items-center gap-3">
                <input
                  id={studentId}
                  type="checkbox"
                  disabled={isLocked}
                  className="h-4 w-4 cursor-pointer accent-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                  {...register("is_student")}
                />
                <label
                  htmlFor={studentId}
                  className={`text-sm text-white ${isLocked ? "opacity-50" : ""}`}
                >
                  I am a student (eligible for student pricing)
                </label>
              </div>

              {/* Institution fields (conditional) */}
              <AnimatePresence>
                {isStudent && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="mb-4">
                      <label
                        htmlFor={institutionNameId}
                        className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/60"
                      >
                        Institution / College Name
                      </label>
                      <input
                        id={institutionNameId}
                        type="text"
                        disabled={isLocked}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="e.g. Tezpur University"
                        {...register("institution_name")}
                      />
                      {errors.institution_name && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {errors.institution_name.message}
                        </p>
                      )}
                    </div>

                    <div className="mb-4">
                      <label
                        htmlFor={institutionIdFieldId}
                        className="mb-1.5 block text-xs font-medium uppercase tracking-widest text-white/60"
                      >
                        Student / Roll Number
                      </label>
                      <input
                        id={institutionIdFieldId}
                        type="text"
                        disabled={isLocked}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/25 outline-none transition focus:border-cyan-300/60 focus:ring-2 focus:ring-cyan-300/20 disabled:cursor-not-allowed disabled:opacity-50"
                        placeholder="Your student ID / roll number"
                        {...register("institution_id")}
                      />
                      {errors.institution_id && (
                        <p className="mt-1.5 text-xs text-red-400">
                          {errors.institution_id.message}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Root error */}
              {errors.root && (
                <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
                  {errors.root.message}
                </p>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-cyan-300 py-3 text-sm font-semibold text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Saving…" : "Save & Continue"}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
