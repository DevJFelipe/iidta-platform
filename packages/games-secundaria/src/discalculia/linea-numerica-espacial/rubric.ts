import {
  likertMap,
  type ChallengeRawResult,
  type LikertScore,
  type NormStats,
} from "@iidta/core/scoring";

/** Conteo de respuestas por bin (hit/near/far). */
export interface KindBreakdown {
  hits: number;
  near: number;
  far: number;
}

/**
 * Metadata que la scene del reto inyecta en `raw.metadata` cuando termina
 * la fase diagnóstica. `accuracy` (hits/total) es lo que entra al Likert;
 * el resto es métrica cualitativa para investigadoras.
 */
export interface LineaNumericaMeta {
  phase: "diagnostic";
  totalTrials: number;
  hits: number;
  near: number;
  far: number;
  omissions: number;
  meanErrorPct: number;
  medianErrorPct: number;
  meanRTms: number;
  /** Conteo agregado por bin — facilita tabla en ResultScreen. */
  kinds: KindBreakdown;
}

/**
 * Rúbrica S-DC-01 (ítem C1, discalculia secundaria, paradigma NLE).
 *
 * Fórmula: `accuracy = hits / totalTrials`. Un trial cuenta como hit si el
 * error absoluto fue ≤ 7% del rango. Las respuestas "near" (7-14%) y "far"
 * (>14%) NO cuentan como hit pero se reportan en metadata para análisis
 * cualitativo del perfil del estudiante.
 *
 * TODO PROMPT 5+ (post-piloto):
 * Considerar migrar a un score basado en `meanErrorPct` (más sensible
 * psicométricamente) si los datos del piloto sugieren falta de discriminación
 * con `accuracy`. Por ahora alineamos con el patrón del resto del demo set.
 */
export function rubricLineaNumericaEspacial(raw: ChallengeRawResult): LikertScore {
  const meta = raw.metadata as LineaNumericaMeta | undefined;
  if (!meta || meta.phase !== "diagnostic") {
    return 3;
  }

  const total = Math.max(1, meta.totalTrials);
  const accuracy = Math.min(1, meta.hits / total);

  // Norma provisional para C1 — refinar con datos del piloto USCO/UDES.
  // mean=0.70: un estudiante típico de secundaria acierta ~8 de 12 trials con
  // tolerancia ±7%. stdDev=0.18 captura la dispersión esperada.
  const norm: NormStats = {
    itemCode: "C1",
    mean: 0.7,
    stdDev: 0.18,
    n: 0,
    source: "provisional",
  };

  return likertMap(accuracy, norm);
}
