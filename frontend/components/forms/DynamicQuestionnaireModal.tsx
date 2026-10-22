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
}

export default function DynamicQuestionnaireModal({
  isOpen,
  onClose,
  eventTitle,
  formSchema,
  onSubmit,
  isSubmitting,
  externalError,
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
      if (val && field.type === "url") {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={isSubmitting ? undefined : onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl transition-all sm:p-8 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-400/10 text-cyan-300">
              <ClipboardList className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Registration Questionnaire
              </h2>
              <p className="text-xs text-white/60 truncate max-w-[280px] sm:max-w-xs">
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

        {/* Info text & Error banner */}
        <div className="pt-4">
          <p className="text-xs text-white/60">
            Please answer the required questions below to complete your
            registration for this event.
          </p>

          {externalError && (
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
              <span>{externalError}</span>
            </div>
          )}
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="mt-4 flex-1 overflow-y-auto pr-1 space-y-4">
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

          {/* Footer actions inside form */}
          <div className="sticky bottom-0 pt-4 pb-1 border-t border-white/10 bg-[#0C1017] flex items-center justify-end gap-3">
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
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-xl bg-cyan-300 px-5 py-2.5 text-xs font-bold text-black transition hover:bg-cyan-200 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving & Proceeding...
                </>
              ) : (
                "Continue to Checkout"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
