// Resuelve paths reales de assets desde el manifest generado por
// `scripts/download-assets.mjs`. Si una key falta, falla rápido al import.

import manifestData from "../../assets-manifest.json";

interface Entry {
  key: string;
  path: string;
  ext: string;
}

const all: Entry[] = [...manifestData.sprites, ...manifestData.audio];

const byKey = (k: string): string => {
  const matches = all.filter((a) => a.key === k);
  if (matches.length === 0) {
    throw new Error(
      `[detective-ortografico/assets] Asset key not found in secundaria manifest: "${k}". ` +
        `Re-run scripts/download-assets.mjs secundaria.`,
    );
  }
  const preferred = matches.find((m) => m.ext === "webp" || m.ext === "ogg");
  const chosen = preferred ?? matches[0];
  if (!chosen) {
    throw new Error(`[detective-ortografico/assets] Empty match for "${k}"`);
  }
  return chosen.path;
};

export const ASSETS = {
  // Mascota dislexia secundaria: "AURA" — Asistente Universal de Rastreo
  // Alfabético. Astronauta isométrico mirando al frente (S).
  mascot: byKey("sprites_space-kit_Isometric_astronautA_S"),
  sounds: {
    pickUp: byKey("audio_sci-fi-sounds_Audio_forceField_000"),
    correct: byKey("audio_sci-fi-sounds_Audio_forceField_002"),
    wrong: byKey("audio_sci-fi-sounds_Audio_explosionCrunch_000"),
    levelUp: byKey("audio_sci-fi-sounds_Audio_computerNoise_002"),
  },
} as const;

export type AssetMap = typeof ASSETS;
