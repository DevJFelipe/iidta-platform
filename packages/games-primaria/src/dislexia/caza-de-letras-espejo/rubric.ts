import {
  likertMap,
  type ChallengeRawResult,
  type LikertScore,
  type NormStats,
} from "@iidta/core/scoring";

/**
 * Metadata específico que la scene del reto inyecta en `raw.metadata`
 * cuando termina la fase diagnóstica.
 */
export interface CazaDeLetrasEspejoMeta {
  phase: "diagnostic";
  targetCount: number;
  distractorCount: number;
  hits: number;
  commissions: number;
  omissions: number;
  meanRTms: number;
}

/**
 * Rúbrica P-DI-01 (ítem A1, dislexia primaria).
 *
 * Fórmula: balanced accuracy = (hitRate + (1 - commissionRate)) / 2.
 * Rango [0, 1], donde 1 = desempeño perfecto y 0 = peor caso (todas las
 * comisiones, cero hits).
 *
 * TODO PROMPT 5+ (post-piloto):
 * Tras 50 estudiantes piloto USCO/UDES, evaluar migración a d-prime
 * (z(hitRate) - z(falseAlarmRate)). La firma de `LikertRubric` queda
 * compatible — solo cambia la transformación interna de raw → composite.
 *
 * Norma actual: provisional, basada en CLAUDE.md.
 */
export function rubricCazaDeLetrasEspejo(raw: ChallengeRawResult): LikertScore {
  const meta = raw.metadata as CazaDeLetrasEspejoMeta | undefined;
  if (!meta || meta.phase !== "diagnostic") {
    // Sin metadata válida: conservador → "siempre presenta dificultad".
    return 3;
  }

  const targetCount = Math.max(1, meta.targetCount);
  const distractorCount = Math.max(1, meta.distractorCount);
  const hitRate = Math.min(1, meta.hits / targetCount);
  const commissionRate = Math.min(1, meta.commissions / distractorCount);

  const balancedAccuracy = (hitRate + (1 - commissionRate)) / 2;

  // Norma provisional para A1 — refinar con datos del piloto USCO/UDES.
  // mean=0.75 asume que un estudiante típico de primaria detecta ~80% de
  // targets con ~10% de comisiones. stdDev=0.15 captura la dispersión esperada.
  const norm: NormStats = {
    itemCode: "A1",
    mean: 0.75,
    stdDev: 0.15,
    n: 0,
    source: "provisional",
  };

  return likertMap(balancedAccuracy, norm);
}
