// ============================================================================
// IMPORTANTE — SOLO LA FASE DIAGNÓSTICA PRODUCE EL PUNTAJE LIKERT.
//
// DIAGNOSTIC: 6 problemas de compra en 180s (30s por problema). Idéntico para
// todos los estudiantes. Mide la habilidad de resolver problemas matemáticos
// sencillos en situaciones cotidianas (ítem B4 de IIDTA-P).
//
// PRACTICE_LEVELS: motivacionales, NO afectan el score Likert.
// ============================================================================

import type { Dimension, Level } from "@iidta/core/scoring";

export const META = {
  id: "P-DC-01-mercado-matematico",
  level: "primaria" satisfies Level,
  dimension: "discalculia" satisfies Dimension,
  itemCode: "B4",
  title: "Mercado matemático",
  description: "Compra productos en el Mercado del Bosque. Arrastra monedas hasta llegar al precio.",
} as const;

/** Productos del mercado con sus precios (en monedas). */
export interface Product {
  emoji: string;
  name: string;
  price: number;
}

export const PRODUCTS_BANK: readonly Product[] = [
  { emoji: "🥚", name: "huevo", price: 1 },
  { emoji: "🥕", name: "zanahoria", price: 2 },
  { emoji: "🍎", name: "manzana", price: 3 },
  { emoji: "🍌", name: "banano", price: 4 },
  { emoji: "🥖", name: "pan", price: 5 },
  { emoji: "🍅", name: "tomate", price: 6 },
  { emoji: "🥛", name: "leche", price: 7 },
  { emoji: "🍞", name: "tostada", price: 8 },
  { emoji: "🧀", name: "queso", price: 9 },
  { emoji: "🍫", name: "chocolate", price: 10 },
] as const;

/** Denominación de monedas disponibles. */
export type CoinValue = 1 | 2 | 5;

export const DIAGNOSTIC = {
  /** Número total de problemas en la fase diagnóstica. */
  totalProblems: 6,
  /** Tiempo máximo por problema antes de marcar omisión. */
  problemTimeoutMs: 28_000,
  /** Monedas disponibles durante diagnóstico. */
  coins: [1, 2, 5] satisfies CoinValue[],
  /** Rango de precios en diagnóstico (referencia). */
  priceRange: [3, 10] as const,
  durationSec: 180,
} as const;

export interface ProblemRound {
  type: "problem";
  totalProblems: number;
  /** Si se define, fija un rango específico de precios para este nivel. */
  priceMin: number;
  priceMax: number;
  /** Monedas disponibles durante el nivel. */
  coins: CoinValue[];
  /** Tiempo máximo por problema. */
  problemTimeoutMs: number;
}

export interface CompositeRound {
  type: "composite";
  rounds: readonly ProblemRound[];
}

export type LevelConfig = ProblemRound | CompositeRound;

export type PracticeLevel = 1 | 2 | 3 | 4 | 5;

export const PRACTICE_LEVELS: Record<PracticeLevel, LevelConfig> = {
  1: {
    type: "problem",
    totalProblems: 5,
    priceMin: 1,
    priceMax: 5,
    coins: [1, 2],
    problemTimeoutMs: 30_000,
  },
  2: {
    type: "problem",
    totalProblems: 5,
    priceMin: 3,
    priceMax: 8,
    coins: [1, 2, 5],
    problemTimeoutMs: 30_000,
  },
  3: {
    type: "problem",
    totalProblems: 5,
    priceMin: 5,
    priceMax: 10,
    coins: [1, 2, 5],
    problemTimeoutMs: 25_000,
  },
  4: {
    type: "problem",
    totalProblems: 6,
    priceMin: 6,
    priceMax: 10,
    coins: [1, 2, 5],
    problemTimeoutMs: 22_000,
  },
  5: {
    type: "composite",
    rounds: [
      {
        type: "problem",
        totalProblems: 3,
        priceMin: 4,
        priceMax: 8,
        coins: [1, 2, 5],
        problemTimeoutMs: 20_000,
      },
      {
        type: "problem",
        totalProblems: 3,
        priceMin: 8,
        priceMax: 12,
        coins: [1, 2, 5],
        problemTimeoutMs: 22_000,
      },
    ],
  },
};

export const PRACTICE_LEVEL_TITLES: Record<PracticeLevel, string> = {
  1: "Nivel 1 · Calentamiento",
  2: "Nivel 2 · Combinando monedas",
  3: "Nivel 3 · Más rápido",
  4: "Nivel 4 · Compras grandes",
  5: "Nivel 5 · Desafío final",
} as const;

/** Paleta — Torre de los Números (esmeralda + blanco hueso). */
export const PALETTE = {
  primary: 0x10b981, // esmeralda
  primaryHex: "#10B981",
  primaryDark: "#047857",
  bg: "#FAF7F2",
  bgHex: 0xfaf7f2,
  surface: 0xffffff,
  textDark: "#0F172A",
  textLight: "#FFFFFF",
  correct: 0x10b981,
  wrong: 0xef4444,
  coin: 0xfbbf24, // amarillo dorado
  coinDark: 0xb45309,
  cart: 0x065f46, // verde oscuro
  cartLight: 0xd1fae5,
} as const;
