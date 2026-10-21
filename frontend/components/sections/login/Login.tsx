
"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import gsap from "gsap";

import LogoTech from "@/components/animations/LogoTech";

type LoginResponse = {
    success: boolean;
    data?: {
        profile_complete: boolean;
    };
    error?: {
        message?: string;
    };
};

export default function Login() {
    const router = useRouter();
    const sectionRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);

    const logoProgressRef = useRef({ value: 1 });
    const logoOpacityRef = useRef({ value: 1 });

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    useLayoutEffect(() => {
        const section = sectionRef.current;
        const logo = logoRef.current;

        if (!section) return;

        const ctx = gsap.context(() => {
            const reducedMotion = window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches;

            if (reducedMotion) return;

            gsap.fromTo(
                section.querySelectorAll(".login-reveal"),
                { autoAlpha: 0, y: 12 },
                {
                    autoAlpha: 1,
                    y: 0,
                    duration: 0.65,
                    stagger: 0.07,
                    ease: "power2.out",
                    delay: 0.1,
                }
            );

            if (logo) {
                gsap.fromTo(
                    logo,
                    { autoAlpha: 0, scale: 0.97 },
                    {
                        autoAlpha: 1,
                        scale: 1,
                        duration: 0.9,
                        ease: "power2.out",
                    }
                );
            }
        }, section);

        return () => ctx.revert();
    }, []);

    async function handleGoogleLogin(idToken: string) {
        setLoading(true);
        setError("");

        try {
            const apiUrl =
                process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";

            const response = await fetch(`${apiUrl}/api/auth/google`, {
                method: "POST",
                credentials: "include",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ id_token: idToken }),
            });

            const result = (await response.json()) as LoginResponse;

            if (!response.ok || !result.success) {
                throw new Error(
                    result.error?.message ?? "Unable to sign in. Please try again."
                );
            }

            router.replace(
                result.data?.profile_complete ? "/dashboard" : "/profile-completion"
            );
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
            const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8787";
            const response = await fetch(`${apiUrl}/api/auth/login`, {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: normalizedEmail, password }),
            });

            const result = (await response.json()) as LoginResponse;
            if (!response.ok || !result.success) {
                throw new Error(result.error?.message ?? "Unable to sign in. Please check your details.");
            }

            router.replace(result.data?.profile_complete ? "/dashboard" : "/profile-completion");
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main
            ref={sectionRef}
            className="relative isolate flex min-h-dvh items-center justify-center overflow-x-clip bg-transparent px-5 pb-6 pt-24 text-white sm:px-8 sm:py-12 lg:px-10 lg:py-8 xl:px-16"
        >
            <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_18%_42%,rgba(0,190,255,0.06),transparent_42%),radial-gradient(ellipse_at_85%_75%,rgba(25,90,255,0.05),transparent_38%)]"
            />

            <Link
                href="/"
                aria-label="TechXetra home"
                className="absolute left-5 top-5 z-20 flex items-center gap-3 sm:left-8 sm:top-7 lg:left-10 lg:top-6"
            >
                <span className="font-heading text-3xl leading-none text-cyan-300">
                    X
                </span>
                <span className="font-autotech text-sm tracking-[0.16em] sm:text-base">
                    TECHXETRA
                </span>
            </Link>

            <section className="relative z-10 mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-7 sm:gap-9 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 xl:gap-16">
                {/* Desktop logo and introduction */}
                <div className="hidden min-w-0 flex-col justify-center lg:flex">
                    <div
                        ref={logoRef}
                        className="relative mx-auto aspect-square w-full max-w-[29rem] overflow-visible xl:max-w-[32rem]"
                    >
                        <div className="relative h-full w-full overflow-visible">
                            <LogoTech
                                progressRef={logoProgressRef}
                                opacityRef={logoOpacityRef}
                            />
                        </div>
                    </div>

                    <div className="login-reveal mx-auto mt-2 w-full max-w-xl">
                        <p className="mb-3 font-autotech text-[clamp(0.65rem,0.75vw,0.8rem)] tracking-[0.2em] text-cyan-300">
                            FOR THE CURIOUS AND THE CREATIVE
                        </p>

                        <h1 className="font-heading text-[clamp(2rem,3.1vw,3.5rem)] leading-[1.08] tracking-tight">
                            Your next big
                            <span className="mt-1 block text-cyan-300">
                                idea starts here.
                            </span>
                        </h1>

                        <p className="mt-4 max-w-md text-[clamp(0.85rem,1vw,1rem)] leading-relaxed text-white/60">
                            A space to explore ideas, meet fellow creators and discover what
                            you can build together.
                        </p>
                    </div>
                </div>

                {/* Login form */}
                <div className="mx-auto flex w-full max-w-md min-w-0 flex-col overflow-visible lg:max-w-[27rem]">
                    <div className="login-reveal mb-5 lg:hidden">
                        <p className="mb-2 font-autotech text-[0.65rem] tracking-[0.16em] text-cyan-300 sm:text-xs">
                            FOR THE CURIOUS AND THE CREATIVE
                        </p>

                        <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
                            Good to have
                            <span className="block text-cyan-300">you here.</span>
                        </h1>
                    </div>

                    <div className="login-reveal rounded-[1.5rem] border border-cyan-200/15 bg-black/30 p-5 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-8 lg:p-7 xl:p-8">
                        <div className="mb-5 sm:mb-6">
                            <p className="mb-2 font-autotech text-[0.65rem] tracking-[0.18em] text-cyan-300 sm:text-xs">
                                WELCOME TO TECHXETRA
                            </p>

                            <h2 className="font-heading text-3xl leading-tight sm:text-4xl">
                                Let’s get started.
                            </h2>
                        </div>

                        <form onSubmit={handleManualLogin} className="space-y-4">
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
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
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
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-medium text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-black"
                            >
                                {loading ? "Signing in..." : "Sign in"}
                                <span className="transition-transform group-hover:translate-x-1">
                                    →
                                </span>
                            </button>
                        </form>

                        <div className="my-5 flex items-center gap-3">
                            <span className="h-px flex-1 bg-white/10" />
                            <span className="text-[0.65rem] text-white/40 sm:text-xs">
                                OR CONTINUE WITH
                            </span>
                            <span className="h-px flex-1 bg-white/10" />
                        </div>

                        <div className="flex min-h-11 w-full items-center justify-center">
                            {loading ? (
                                <div className="flex items-center gap-3 text-sm text-white/70">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
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
                                <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center text-xs text-white/50">
                                    Google Sign-In unavailable (configure NEXT_PUBLIC_GOOGLE_CLIENT_ID)
                                </div>
                            )}
                        </div>

                        {error && (
                            <p
                                role="alert"
                                className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm leading-6 text-red-300"
                            >
                                {error}
                            </p>
                        )}



                        <p className="mt-5 text-center text-sm text-white/55">
                            New to TechXetra?{" "}
                            <Link
                                href="/signup"
                                className="font-medium text-cyan-300 transition hover:text-white"
                            >
                                Create an account
                            </Link>
                        </p>
                    </div>

                    <p className="login-reveal mt-4 text-center text-xs text-white/35 lg:mt-3">
                        A community built around ideas and possibility.
                    </p>

                    {/* Mobile logo: responsive sizing, no fixed height */}
                    <div className="relative mx-auto mt-5 aspect-square w-full max-w-[20rem] shrink-0 overflow-visible sm:mt-7 sm:max-w-[25rem] lg:hidden">
                        <div className="absolute inset-0 overflow-visible">
                            <LogoTech
                                progressRef={logoProgressRef}
                                opacityRef={logoOpacityRef}
                            />
                        </div>
                    </div>
                </div>
            </section>
        </main>
    );
}
