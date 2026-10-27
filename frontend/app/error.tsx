"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-[65vh] flex-col items-center justify-center gap-5 px-6 text-center text-white">
      <h1 className="font-heading text-2xl">Something went wrong</h1>
      <p className="max-w-md text-sm text-white/60">
        This page could not be loaded. Please try again.
      </p>
      <button
        type="button"
        onClick={() => reset()}
        className="rounded-full border border-cyan-300/50 px-5 py-2 text-sm text-cyan-200 transition hover:bg-cyan-300/10"
      >
        Try again
      </button>
    </main>
  );
}
