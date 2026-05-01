"use client";

import { useEffect, useState } from "react";

export interface TimerProps {
  durationSec: number;
  onExpire?: () => void;
  paused?: boolean;
  showWhenLow?: number;
  className?: string;
}

function formatRemaining(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.max(0, sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function Timer({
  durationSec,
  onExpire,
  paused = false,
  showWhenLow = 10,
  className = "",
}: TimerProps): JSX.Element {
  const [remaining, setRemaining] = useState(durationSec);

  useEffect(() => {
    setRemaining(durationSec);
  }, [durationSec]);

  useEffect(() => {
    if (paused) return;
    if (remaining <= 0) {
      onExpire?.();
      return;
    }
    const id = setTimeout(() => setRemaining((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, paused, onExpire]);

  const isLow = remaining <= showWhenLow;
  return (
    <span
      role="timer"
      aria-live="polite"
      className={`font-mono tabular-nums ${isLow ? "text-red-600" : "text-neutral-900"} ${className}`}
    >
      {formatRemaining(remaining)}
    </span>
  );
}
