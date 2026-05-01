"use client";

import { useCallback, useMemo } from "react";
import type {
  ChallengeManifest,
  ChallengeRawResult,
  LikertScore,
  TelemetryEvent,
} from "../scoring/types";

export interface ChallengeRunnerProps {
  manifest: ChallengeManifest;
  studentCode: string;
  sessionId: string;
  diagnosticMode?: boolean;
  hasConsent?: boolean;
  onResult: (likert: LikertScore, raw: ChallengeRawResult) => void;
  onTelemetry?: (event: TelemetryEvent) => void;
  onConsentRequired?: () => void;
}

export function ChallengeRunner({
  manifest,
  studentCode,
  sessionId,
  diagnosticMode = true,
  hasConsent = false,
  onResult,
  onTelemetry,
  onConsentRequired,
}: ChallengeRunnerProps): JSX.Element {
  const Component = manifest.Component;

  const handleComplete = useCallback(
    (raw: ChallengeRawResult) => {
      const likert = manifest.rubric(raw);
      onResult(likert, raw);
    },
    [manifest, onResult],
  );

  const componentProps = useMemo(
    () => ({
      manifest,
      studentCode,
      sessionId,
      diagnosticMode,
      onComplete: handleComplete,
      onTelemetry,
    }),
    [manifest, studentCode, sessionId, diagnosticMode, handleComplete, onTelemetry],
  );

  if (!hasConsent) {
    if (onConsentRequired) onConsentRequired();
    return (
      <div role="alert" className="p-4 text-sm text-neutral-600">
        Consentimiento requerido para iniciar el reto.
      </div>
    );
  }

  return <Component {...componentProps} />;
}
