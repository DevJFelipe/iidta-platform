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
      `[mercado-matematico/assets] Asset key not found in primaria manifest: "${k}". ` +
        `Re-run scripts/download-assets.mjs primaria.`,
    );
  }
  const preferred = matches.find((m) => m.ext === "webp" || m.ext === "ogg");
  const chosen = preferred ?? matches[0];
  if (!chosen) {
    throw new Error(`[mercado-matematico/assets] Empty match for "${k}"`);
  }
  return chosen.path;
};

export const ASSETS = {
  // Mascota Discalculia primaria: "Coni Conejo" del Mercado del Bosque.
  // Vendedor amigable que explica cuánto cuesta cada producto.
  mascot: byKey("sprites_animal-pack_PNG_Round (outline)_rabbit"),
  sounds: {
    coin: byKey("audio_interface-sounds_Audio_click_001"),
    correct: byKey("audio_interface-sounds_Audio_confirmation_001"),
    wrong: byKey("audio_interface-sounds_Audio_error_001"),
    levelUp: byKey("audio_interface-sounds_Audio_confirmation_003"),
  },
} as const;

export type AssetMap = typeof ASSETS;
