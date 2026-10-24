
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
    : "";

  const listId = useId();
  const optionRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number
  ) => {
    if (!orderedQuestions.length) return;

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
    setSelectedId(orderedQuestions[nextIndex].id);
    optionRefs.current[nextIndex]?.focus();
  };

  return (
    <section
      aria-label="Frequently asked questions"
      className="relative isolate w-full overflow-hidden text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-400/[0.08] blur-[110px] sm:h-96 sm:w-96" />
        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-600/[0.09] blur-[100px]" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(125,211,252,0.018)_1px,transparent_1px),linear-gradient(90deg,rgba(125,211,252,0.018)_1px,transparent_1px)] bg-[size:36px_36px] sm:bg-[size:44px_44px]" />
      </div>

      <div className="mx-auto w-full max-w-screen-2xl px-4 py-12 sm:px-6 sm:py-16 md:px-8 md:py-20 lg:px-12 lg:py-24 xl:px-16">
        <div className="mb-8 max-w-3xl sm:mb-12 lg:mb-14">
          <p className="mb-4 font-pixel text-[9px] uppercase tracking-[0.2em] text-cyan-300 sm:text-[10px]">
            FAQ
          </p>

          <h2 className="font-hero text-[clamp(2.5rem,7vw,6rem)] uppercase leading-[0.92] tracking-tight text-white">
            Got questions
            <span className="text-cyan-300">?</span>
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300/65 sm:mt-6 sm:text-base sm:leading-8">
            Everything you need to know before stepping into the TechXetra
            experience.
          </p>
        </div>

        {orderedQuestions.length === 0 ? (
          <p className="border-t border-white/10 py-8 text-sm text-white/50">
            More information will be announced soon.
          </p>
        ) : (
          <div
            id={listId}
            role="tablist"
            aria-label="TechXetra questions"
            aria-orientation="vertical"
            className="border-t border-cyan-200/20"
          >
            {orderedQuestions.map((question, index) => {
              const isSelected = activeId === question.id;
              const panelId = `${listId}-answer-${index}`;

              return (
                <div
                  key={question.id}
                  className={`relative border-b transition-colors duration-300 ${
                    isSelected
                      ? "border-cyan-300/30 bg-cyan-300/[0.035]"
                      : "border-white/10"
                  }`}
                >
                  <button
                    ref={(element) => {
                      optionRefs.current[index] = element;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isSelected}
                    aria-controls={panelId}
                    tabIndex={isSelected ? 0 : -1}
                    onClick={() =>
                      setSelectedId(isSelected ? "" : question.id)
                    }
                    onKeyDown={(event) => handleKeyDown(event, index)}
                    className="group relative flex w-full items-center justify-between gap-4 px-4 py-5 text-left outline-none transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300 sm:gap-6 sm:px-6 sm:py-6 md:px-8 md:py-7 lg:px-10"
                  >
                    <span
                      aria-hidden="true"
                      className={`absolute bottom-0 left-0 h-px transition-all duration-500 ${
                        isSelected
                          ? "w-full bg-gradient-to-r from-cyan-300 via-blue-400/60 to-transparent"
                          : "w-0 bg-cyan-300/50 group-hover:w-full"
                      }`}
                    />

                    <span
                      className={`min-w-0 flex-1 text-sm leading-6 transition-colors sm:text-base sm:leading-7 md:text-lg ${
                        isSelected
                          ? "text-white"
                          : "text-white/60 group-hover:text-white"
                      }`}
                    >
                      {question.question}
                    </span>

                    <span
                      aria-hidden="true"
                      className={`flex size-8 shrink-0 items-center justify-center border transition-all duration-300 sm:size-9 ${
                        isSelected
                          ? "rotate-45 border-cyan-300/60 bg-cyan-300/10 text-cyan-200"
                          : "border-white/15 text-white/50 group-hover:border-cyan-300/50 group-hover:text-cyan-200"
                      }`}
                    >
                      <span className="text-xl leading-none">+</span>
                    </span>
                  </button>

                  {isSelected && (
                    <div
                      id={panelId}
                      role="tabpanel"
                      aria-label={question.question}
                      className="animate-in fade-in duration-300 border-t border-cyan-300/10 bg-gradient-to-br from-cyan-300/[0.07] via-blue-500/[0.025] to-transparent px-4 pb-7 pt-5 sm:px-6 sm:pb-9 sm:pt-6 md:px-8 lg:px-10"
                    >
                      <div className="max-w-4xl border-l-2 border-cyan-300/70 pl-4 sm:pl-6 md:pl-7">
                        <p className="font-pixel text-[9px] uppercase tracking-[0.18em] text-cyan-300">
                          {question.category ?? "INFORMATION"}
                        </p>

                        <h3 className="mt-4 break-words font-heading text-lg leading-snug text-white sm:mt-5 sm:text-xl md:text-2xl">
                          {question.question}
                        </h3>

                        <div className="my-4 h-px w-full bg-gradient-to-r from-cyan-300/60 via-blue-400/20 to-transparent sm:my-5" />

                        <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-200/70 sm:text-base sm:leading-8">
                          {question.answer}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
