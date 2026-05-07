// ============================================================================
// IMPORTANTE — SOLO LA FASE DIAGNÓSTICA PRODUCE EL PUNTAJE LIKERT.
//
// DIAGNOSTIC: paradigma Go/No-Go clásico, idéntico para todos los estudiantes.
// Ratio 70:30 (verde:rojo) — desbalance que crea "tendencia a responder" y
// permite medir inhibición de impulsos vía falsas alarmas (commissions).
//
// PRACTICE_LEVELS: motivacionales, NO afectan el score Likert. Su telemetría
// se registra para análisis exploratorio.
//
// Restricción CLAUDE.md §"Restricciones críticas" #4: en retos de TDAH la UI
// debe ser de baja distracción. Aquí no agregamos backgrounds animados ni
// distractores visuales — la dificultad sube por velocidad y ratio Go/No-Go.
// ============================================================================

import type { Dimension, Level } from "@iidta/core/scoring";

export const META = {
  id: "P-TD-01-semaforo-de-impulsos",
  level: "primaria" satisfies Level,
  dimension: "tdah" satisfies Dimension,
  itemCode: "C5",
  title: "Semáforo de impulsos",
  description: "Toca el botón cuando se prenda el VERDE. ¡No toques en ROJO!",
} as const;

export const DIAGNOSTIC = {
  totalStimuli: 60,
  goCount: 42, // 70% verde
  noGoCount: 18, // 30% rojo
  /** Tiempo total del ciclo: ISI + presentación. */
  cycleMs: 3000,
  /** Cuánto dura visible el color (verde o rojo). El resto es ISI gris. */
  stimulusDurationMs: 1200,
  durationSec: 180,
} as const;

export type GoNoGoRound = {
  type: "go-nogo";
  totalStimuli: number;
  goRatio: number;
  cycleMs: number;
  stimulusDurationMs: number;
};

export type CompositeRound = {
  type: "composite";
  rounds: readonly GoNoGoRound[];
};

export type LevelConfig = GoNoGoRound | CompositeRound;

export type PracticeLevel = 1 | 2 | 3 | 4 | 5;

export const PRACTICE_LEVELS: Record<PracticeLevel, LevelConfig> = {
  1: {
    type: "go-nogo",
    totalStimuli: 16,
    goRatio: 0.6,
    cycleMs: 3000,
    stimulusDurationMs: 1500,
  },
  2: {
    type: "go-nogo",
    totalStimuli: 20,
    goRatio: 0.7,
    cycleMs: 2200,
    stimulusDurationMs: 1100,
  },
  3: {
    type: "go-nogo",
    totalStimuli: 20,
    goRatio: 0.8, // mayor presión: 80% Go → más difícil inhibir en NoGo
    cycleMs: 2000,
    stimulusDurationMs: 900,
  },
  4: {
    type: "go-nogo",
    totalStimuli: 24,
    goRatio: 0.7,
    cycleMs: 1500,
    stimulusDurationMs: 800,
  },
  5: {
    type: "composite",
    rounds: [
      {
        type: "go-nogo",
        totalStimuli: 8,
        goRatio: 0.75,
        cycleMs: 2000,
        stimulusDurationMs: 900,
      },
      {
        type: "go-nogo",
        totalStimuli: 8,
        goRatio: 0.8,
        cycleMs: 1600,
        stimulusDurationMs: 800,
      },
      {
        type: "go-nogo",
        totalStimuli: 8,
        goRatio: 0.7,
        cycleMs: 1300,
        stimulusDurationMs: 700,
      },
    ],
  },
};

export const PRACTICE_LEVEL_TITLES: Record<PracticeLevel, string> = {
  1: "Nivel 1 · Calentamiento",
  2: "Nivel 2 · Más rápido",
  3: "Nivel 3 · Resistir el rojo",
  4: "Nivel 4 · Reflejos",
  5: "Nivel 5 · Desafío final",
} as const;

/** Paleta — Torre del Enfoque (coral + blanco hueso, alto contraste, baja saturación visual). */
export const PALETTE = {
  primary: 0xf97316, // coral
  bg: "#FAF7F2",
  bgHex: 0xfaf7f2,
  textDark: "#0F172A",
  textLight: "#FFFFFF",
  go: 0x10b981, // verde esmeralda
  noGo: 0xef4444, // rojo
  idle: 0xd4d4d8, // gris zinc-300 (luz apagada)
  housing: 0x1f2937, // gris-800 (carcasa del semáforo)
} as const;
