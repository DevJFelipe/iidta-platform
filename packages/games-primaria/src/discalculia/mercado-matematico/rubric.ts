import {
  likertMap,
  type ChallengeRawResult,
  type LikertScore,
  type NormStats,
} from "@iidta/core/scoring";

/**
 * Metadata que la scene del reto inyecta en `raw.metadata` cuando termina
 * la fase diagnóstica.
 */
export interface MercadoMatematicoMeta {
  phase: "diagnostic";
  totalProblems: number;
  hits: number;
  errors: number;
  omissions: number;
  meanRTms: number;
}

/**
 * Rúbrica P-DC-01 (ítem B4, discalculia primaria).
 *
 * Fórmula: accuracy = hits / totalProblems.
 * Rango [0, 1], donde 1 = todos los problemas resueltos correctamente.
 *
 * Las omisiones (timeout) y errores (suma incorrecta al pagar) cuentan
 * igualmente como NO-hits — para el ítem B4 lo relevante es la cantidad
 * de problemas resueltos correctamente, no la causa de la falla.
 *
 * TODO PROMPT 5+ (post-piloto):
 * Considerar separar omissions de errores comisión: un niño que omite por
 * lentitud puede tener un perfil distinto a quien comete errores aritméticos.
 * Refinar con datos del piloto USCO/UDES.
 */
export function rubricMercadoMatematico(raw: ChallengeRawResult): LikertScore {
  const meta = raw.metadata as MercadoMatematicoMeta | undefined;
  if (!meta || meta.phase !== "diagnostic") {
    return 3;
  }

  const total = Math.max(1, meta.totalProblems);
  const accuracy = Math.min(1, meta.hits / total);

  // Norma provisional para B4 — refinar con datos del piloto.
  // mean=0.70: un estudiante típico resuelve correctamente ~4-5 de 6 problemas
  // de compra simple. stdDev=0.20: dispersión amplia esperada en primaria.
  const norm: NormStats = {
    itemCode: "B4",
    mean: 0.7,
    stdDev: 0.2,
    n: 0,
    source: "provisional",
  };

  return likertMap(accuracy, norm);
}
