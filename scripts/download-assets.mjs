#!/usr/bin/env node
/**
 * IIDTA — Asset downloader
 *
 * Uso:
 *   node --env-file=.env.local scripts/download-assets.mjs <nivel>
 *
 * Donde <nivel> es: primaria | secundaria | media | todos
 *
 * Fuentes (todas con licencia compatible):
 *  - Kenney.nl (CC0)
 *  - Pixabay   (Pixabay License) — requiere PIXABAY_API_KEY
 *
 * Modo permisivo: errores no detienen el script. Se loguean en
 * apps/web/public/assets/<level>/assets-fallback.md.
 */

import { mkdir, writeFile, readdir, stat } from "node:fs/promises";
import { existsSync, createWriteStream } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import { execSync } from "node:child_process";
import AdmZip from "adm-zip";

const ROOT = process.cwd();
const CACHE = join(ROOT, "assets-source-cache");
const ASSETS_DIR = join(ROOT, "apps/web/public/assets");
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

const KENNEY_BASE = "https://kenney.nl";

// ----------------------------------------------------------------------------
// Manifests por nivel
// ----------------------------------------------------------------------------

// NOTA: Pixabay API pública sólo expone imágenes y videos en 2026.
// El endpoint /api/sounds/ no existe (devuelve 404). Por eso las queries
// de Pixabay son IMÁGENES (backgrounds/ilustraciones), no audio.
// Los sonidos vienen 100% de Kenney (que sí ofrece sound packs CC0).
const ASSETS = {
  primaria: {
    kenney: ["animal-pack", "ui-pack", "game-icons", "interface-sounds", "impact-sounds"],
    pixabayImages: ["classroom cartoon", "school illustration kids"],
  },
  secundaria: {
    kenney: ["space-kit", "ui-pack-sci-fi", "sci-fi-sounds", "voiceover-pack"],
    pixabayImages: ["nebula space", "space station illustration"],
  },
  media: {
    kenney: ["1-bit-pack", "interface-sounds"],
    pixabayImages: ["dark gradient abstract", "minimal noir"],
  },
};

// ----------------------------------------------------------------------------
// Logging + fallback
// ----------------------------------------------------------------------------

const fallbackLog = [];

function logFallback(level, source, slug, error) {
  const message = error?.message || String(error);
  fallbackLog.push({ level, source, slug, error: message, ts: new Date().toISOString() });
  console.warn(`⚠️  [${level}] ${source} "${slug}" falló: ${message}`);
}

async function writeFallbackLog(level) {
  if (fallbackLog.length === 0) return;
  const lines = [
    `# Assets fallback log — nivel ${level}`,
    "",
    `Generado: ${new Date().toISOString()}`,
    "",
    "Estos assets no se descargaron y deben revisarse manualmente:",
    "",
    "| Source | Slug | Error |",
    "|---|---|---|",
    ...fallbackLog
      .filter((f) => f.level === level)
      .map((f) => `| ${f.source} | \`${f.slug}\` | ${f.error.slice(0, 200)} |`),
    "",
  ];
  await writeFile(join(ASSETS_DIR, level, "assets-fallback.md"), lines.join("\n"));
}

// ----------------------------------------------------------------------------
// Helpers I/O
// ----------------------------------------------------------------------------

async function ensureDir(p) {
  await mkdir(p, { recursive: true });
}

async function fetchToFile(url, dest) {
  const res = await fetch(url, {
    headers: { "User-Agent": "iidta-platform/0.0.0 (asset downloader)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  if (!res.body) throw new Error("empty body");
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
}

async function dirSizeMB(dirPath) {
  if (!existsSync(dirPath)) return 0;
  let total = 0;
  async function walk(d) {
    let entries;
    try {
      entries = await readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const fp = join(d, e.name);
      if (e.isDirectory()) await walk(fp);
      else if (e.isFile()) total += (await stat(fp)).size;
    }
  }
  await walk(dirPath);
  return Math.round((total / 1024 / 1024) * 10) / 10;
}

async function isDirNonEmpty(p) {
  if (!existsSync(p)) return false;
  try {
    const list = await readdir(p);
    return list.length > 0;
  } catch {
    return false;
  }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ----------------------------------------------------------------------------
// Kenney.nl
// ----------------------------------------------------------------------------

async function findKenneyZipUrl(slug) {
  const pageUrl = `${KENNEY_BASE}/assets/${slug}`;
  const res = await fetch(pageUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; iidta-platform/0.0.0)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} on ${pageUrl}`);
  const html = await res.text();

  // Kenney usa comillas SIMPLES en su HTML. La URL canónica del ZIP tiene
  // forma: /media/pages/assets/<slug>/<hash>-<ts>/kenney_<slug>.zip
  // (encontrada en el modal #inline-download).
  const patterns = [
    /['"](\/media\/pages\/assets\/[^'"]+\.zip)['"]/,
    /['"](https?:\/\/[^'"]+\.zip)['"]/,
    /data-href=['"]([^'"]+\.zip)['"]/,
  ];
  for (const re of patterns) {
    const m = html.match(re);
    if (m) {
      return m[1].startsWith("http") ? m[1] : `${KENNEY_BASE}${m[1]}`;
    }
  }
  throw new Error(`no .zip link found at ${pageUrl}`);
}

function isAudioPack(slug) {
  return /sound|audio|voiceover|music|sfx/i.test(slug);
}

async function downloadKenneyPack(slug, level) {
  const cachePath = join(CACHE, `${slug}.zip`);
  const subdir = isAudioPack(slug) ? "audio" : "sprites";
  const targetDir = join(ASSETS_DIR, level, subdir, slug);

  if (await isDirNonEmpty(targetDir)) {
    console.log(`⏭️  Kenney "${slug}" (${level}): ya extraído, skip`);
    return;
  }

  if (!existsSync(cachePath)) {
    console.log(`📥 Kenney "${slug}": resolviendo URL…`);
    const zipUrl = await findKenneyZipUrl(slug);
    console.log(`   ↓ ${zipUrl}`);
    await fetchToFile(zipUrl, cachePath);
  } else {
    console.log(`📦 Kenney "${slug}": cache hit`);
  }

  await ensureDir(targetDir);
  const zip = new AdmZip(cachePath);
  zip.extractAllTo(targetDir, /* overwrite */ true);
  const sizeMB = await dirSizeMB(targetDir);
  console.log(`✅ Kenney "${slug}" → ${targetDir} (${sizeMB} MB)`);
}

// ----------------------------------------------------------------------------
// Pixabay (sound effects API)
// ----------------------------------------------------------------------------

async function downloadPixabayImages(query, level) {
  if (!PIXABAY_KEY) {
    console.log(`⏭️  Pixabay "${query}": PIXABAY_API_KEY no configurada, skip`);
    return;
  }

  const url = `https://pixabay.com/api/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=3&image_type=illustration&safesearch=true&orientation=horizontal`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status}: ${body.slice(0, 120)}`);
  }
  const data = await res.json().catch(() => null);
  if (!data || !Array.isArray(data.hits) || data.hits.length === 0) {
    throw new Error("no hits");
  }

  const targetDir = join(ASSETS_DIR, level, "sprites", "pixabay-bg");
  await ensureDir(targetDir);

  for (const hit of data.hits.slice(0, 3)) {
    const imgUrl = hit.largeImageURL || hit.webformatURL;
    if (!imgUrl) continue;
    const id = hit.id || Math.random().toString(36).slice(2, 8);
    const ext = imgUrl.split(".").pop().split("?")[0] || "jpg";
    const filename = `${query.replace(/\s+/g, "-")}-${id}.${ext}`;
    const dest = join(targetDir, filename);
    if (existsSync(dest)) {
      console.log(`⏭️  Pixabay img ${filename}: existe, skip`);
      continue;
    }
    try {
      await fetchToFile(imgUrl, dest);
      console.log(`✅ Pixabay img: ${filename}`);
    } catch (e) {
      console.warn(`   ⚠️ no pude bajar ${filename}: ${e.message}`);
    }
    await sleep(300);
  }
}

// ----------------------------------------------------------------------------
// Optimización: PNG → WebP, MP3 → OGG
// ----------------------------------------------------------------------------

async function optimizeAssets(level) {
  const sharp = (await import("sharp")).default;
  const { glob } = await import("glob");

  const baseDir = join(ASSETS_DIR, level);

  // PNG → WebP
  const pngs = await glob("sprites/**/*.png", { cwd: baseDir, absolute: true });
  let webpCount = 0;
  for (const png of pngs) {
    const webp = png.replace(/\.png$/i, ".webp");
    if (existsSync(webp)) continue;
    try {
      await sharp(png).webp({ quality: 85 }).toFile(webp);
      webpCount++;
    } catch (e) {
      // skip silently — algunos PNGs pueden ser corruptos / >dimension limit
    }
  }
  if (webpCount > 0) console.log(`🖼️  Convertidos a WebP: ${webpCount} sprites`);

  // MP3 → OGG (si ffmpeg disponible)
  let hasFfmpeg = false;
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    hasFfmpeg = true;
  } catch {
    console.warn("⚠️  ffmpeg no disponible — saltando conversión OGG");
  }
  if (hasFfmpeg) {
    const mp3s = await glob("audio/**/*.mp3", { cwd: baseDir, absolute: true });
    let oggCount = 0;
    for (const mp3 of mp3s) {
      const ogg = mp3.replace(/\.mp3$/i, ".ogg");
      if (existsSync(ogg)) continue;
      try {
        execSync(`ffmpeg -y -i "${mp3}" -c:a libopus -b:a 64k -ac 1 "${ogg}"`, {
          stdio: "ignore",
        });
        oggCount++;
      } catch {
        // skip on individual ffmpeg failures
      }
    }
    if (oggCount > 0) console.log(`🔊 Convertidos a OGG: ${oggCount} audios`);
  }
}

// ----------------------------------------------------------------------------
// Manifest TS-friendly + LICENSES.md
// ----------------------------------------------------------------------------

async function generateManifest(level) {
  const { glob } = await import("glob");
  const baseDir = join(ASSETS_DIR, level);
  // Audio puede estar en audio/ o (legacy) en sprites/<sound-pack>/.
  // Sprites solo en sprites/.
  const sprites = await glob("sprites/**/*.{webp,png,svg}", {
    cwd: baseDir,
    absolute: false,
  });
  const audios = await glob("**/*.{ogg,mp3,wav}", {
    cwd: baseDir,
    absolute: false,
  });

  const manifest = {
    level,
    generated: new Date().toISOString(),
    pixabayUsed: Boolean(PIXABAY_KEY),
    sprites: sprites.map((rel) => ({
      key: rel.replace(/\.(webp|png|svg)$/i, "").replace(/\//g, "_"),
      path: `/assets/${level}/${rel}`,
      ext: rel.split(".").pop(),
    })),
    audio: audios.map((rel) => ({
      key: rel.replace(/\.(ogg|mp3|wav)$/i, "").replace(/\//g, "_"),
      path: `/assets/${level}/${rel}`,
      ext: rel.split(".").pop(),
    })),
  };

  const manifestPath = join(ROOT, "packages", `games-${level}`, "src", "assets-manifest.json");
  await ensureDir(join(ROOT, "packages", `games-${level}`, "src"));
  await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(
    `📋 Manifest: ${manifest.sprites.length} sprites, ${manifest.audio.length} audios → ${manifestPath}`,
  );
}

async function generateLicenses(level) {
  const content = `# Licencias de assets — Nivel ${level}

> Generado automáticamente por \`scripts/download-assets.mjs\`.
> Última actualización: ${new Date().toISOString()}

## Kenney.nl
- Licencia: **CC0 1.0 Universal**
- Atribución: NO requerida (apreciada en créditos finales como cortesía)
- Uso comercial: Permitido sin restricción
- URL: https://kenney.nl

## Pixabay
- Licencia: **Pixabay Content License**
- Atribución: NO requerida
- Uso comercial: Permitido (con restricciones a redistribución como producto)
- URL: https://pixabay.com/service/license-summary/

## Lucide Icons (instalado vía npm)
- Licencia: **ISC License**
- URL: https://lucide.dev

## Google Fonts (Fredoka, Nunito, Orbitron, Inter, Manrope, JetBrains Mono)
- Licencia: **SIL Open Font License 1.1**
- URL: https://fonts.google.com

---

Si reemplazás un asset descargado por uno de fuente distinta, agregá manualmente
su licencia y atribución a este archivo.
`;
  await writeFile(join(ASSETS_DIR, level, "LICENSES.md"), content);
}

// ----------------------------------------------------------------------------
// Pipeline por nivel
// ----------------------------------------------------------------------------

async function runLevel(level) {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`🚀 NIVEL: ${level}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

  const cfg = ASSETS[level];
  if (!cfg) {
    console.error(`Nivel desconocido: ${level}`);
    return;
  }

  await ensureDir(join(ASSETS_DIR, level, "sprites"));
  await ensureDir(join(ASSETS_DIR, level, "audio"));

  const startedAt = Date.now();

  for (const slug of cfg.kenney) {
    try {
      await downloadKenneyPack(slug, level);
    } catch (e) {
      logFallback(level, "kenney", slug, e);
    }
  }

  for (const query of cfg.pixabayImages || []) {
    try {
      await downloadPixabayImages(query, level);
    } catch (e) {
      logFallback(level, "pixabay", query, e);
    }
  }

  console.log(`\n🛠️  Optimizando assets de ${level}…`);
  try {
    await optimizeAssets(level);
  } catch (e) {
    console.warn(`⚠️ optimizeAssets falló: ${e.message}`);
  }

  await generateManifest(level);
  await generateLicenses(level);
  await writeFallbackLog(level);

  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  const totalMB = await dirSizeMB(join(ASSETS_DIR, level));
  console.log(`\n✅ Nivel ${level}: ${totalMB} MB en ${elapsed}s`);
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  const arg = process.argv[2] || "todos";

  await ensureDir(CACHE);

  const levels =
    arg === "todos" ? ["primaria", "secundaria", "media"] : [arg];

  for (const lvl of levels) {
    if (!ASSETS[lvl]) {
      console.error(`Nivel desconocido: ${lvl}. Usar primaria | secundaria | media | todos`);
      process.exit(2);
    }
    await runLevel(lvl);
  }

  if (fallbackLog.length > 0) {
    console.log(
      `\n⚠️  ${fallbackLog.length} assets fallaron. Detalles en assets-fallback.md por nivel.`,
    );
  } else {
    console.log(`\n🎉 Todo listo, sin fallos.`);
  }
}

main().catch((e) => {
  console.error("Error fatal:", e);
  process.exit(1);
});
