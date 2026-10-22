"use client";

import React from "react";
import { X, ExternalLink, HelpCircle } from "lucide-react";

interface QuestionnaireResponsesModalProps {
  isOpen: boolean;
  onClose: () => void;
  participantName: string;
  teamName?: string | null;
  responses: Record<string, any> | null;
}

export default function QuestionnaireResponsesModal({
  isOpen,
  onClose,
  participantName,
  teamName,
  responses,
}: QuestionnaireResponsesModalProps) {
  if (!isOpen) return null;

  const entries = responses ? Object.entries(responses) : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-lg rounded-3xl border border-white/10 bg-[#0C1017] p-6 shadow-2xl sm:p-8 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-cyan-400/10 px-2.5 py-0.5 text-[10px] font-semibold text-cyan-300">
                FORM RESPONSES
              </span>
              {teamName && (
                <span className="rounded-full bg-white/[0.05] px-2.5 py-0.5 text-[10px] text-white/70">
                  {teamName}
                </span>
              )}
            </div>
            <h2 className="mt-1 text-lg font-bold text-white">
              {participantName}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 p-2 text-white/50 transition hover:border-white/20 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 flex-1 overflow-y-auto pr-1 space-y-3">
          {entries.length === 0 ? (
            <div className="py-12 text-center text-xs text-white/40">
              <HelpCircle className="mx-auto mb-2 h-8 w-8 text-white/20" />
              No custom questionnaire answers submitted.
            </div>
          ) : (
            entries.map(([key, value]) => {
              const strVal = String(value ?? "");
              const isUrl =
                strVal.startsWith("http://") || strVal.startsWith("https://");

              return (
                <div
                  key={key}
                  className="rounded-2xl border border-white/10 bg-white/[0.02] p-4 transition hover:border-white/15"
                >
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-cyan-300">
                    {key.replace(/_/g, " ")}
                  </p>
                  <div className="mt-1.5 text-sm text-white">
                    {isUrl ? (
                      <a
                        href={strVal}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-cyan-400 underline hover:text-cyan-300 break-all"
                      >
                        <span>{strVal}</span>
                        <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                      </a>
                    ) : (
                      <span className="whitespace-pre-wrap text-white/90">
                        {strVal || <em className="text-white/40">Not provided</em>}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 border-t border-white/10 pt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/[0.05] px-4 py-2 text-xs font-semibold text-white transition hover:bg-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
