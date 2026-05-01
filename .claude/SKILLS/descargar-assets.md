---
description: Descarga assets del proyecto IIDTA automáticamente desde fuentes gratuitas verificadas
---

Voy a descargar y procesar assets para el proyecto IIDTA desde múltiples fuentes gratuitas con licencia compatible (CC0, Pixabay License, OFL).

**Fuentes que voy a usar (todas verificadas):**

| Fuente       | Tipo                    | Licencia             | Acceso                        |
| ------------ | ----------------------- | -------------------- | ----------------------------- |
| Kenney.nl    | Sprites 2D, UI, audio   | CC0 (sin atribución) | URLs directas a ZIP           |
| Pixabay API  | Imágenes y audio        | Pixabay License      | API key gratis (registro 30s) |
| Lucide Icons | Iconos UI vectoriales   | ISC                  | Paquete npm                   |
| Google Fonts | Tipografías             | OFL                  | next/font (automático)        |
| OpenGameArt  | Sprites complementarios | CC0/CC-BY            | URLs directas                 |

**Antes de empezar — preguntas al usuario:**

1. **¿Para qué nivel descargar?**
   - `primaria` (Academia de Héroes del Saber)
   - `secundaria` (Estación Orbital)
   - `media` (Agencia Cognitiva)
   - `todos` (descarga base de los 3)

2. **Para Pixabay y Freesound necesito API keys.** ¿El usuario las tiene? Si no:
   - Pixabay (recomendada, fácil): https://pixabay.com/api/docs/ → Login → copia tu key (~30 segundos)
   - Freesound (opcional, más sonidos): https://freesound.org/apiv2/apply/ → requiere OAuth2 si quieres descarga original

3. **¿Qué hacer si una descarga falla?**
   - Modo estricto: detener todo y reportar
   - Modo permisivo: usar fallback (SVG generado o emoji) y continuar

**Pasos a ejecutar:**

### Paso 1: Setup del directorio de assets

```bash
mkdir -p apps/web/public/assets/{primaria,secundaria,media}/{sprites,audio,fonts}
mkdir -p apps/web/public/assets/shared
mkdir -p assets-source-cache  # cache local de descargas (.gitignore)
```

Agregar `/assets-source-cache/` al `.gitignore`.

### Paso 2: Crear el script de descarga

Crear `scripts/download-assets.mjs` con esta estructura:

```javascript
import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable } from "node:stream";
import AdmZip from "adm-zip";

const CACHE = "./assets-source-cache";
const PIXABAY_KEY = process.env.PIXABAY_API_KEY;

// Manifest de assets por nivel
const ASSETS = {
  primaria: {
    kenney: [
      "animal-pack", // mascotas (búho, ardilla, colibrí)
      "ui-pack", // botones, paneles
      "game-icons", // iconos genéricos
      "interface-sounds", // SFX click, success, fail
      "impact-sounds", // SFX impacto
    ],
    pixabay: {
      sounds: ["kids cheer short", "magic sparkle", "page turn", "coin collect"],
      images: ["kids classroom illustration cartoon"],
    },
  },
  secundaria: {
    kenney: [
      "space-kit", // estación orbital
      "ui-space-expansion", // UI sci-fi
      "sci-fi-sounds", // SFX espaciales
      "voiceover-pack", // alertas
    ],
    pixabay: {
      sounds: ["space ambient", "beep technology", "futuristic notification"],
      images: ["nebula background", "space station illustration"],
    },
  },
  media: {
    kenney: [
      "minimalist-icons", // iconos minimalistas
      "interface-sounds", // SFX neutros
    ],
    pixabay: {
      sounds: ["notification subtle", "click minimal", "investigation ambient"],
      images: ["dark gradient abstract", "film noir minimal"],
    },
  },
  shared: {
    fonts: ["Fredoka", "Nunito", "Orbitron", "Inter", "Manrope", "JetBrains Mono"],
    npmPackages: ["lucide-react", "@lottiefiles/react-lottie-player"],
  },
};

// Descarga de Kenney.nl
async function downloadKenneyPack(slug) {
  // Kenney usa esta estructura: https://kenney.nl/media/pages/assets/{slug}/{hash}.zip
  // Como el hash cambia, scrapeamos la página primero
  const pageUrl = `https://kenney.nl/assets/${slug}`;
  console.log(`📥 Descargando Kenney: ${slug}`);

  const html = await fetch(pageUrl).then((r) => r.text());
  const zipMatch = html.match(/href="(\/media\/pages\/assets\/[^"]+\.zip)"/);

  if (!zipMatch) {
    throw new Error(`No se encontró ZIP para ${slug}. URL puede haber cambiado.`);
  }

  const zipUrl = `https://kenney.nl${zipMatch[1]}`;
  const cachePath = join(CACHE, `${slug}.zip`);

  if (!existsSync(cachePath)) {
    const response = await fetch(zipUrl);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(cachePath));
  }

  // Descomprimir y extraer solo lo necesario
  const zip = new AdmZip(cachePath);
  const targetDir = `apps/web/public/assets/{level}/sprites/${slug}/`;
  zip.extractAllTo(targetDir, /* overwrite */ true);

  console.log(`✅ Kenney ${slug} extraído a ${targetDir}`);
}

// Descarga de Pixabay
async function downloadPixabaySounds(query, level) {
  if (!PIXABAY_KEY) {
    console.warn("⚠️ PIXABAY_API_KEY no configurada, saltando Pixabay");
    return;
  }

  const url = `https://pixabay.com/api/sounds/?key=${PIXABAY_KEY}&q=${encodeURIComponent(query)}&per_page=3`;
  const data = await fetch(url).then((r) => r.json());

  for (const sound of data.hits.slice(0, 3)) {
    const audioUrl = sound.audio;
    const filename = `${level}-${query.replace(/\s+/g, "-")}-${sound.id}.mp3`;
    const targetPath = `apps/web/public/assets/${level}/audio/${filename}`;

    const response = await fetch(audioUrl);
    await pipeline(Readable.fromWeb(response.body), createWriteStream(targetPath));
    console.log(`✅ Pixabay sound: ${filename}`);
  }
}

// Procesamiento post-descarga
async function optimizeAssets(level) {
  // Convertir PNG → WebP con sharp
  const sharp = (await import("sharp")).default;
  const { glob } = await import("glob");

  const pngs = await glob(`apps/web/public/assets/${level}/sprites/**/*.png`);
  for (const png of pngs) {
    const webp = png.replace(".png", ".webp");
    await sharp(png).webp({ quality: 85 }).toFile(webp);
  }

  // Convertir MP3 → OGG con ffmpeg (si está disponible)
  const { execSync } = await import("child_process");
  try {
    execSync("ffmpeg -version", { stdio: "ignore" });
    const mp3s = await glob(`apps/web/public/assets/${level}/audio/**/*.mp3`);
    for (const mp3 of mp3s) {
      const ogg = mp3.replace(".mp3", ".ogg");
      execSync(`ffmpeg -y -i "${mp3}" -c:a libopus -b:a 64k -ac 1 "${ogg}"`, { stdio: "ignore" });
    }
  } catch {
    console.warn("⚠️ ffmpeg no disponible, saltando conversión OGG");
  }
}

// Generar manifest TypeScript
async function generateManifest(level) {
  const { glob } = await import("glob");
  const sprites = await glob(`apps/web/public/assets/${level}/sprites/**/*.{webp,png}`);
  const audios = await glob(`apps/web/public/assets/${level}/audio/**/*.{ogg,mp3}`);

  const manifest = {
    level,
    generated: new Date().toISOString(),
    sprites: sprites.map((p) => ({
      key: p
        .split("/")
        .pop()
        .replace(/\.(webp|png)$/, ""),
      path: p.replace("apps/web/public", ""),
    })),
    audio: audios.map((p) => ({
      key: p
        .split("/")
        .pop()
        .replace(/\.(ogg|mp3)$/, ""),
      path: p.replace("apps/web/public", ""),
    })),
  };

  await writeFile(
    `packages/games-${level}/src/assets-manifest.json`,
    JSON.stringify(manifest, null, 2),
  );
}

// Generar LICENSES.md
async function generateLicenses(level) {
  const content = `# Licencias de assets — Nivel ${level}

## Kenney.nl
- Licencia: **CC0 1.0 Universal**
- Atribución: NO requerida
- Uso comercial: Permitido sin restricción
- URL: https://kenney.nl

## Pixabay
- Licencia: **Pixabay License**
- Atribución: NO requerida
- Uso comercial: Permitido
- URL: https://pixabay.com/service/license-summary/

## Lucide Icons
- Licencia: **ISC License**
- Atribución: NO requerida en uso final
- URL: https://lucide.dev

## Google Fonts (Fredoka, Nunito, etc.)
- Licencia: **SIL Open Font License 1.1**
- Atribución: NO requerida en uso final
- URL: https://fonts.google.com

---
Generado automáticamente: ${new Date().toISOString()}
`;
  await writeFile(`apps/web/public/assets/${level}/LICENSES.md`, content);
}

// Main
async function main() {
  const level = process.argv[2] || "primaria";
  console.log(`🚀 Descargando assets para nivel: ${level}`);

  await mkdir(CACHE, { recursive: true });

  const config = ASSETS[level];

  // Kenney
  for (const slug of config.kenney) {
    try {
      await downloadKenneyPack(slug);
    } catch (e) {
      console.warn(`⚠️ Kenney ${slug} falló: ${e.message}`);
    }
  }

  // Pixabay
  if (config.pixabay && PIXABAY_KEY) {
    for (const query of config.pixabay.sounds) {
      try {
        await downloadPixabaySounds(query, level);
      } catch (e) {
        console.warn(`⚠️ Pixabay "${query}" falló: ${e.message}`);
      }
    }
  }

  await optimizeAssets(level);
  await generateManifest(level);
  await generateLicenses(level);

  console.log(`✅ Assets de ${level} listos`);
}

main().catch(console.error);
```

### Paso 3: Instalar dependencias necesarias

```bash
pnpm add -D -w adm-zip sharp glob
# ffmpeg debe estar instalado en el sistema (no es npm package)
# macOS: brew install ffmpeg
# Linux: sudo apt install ffmpeg
# Windows: choco install ffmpeg
```

### Paso 4: Crear .env.local con las API keys

```bash
# .env.local (no commitear)
PIXABAY_API_KEY=tu_key_aqui  # opcional, mejora la calidad de assets
```

### Paso 5: Ejecutar

```bash
node scripts/download-assets.mjs primaria
node scripts/download-assets.mjs secundaria
node scripts/download-assets.mjs media
```

### Paso 6: Verificación

1. Listar archivos descargados: `ls -lh apps/web/public/assets/{level}/`
2. Verificar tamaño total (no debe exceder ~200 MB combinado)
3. Si tamaño > 200 MB: avisar al usuario que considere mover a Cloudflare R2 o Supabase Storage
4. Confirmar que `manifest.json` se generó correctamente
5. Confirmar que `LICENSES.md` está presente
6. Reportar resumen al usuario:
   - X assets descargados de Kenney
   - X assets descargados de Pixabay
   - X MB total
   - Tiempo total
   - Próximos pasos

**Manejo de fallos:**

- Si Kenney URL cambió: scrapeo el HTML buscando `<a href="*.zip">` cerca de la palabra "Download"
- Si Pixabay API rate-limit (3 mil/día gratis): wait 1 segundo entre llamadas
- Si descarga falla 3 veces: marcar como TODO en `assets-fallback.md` y continuar
- Si ffmpeg no está: dejar MP3, agregar nota en LICENSES sobre tamaño no optimizado

**Importante:**

- Las URLs de Kenney pueden cambiar. El script las scrapea dinámicamente, no las hardcodea.
- Si el usuario está en zona con bloqueo a sitios extranjeros, ofrecer fallback a mirrors.
- Documentar TODAS las fuentes y licencias en `LICENSES.md` por nivel.

Cuando el usuario confirme, empezar con el nivel solicitado.
