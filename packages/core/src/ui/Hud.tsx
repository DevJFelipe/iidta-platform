"use client";

import type { ReactNode } from "react";

export interface HudProps {
  title?: string;
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export function Hud({ title, left, center, right, className = "" }: HudProps): JSX.Element {
  return (
    <header
      className={`flex w-full items-center justify-between gap-4 border-b border-neutral-200 bg-white/80 px-4 py-3 backdrop-blur ${className}`}
      role="banner"
    >
      <div className="flex items-center gap-3">
        {left}
        {title ? <h2 className="text-base font-medium text-neutral-900">{title}</h2> : null}
      </div>
      <div className="flex items-center gap-3">{center}</div>
      <div className="flex items-center gap-3">{right}</div>
    </header>
  );
}
