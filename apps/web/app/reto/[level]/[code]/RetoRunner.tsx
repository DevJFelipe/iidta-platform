"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { ChallengeRunner } from "@iidta/core/engine";
import { findManifest } from "@iidta/core/registry";
import type { Level } from "@iidta/core/scoring";
import { ConsentScreen, useConsent } from "@iidta/core/consent";
import { ensureManifestsRegistered } from "@/lib/registerManifests";

interface RetoRunnerProps {
  manifestId: string;
  level: Level;
}

export function RetoRunner({ manifestId, level }: RetoRunnerProps): JSX.Element {
  // Cliente y servidor tienen registries separados (bundles distintos).
  // Llamamos también acá para garantizar registro client-side.
  ensureManifestsRegistered();

  const router = useRouter();
  const { state, grant } = useConsent(level);

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

  if (state.status === "loading") {
    return (
      <main className="mx-auto flex min-h-screen max-w-md items-center justify-center bg-[#FAF7F2] p-12 text-center text-neutral-500">
        Cargando…
      </main>
    );
  }

  if (state.status === "needed") {
    return (
      <ConsentScreen
        level={level}
        onGrant={(studentCode, consentVersion) => {
          void grant(studentCode, consentVersion);
        }}
        onDecline={() => router.push("/")}
      />
    );
  }

  return (
    <ChallengeRunner
      manifest={manifest}
      studentCode={state.studentCode}
      sessionId={sessionId}
      diagnosticMode
      hasConsent
      onResult={(likert, raw) => {
        // El Component del reto maneja el flujo final (DoneScreen).
        console.log("[reto] result", { likert, hits: raw.hits, errors: raw.errors });
      }}
    />
  );
}
