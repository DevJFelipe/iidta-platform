// ============================================================================
// IMPORTANTE — SOLO LA FASE DIAGNÓSTICA PRODUCE EL PUNTAJE LIKERT.
//
// DIAGNOSTIC: 12 trials de Number Line Estimation (NLE) en rango [0,100], 180s.
// El estudiante ve un número objetivo y arrastra un marcador a la posición que
// cree correcta sobre una línea con extremos rotulados. Mide el sentido
// numérico espacial — predictor robusto de discalculia (Siegler & Booth 2004).
//
// PRACTICE_LEVELS: motivacionales, NO afectan el score Likert. Progresión:
// rango asistido → estándar → magnitud grande → decimales → composite.
// ============================================================================

import type { Dimension, Level } from "@iidta/core/scoring";

export const META = {
  id: "S-DC-01-linea-numerica-espacial",
  level: "secundaria" satisfies Level,
  dimension: "discalculia" satisfies Dimension,
  itemCode: "C1",
  title: "Línea numérica espacial",
  description:
    "Arrastra el marcador a la posición que crees correcta sobre la línea numérica.",
} as const;

/** Configuración de un rango numérico (extremos, decimales, ticks visibles). */
export interface RangeConfig {
  min: number;
  max: number;
  /** 0 = enteros; 1 = decimales (e.g. 0.0–1.0 con un decimal). */
  decimals: number;
  /** Marcas intermedias visibles en la línea (modo asistido). Opcional. */
  ticks?: readonly number[];
  /** Tolerancia para "hit" como fracción del rango: 0.07 = ±7% de (max-min). */
  toleranceFraction: number;
}

export interface NumberLineRound {
  type: "numberLine";
  range: RangeConfig;
  /** Targets pre-secuenciados — comparabilidad entre estudiantes en diagnóstico. */
  trials: readonly number[];
  trialTimeoutMs: number;
}

export interface CompositeRound {
  type: "composite";
  rounds: readonly NumberLineRound[];
}

export type LevelConfig = NumberLineRound | CompositeRound;

/**
 * DIAGNÓSTICO — idéntico para todos los estudiantes:
 * rango [0,100], 12 trials pre-secuenciados por deciles, ±7% tolerancia.
 * 15s por trial × 12 = 180s nominal.
 */
export const DIAGNOSTIC = {
  range: {
    min: 0,
    max: 100,
    decimals: 0,
    toleranceFraction: 0.07,
  } satisfies RangeConfig,
  trials: [7, 14, 23, 38, 47, 53, 61, 72, 83, 89, 95, 99] as readonly number[],
  trialTimeoutMs: 15_000,
  durationSec: 180,
} as const;

export type PracticeLevel = 1 | 2 | 3 | 4 | 5;

export const PRACTICE_LEVELS: Record<PracticeLevel, LevelConfig> = {
  1: {
    type: "numberLine",
    range: {
      min: 0,
      max: 20,
      decimals: 0,
      ticks: [5, 10, 15],
      toleranceFraction: 0.1,
    },
    trials: [3, 7, 11, 14, 17, 19],
    trialTimeoutMs: 18_000,
  },
  2: {
    type: "numberLine",
    range: { min: 0, max: 100, decimals: 0, toleranceFraction: 0.07 },
    trials: [9, 22, 35, 48, 56, 70, 84, 93],
    trialTimeoutMs: 15_000,
  },
  3: {
    type: "numberLine",
    range: { min: 0, max: 1000, decimals: 0, toleranceFraction: 0.07 },
    trials: [73, 240, 380, 510, 627, 740, 850, 950],
    trialTimeoutMs: 15_000,
  },
  4: {
    type: "numberLine",
    range: { min: 0, max: 1, decimals: 1, toleranceFraction: 0.07 },
    trials: [0.1, 0.2, 0.3, 0.4, 0.6, 0.7, 0.8, 0.9],
    trialTimeoutMs: 15_000,
  },
  5: {
    type: "composite",
    rounds: [
      {
        type: "numberLine",
        range: { min: 0, max: 20, decimals: 0, toleranceFraction: 0.07 },
        trials: [4, 11, 17, 19],
        trialTimeoutMs: 14_000,
      },
      {
        type: "numberLine",
        range: { min: 0, max: 100, decimals: 0, toleranceFraction: 0.07 },
        trials: [27, 49, 73, 91],
        trialTimeoutMs: 14_000,
      },
      {
        type: "numberLine",
        range: { min: 0, max: 1000, decimals: 0, toleranceFraction: 0.07 },
        trials: [120, 415, 670, 880],
        trialTimeoutMs: 14_000,
      },
    ],
  },
};

export const PRACTICE_LEVEL_TITLES: Record<PracticeLevel, string> = {
  1: "Misión 1 · Calibración asistida",
  2: "Misión 2 · Rango estándar",
  3: "Misión 3 · Escala mil",
  4: "Misión 4 · Decimales",
  5: "Misión 5 · Protocolo final",
} as const;

/** Paleta — Estación Orbital del Aprendizaje (cian + magenta + slate-900). */
export const PALETTE = {
  primary: 0x06b6d4, // cian
  primaryHex: "#06B6D4",
  primaryDark: "#0E7490",
  accent: 0xd946ef, // magenta
  accentHex: "#D946EF",
  warning: 0xfacc15, // ámbar (near miss)
  bg: "#0F172A",
  bgHex: 0x0f172a,
  surface: 0x1e293b,
  surfaceLight: 0x334155,
  textLight: "#F1F5F9",
  textMuted: "#94A3B8",
  correct: 0x10b981,
  wrong: 0xef4444,
} as const;
