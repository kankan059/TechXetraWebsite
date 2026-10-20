"use client"
export default function Loading() {
  return (
    <main
      role="status"
      aria-label="Loading page"
      className="relative z-10 flex min-h-[65vh] w-full flex-col items-center justify-center overflow-hidden"
    >
      <div className="relative flex h-24 w-24 items-center justify-center">
        <div className="absolute inset-0 rounded-full border border-cyan-400/10" />

        <div className="absolute inset-1 animate-spin rounded-full border-2 border-transparent border-t-cyan-300 border-r-cyan-500/40 [animation-duration:1.4s]" />

        <div className="absolute inset-3 animate-spin rounded-full border border-transparent border-b-cyan-300/70 [animation-duration:2s] [animation-direction:reverse]" />

        <div className="h-3 w-3 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_20px_5px_rgba(34,211,238,0.45)]" />
      </div>

      <p className="mt-7 text-xs tracking-[0.4em] text-cyan-200/70">
        LOADING
      </p>

      <div className="mt-4 h-px w-32 overflow-hidden bg-white/10">
        <div className="h-full w-1/2 animate-[loading_1.4s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
      </div>

      <style jsx>{`
        @keyframes loading {
          0% {
            transform: translateX(-100%);
          }
          100% {
            transform: translateX(200%);
          }
        }
      `}</style>
    </main>
  );
}
