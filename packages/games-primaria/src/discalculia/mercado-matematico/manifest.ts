import type { ChallengeManifest } from "@iidta/core/scoring";
import { MercadoMatematicoComponent } from "./Component";
import { rubricMercadoMatematico } from "./rubric";
import { DIAGNOSTIC, META } from "./config";
import { ASSETS } from "./assets";

export const mercadoMatematicoManifest: ChallengeManifest = {
  id: META.id,
  level: META.level,
  dimension: META.dimension,
  itemCode: META.itemCode,
  title: META.title,
  description: META.description,
  diagnosticDuration: DIAGNOSTIC.durationSec,
  practiceLevels: 5,
  rubric: rubricMercadoMatematico,
  Component: MercadoMatematicoComponent,
  assetsManifest: [
    ASSETS.mascot,
    ASSETS.sounds.coin,
    ASSETS.sounds.correct,
    ASSETS.sounds.wrong,
    ASSETS.sounds.levelUp,
  ],
};
