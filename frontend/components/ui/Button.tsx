
import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

type ButtonVariant = "primary" | "outline" | "ghost";
type ButtonSize = "sm" | "md" | "lg";
type ButtonAlign = "left" | "center" | "right";

type ButtonProps = {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  align?: ButtonAlign;
  href?: string;
  className?: string;
  fullWidth?: boolean;
  loading?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

const variants: Record<ButtonVariant, string> = {
  primary:
    "border border-cyan-300 bg-transparent text-cyan-300 hover:border-cyan-200 hover:bg-cyan-300 hover:text-black active:scale-[0.96] active:border-cyan-400 active:bg-cyan-400 active:text-black",

  outline:
    "border border-white/30 bg-transparent text-white hover:border-cyan-300 hover:text-cyan-300 active:scale-[0.96]",

  ghost:
    "border border-transparent bg-transparent text-white/75 hover:bg-white/5 hover:text-white active:scale-[0.96]",
};

const sizes: Record<ButtonSize, string> = {
  sm: "px-4 py-2 text-[10px]",
  md: "px-6 py-3 text-xs",
  lg: "px-8 py-4 text-sm",
};

const alignments: Record<ButtonAlign, string> = {
  left: "mr-auto",
  center: "mx-auto",
  right: "ml-auto",
};

const baseStyles =
  "group inline-flex items-center justify-center gap-3 font-pixel uppercase tracking-wider transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-black disabled:pointer-events-none disabled:opacity-50";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  align = "center",
  href,
  className = "",
  fullWidth = false,
  loading = false,
  disabled = false,
  type = "button",
  ...props
}: ButtonProps) {
  const widthStyle = fullWidth ? "w-full" : "";
  const alignmentStyle = fullWidth ? "" : alignments[align];

  const styles = [
    baseStyles,
    variants[variant],
    sizes[size],
    widthStyle,
    alignmentStyle,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const content = (
    <>
      {loading && (
        <span
          className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      )}

      <span>{children}</span>


    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={`${styles} ${
          disabled || loading ? "pointer-events-none opacity-50" : ""
        }`}
        aria-disabled={disabled || loading || undefined}
        tabIndex={disabled || loading ? -1 : undefined}
      >
        {content}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={styles}
      disabled={disabled || loading}
      {...props}
    >
      {content}
    </button>
  );
}
