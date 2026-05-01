"use client";

import type { ReactNode } from "react";

export type FeedbackVariant = "correct" | "incorrect" | "info" | "neutral";

export interface FeedbackProps {
  variant?: FeedbackVariant;
  title?: string;
  children?: ReactNode;
  className?: string;
}

const VARIANT_STYLES: Record<FeedbackVariant, string> = {
  correct: "bg-emerald-50 text-emerald-900 border-emerald-200",
  incorrect: "bg-red-50 text-red-900 border-red-200",
  info: "bg-sky-50 text-sky-900 border-sky-200",
  neutral: "bg-neutral-50 text-neutral-900 border-neutral-200",
};

export function Feedback({
  variant = "neutral",
  title,
  children,
  className = "",
}: FeedbackProps): JSX.Element {
  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-md border p-4 ${VARIANT_STYLES[variant]} ${className}`}
    >
      {title ? <h3 className="mb-1 text-sm font-semibold">{title}</h3> : null}
      {children ? <div className="text-sm">{children}</div> : null}
    </div>
  );
}
