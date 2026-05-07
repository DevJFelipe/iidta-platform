import {
  likertMap,
  type ChallengeRawResult,
  type LikertScore,
  type NormStats,
} from "@iidta/core/scoring";
import type { WordCategory } from "./config";

/** Conteo por regla ortográfica (cualitativo, no afecta el Likert). */
export interface CategoryBreakdown {
  hits: number;
  total: number;
}

/**
 * Metadata que la scene del reto inyecta en `raw.metadata` cuando termina
 * la fase diagnóstica.
 */
export interface DetectiveOrtograficoMeta {
  phase: "diagnostic";
  totalWords: number;
  hits: number;
  errors: number;
  omissions: number;
  meanRTms: number;
  /** Desempeño por regla ortográfica — uso cualitativo en ResultScreen. */
  perCategory: Record<WordCategory, CategoryBreakdown>;
}

/**
 * Rúbrica S-DI-01 (ítem D5, dislexia secundaria).
 *
 * Fórmula: accuracy = hits / totalWords. Rango [0, 1]. Cada palabra
 * clasificada correctamente cuenta como hit; los errores de clasificación y
 * los timeouts cuentan como NO-hit.
 *
 * TODO PROMPT 5+ (post-piloto):
 * Considerar separar errores por categoría (b/v vs h muda vs s/c/z) — un
 * estudiante con dislexia puede dominar unas reglas y fallar otras de forma
 * sistemática. La separación permite análisis cualitativo del perfil.
 */
export function rubricDetectiveOrtografico(raw: ChallengeRawResult): LikertScore {
  const meta = raw.metadata as DetectiveOrtograficoMeta | undefined;
  if (!meta || meta.phase !== "diagnostic") {
    return 3;
  }

  const total = Math.max(1, meta.totalWords);
  const accuracy = Math.min(1, meta.hits / total);

  // Norma provisional para D5 — refinar con datos del piloto USCO/UDES.
  // mean=0.75: un estudiante típico de secundaria reconoce ~9 de 12 palabras
  // correctamente. stdDev=0.18 captura la dispersión esperada.
  const norm: NormStats = {
    itemCode: "D5",
    mean: 0.75,
    stdDev: 0.18,
    n: 0,
    source: "provisional",
  };

  return likertMap(accuracy, norm);
}
