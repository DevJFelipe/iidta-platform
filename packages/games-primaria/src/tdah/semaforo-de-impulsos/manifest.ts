import type { ChallengeManifest } from "@iidta/core/scoring";
import { SemaforoImpulsosComponent } from "./Component";
import { rubricSemaforoImpulsos } from "./rubric";
import { DIAGNOSTIC, META } from "./config";
import { ASSETS } from "./assets";

export const semaforoImpulsosManifest: ChallengeManifest = {
  id: META.id,
  level: META.level,
  dimension: META.dimension,
  itemCode: META.itemCode,
  title: META.title,
  description: META.description,
  diagnosticDuration: DIAGNOSTIC.durationSec,
  practiceLevels: 5,
  rubric: rubricSemaforoImpulsos,
  Component: SemaforoImpulsosComponent,
  assetsManifest: [
    ASSETS.mascot,
    ASSETS.sounds.click,
    ASSETS.sounds.correct,
    ASSETS.sounds.wrong,
    ASSETS.sounds.levelUp,
  ],
};
