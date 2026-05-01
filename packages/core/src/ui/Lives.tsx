"use client";

export interface LivesProps {
  total: number;
  remaining: number;
  symbol?: string;
  className?: string;
}

export function Lives({ total, remaining, symbol = "♥", className = "" }: LivesProps): JSX.Element {
  const safeRemaining = Math.max(0, Math.min(total, remaining));
  return (
    <span
      role="img"
      aria-label={`${safeRemaining} de ${total} vidas restantes`}
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className={i < safeRemaining ? "text-red-500" : "text-neutral-300"}
        >
          {symbol}
        </span>
      ))}
    </span>
  );
}
