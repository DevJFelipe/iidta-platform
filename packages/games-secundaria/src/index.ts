import type { ChallengeManifest } from "@iidta/core/scoring";
import { detectiveOrtograficoManifest } from "./dislexia/detective-ortografico/manifest";
import { lineaNumericaEspacialManifest } from "./discalculia/linea-numerica-espacial/manifest";

export { detectiveOrtograficoManifest, lineaNumericaEspacialManifest };

export const MANIFESTS: ChallengeManifest[] = [
  detectiveOrtograficoManifest,
  lineaNumericaEspacialManifest,
];
