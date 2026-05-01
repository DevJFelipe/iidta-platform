"use client";

import { useMemo } from "react";
import { ChallengeRunner } from "@iidta/core/engine";
import { findManifest } from "@iidta/core/registry";
import { ensureManifestsRegistered } from "@/lib/registerManifests";

interface RetoRunnerProps {
  manifestId: string;
}

export function RetoRunner({ manifestId }: RetoRunnerProps): JSX.Element {
  // Cliente y servidor tienen registries separados (bundles distintos).
  // Llamamos también acá para garantizar registro client-side.
  ensureManifestsRegistered();

  const manifest = findManifest(manifestId);
  const sessionId = useMemo(
    () => `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    [],
  );

  if (!manifest) {
    return (
      <main className="mx-auto max-w-md p-12 text-center text-neutral-600">
        Reto no disponible.
      </main>
    );
  }

  // TODO PROMPT 4+: studentCode viene del flujo ConsentScreen. Por ahora demo.
  const studentCode = "demo-student";

  return (
    <ChallengeRunner
      manifest={manifest}
      studentCode={studentCode}
      sessionId={sessionId}
      diagnosticMode
      hasConsent
      onResult={(likert, raw) => {
        // El Component del reto maneja el flujo final (DoneScreen).
        // PROMPT 4+ wirea navegación / resumen al ConsentScreen flow.
        console.log("[reto] result", { likert, hits: raw.hits, errors: raw.errors });
      }}
    />
  );
}
