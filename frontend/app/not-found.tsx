
import Button from "@/components/ui/Button";

export default function NotFound() {
    return (
        <main className="relative flex min-h-[85vh] w-full items-center justify-center overflow-hidden px-6 py-24 text-center">
            <div className="pointer-events-none absolute left-1/2 top-1/2 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan-500/[0.07] blur-[100px]" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 animate-[spin_24s_linear_infinite] rounded-full border border-cyan-400/10" />

            <div className="pointer-events-none absolute left-1/2 top-1/2 h-48 w-48 -translate-x-1/2 -translate-y-1/2 animate-[spin_16s_linear_infinite_reverse] rounded-full border border-dashed border-cyan-300/20" />

            <div className="relative z-10 flex max-w-2xl flex-col items-center">
                <div className="mb-5 flex items-center gap-3">
                    <span className="h-px w-8 bg-cyan-400/50" />
                    <p className="font-pixel text-xs tracking-[0.35em] text-cyan-300/80">
                        SIGNAL LOST
                    </p>
                    <span className="h-px w-8 bg-cyan-400/50" />
                </div>

                <h1 className="select-none animate-[glitch-shake_3s_ease-in-out_infinite] bg-gradient-to-b from-white via-cyan-100 to-cyan-500/40 bg-clip-text font-autotech text-[clamp(7rem,25vw,15rem)] leading-[0.8] tracking-[-0.09em] text-transparent drop-shadow-[0_0_35px_rgba(34,211,238,0.12)]">
                    404
                </h1>

                <div className="mt-8 flex items-center gap-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(103,232,249,0.8)]" />
                    <p className="font-heading text-xs tracking-[0.25em] text-white/40">
                        UNKNOWN DESTINATION
                    </p>
                </div>

                <h2 className="mt-5 font-hero capitalize text-2xl font-semibold tracking-tight text-white sm:text-4xl">
                    Lost in the <span className="text-cyan-300">digital universe?</span>
                </h2>

                <p className="font-cta  mt-4 max-w-md text-sm leading-7 text-white/50 sm:text-base">
                    Looks like this page drifted into deep space. The destination
                    you&apos;re looking for doesn&apos;t exist or may have moved.
                </p>

                <div className="mt-9">
                    <Button href="/" align="center" variant="primary" size="md">Return to Home</Button>
                </div>

                <p className="mt-8 font-mono text-[10px] tracking-[0.2em] text-white/20">
                    TECHXETRA // EXPLORATION CONTINUES
                </p>
            </div>
        </main>
    );
}
