// components/ui/Star.tsx

type StarProps = {
  size?: string;
  className?: string;
};

export default function Star({
  size = "0.75rem",
  className = "",
}: StarProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0  ${className} `}
      style={{
        width: size,
        height: size,
        clipPath:
          "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)",
      }}
    />
  );
}