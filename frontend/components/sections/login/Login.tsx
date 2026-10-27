
"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";

import { participantApi } from "@/services/participant-api";
import LogoStatic from "@/components/animations/LogoStatic";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin(idToken: string) {
    setLoading(true);
    setError("");

    try {
      const result = await participantApi.auth.google(idToken);
      const user = result.user;
      const isComplete = Boolean(
        user?.profileComplete ?? user?.profile_complete
      );

      router.replace(isComplete ? "/dashboard" : "/profile-completion");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleManualLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter your email address and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await participantApi.auth.login({
        email: normalizedEmail,
        password,
      });

      const user = result.user;
      const isComplete = Boolean(
        user?.profileComplete ?? user?.profile_complete
      );

      router.replace(isComplete ? "/dashboard" : "/profile-completion");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative isolate min-h-dvh overflow-x-clip px-4 pb-8 pt-20 text-white sm:px-6 sm:pb-10 sm:pt-24 lg:px-10 lg:py-10 xl:px-16">
      <Link
        href="/"
        className="group fixed left-4 top-4 z-50 inline-flex min-h-10 items-center gap-2 border border-white/10 bg-transparent px-3 py-2 text-xs text-white/70 backdrop-blur-md transition-colors hover:border-cyan-300/40 hover:text-cyan-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300 sm:left-6 sm:top-6 sm:px-4 sm:text-sm lg:left-8 lg:top-8"
      >
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          fill="none"
          className="size-4 transition-transform duration-200 group-hover:-translate-x-1"
        >
          <path
            d="M19 12H5M12 19l-7-7 7-7"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>

        <span>Back to Home</span>
      </Link>

      <section className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-8 sm:gap-10 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:gap-12 xl:gap-16">
        <div className="order-2 flex min-w-0 flex-col items-center justify-center lg:order-1 lg:items-start">
          <div className="relative aspect-square w-full max-w-[19rem] sm:max-w-[23rem] lg:max-w-[27rem] xl:max-w-[31rem]">
            <LogoStatic />
          </div>

          <div className="hidden w-full max-w-xl lg:block">
            <p className="mb-3 font-autotech text-xs tracking-[0.2em] text-cyan-300 xl:text-sm">
              FOR THE CURIOUS AND THE CREATIVE
            </p>

            <h1 className="font-heading text-4xl leading-[1.08] tracking-tight xl:text-5xl">
              Your next big
              <span className="mt-1 block text-cyan-300">
                idea starts here.
              </span>
            </h1>

            <p className="mt-4 max-w-md text-base leading-7 text-white/55">
              A space to explore ideas, meet fellow creators and discover
              what you can build together.
            </p>
          </div>
        </div>

        <div className="order-1 mx-auto flex w-full max-w-md min-w-0 flex-col lg:order-2 lg:max-w-[27rem]">
          <div className="mb-6 lg:hidden">
            <p className="mb-2 font-autotech text-[10px] tracking-[0.17em] text-cyan-300 sm:text-xs">
              FOR THE CURIOUS AND THE CREATIVE
            </p>

            <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
              Good to have
              <span className="block text-cyan-300">you here.</span>
            </h1>
          </div>

          <div className="rounded-2xl border border-cyan-200/15 bg-transparent p-5 sm:rounded-3xl sm:p-7 md:p-8 lg:p-7 xl:p-8">
            <div className="mb-6">
              <p className="mb-2 font-autotech text-[10px] tracking-[0.18em] text-cyan-300 sm:text-xs">
                WELCOME TO TECHXETRA
              </p>

              <h2 className="font-heading text-3xl leading-tight sm:text-4xl">
                Let’s get started.
              </h2>
            </div>

            <form onSubmit={handleManualLogin} className="space-y-5">
              <div>
                <label
                  htmlFor="login-email"
                  className="mb-2 block text-sm text-white/75"
                >
                  Email address
                </label>

                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                />
              </div>

              <div>
                <label
                  htmlFor="login-password"
                  className="mb-2 block text-sm text-white/75"
                >
                  Password
                </label>

                <input
                  id="login-password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-base text-white outline-none transition-colors placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="group flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-medium text-black transition-colors hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-200"
              >
                {loading ? "Signing in..." : "Sign in"}

                <span className="transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
            </form>

            <div className="my-6 flex items-center gap-3">
              <span className="h-px flex-1 bg-white/10" />

              <span className="whitespace-nowrap text-[10px] text-white/40 sm:text-xs">
                OR CONTINUE WITH
              </span>

              <span className="h-px flex-1 bg-white/10" />
            </div>

            <div className="flex min-h-11 w-full items-center justify-center">
              {loading ? (
                <div className="flex items-center gap-3 text-sm text-white/70">
                  <span className="size-5 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
                  Signing you in...
                </div>
              ) : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                <div className="w-full [&>div]:flex [&>div]:justify-center">
                  <GoogleLogin
                    onSuccess={(credentialResponse) => {
                      if (credentialResponse.credential) {
                        void handleGoogleLogin(credentialResponse.credential);
                      } else {
                        setError("Google sign-in could not be completed.");
                      }
                    }}
                    onError={() => {
                      setError("Google sign-in failed. Please try again.");
                    }}
                    text="continue_with"
                    theme="filled_black"
                    shape="rectangular"
                    logo_alignment="left"
                  />
                </div>
              ) : (
                <div className="w-full rounded-xl border border-white/10 bg-transparent px-4 py-3 text-center text-xs text-white/50">
                  Google Sign-In unavailable. Please try again later.
                </div>
              )}
            </div>

            {error && (
              <p
                role="alert"
                className="mt-4 break-words rounded-xl border border-red-400/20 bg-transparent px-4 py-3 text-sm leading-6 text-red-300"
              >
                {error}
              </p>
            )}

            <p className="mt-6 text-center text-sm text-white/55">
              New to TechXetra?{" "}
              <Link
                href="/signup"
                className="font-medium text-cyan-300 transition-colors hover:text-white"
              >
                Create an account
              </Link>
            </p>
          </div>

          <p className="mt-4 text-center text-xs leading-5 text-white/35">
            A community built around ideas and possibility.
          </p>
        </div>
      </section>
    </main>
  );
}
