"use client";

import React, { useState, useEffect } from "react";
import { X, ClipboardList, Loader2, AlertCircle } from "lucide-react";
import type { FormFieldDefinition } from "@/types/api";
import FormFieldRenderer from "./FormFieldRenderer";

interface DynamicQuestionnaireModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventTitle: string;
  formSchema: FormFieldDefinition[];
  onSubmit: (responses: Record<string, any>) => Promise<void>;
  isSubmitting: boolean;
  externalError?: string | null;
  submitLabel?: string;
}

export default function DynamicQuestionnaireModal({
  isOpen,
  onClose,
  eventTitle,
  formSchema,
  onSubmit,
  isSubmitting,
  externalError,
  submitLabel,
}: DynamicQuestionnaireModalProps) {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isOpen) {
      setResponses({});
      setErrors({});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFieldChange = (fieldId: string, value: any) => {
    setResponses((prev) => ({ ...prev, [fieldId]: value }));
    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    for (const field of formSchema) {
      const val = responses[field.id];
      if (
        field.required &&
        (val === undefined || val === null || String(val).trim() === "")
      ) {
        newErrors[field.id] = `${field.label} is required.`;
        continue;
      }
      const isUrlField =
        (field.type as string) === "url" ||
        field.id.toLowerCase().includes("url") ||
        field.label.toLowerCase().includes("url") ||
        field.label.toLowerCase().includes("link");

      if (val && isUrlField) {
        try {
          new URL(String(val));
        } catch {
          newErrors[field.id] =
            "Please enter a valid URL (e.g., https://example.com).";
        }
      }
      if (
        val &&
        field.type === "email" &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(val))
      ) {
        newErrors[field.id] = "Please enter a valid email address.";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    await onSubmit(responses);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 md:p-8">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 flex max-h-[85vh] w-full max-w-xl flex-col overflow-hidden rounded-3xl border border-white/15 bg-[#0C1017] shadow-[0_24px_70px_rgba(0,0,0,0.85)] transition-all sm:max-h-[88vh]">
        {/* Header - Fixed at top */}
        <div className="flex shrink-0 items-start justify-between border-b border-white/10 px-6 py-5 sm:px-7">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Registration Questionnaire
              </h2>
              <p className="text-xs text-white/60 truncate max-w-[260px] sm:max-w-xs">
                {eventTitle}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-white/10 p-2 text-white/50 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Info text & External Error banner */}
        <div className="shrink-0 px-6 pt-4 pb-2 sm:px-7">
          <p className="text-xs text-white/60">
            Please answer the required questions below to complete your registration for this event.
          </p>

          {externalError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{externalError}</span>
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form
          id="dynamic-questionnaire-form"
          onSubmit={handleSubmit}
          className="flex-1 min-h-0 overflow-y-auto px-6 py-3 sm:px-7 space-y-4"
        >
          {formSchema.map((field) => (
            <FormFieldRenderer
              key={field.id}
              field={field}
              value={responses[field.id]}
              onChange={(val) => handleFieldChange(field.id, val)}
              error={errors[field.id]}
              disabled={isSubmitting}
            />
          ))}
        </form>

        {/* Footer Actions - Pinned at bottom */}
        <div className="flex shrink-0 items-center justify-end gap-3 border-t border-white/10 bg-[#090D13] px-6 py-4 sm:px-7">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-semibold text-white/70 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="dynamic-questionnaire-form"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200 disabled:opacity-50 cursor-pointer shadow-[0_0_20px_rgba(85,223,255,0.2)]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving & Proceeding...
              </>
            ) : (
              submitLabel || "Continue to Checkout"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
