
"use client";

import { useId, useMemo, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { HeroQuestion } from "@/data/info/hero-qa";

type HeroQAProps = {
  questions: HeroQuestion[];
};

function Constellation({
  className = "",
  variant = 0,
}: {
  className?: string;
  variant?: number;
}) {
  const paths = [
    <>
      <path d="M20 145 L75 95 L130 120 L175 55 L235 82 L280 25" />
      <path d="M75 95 L90 35 L175 55" />
      <path d="M130 120 L155 185 L235 82" />
      <path d="M175 55 L205 15" />
    </>,
    <>
      <path d="M25 45 L85 90 L140 55 L190 115 L260 75" />
      <path d="M85 90 L95 155 L190 115" />
      <path d="M140 55 L160 15" />
      <path d="M190 115 L220 175 L275 150" />
    </>,
    <>
      <path d="M30 110 L80 60 L135 100 L195 35 L255 90" />
      <path d="M80 60 L105 15" />
      <path d="M135 100 L155 165 L220 145 L255 90" />
    </>,
  ];

  const stars = [
    [
      [20, 145], [75, 95], [130, 120], [175, 55],
      [235, 82], [280, 25], [90, 35], [155, 185], [205, 15],
    ],
    [
      [25, 45], [85, 90], [140, 55], [190, 115],
      [260, 75], [95, 155], [160, 15], [220, 175], [275, 150],
    ],
    [
      [30, 110], [80, 60], [135, 100], [195, 35],
      [255, 90], [105, 15], [155, 165], [220, 145],
    ],
  ];

  const points = stars[variant % stars.length];

  return (
    <svg
      viewBox="0 0 300 210"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none ${className}`}
    >
      <g
        stroke="#77DFFF"
        strokeWidth="0.85"
        strokeOpacity="0.48"
        className="faq-constellation-lines"
      >
        {paths[variant % paths.length]}
      </g>

      <g fill="#B8F1FF">
        {points.map(([x, y], index) => (
          <circle
            key={`${x}-${y}`}
            cx={x}
            cy={y}
            r={index % 3 === 0 ? 2.5 : 1.7}
            className="faq-star"
            style={{ animationDelay: `${index * 0.22}s` }}
          />
        ))}
      </g>

      <g fill="#55DFFF">
        {points
          .filter((_, index) => index % 3 === 0)
          .map(([x, y], index) => (
            <circle
              key={`${x}-${y}-glow`}
              cx={x}
              cy={y}
              r="8"
              opacity="0.13"
              className="faq-star-glow"
              style={{ animationDelay: `${index * 0.35}s` }}
            />
          ))}
      </g>
    </svg>
  );
}

function AnswerConstellation() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      <div className="faq-answer-glow absolute right-[-70px] top-[-100px] h-64 w-64 rounded-full" />

      <Constellation
        variant={1}
        className="absolute -right-12 top-0 w-[210px] opacity-35 sm:-right-8 sm:w-[270px] md:w-[310px]"
      />

      <Constellation
        variant={2}
        className="absolute -bottom-16 -left-20 w-[190px] rotate-180 opacity-25 sm:w-[250px] md:w-[280px]"
      />

      <div className="absolute right-[22%] top-[24%] size-1 rounded-full bg-cyan-200 shadow-[0_0_12px_3px_rgba(85,223,255,0.45)]" />
      <div className="absolute bottom-[22%] right-[12%] size-1 rounded-full bg-cyan-200 shadow-[0_0_12px_3px_rgba(85,223,255,0.35)]" />
    </div>
  );
}

function AnswerContent({
  question,
  index,
}: {
  question: HeroQuestion;
  index: number;
}) {
  return (
    <>
      <AnswerConstellation />

      <div className="relative z-10 max-w-2xl">
        <div className="mb-7 flex items-center gap-3 sm:mb-9">
          <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_12px_3px_rgba(85,223,255,0.4)]" />

        

          <span className="h-px w-12 bg-gradient-to-r from-cyan-300/60 to-transparent sm:w-20" />
        </div>

        <p className="mb-3 font-pixel text-[9px] tracking-[0.18em] text-white/35">
          {String(index + 1).padStart(2, "0")}
        </p>

        <h3 className="break-words font-heading text-xl leading-snug text-white sm:text-2xl md:text-3xl">
          {question.question}
        </h3>

        <div className="my-5 h-px w-full bg-gradient-to-r from-cyan-300/50 via-blue-400/20 to-transparent sm:my-7" />

        <p className="whitespace-pre-line break-words text-sm leading-7 text-slate-200/75 sm:text-base sm:leading-8">
          {question.answer}
        </p>
      </div>
    </>
  );
}

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

  const activeQuestionIndex = orderedQuestions.findIndex(
    (question) => question.id === activeId
  );

  const activeQuestion =
    activeQuestionIndex >= 0
      ? orderedQuestions[activeQuestionIndex]
      : null;

  return (
    <section
      aria-label="Frequently asked questions"
      className="hero-qa relative isolate w-full overflow-hidden bg-black text-white"
    >
      <style>{`
        .hero-qa {
          --faq-cyan: #77DFFF;
          --faq-blue: #173B50;
        }

        .hero-qa .faq-star {
          animation: faqTwinkle 3.5s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }

        .hero-qa .faq-star-glow {
          animation: faqGlow 4s ease-in-out infinite;
        }

        .hero-qa .faq-constellation-lines {
          stroke-dasharray: 260;
          stroke-dashoffset: 0;
          animation: faqLineFlow 12s linear infinite;
        }

        .hero-qa .faq-answer-glow {
          background: radial-gradient(
            circle,
            rgba(40, 151, 190, 0.14),
            rgba(15, 65, 95, 0.06) 42%,
            transparent 72%
          );
          filter: blur(16px);
        }

        .hero-qa .faq-answer-panel {
          animation: faqPanelIn 0.45s cubic-bezier(.2,.7,.2,1) both;
        }

        .hero-qa .faq-active-line {
          animation: faqLineIn 0.55s ease-out both;
        }

        .hero-qa .faq-question-number {
          font-variant-numeric: tabular-nums;
          transition: color 0.3s ease;
        }

        @keyframes faqTwinkle {
          0%, 100% {
            opacity: 0.48;
            transform: scale(0.8);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }

        @keyframes faqGlow {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.9; }
        }

        @keyframes faqLineFlow {
          0% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: -520; }
        }

        @keyframes faqPanelIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes faqLineIn {
          from {
            transform: scaleX(0);
            transform-origin: left;
          }
          to {
            transform: scaleX(1);
            transform-origin: left;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .hero-qa .faq-star,
          .hero-qa .faq-star-glow,
          .hero-qa .faq-constellation-lines,
          .hero-qa .faq-answer-panel,
          .hero-qa .faq-active-line {
            animation: none;
          }
        }
      `}</style>

      {/* SPACE BACKGROUND */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <div className="absolute inset-0 bg-black" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_48%,#102838_0%,#091823_32%,#040B11_65%,#000000_100%)]" />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_18%_28%,rgba(25,115,150,0.12)_0%,transparent_43%),radial-gradient(ellipse_at_85%_75%,rgba(35,85,135,0.10)_0%,transparent_45%)]" />

        <div
          className="absolute inset-0 opacity-[0.055]"
          style={{
            backgroundImage:
              "radial-gradient(rgba(180,220,235,0.8) 0.65px, transparent 0.65px)",
            backgroundSize: "6px 6px",
          }}
        />

        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_10%,rgba(0,0,0,0.35)_65%,#000000_100%)]" />

        {/* Black transitions */}
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black via-black/70 to-transparent sm:h-36" />
        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black via-black/65 to-transparent sm:h-36" />
      </div>

      {/* BACKGROUND CONSTELLATIONS */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      >
        <Constellation
          variant={0}
          className="absolute -right-20 top-[4%] w-[230px] opacity-35 sm:-right-12 sm:w-[300px] md:w-[370px] lg:w-[410px]"
        />

        <Constellation
          variant={1}
          className="absolute -left-24 top-[30%] w-[230px] -rotate-12 opacity-30 sm:-left-16 sm:w-[290px] md:w-[340px]"
        />

        <Constellation
          variant={2}
          className="absolute -bottom-16 right-[-75px] w-[240px] rotate-12 opacity-35 sm:w-[310px] md:w-[360px]"
        />

        <Constellation
          variant={0}
          className="absolute bottom-[5%] left-[18%] hidden w-[210px] rotate-180 opacity-20 lg:block"
        />

        <div className="absolute left-[16%] top-[20%] size-1 rounded-full bg-cyan-100/70 shadow-[0_0_12px_3px_rgba(85,223,255,0.35)]" />
        <div className="absolute right-[28%] top-[13%] size-1 rounded-full bg-cyan-100/60 shadow-[0_0_10px_2px_rgba(85,223,255,0.3)]" />
        <div className="absolute left-[42%] top-[43%] size-1 rounded-full bg-cyan-100/50 shadow-[0_0_10px_2px_rgba(85,223,255,0.3)]" />
        <div className="absolute bottom-[20%] right-[16%] size-1 rounded-full bg-cyan-100/60 shadow-[0_0_10px_2px_rgba(85,223,255,0.3)]" />
      </div>

      {/* CONTENT */}
      <div className="relative z-10 mx-auto w-full max-w-screen-2xl px-4 py-16 sm:px-6 sm:py-20 md:px-8 md:py-24 lg:px-12 lg:py-28 xl:px-16">
        {/* HEADING */}
        <header className="mb-10 max-w-3xl sm:mb-14 lg:mb-16">
          <div className="mb-5 flex items-center gap-3">
            <span className="size-2 rounded-full bg-cyan-300 shadow-[0_0_12px_3px_rgba(85,223,255,0.4)]" />

            <span className="font-pixel text-[9px] uppercase tracking-[0.25em] text-cyan-200/75 sm:text-[10px]">
              FAQ / KNOW BEFORE YOU GO
            </span>

            <span className="h-px w-12 bg-gradient-to-r from-cyan-300/60 to-transparent sm:w-20" />
          </div>

          <h2 className="font-roboto text-[clamp(2.5rem,7vw,6rem)] uppercase leading-[0.92] tracking-tight text-white">
            Got questions
            <span className="text-cyan-300">?</span>
          </h2>

          <p className="mt-5 max-w-xl text-sm leading-7 text-slate-300/65 sm:mt-6 sm:text-base sm:leading-8">
            Everything you need to know before stepping into the TechXetra
            experience.
          </p>
        </header>

        {orderedQuestions.length === 0 ? (
          <p className="border-t border-white/10 py-8 text-sm text-white/50">
            More information will be announced soon.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:gap-12 xl:gap-16">
            {/* QUESTION LIST */}
            <div
              id={listId}
              role="tablist"
              aria-label="TechXetra questions"
              aria-orientation="vertical"
              className="relative border-t border-cyan-200/20"
            >
              {orderedQuestions.map((question, index) => {
                const isSelected = activeId === question.id;
                const mobilePanelId = `${listId}-mobile-answer-${index}`;

                return (
                  <div
                    key={question.id}
                    className={`relative border-b transition-all duration-300 ${
                      isSelected
                        ? "border-cyan-300/30 bg-cyan-300/[0.045]"
                        : "border-white/10 hover:bg-white/[0.025]"
                    }`}
                  >
                    {isSelected && (
                      <span className="faq-active-line absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-cyan-300 via-blue-400/60 to-transparent" />
                    )}

                    <button
                      ref={(element) => {
                        optionRefs.current[index] = element;
                      }}
                      type="button"
                      role="tab"
                      aria-selected={isSelected}
                      aria-controls={mobilePanelId}
                      tabIndex={isSelected ? 0 : -1}
                      onClick={() =>
                        setSelectedId(isSelected ? "" : question.id)
                      }
                      onKeyDown={(event) => handleKeyDown(event, index)}
                      className="group flex w-full items-center gap-4 px-3 py-5 text-left outline-none transition-colors duration-300 focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-cyan-300 sm:gap-5 sm:px-5 sm:py-6 md:py-7"
                    >
                      <span
                        className={`faq-question-number w-7 shrink-0 font-pixel text-[9px] sm:text-[10px] ${
                          isSelected
                            ? "text-cyan-200"
                            : "text-white/25 group-hover:text-cyan-200/70"
                        }`}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>

                      <span
                        className={`min-w-0 flex-1 text-sm leading-6 transition-colors sm:text-base sm:leading-7 md:text-lg ${
                          isSelected
                            ? "text-white"
                            : "text-white/60 group-hover:text-white/90"
                        }`}
                      >
                        {question.question}
                      </span>

                      <span
                        aria-hidden="true"
                        className={`flex size-8 shrink-0 items-center justify-center border transition-all duration-300 sm:size-9 ${
                          isSelected
                            ? "rotate-45 border-cyan-300/60 bg-cyan-300/10 text-cyan-200"
                            : "border-white/15 text-white/45 group-hover:border-cyan-300/50 group-hover:text-cyan-200"
                        }`}
                      >
                        <span className="text-xl leading-none">+</span>
                      </span>
                    </button>

                    {/* MOBILE INLINE ANSWER */}
                    {isSelected && (
                      <div
                        id={mobilePanelId}
                        role="tabpanel"
                        aria-label={question.question}
                        className="faq-answer-panel relative overflow-hidden border-t border-cyan-300/15 bg-gradient-to-br from-[#10232D]/90 via-[#09141D]/95 to-[#05090F] px-4 py-6 sm:px-6 lg:hidden"
                      >
                        <AnswerContent
                          question={question}
                          index={index}
                        />

                        <span className="pointer-events-none absolute left-0 top-0 h-3 w-3 border-l border-t border-cyan-300/40" />
                        <span className="pointer-events-none absolute bottom-0 right-0 h-3 w-3 border-b border-r border-cyan-300/40" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* DESKTOP ANSWER PANEL */}
            <div
              className="relative hidden min-h-[390px] overflow-hidden rounded-sm border border-cyan-200/15 bg-gradient-to-br from-[#10232D]/80 via-[#09141D]/90 to-[#05090F]/95 shadow-[0_20px_70px_rgba(0,0,0,0.35)] lg:block"
            >
              {activeQuestion ? (
                <div
                  key={activeQuestion.id}
                  role="tabpanel"
                  aria-label={activeQuestion.question}
                  className="faq-answer-panel relative flex min-h-[390px] flex-col justify-center p-8 xl:p-12"
                >
                  <AnswerContent
                    question={activeQuestion}
                    index={activeQuestionIndex}
                  />

                  <span className="pointer-events-none absolute left-0 top-0 h-4 w-4 border-l border-t border-cyan-300/40" />
                  <span className="pointer-events-none absolute right-0 top-0 h-4 w-4 border-r border-t border-cyan-300/40" />
                  <span className="pointer-events-none absolute bottom-0 left-0 h-4 w-4 border-b border-l border-cyan-300/40" />
                  <span className="pointer-events-none absolute bottom-0 right-0 h-4 w-4 border-b border-r border-cyan-300/40" />
                </div>
              ) : (
                <div className="relative flex min-h-[390px] flex-col items-center justify-center p-8 text-center">
                  <AnswerConstellation />

                  <div className="relative z-10">
                    <span className="font-pixel text-[10px] tracking-[0.25em] text-cyan-200/70">
                      DO YOU HAVE ANY DOUBT?
                    </span>

                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* FOOTER DETAIL */}
        
      </div>
    </section>
  );
}
