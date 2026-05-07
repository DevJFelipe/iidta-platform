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
export interface SemaforoImpulsosMeta {
  phase: "diagnostic";
  goCount: number;
  noGoCount: number;
  hits: number;
  commissions: number; // pulsó en rojo — falsa alarma
  omissions: number; // no pulsó en verde
  meanRTms: number;
}

/**
 * Rúbrica P-TD-01 (ítem C5, TDAH primaria).
 *
 * Fórmula: balanced accuracy = (hitRate + (1 - commissionRate)) / 2.
 * commissionRate (impulsividad) pesa igual que hitRate (atención sostenida)
 * — para TDAH la métrica clínica más relevante es la inhibición de impulsos,
 * que aquí se captura vía commissions.
 *
 * TODO PROMPT 5+ (post-piloto):
 * Tras 50 estudiantes piloto, evaluar migración a d-prime
 * (z(hitRate) - z(falseAlarmRate)) o reescalar pesos según consenso clínico
 * con investigadoras UDES.
 */
export function rubricSemaforoImpulsos(raw: ChallengeRawResult): LikertScore {
  const meta = raw.metadata as SemaforoImpulsosMeta | undefined;
  if (!meta || meta.phase !== "diagnostic") {
    return 3;
  }

  const goCount = Math.max(1, meta.goCount);
  const noGoCount = Math.max(1, meta.noGoCount);
  const hitRate = Math.min(1, meta.hits / goCount);
  const commissionRate = Math.min(1, meta.commissions / noGoCount);

  const balancedAccuracy = (hitRate + (1 - commissionRate)) / 2;

  // Norma provisional para C5 — refinar con datos del piloto USCO/UDES.
  // mean=0.78 asume que un estudiante típico de primaria detecta ~85% de Go
  // con ~15% de comisiones. stdDev=0.14 captura la dispersión esperada
  // (mayor que A1 porque el ratio 70:30 induce más comisiones).
  const norm: NormStats = {
    itemCode: "C5",
    mean: 0.78,
    stdDev: 0.14,
    n: 0,
    source: "provisional",
  };

  return likertMap(balancedAccuracy, norm);
}
