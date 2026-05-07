// ============================================================================
// IMPORTANTE — SOLO LA FASE DIAGNÓSTICA PRODUCE EL PUNTAJE LIKERT.
//
// La sección DIAGNOSTIC define la fase comparable entre estudiantes (idéntica
// para todos: 60 estímulos en 180 s, ratio 70:30 target/distractor). Su
// resultado pasa por `rubricCazaDeLetrasEspejo` y produce el Likert 0-3.
//
// PRACTICE_LEVELS son MOTIVACIONALES y NO modifican el score Likert. Existen
// para que el estudiante explore y se familiarice con la mecánica. Su
// telemetría se registra para análisis exploratorio, pero la rúbrica NO se
// aplica sobre los raw de práctica.
// ============================================================================

import type { Level, Dimension } from "@iidta/core/scoring";

export const TARGET_LETTER = "b" as const;
export const DISTRACTOR_LETTERS = ["d", "p", "q"] as const;

export const META = {
  id: "P-DI-01-caza-de-letras-espejo",
  level: "primaria" satisfies Level,
  dimension: "dislexia" satisfies Dimension,
  itemCode: "A1",
  title: "Caza de letras espejo",
  description: "Toca solo cuando veas la letra B. ¡Cuidado con d, p y q que se le parecen!",
} as const;

export const DIAGNOSTIC = {
  totalStimuli: 60,
  targetCount: 42, // 70% de 60
  distractorCount: 18, // 30% de 60
  intervalMs: 3000,
  durationSec: 180,
  /** Tamaño de fuente del estímulo en px. */
  letterSize: 220,
} as const;

export type LetterHuntRound = {
  type: "letter-hunt";
  distractorCount: 2 | 3 | 4;
  rotationDeg: 0 | 90 | 180;
  intervalMs: number;
  totalStimuli: number;
  targetRatio: number;
};

export type WordHuntRound = {
  type: "word-hunt";
  words: readonly string[];
  targetLetter: string;
};

export type CompositeRound = {
  type: "composite";
  rounds: readonly (LetterHuntRound | WordHuntRound)[];
};

export type LevelConfig = LetterHuntRound | WordHuntRound | CompositeRound;

export type PracticeLevel = 1 | 2 | 3 | 4 | 5;

// IMPORTANTE: estos niveles son MOTIVACIONALES y NO afectan el puntaje
// Likert. Solo la sección DIAGNOSTIC arriba produce el score psicométrico.
// Aquí ajustamos duraciones para que cada nivel ronde los 30 s (45 s el 5).
export const PRACTICE_LEVELS: Record<PracticeLevel, LevelConfig> = {
  // Nivel 1 — Calentamiento: target estable, 2 distractores, ~30 s
  1: {
    type: "letter-hunt",
    distractorCount: 2,
    rotationDeg: 0,
    intervalMs: 2000,
    totalStimuli: 15,
    targetRatio: 0.4,
  },
  // Nivel 2 — Letras volteadas: 4 distractores, rotación 90°, ~30 s
  2: {
    type: "letter-hunt",
    distractorCount: 4,
    rotationDeg: 90,
    intervalMs: 1700,
    totalStimuli: 18,
    targetRatio: 0.4,
  },
  // Nivel 3 — Buscando en palabras: word-hunt (10 palabras × 3.5 s), ~35 s
  3: {
    type: "word-hunt",
    words: [
      "boca",
      "barco",
      "balde",
      "abeja",
      "tubo",
      "ballena",
      "cebra",
      "burro",
      "abuelo",
      "tabla",
    ],
    targetLetter: TARGET_LETTER,
  },
  // Nivel 4 — Velocidad: presión de tiempo, intervalMs 700 ms (500 ms es
  // demasiado rápido incluso para adultos en tareas Go/No-Go), ~28 s
  4: {
    type: "letter-hunt",
    distractorCount: 3,
    rotationDeg: 0,
    intervalMs: 700,
    totalStimuli: 40,
    targetRatio: 0.5,
  },
  // Nivel 5 — Desafío final: combinación de los niveles anteriores, ~45 s
  5: {
    type: "composite",
    rounds: [
      {
        type: "letter-hunt",
        distractorCount: 4,
        rotationDeg: 90,
        intervalMs: 1500,
        totalStimuli: 15,
        targetRatio: 0.4,
      },
      {
        type: "word-hunt",
        words: ["bombero", "lobo", "habla", "cabra", "tabique"],
        targetLetter: TARGET_LETTER,
      },
      {
        type: "letter-hunt",
        distractorCount: 4,
        rotationDeg: 0,
        intervalMs: 800,
        totalStimuli: 15,
        targetRatio: 0.5,
      },
    ],
  },
};

export const PRACTICE_LEVEL_TITLES: Record<PracticeLevel, string> = {
  1: "Nivel 1 · Calentamiento",
  2: "Nivel 2 · Letras volteadas",
  3: "Nivel 3 · Buscando en palabras",
  4: "Nivel 4 · Velocidad",
  5: "Nivel 5 · Desafío final",
} as const;

/** Paleta visual del reto — Torre de las Letras (índigo + blanco hueso). */
export const PALETTE = {
  primary: 0x4f46e5, // índigo
  bg: "#FAF7F2", // blanco hueso
  bgHex: 0xfaf7f2,
  textDark: "#0F172A",
  textLight: "#FFFFFF",
  correct: 0x10b981, // esmeralda
  wrong: 0xef4444, // rojo
} as const;
