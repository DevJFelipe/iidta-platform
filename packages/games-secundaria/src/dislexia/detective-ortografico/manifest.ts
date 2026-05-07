import type { ChallengeManifest } from "@iidta/core/scoring";
import { DetectiveOrtograficoComponent } from "./Component";
import { rubricDetectiveOrtografico } from "./rubric";
import { DIAGNOSTIC, META } from "./config";
import { ASSETS } from "./assets";

export const detectiveOrtograficoManifest: ChallengeManifest = {
  id: META.id,
  level: META.level,
  dimension: META.dimension,
  itemCode: META.itemCode,
  title: META.title,
  description: META.description,
  diagnosticDuration: DIAGNOSTIC.durationSec,
  practiceLevels: 5,
  rubric: rubricDetectiveOrtografico,
  Component: DetectiveOrtograficoComponent,
  assetsManifest: [
    ASSETS.mascot,
    ASSETS.sounds.pickUp,
    ASSETS.sounds.correct,
    ASSETS.sounds.wrong,
    ASSETS.sounds.levelUp,
  ],
};
