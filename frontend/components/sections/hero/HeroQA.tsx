"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HeroQuestion } from "@/data/info/hero-qa";

type HeroQAProps = {
  questions: HeroQuestion[];
};

export default function HeroQA({ questions }: HeroQAProps) {
  const orderedQuestions = useMemo(
    () =>
      [...questions].sort(
        (first, second) => (first.order ?? 0) - (second.order ?? 0)
      ),
    [questions]
  );
  const [selectedId, setSelectedId] = useState(
    orderedQuestions[0]?.id ?? ""
  );
  const activeId = orderedQuestions.some(
    (question) => question.id === selectedId
  )
    ? selectedId
    : (orderedQuestions[0]?.id ?? "");
  const selectedQuestion =
    orderedQuestions.find((question) => question.id === activeId) ??
    orderedQuestions[0];
  const listId = useId();
  const answerId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (orderedQuestions.length === 0) return;

    let nextIndex: number | null = null;
    if (event.key === "ArrowDown" || event.key === "ArrowRight") {
      nextIndex = (index + 1) % orderedQuestions.length;
    } else if (event.key === "ArrowUp" || event.key === "ArrowLeft") {
      nextIndex =
        (index - 1 + orderedQuestions.length) % orderedQuestions.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = orderedQuestions.length - 1;
    }

    if (nextIndex === null) return;

    event.preventDefault();
    const nextQuestion = orderedQuestions[nextIndex];
    setSelectedId(nextQuestion.id);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      aria-labelledby={`${listId}-heading`}
      className="w-full max-w-2xl border border-(--tx-cream)/20 bg-black/15 p-4 backdrop-blur-[3px] sm:p-5 lg:max-w-none lg:min-w-[34rem] lg:flex-1"
    >
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-(--tx-cream)/10 pb-4">
        <div>
          <p
            id={`${listId}-heading`}
            className="font-pixel text-[10px] uppercase tracking-[0.22em] text-(--tx-blue)"
          >
            Quick answers
          </p>
          <p className="mt-1.5 text-xs text-(--tx-cream)/50">
            Select a question to explore
          </p>
        </div>
        <span
          aria-hidden="true"
          className="h-2 w-2 rounded-full bg-(--tx-green)"
        />
      </div>

      {orderedQuestions.length === 0 ? (
        <p className="px-1 py-5 text-sm leading-6 text-(--tx-cream)/55">
          More information will be announced soon.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
          <div
            id={listId}
            role="tablist"
            aria-label="TechXetra questions"
            className="flex max-h-36 gap-1.5 overflow-x-auto pb-1 sm:max-h-52 sm:flex-col sm:overflow-y-auto sm:overflow-x-hidden"
          >
            {orderedQuestions.map((question, index) => {
              const isSelected = activeId === question.id;

              return (
                <button
                  key={question.id}
                  ref={(element) => {
                    optionRefs.current[index] = element;
                  }}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={answerId}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => setSelectedId(question.id)}
                  onKeyDown={(event) => handleKeyDown(event, index)}
                  className={`min-w-[13rem] shrink-0 border px-3.5 py-3 text-left text-xs leading-5 transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-(--tx-blue) sm:min-w-0 ${
                    isSelected
                      ? "border-(--tx-blue)/65 bg-(--tx-blue)/12 text-(--tx-cream)"
                      : "border-transparent text-(--tx-cream)/55 hover:border-(--tx-cream)/15 hover:bg-(--tx-cream)/[0.03] hover:text-(--tx-cream)/85"
                  }`}
                >
                  <span className="mr-2 font-pixel text-[9px] text-(--tx-blue)/80">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {question.question}
                </button>
              );
            })}
          </div>

          <div
            id={answerId}
            role="tabpanel"
            aria-live="polite"
            aria-label={selectedQuestion?.question ?? "Answer"}
            className="border-t border-(--tx-cream)/10 px-1 pt-4 sm:min-h-52 sm:border-l sm:border-t-0 sm:px-5 sm:py-2"
          >
            {selectedQuestion ? (
              <>
                <p className="font-pixel text-[9px] uppercase tracking-[0.2em] text-(--tx-green)">
                  {selectedQuestion.category ?? "INFO"}
                </p>
                <p className="mt-3 max-w-md text-sm leading-6 text-(--tx-cream)/80">
                  {selectedQuestion.answer}
                </p>
              </>
            ) : (
              <p className="text-sm leading-6 text-(--tx-cream)/55">
                More information will be announced soon.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
