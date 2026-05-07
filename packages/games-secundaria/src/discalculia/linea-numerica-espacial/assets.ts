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
      `[linea-numerica-espacial/assets] Asset key not found in secundaria manifest: "${k}". ` +
        `Re-run scripts/download-assets.mjs secundaria.`,
    );
  }
  const preferred = matches.find((m) => m.ext === "webp" || m.ext === "ogg");
  const chosen = preferred ?? matches[0];
  if (!chosen) {
    throw new Error(`[linea-numerica-espacial/assets] Empty match for "${k}"`);
  }
  return chosen.path;
};

export const ASSETS = {
  // Mascota discalculia secundaria: "ZARA" — Zona de Análisis y Rastreo
  // Aritmético. Astronauta isométrico variante B (distinto de AURA en
  // detective ortográfico que usa variante A).
  mascot: byKey("sprites_space-kit_Isometric_astronautB_S"),
  sounds: {
    pickUp: byKey("audio_sci-fi-sounds_Audio_forceField_000"),
    correct: byKey("audio_sci-fi-sounds_Audio_forceField_002"),
    wrong: byKey("audio_sci-fi-sounds_Audio_explosionCrunch_000"),
    levelUp: byKey("audio_sci-fi-sounds_Audio_computerNoise_002"),
  },
} as const;

export type AssetMap = typeof ASSETS;
