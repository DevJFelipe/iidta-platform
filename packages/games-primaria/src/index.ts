import type { ChallengeManifest } from "@iidta/core/scoring";
import { cazaDeLetrasEspejoManifest } from "./dislexia/caza-de-letras-espejo/manifest";
import { mercadoMatematicoManifest } from "./discalculia/mercado-matematico/manifest";
import { semaforoImpulsosManifest } from "./tdah/semaforo-de-impulsos/manifest";

export { cazaDeLetrasEspejoManifest, mercadoMatematicoManifest, semaforoImpulsosManifest };

export const MANIFESTS: ChallengeManifest[] = [
  cazaDeLetrasEspejoManifest,
  mercadoMatematicoManifest,
  semaforoImpulsosManifest,
];
