// ============================================================================
// IMPORTANTE — SOLO LA FASE DIAGNÓSTICA PRODUCE EL PUNTAJE LIKERT.
//
// DIAGNOSTIC: 12 palabras en 180s. Cada palabra es CORRECTA o INCORRECTA según
// reglas ortográficas comunes (b/v, h muda, consonantes confusas: c/s/z, c/k,
// g/j). El estudiante arrastra la palabra al cesto que considere correcto.
// Idéntico para todos.
//
// PRACTICE_LEVELS: motivacionales, NO afectan el score Likert.
// ============================================================================

import type { Dimension, Level } from "@iidta/core/scoring";

export const META = {
  id: "S-DI-01-detective-ortografico",
  level: "secundaria" satisfies Level,
  dimension: "dislexia" satisfies Dimension,
  itemCode: "D5",
  title: "Detective ortográfico",
  description:
    "Clasifica palabras según su ortografía. Detecta errores de b/v, h muda y consonantes confusas.",
} as const;

export type WordCategory = "bv" | "h" | "consonantes";

/**
 * Banco de palabras: cada entrada tiene una variante CORRECTA y una INCORRECTA
 * que sigue una regla ortográfica clara. La scene elige aleatoriamente cuál
 * mostrar; el estudiante decide si es válida o tiene error.
 */
export interface WordPair {
  category: WordCategory;
  correct: string;
  incorrect: string;
  rule: string;
}

export const WORD_BANK: readonly WordPair[] = [
  // b/v
  { category: "bv", correct: "vaca", incorrect: "baca", rule: "b/v" },
  { category: "bv", correct: "vivir", incorrect: "bibir", rule: "b/v" },
  { category: "bv", correct: "voy", incorrect: "boi", rule: "b/v + ortografía" },
  { category: "bv", correct: "abuelo", incorrect: "avuelo", rule: "b/v" },
  { category: "bv", correct: "barco", incorrect: "varco", rule: "b/v" },
  { category: "bv", correct: "ventana", incorrect: "bentana", rule: "b/v" },
  // h muda
  { category: "h", correct: "haber", incorrect: "aber", rule: "h muda" },
  { category: "h", correct: "huevo", incorrect: "uevo", rule: "h muda" },
  { category: "h", correct: "hueso", incorrect: "ueso", rule: "h muda" },
  { category: "h", correct: "ahora", incorrect: "aora", rule: "h muda" },
  { category: "h", correct: "hambre", incorrect: "ambre", rule: "h muda" },
  { category: "h", correct: "hermano", incorrect: "ermano", rule: "h muda" },
  // consonantes confusas (c/s/z, c/k, g/j)
  { category: "consonantes", correct: "cero", incorrect: "sero", rule: "c ante e/i" },
  { category: "consonantes", correct: "cielo", incorrect: "sielo", rule: "c ante e/i" },
  { category: "consonantes", correct: "zapato", incorrect: "sapato", rule: "z ante a/o/u" },
  { category: "consonantes", correct: "silla", incorrect: "cilla", rule: "s/c contraste" },
  { category: "consonantes", correct: "casa", incorrect: "kasa", rule: "c/k" },
  { category: "consonantes", correct: "tijera", incorrect: "tigera", rule: "g/j" },
] as const;

export const DIAGNOSTIC = {
  totalWords: 12,
  /** Aproximadamente la mitad correctas, la otra mitad incorrectas. */
  correctCount: 6,
  incorrectCount: 6,
  /** Tiempo máximo por palabra antes de marcar omisión. */
  wordTimeoutMs: 13_000,
  /** Categorías incluidas en diagnóstico (todas las reglas). */
  categories: ["bv", "h", "consonantes"] as readonly WordCategory[],
  durationSec: 180,
} as const;

export interface WordRound {
  type: "word";
  totalWords: number;
  correctRatio: number;
  categories: readonly WordCategory[];
  wordTimeoutMs: number;
}

export interface CompositeRound {
  type: "composite";
  rounds: readonly WordRound[];
}

export type LevelConfig = WordRound | CompositeRound;

export type PracticeLevel = 1 | 2 | 3 | 4 | 5;

export const PRACTICE_LEVELS: Record<PracticeLevel, LevelConfig> = {
  1: {
    type: "word",
    totalWords: 8,
    correctRatio: 0.5,
    categories: ["bv"],
    wordTimeoutMs: 15_000,
  },
  2: {
    type: "word",
    totalWords: 8,
    correctRatio: 0.5,
    categories: ["h"],
    wordTimeoutMs: 14_000,
  },
  3: {
    type: "word",
    totalWords: 8,
    correctRatio: 0.5,
    categories: ["consonantes"],
    wordTimeoutMs: 14_000,
  },
  4: {
    type: "word",
    totalWords: 10,
    correctRatio: 0.5,
    categories: ["bv", "h", "consonantes"],
    wordTimeoutMs: 11_000,
  },
  5: {
    type: "composite",
    rounds: [
      {
        type: "word",
        totalWords: 4,
        correctRatio: 0.5,
        categories: ["bv"],
        wordTimeoutMs: 10_000,
      },
      {
        type: "word",
        totalWords: 4,
        correctRatio: 0.5,
        categories: ["h"],
        wordTimeoutMs: 10_000,
      },
      {
        type: "word",
        totalWords: 4,
        correctRatio: 0.5,
        categories: ["consonantes"],
        wordTimeoutMs: 9_000,
      },
    ],
  },
};

export const PRACTICE_LEVEL_TITLES: Record<PracticeLevel, string> = {
  1: "Misión 1 · Operación b/v",
  2: "Misión 2 · La h muda",
  3: "Misión 3 · Decodificar consonantes",
  4: "Misión 4 · Frecuencia mixta",
  5: "Misión 5 · Protocolo final",
} as const;

/** Paleta — Estación Orbital del Aprendizaje (azul espacial + cian + magenta + ámbar). */
export const PALETTE = {
  primary: 0x06b6d4, // cian
  primaryHex: "#06B6D4",
  primaryDark: "#0E7490",
  accent: 0xd946ef, // magenta
  accentHex: "#D946EF",
  warning: 0xfacc15, // ámbar
  bg: "#0F172A", // azul espacial (Slate-900)
  bgHex: 0x0f172a,
  surface: 0x1e293b, // Slate-800
  surfaceLight: 0x334155, // Slate-700
  textLight: "#F1F5F9", // Slate-100
  textMuted: "#94A3B8", // Slate-400
  correct: 0x10b981, // emerald
  wrong: 0xef4444, // red
} as const;
