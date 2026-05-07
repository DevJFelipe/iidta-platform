import type { ChallengeManifest } from "@iidta/core/scoring";
import { LineaNumericaEspacialComponent } from "./Component";
import { rubricLineaNumericaEspacial } from "./rubric";
import { DIAGNOSTIC, META } from "./config";
import { ASSETS } from "./assets";

export const lineaNumericaEspacialManifest: ChallengeManifest = {
  id: META.id,
  level: META.level,
  dimension: META.dimension,
  itemCode: META.itemCode,
  // El reto cubre C1 (representación espacial) y C3 (valor posicional).
  // CLAUDE.md tabla "Los 90 retos" lo lista como (C1, C3).
  itemCodes: ["C1", "C3"],
  title: META.title,
  description: META.description,
  diagnosticDuration: DIAGNOSTIC.durationSec,
  practiceLevels: 5,
  rubric: rubricLineaNumericaEspacial,
  Component: LineaNumericaEspacialComponent,
  assetsManifest: [
    ASSETS.mascot,
    ASSETS.sounds.pickUp,
    ASSETS.sounds.correct,
    ASSETS.sounds.wrong,
    ASSETS.sounds.levelUp,
  ],
};
