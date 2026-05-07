import type { ChallengeRawResult, LikertScore } from "@iidta/core/scoring";

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
 * Rango [0, 1], donde 1 = desempeño perfecto y 0 = peor caso.
 *
 * PROVISIONAL: estos umbrales deben recalibrarse con z-score contra la
 * norma piloto de los primeros 50 estudiantes (RF-22). Ver issue de
 * calibración después del piloto.
 *
 * TODO PROMPT 5+: tras 50 estudiantes piloto USCO/UDES, evaluar migración
 * a d-prime (z(hitRate) - z(falseAlarmRate)). La firma de `LikertRubric`
 * queda compatible — solo cambia la transformación interna de raw → composite.
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

  if (balancedAccuracy >= 0.85) return 0;
  if (balancedAccuracy >= 0.7) return 1;
  if (balancedAccuracy >= 0.55) return 2;
  return 3;
}
