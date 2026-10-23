
"use client";

import { useLayoutEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { GoogleLogin } from "@react-oauth/google";
import gsap from "gsap";

import LogoTech from "@/components/animations/LogoTech";
import { participantApi } from "@/services/participant-api";

export default function Signup() {
    const router = useRouter();
    const sectionRef = useRef<HTMLElement>(null);
    const logoRef = useRef<HTMLDivElement>(null);

    const logoProgressRef = useRef({ value: 1 });
    const logoOpacityRef = useRef({ value: 1 });

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    useLayoutEffect(() => {
        const section = sectionRef.current;
        const logo = logoRef.current;

        if (!section) return;

        const ctx = gsap.context(() => {
            if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
                return;
            }

            gsap.fromTo(
                section.querySelectorAll(".signup-reveal"),
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

    async function handleGoogleSignup(idToken: string) {
        setLoading(true);
        setError("");
        setNotice("");

        try {
            const result = await participantApi.auth.google(idToken);
            const user = result.user;
            const isComplete = Boolean(user?.profileComplete ?? user?.profile_complete);

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

    async function handleManualSignup(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setNotice("");

        const normalizedEmail = email.trim().toLowerCase();
        const trimmedName = name.trim();

        if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
            setError("Please complete all fields.");
            return;
        }

        if (trimmedName.length < 2 || trimmedName.length > 100) {
            setError("Your name must be between 2 and 100 characters.");
            return;
        }

        if (password.length < 8) {
            setError("Your password must contain at least 8 characters.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Your passwords do not match.");
            return;
        }

        setLoading(true);
        try {
            const result = await participantApi.auth.register({
                name: trimmedName,
                email: normalizedEmail,
                password,
            });
            const user = result.user;
            const isComplete = Boolean(user?.profileComplete ?? user?.profile_complete);

            router.replace(isComplete ? "/dashboard" : "/profile-completion");
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
                {/* Desktop branding */}
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

                    <div className="signup-reveal mx-auto mt-2 w-full max-w-xl">
                        <p className="mb-3 font-autotech text-[clamp(0.65rem,0.75vw,0.8rem)] tracking-[0.2em] text-cyan-300">
                            FOR THE CURIOUS AND THE CREATIVE
                        </p>

                        <h1 className="font-heading text-[clamp(2rem,3.1vw,3.5rem)] leading-[1.08] tracking-tight">
                            Make something
                            <span className="mt-1 block text-cyan-300">extraordinary.</span>
                        </h1>

                        <p className="mt-4 max-w-md text-[clamp(0.85rem,1vw,1rem)] leading-relaxed text-white/60">
                            Join the community, explore new ideas and build something worth
                            sharing.
                        </p>
                    </div>
                </div>

                {/* Signup form */}
                <div className="mx-auto flex w-full max-w-md min-w-0 flex-col overflow-visible lg:max-w-[27rem]">
                    <div className="signup-reveal mb-5 lg:hidden">
                        <p className="mb-2 font-autotech text-[0.65rem] tracking-[0.16em] text-cyan-300 sm:text-xs">
                            FOR THE CURIOUS AND THE CREATIVE
                        </p>

                        <h1 className="font-heading text-3xl leading-tight sm:text-4xl">
                            Your journey
                            <span className="block text-cyan-300">starts here.</span>
                        </h1>
                    </div>

                    <div className="signup-reveal rounded-[1.5rem] border border-cyan-200/15 bg-black/30 p-5 backdrop-blur-xl sm:rounded-[1.75rem] sm:p-8 lg:p-7 xl:p-8">
                        <div className="mb-5 sm:mb-6">
                            <p className="mb-2 font-autotech text-[0.65rem] tracking-[0.18em] text-cyan-300 sm:text-xs">
                                JOIN TECHXETRA
                            </p>

                            <h2 className="font-heading text-3xl leading-tight sm:text-4xl">
                                Create account.
                            </h2>

                            <p className="mt-2 text-sm leading-relaxed text-white/50">
                                Get started with your TechXetra account.
                            </p>
                        </div>

                        <form onSubmit={handleManualSignup} className="space-y-4">
                            <div>
                                <label
                                    htmlFor="signup-name"
                                    className="mb-2 block text-sm text-white/75"
                                >
                                    Full name
                                </label>

                                <input
                                    id="signup-name"
                                    name="name"
                                    type="text"
                                    autoComplete="name"
                                    value={name}
                                    onChange={(event) => setName(event.target.value)}
                                    placeholder="Your full name"
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="signup-email"
                                    className="mb-2 block text-sm text-white/75"
                                >
                                    Email address
                                </label>

                                <input
                                    id="signup-email"
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
                                    htmlFor="signup-password"
                                    className="mb-2 block text-sm text-white/75"
                                >
                                    Password
                                </label>

                                <input
                                    id="signup-password"
                                    name="password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(event) => setPassword(event.target.value)}
                                    placeholder="At least 8 characters"
                                    minLength={8}
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                                />
                            </div>

                            <div>
                                <label
                                    htmlFor="signup-confirm-password"
                                    className="mb-2 block text-sm text-white/75"
                                >
                                    Confirm password
                                </label>

                                <input
                                    id="signup-confirm-password"
                                    name="confirmPassword"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirmPassword}
                                    onChange={(event) => setConfirmPassword(event.target.value)}
                                    placeholder="Re-enter your password"
                                    minLength={8}
                                    required
                                    className="w-full rounded-xl border border-white/10 bg-white/[0.045] px-4 py-3 text-base text-white outline-none transition placeholder:text-white/30 focus:border-cyan-300/70 focus:ring-2 focus:ring-cyan-300/10"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading}
                                className="group flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-300 px-5 py-3 font-medium text-black transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:ring-offset-2 focus:ring-offset-black"
                            >
                                {loading ? "Creating account..." : "Create account"}
                                <span className="transition-transform group-hover:translate-x-1">
                                    →
                                </span>
                            </button>
                        </form>

                        <div className="my-5 flex items-center gap-3">
                            <span className="h-px flex-1 bg-white/10" />
                            <span className="text-[0.65rem] text-white/40 sm:text-xs">
                                OR SIGN UP WITH
                            </span>
                            <span className="h-px flex-1 bg-white/10" />
                        </div>

                        <div className="flex min-h-11 w-full items-center justify-center">
                            {loading ? (
                                <div className="flex items-center gap-3 text-sm text-white/70">
                                    <span className="h-5 w-5 animate-spin rounded-full border-2 border-cyan-300/25 border-t-cyan-300" />
                                    Creating your account...
                                </div>
                            ) : process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
                                <div className="w-full [&>div]:flex [&>div]:justify-center">
                                    <GoogleLogin
                                        onSuccess={(credentialResponse) => {
                                            if (credentialResponse.credential) {
                                                void handleGoogleSignup(credentialResponse.credential);
                                            } else {
                                                setError("Google sign-up could not be completed.");
                                            }
                                        }}
                                        onError={() => {
                                            setError("Google sign-up failed. Please try again.");
                                        }}
                                        text="signup_with"
                                        theme="filled_black"
                                        shape="rectangular"
                                        logo_alignment="left"
                                    />
                                </div>
                            ) : (
                                <div className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2.5 text-center text-xs text-white/50">
                                    Google Sign-Up unavailable (configure NEXT_PUBLIC_GOOGLE_CLIENT_ID)
                                </div>
                            )}
                        </div>

                        {notice && (
                            <p role="status" className="mt-4 rounded-xl border border-cyan-300/20 bg-cyan-300/5 px-4 py-3 text-sm leading-6 text-cyan-100">
                                {notice}
                            </p>
                        )}

                        {error && (
                            <p
                                role="alert"
                                className="mt-4 rounded-xl border border-red-400/20 bg-red-400/5 px-4 py-3 text-sm leading-6 text-red-300"
                            >
                                {error}
                            </p>
                        )}



                        <p className="mt-5 text-center text-sm text-white/55">
                            Already have an account?{" "}
                            <Link
                                href="/login"
                                className="font-medium text-cyan-300 transition hover:text-white"
                            >
                                Sign in
                            </Link>
                        </p>
                    </div>

                    <p className="signup-reveal mt-4 text-center text-xs text-white/35 lg:mt-3">
                        A community built around ideas and possibility.
                    </p>

                    {/* Mobile logo */}
                    <div className="relative mx-auto mt-5 aspect-square w-full max-w-[13rem] shrink-0 overflow-visible sm:mt-7 sm:max-w-[15rem] lg:hidden">
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
