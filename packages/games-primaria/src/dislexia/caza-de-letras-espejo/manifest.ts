import type { ChallengeManifest } from "@iidta/core/scoring";
import { CazaDeLetrasEspejoComponent } from "./Component";
import { rubricCazaDeLetrasEspejo } from "./rubric";
import { DIAGNOSTIC, META } from "./config";
import { ASSETS } from "./assets";

export const cazaDeLetrasEspejoManifest: ChallengeManifest = {
  id: META.id,
  level: META.level,
  dimension: META.dimension,
  itemCode: META.itemCode,
  title: META.title,
  description: META.description,
  diagnosticDuration: DIAGNOSTIC.durationSec,
  practiceLevels: 5,
  rubric: rubricCazaDeLetrasEspejo,
  Component: CazaDeLetrasEspejoComponent,
  assetsManifest: [
    ASSETS.mascot,
    ASSETS.background,
    ASSETS.button,
    ASSETS.sounds.click,
    ASSETS.sounds.correct,
    ASSETS.sounds.wrong,
    ASSETS.sounds.levelUp,
  ],
};
