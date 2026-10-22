"use client";

import React from "react";
import type { FormFieldDefinition } from "@/types/api";

interface FormFieldRendererProps {
  field: FormFieldDefinition;
  value: any;
  onChange: (value: any) => void;
  error?: string;
  disabled?: boolean;
}

export default function FormFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled = false,
}: FormFieldRendererProps) {
  const inputBaseClasses = `w-full rounded-xl border bg-white/[0.04] px-4 py-2.5 text-sm text-white placeholder-white/30 transition outline-none ${
    error
      ? "border-red-500/80 focus:border-red-400 focus:ring-1 focus:ring-red-400"
      : "border-white/10 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
  } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`;

  return (
    <div className="space-y-1.5">
      <label
        htmlFor={field.id}
        className="block text-xs font-semibold tracking-wide text-white/90"
      >
        {field.label}
        {field.required && <span className="ml-1 text-red-400">*</span>}
      </label>

      {field.description && (
        <p className="text-[11px] text-white/50">{field.description}</p>
      )}

      {field.type === "textarea" ? (
        <textarea
          id={field.id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          disabled={disabled}
          rows={3}
          className={`${inputBaseClasses} resize-y min-h-[80px]`}
        />
      ) : field.type === "select" ? (
        <div className="relative">
          <select
            id={field.id}
            value={value ?? ""}
            onChange={(e) => onChange(e.target.value)}
            disabled={disabled}
            className={`${inputBaseClasses} appearance-none pr-8 bg-[#0C1017]`}
          >
            <option value="" disabled className="bg-[#0C1017] text-white/40">
              {field.placeholder || "Select an option..."}
            </option>
            {field.options?.map((opt) => (
              <option
                key={opt.value}
                value={opt.value}
                className="bg-[#0C1017] text-white"
              >
                {opt.label}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/40 text-xs">
            ▼
          </div>
        </div>
      ) : (
        <input
          id={field.id}
          type={field.type}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
          disabled={disabled}
          className={inputBaseClasses}
        />
      )}

      {error && (
        <p className="text-[11px] font-medium text-red-400 animate-fadeIn">
          {error}
        </p>
      )}
    </div>
  );
}
