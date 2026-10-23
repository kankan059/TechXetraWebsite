"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Settings2,
  CheckCircle2,
} from "lucide-react";
import type { FormFieldDefinition, FormFieldType } from "@/types/api";
import FormFieldRenderer from "@/components/forms/FormFieldRenderer";

interface FormSchemaBuilderProps {
  schema: FormFieldDefinition[];
  onChange: (schema: FormFieldDefinition[]) => void;
  disabled?: boolean;
}

const FIELD_TYPES: { label: string; value: FormFieldType }[] = [
  { label: "Short Text", value: "shortText" },
  { label: "Long Text", value: "longText" },
  { label: "Number", value: "number" },
  { label: "Email Address", value: "email" },
  { label: "Phone Number", value: "phone" },
  { label: "Date", value: "date" },
  { label: "Checkbox", value: "checkbox" },
  { label: "Single Choice (dropdown)", value: "singleChoice" },
  { label: "Multiple Choice", value: "multipleChoice" },
];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 32);
}

export default function FormSchemaBuilder({
  schema,
  onChange,
  disabled = false,
}: FormSchemaBuilderProps) {
  const [activeTab, setActiveTab] = useState<"BUILDER" | "PREVIEW">("BUILDER");
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({});

  const handleAddQuestion = () => {
    const newField: FormFieldDefinition = {
      id: `question_${Date.now()}`,
      label: "New Question",
      type: "shortText",
      required: false,
      placeholder: "",
    };
    onChange([...schema, newField]);
  };

  const handleUpdateField = (
    index: number,
    updates: Partial<FormFieldDefinition>
  ) => {
    const next = [...schema];
    const target = { ...next[index], ...updates };

    // Auto-update ID if label changed and ID was still auto-generated
    if (updates.label && target.id.startsWith("question_")) {
      const generatedId = slugify(updates.label);
      if (generatedId) target.id = generatedId;
    }

    next[index] = target;
    onChange(next);
  };

  const handleRemoveField = (index: number) => {
    const next = schema.filter((_, i) => i !== index);
    onChange(next);
  };

  const handleMove = (index: number, direction: "UP" | "DOWN") => {
    const next = [...schema];
    const targetIdx = direction === "UP" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= next.length) return;
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    onChange(next);
  };

  // Select Option handlers
  const handleAddOption = (fieldIndex: number) => {
    const options = schema[fieldIndex].options || [];
    handleUpdateField(fieldIndex, {
      options: [...options, `Option ${options.length + 1}`],
    });
  };

  const handleUpdateOption = (fieldIndex: number, optIndex: number, value: string) => {
    const nextOpts = [...(schema[fieldIndex].options || [])];
    nextOpts[optIndex] = value;
    handleUpdateField(fieldIndex, { options: nextOpts });
  };

  const handleRemoveOption = (fieldIndex: number, optIndex: number) => {
    const nextOpts = (schema[fieldIndex].options || []).filter((_, i) => i !== optIndex);
    handleUpdateField(fieldIndex, { options: nextOpts });
  };

  return (
    <div className="space-y-4">
      {/* Tab Switcher */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("BUILDER")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${activeTab === "BUILDER"
              ? "bg-purple-400 text-black font-bold"
              : "text-white/60 hover:text-white"
              }`}
          >
            <Settings2 className="h-3.5 w-3.5" />
            <span>Form Builder ({schema.length})</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("PREVIEW")}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition ${activeTab === "PREVIEW"
              ? "bg-cyan-400 text-black font-bold"
              : "text-white/60 hover:text-white"
              }`}
          >
            <Eye className="h-3.5 w-3.5" />
            <span>Live Checkout Preview</span>
          </button>
        </div>

        {activeTab === "BUILDER" && (
          <button
            type="button"
            onClick={handleAddQuestion}
            disabled={disabled}
            className="inline-flex items-center gap-1.5 rounded-xl bg-purple-400/15 border border-purple-400/30 px-3 py-1.5 text-xs font-semibold text-purple-300 hover:bg-purple-400 hover:text-black transition disabled:opacity-40"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Question</span>
          </button>
        )}
      </div>

      {/* Mode 1: Form Builder */}
      {activeTab === "BUILDER" && (
        <div className="space-y-4">
          {schema.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 py-10 text-center text-xs text-white/40">
              No custom questionnaire configured yet. Participants will proceed directly to checkout.
              <div className="mt-3">
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  disabled={disabled}
                  className="rounded-xl bg-purple-400 px-4 py-2 text-xs font-bold text-black hover:bg-purple-300"
                >
                  + Add First Question
                </button>
              </div>
            </div>
          ) : (
            schema.map((field, idx) => (
              <div
                key={field.id + idx}
                className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 space-y-4 transition hover:border-white/20"
              >
                {/* Header Controls */}
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                    Question #{idx + 1}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleMove(idx, "UP")}
                      disabled={idx === 0 || disabled}
                      title="Move Up"
                      className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMove(idx, "DOWN")}
                      disabled={idx === schema.length - 1 || disabled}
                      title="Move Down"
                      className="rounded-lg p-1 text-white/50 hover:bg-white/10 hover:text-white disabled:opacity-30"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRemoveField(idx)}
                      disabled={disabled}
                      title="Delete Question"
                      className="rounded-lg p-1 text-red-400 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-30 ml-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Grid Inputs */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {/* Label */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-white/80">
                      Question Label <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={field.label}
                      onChange={(e) =>
                        handleUpdateField(idx, { label: e.target.value })
                      }
                      placeholder="e.g. GitHub Repository Link"
                      disabled={disabled}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Field ID / Key */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-white/80">
                      Field Identifier (ID Key) <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={field.id}
                      onChange={(e) =>
                        handleUpdateField(idx, { id: slugify(e.target.value) })
                      }
                      placeholder="e.g. github_url"
                      disabled={disabled}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 font-mono text-xs text-cyan-300 outline-none focus:border-cyan-400"
                    />
                  </div>

                  {/* Type */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-white/80">
                      Input Type
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) =>
                        handleUpdateField(idx, {
                          type: e.target.value as FormFieldType,
                        })
                      }
                      disabled={disabled}
                      className="w-full rounded-xl border border-white/10 bg-[#0C1017] px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                    >
                      {FIELD_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Placeholder */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-white/80">
                      Placeholder Example Text
                    </label>
                    <input
                      type="text"
                      value={field.placeholder || ""}
                      onChange={(e) =>
                        handleUpdateField(idx, { placeholder: e.target.value })
                      }
                      placeholder="e.g. https://github.com/username/project"
                      disabled={disabled}
                      className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400"
                    />
                  </div>
                </div>

                {/* Description helper */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-white/80">
                    Helper Description (Optional)
                  </label>
                  <input
                    type="text"
                    value={field.helperText || ""}
                    onChange={(e) =>
                      handleUpdateField(idx, { helperText: e.target.value })
                    }
                    placeholder="Instructions displayed below question..."
                    disabled={disabled}
                    className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3.5 py-2 text-xs text-white placeholder-white/30 outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Required Toggle */}
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white/90">
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) =>
                        handleUpdateField(idx, { required: e.target.checked })
                      }
                      disabled={disabled}
                      className="rounded border-white/20 bg-white/10 text-purple-400 focus:ring-purple-400"
                    />
                    <span>Required question (Participant cannot checkout without answering)</span>
                  </label>
                </div>

                {/* Options Builder for 'select' type */}
                {(field.type === "singleChoice" || field.type === "multipleChoice") && (
                  <div className="rounded-xl border border-white/10 bg-black/30 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-cyan-300 uppercase">
                        Dropdown Menu Options:
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddOption(idx)}
                        disabled={disabled}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold"
                      >
                        + Add Option
                      </button>
                    </div>

                    {(field.options || []).length === 0 ? (
                      <p className="text-[11px] text-white/40 italic">
                        No options added yet. Click &quot;+ Add Option&quot; above.
                      </p>
                    ) : (
                      (field.options || []).map((opt, optIdx) => (
                        <div key={optIdx} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateOption(idx, optIdx, e.target.value)}
                            placeholder="Option text (e.g. Size L)"
                            disabled={disabled}
                            className="flex-1 rounded-lg border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveOption(idx, optIdx)}
                            disabled={disabled}
                            className="text-white/40 hover:text-red-400 p-1"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Mode 2: Live Checkout Preview */}
      {activeTab === "PREVIEW" && (
        <div className="rounded-2xl border border-white/10 bg-[#0C1017] p-6 space-y-4">
          <div className="flex items-center gap-2 text-xs text-white/60">
            <CheckCircle2 className="h-4 w-4 text-cyan-400" />
            <span>
              This is a live preview of how participants will see the questionnaire during checkout:
            </span>
          </div>

          {schema.length === 0 ? (
            <p className="py-8 text-center text-xs text-white/40">
              No questions in questionnaire. Add questions in the Builder tab to preview them here.
            </p>
          ) : (
            <div className="space-y-4 max-w-md mx-auto py-2">
              {schema.map((f) => (
                <FormFieldRenderer
                  key={f.id}
                  field={f}
                  value={previewValues[f.id]}
                  onChange={(val) =>
                    setPreviewValues((prev) => ({ ...prev, [f.id]: val }))
                  }
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
