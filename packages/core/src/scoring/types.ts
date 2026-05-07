import type { ComponentType } from "react";

export type Level = "primaria" | "secundaria" | "media";

export type Dimension = "dislexia" | "discalculia" | "tdah";

export type LikertScore = 0 | 1 | 2 | 3;

export const LIKERT_LABELS: Record<LikertScore, string> = {
  0: "Nunca",
  1: "A veces",
  2: "Frecuente",
  3: "Siempre",
};

export interface NormStats {
  itemCode: string;
  mean: number;
  stdDev: number;
  n: number;
  source: "pilot" | "calibrated" | "provisional";
}

export interface ChallengeRawResult {
  challengeId: string;
  studentCode: string;
  sessionId: string;
  startedAt: number;
  endedAt: number;
  hits: number;
  errors: number;
  attempts: number;
  responseTimes: number[];
  studentFeedback?: {
    difficulty: 1 | 2 | 3 | 4 | 5;
    enjoyment: 1 | 2 | 3 | 4 | 5;
  };
  metadata?: Record<string, unknown>;
}

export type LikertRubric = (raw: ChallengeRawResult) => LikertScore;

export interface ChallengeComponentProps {
  manifest: ChallengeManifest;
  studentCode: string;
  sessionId: string;
  diagnosticMode: boolean;
  onComplete: (raw: ChallengeRawResult) => void;
  onTelemetry?: (event: TelemetryEvent) => void;
}

export interface ChallengeManifest {
  id: string;
  level: Level;
  dimension: Dimension;
  /** Ítem primario del instrumento (back-compat). Para retos multi-ítem usar también `itemCodes`. */
  itemCode: string;
  /**
   * Lista completa de ítems del instrumento que el reto cubre.
   * Si se omite, se asume `[itemCode]`. Algunos retos cubren 2-3 ítems
   * (e.g. C1 + C3 en Línea numérica espacial).
   */
  itemCodes?: readonly string[];
  title: string;
  description?: string;
  diagnosticDuration: number;
  practiceLevels: number;
  rubric: LikertRubric;
  Component: ComponentType<ChallengeComponentProps>;
  assetsManifest: string[];
}

export type TelemetryEventType =
  | "challenge_started"
  | "challenge_ended"
  | "phase_changed"
  | "user_response"
  | "user_input"
  | "asset_loaded"
  | "consent_granted"
  | "error";

export interface TelemetryEvent {
  type: TelemetryEventType;
  challengeId: string;
  studentCode: string;
  sessionId: string;
  ts: number;
  data?: Record<string, unknown>;
}
