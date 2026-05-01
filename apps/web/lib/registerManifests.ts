import { registerManifest } from "@iidta/core/registry";
import { MANIFESTS as primariaManifests } from "@iidta/games-primaria";
import { MANIFESTS as secundariaManifests } from "@iidta/games-secundaria";
import { MANIFESTS as mediaManifests } from "@iidta/games-media";

let registered = false;

/**
 * Idempotente. Llamar antes de cualquier `findManifest()` en el route handler.
 * Funciona tanto server-side como client-side (cada bundle tiene su propio
 * registry Map; ambos lados llaman esta función al inicio).
 */
export function ensureManifestsRegistered(): void {
  if (registered) return;
  for (const m of [...primariaManifests, ...secundariaManifests, ...mediaManifests]) {
    registerManifest(m);
  }
  registered = true;
}
